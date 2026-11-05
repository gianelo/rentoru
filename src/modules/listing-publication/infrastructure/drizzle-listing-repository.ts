import { randomUUID } from "node:crypto";
import { and, asc, count, eq, gt, lt, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "../../../shared/db/schema";
import {
  cities,
  listingPhotoDerivatives,
  listingPhotos,
  listings,
  zones,
} from "../../../shared/db/schema";
import type {
  DraftForActivation,
  ListingActivationPort,
} from "../application/ports/listing-activation.port";
import type { EditableListing, ListingEditPort } from "../application/ports/listing-edit.port";
import type {
  EditRemovingPhotosOutcome,
  ListingEditWithPhotosPort,
} from "../application/ports/listing-edit-with-photos.port";
import type { ListingPhotoAttachmentPort } from "../application/ports/listing-photo-attachment.port";
import type {
  ListingPhotoOrderPort,
  ListingPhotoThumbnail,
  ListingPhotoThumbnailPort,
} from "../application/ports/listing-photo-set.port";
import type {
  ListingRepositoryPort,
  NewListing,
  NewListingPhoto,
} from "../application/ports/listing-repository.port";
import type { DerivativeName } from "../application/ports/photo-derivation.port";
import type { ZoneCataloguePort } from "../application/ports/zone-catalogue.port";
import type { ListingEditWrite } from "../domain/listing-edit";
import type { CuratedZone } from "../domain/publishable-listing";

/**
 * Drizzle adapters for the two publication ports (task 3.13).
 *
 * The database handle is injected rather than imported, and that is what
 * makes the integration test worth running: the deployment hands it a Neon
 * client, the test hands it a `node-postgres` client pointed at a real
 * Postgres container, and **both run this exact code**. Importing the client
 * here would have forced the test to prove something else.
 *
 * Typed as `PgDatabase` rather than either concrete driver for the same
 * reason — it is the shape both share.
 */
export type PublicationDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

export class DrizzleListingRepository implements ListingRepositoryPort {
  constructor(private readonly db: PublicationDatabase) {}

  async save(
    listing: NewListing,
  ): Promise<{ readonly id: string; readonly photoIds: readonly string[] }> {
    // Generated here rather than by the database so the photo rows can name
    // their parent inside the same transaction without a round trip to read
    // back what was just written.
    const id = randomUUID();
    const createdAt = listing.publishedAt;

    // Hoisted out of the transaction closure (task 4.7): the ids below
    // depend on nothing the database returns, so they are just as valid
    // read back out here, and `save`'s caller needs them in submission
    // order to record each photo's perceptual hash afterwards — see
    // `ListingRepositoryPort.save`'s own doc for why the order matters.
    const photoRows = listing.photos.map((photo) => ({
      id: randomUUID(),
      listingId: id,
      position: photo.position,
      createdAt,
    }));

    // One transaction, because a listing with no photo row is a state the
    // publish rules forbid — `photos.required`. Without this, a failure on
    // the second statement leaves exactly that state in the catalogue, and
    // nothing would ever report it.
    //
    // This is why the handle comes from transactional-client.ts.
    await this.db.transaction(async (tx) => {
      await tx.insert(listings).values({
        id,
        publisherId: listing.publisherId,
        // No `?? "owner"` here, ever. The column is NOT NULL with no default
        // precisely so a missing value fails loudly instead of publishing
        // someone as an owner they never claimed to be.
        publisherType: listing.publisherType,
        // Misma regla, misma razón: sin default, para que el olvido sea un
        // error al insertar y no un anexo publicado como apartamento.
        propertyType: listing.propertyType,
        cityId: listing.cityId,
        zoneId: listing.zoneId,
        // tasks.md 18.7. `?? null` explicito por el mismo motivo que
        // `externalReference` doce lineas mas abajo: omitirlo dejaria la
        // columna en su default —tambien `NULL`— y este sitio dejaria de
        // decir en voz alta que "sin referencia" es una respuesta y no un
        // olvido del llamador.
        reference: listing.reference ?? null,
        title: listing.title,
        description: listing.description,
        priceUsd: listing.priceUsd,
        rooms: listing.rooms,
        areaM2: listing.areaM2,
        bathrooms: listing.bathrooms,
        parkingSpots: listing.parkingSpots,
        hasPowerPlant: listing.hasPowerPlant,
        hasRegularWater: listing.hasRegularWater,
        isFurnished: listing.isFurnished,
        hasSecurity: listing.hasSecurity,
        hasAppliances: listing.hasAppliances,
        contactMethod: listing.contactMethod,
        contactValue: listing.contactValue,
        status: listing.status,
        // broker-bulk-import spec, "Idempotent Import by External
        // Reference" (tasks.md 9.17): `?? null`, never omitted — Drizzle
        // would otherwise leave the column at its schema default (also
        // `NULL` here), but writing it explicitly is what makes it visible
        // at this call site that the single-listing flow's `undefined`
        // really does mean "no reference", not "forgot to pass one".
        externalReference: listing.externalReference ?? null,
        publishedAt: listing.publishedAt,
        expiresAt: listing.expiresAt,
      });

      // `photoRows` is generated above, outside this transaction — las
      // derivadas necesitan apuntar a su foto, y volver a leerlas de la base
      // para averiguar qué id les tocó sería un viaje de red por una
      // respuesta que ya tenemos.
      //
      // A published listing always has at least one photo (`photos.required`
      // — see publishable-listing.ts), so this was never empty before now.
      // An imported DRAFT (tasks.md 9.15/9.17) is created with zero — photos
      // attach afterwards through the existing upload path (9.20-9.23) — and
      // `.values([])` is a Drizzle error, not a no-op, so the empty case has
      // to be guarded explicitly rather than assumed away.
      if (photoRows.length > 0) {
        await tx.insert(listingPhotos).values(photoRows);
      }

      // Dentro de la MISMA transacción, que es la razón por la que el
      // repositorio recibe todo junto: una foto sin sus derivadas es una foto
      // que ninguna pantalla puede dibujar.
      const derivativeRows = listing.photos.flatMap((photo, index) =>
        photo.derivatives.map((derivative) => ({
          photoId: photoRows[index]!.id,
          name: derivative.name,
          key: derivative.key,
          bytes: derivative.byteLength,
        })),
      );
      if (derivativeRows.length > 0) {
        await tx.insert(listingPhotoDerivatives).values(derivativeRows);
      }
    });

    return { id, photoIds: photoRows.map((row) => row.id) };
  }
}

/**
 * broker-bulk-import spec, "Drafts Are Not Published Listings" (tasks.md
 * 9.18/9.19) — the read/write pair `activate-listing.ts` needs, kept
 * separate from `DrizzleListingRepository` per AGENTS.md §3: `save` inserts,
 * this reads-then-flips an existing row, and the two never need to change
 * together.
 */
export class DrizzleListingActivation implements ListingActivationPort, ListingPhotoAttachmentPort {
  constructor(private readonly db: PublicationDatabase) {}

  /**
   * `status = 'draft'` lives IN the `WHERE`, exactly like `findRevealable`'s
   * `status = 'active'` (contact-reveal) — never a plain `id = $1` filtered
   * afterwards in TypeScript. An already-active, expired, hidden, or
   * nonexistent id all come back `null` here, which is what lets
   * `activateListing` treat "not a draft" and "does not exist" as the exact
   * same case.
   */
  async findDraftById(listingId: string): Promise<DraftForActivation | null> {
    const rows = await this.db
      .select({
        id: listings.id,
        publisherId: listings.publisherId,
        publisherType: listings.publisherType,
        propertyType: listings.propertyType,
        cityId: listings.cityId,
        zoneId: listings.zoneId,
        title: listings.title,
        description: listings.description,
        priceUsd: listings.priceUsd,
        rooms: listings.rooms,
        areaM2: listings.areaM2,
        bathrooms: listings.bathrooms,
        parkingSpots: listings.parkingSpots,
        hasPowerPlant: listings.hasPowerPlant,
        hasRegularWater: listings.hasRegularWater,
        isFurnished: listings.isFurnished,
        hasSecurity: listings.hasSecurity,
        hasAppliances: listings.hasAppliances,
        contactMethod: listings.contactMethod,
        contactValue: listings.contactValue,
      })
      .from(listings)
      .where(and(eq(listings.id, listingId), eq(listings.status, "draft")))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const photoCountRows = await this.db
      .select({ photoCount: count() })
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listingId));

    return { ...row, photoCount: photoCountRows[0]?.photoCount ?? 0 };
  }

  /**
   * Compare-and-swap, same idiom as `DrizzleLifecycleListings.renew`:
   * `status = 'draft'` guards the `UPDATE` itself, not only the read that
   * preceded it, so two simultaneous activations of the same draft cannot
   * both believe they won.
   */
  async activate(listingId: string, publishedAt: Date, expiresAt: Date): Promise<boolean> {
    const updated = await this.db
      .update(listings)
      .set({ status: "active", publishedAt, expiresAt })
      .where(and(eq(listings.id, listingId), eq(listings.status, "draft")))
      .returning({ id: listings.id });

    return updated.length > 0;
  }

  /**
   * broker-bulk-import spec, "Photos Attached Through the Existing Upload
   * Path" (tasks.md 9.20/9.21) — `ListingPhotoAttachmentPort`'s only method.
   * Same shape as `save`'s photo insert (one transaction, guarded against
   * `.values([])`), except this targets an EXISTING listing row one photo
   * at a time rather than inserting a brand-new one — `attachPhotoToDraft`
   * already proved ownership and the ceiling before this is ever called,
   * so this method carries no lookup of its own.
   */
  async attachPhoto(
    listingId: string,
    photo: NewListingPhoto,
    createdAt: Date,
  ): Promise<{ readonly photoId: string }> {
    const photoId = randomUUID();

    await this.db.transaction(async (tx) => {
      await tx.insert(listingPhotos).values({
        id: photoId,
        listingId,
        position: photo.position,
        createdAt,
      });

      const derivativeRows = photo.derivatives.map((derivative) => ({
        photoId,
        name: derivative.name,
        key: derivative.key,
        bytes: derivative.byteLength,
      }));
      // Mirrors `save`'s own guard: `.values([])` is a Drizzle runtime
      // error, not a no-op (tasks.md 9.15's own lesson, slice C).
      if (derivativeRows.length > 0) {
        await tx.insert(listingPhotoDerivatives).values(derivativeRows);
      }
    });

    return { photoId };
  }
}

/**
 * tasks.md 18.14 — editar un aviso YA PUBLICADO.
 *
 * **Los dos guardas van EN el `WHERE`, en la lectura y en la escritura.** Un
 * filtro en TypeScript sobre `id = $1` habría dejado la escritura sin
 * protección: entre leer y actualizar, un aviso puede vencer o quedar oculto
 * por reportes, y son justo los dos estados que una edición no debe poder
 * volver a encender.
 */
export class DrizzleListingEdit implements ListingEditPort, ListingEditWithPhotosPort {
  constructor(private readonly db: PublicationDatabase) {}

  async findEditableById(listingId: string, publisherId: string): Promise<EditableListing | null> {
    const rows = await this.db
      .select({
        id: listings.id,
        publisherId: listings.publisherId,
        publisherType: listings.publisherType,
        propertyType: listings.propertyType,
        cityId: listings.cityId,
        zoneId: listings.zoneId,
        reference: listings.reference,
        title: listings.title,
        description: listings.description,
        priceUsd: listings.priceUsd,
        rooms: listings.rooms,
        areaM2: listings.areaM2,
        bathrooms: listings.bathrooms,
        parkingSpots: listings.parkingSpots,
        contactMethod: listings.contactMethod,
        contactValue: listings.contactValue,
        // Los cinco de la F6 (18.37): la pantalla dibuja las casillas con
        // esto, y `?? current` saca de aca lo que un pedido no mande.
        hasPowerPlant: listings.hasPowerPlant,
        hasRegularWater: listings.hasRegularWater,
        isFurnished: listings.isFurnished,
        hasSecurity: listings.hasSecurity,
        hasAppliances: listings.hasAppliances,
      })
      .from(listings)
      .where(
        and(
          eq(listings.id, listingId),
          eq(listings.publisherId, publisherId),
          eq(listings.status, "active"),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    // Contadas, nunca declaradas por el pedido: es el mismo numero que el
    // validador usa para el piso y el tope de fotos.
    const photoCountRows = await this.db
      .select({ photoCount: count() })
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listingId));

    // `null` de la columna a `undefined` del dominio: «sin referencia» es una
    // sola respuesta, y dos formas de decirla es como `referenceOrNone` termina
    // recibiendo algo que no es ni una cosa ni la otra.
    return {
      ...row,
      reference: row.reference ?? undefined,
      photoCount: photoCountRows[0]?.photoCount ?? 0,
    };
  }

  /**
   * `status` NO esta entre las columnas del `set`, y esa ausencia es la
   * garantia: editar no puede resucitar nada. **`publisher_type` SI esta desde
   * la 18.38**, y no ensancha nada: el plan solo lo deja pasar de `owner` a
   * `broker`, asi que la fila no puede volver a decir dueno. **`city_id` y
   * `zone_id` tampoco estan**, y esa ausencia es la otra: son los segmentos de la URL que la regla
   * del fundador cierra (18.27), y `ListingEditWrite` ni siquiera los lleva. Lo que si esta en el `WHERE` es
   * `status = 'active'`, el mismo compare-and-swap que `activate` y `renew`.
   */
  async applyEdit(
    listingId: string,
    publisherId: string,
    write: ListingEditWrite,
  ): Promise<boolean> {
    return updateEditable(this.db, listingId, publisherId, write);
  }

  /**
   * Fase 44 (44.4, G3/D1) — **las marcadas y la edición, o nada.** Leer las
   * claves, borrar y renumerar, y el `UPDATE` de `applyEdit`, sobre un solo
   * `tx`. **El `UPDATE` va al final a propósito**: si su
   * compare-and-swap refusa, los borrados ya hechos se revierten con él, y es
   * esa reversión la que la integración prueba. Un faltante tira adentro para
   * que Postgres revierta; afuera se traduce a un resultado, nunca a un éxito.
   */
  async applyEditRemovingPhotos(
    listingId: string,
    publisherId: string,
    write: ListingEditWrite,
    photoIds: readonly string[],
    expectedPhotoIds: readonly string[],
  ): Promise<EditRemovingPhotosOutcome> {
    try {
      const derivativeKeys = await this.db.transaction(async (tx) => {
        // **El candado primero** (verificador, punto 8): sin él, dos guardados
        // sobre un aviso de dos fotos, cada uno marcando una, pasan el piso
        // en memoria y lo dejan sin ninguna. `FOR UPDATE` pone en fila a los
        // dos y también a un adjuntar, cuya clave foránea pide `KEY SHARE`.
        const locked = await tx
          .select({ id: listings.id })
          .from(listings)
          .where(
            and(
              eq(listings.id, listingId),
              eq(listings.publisherId, publisherId),
              eq(listings.status, "active"),
            ),
          )
          .for("update");
        if (locked.length === 0) throw new EditRolledBack("listing");

        // Ya en fila: el conjunto tiene que ser el que el dominio planeó.
        const current = await photoIdsInOrderOf(tx, listingId);
        if (
          current.length !== expectedPhotoIds.length ||
          current.some((id, index) => id !== expectedPhotoIds[index])
        ) {
          throw new EditRolledBack("photos");
        }

        const keys: string[] = [];
        for (const photoId of photoIds) {
          // ANTES del borrado: el cascade se lleva las derivadas con la fila.
          keys.push(...(await derivativeKeysOf(tx, listingId, photoId)));
          if (!(await detachAndRenumber(tx, listingId, photoId))) {
            throw new EditRolledBack("photos");
          }
        }
        if (!(await updateEditable(tx, listingId, publisherId, write))) {
          throw new EditRolledBack("listing");
        }
        return keys;
      });
      return { applied: true, derivativeKeys };
    } catch (error) {
      if (error instanceof EditRolledBack) return { applied: false, reason: error.reason };
      throw error;
    }
  }
}

/** El faltante que revierte la transacción de `applyEditRemovingPhotos`. */
class EditRolledBack extends Error {
  constructor(readonly reason: "listing" | "photos") {
    super(`applyEditRemovingPhotos: rolled back (${reason}).`);
  }
}

/** El cuerpo de `applyEdit`, sobre la base o sobre un `tx`. Su porqué vive allá. */
async function updateEditable(
  db: PublicationDatabase,
  listingId: string,
  publisherId: string,
  write: ListingEditWrite,
): Promise<boolean> {
  const updated = await db
    .update(listings)
    .set({
      title: write.title,
      description: write.description,
      priceUsd: write.priceUsd,
      rooms: write.rooms,
      bathrooms: write.bathrooms,
      areaM2: write.areaM2,
      parkingSpots: write.parkingSpots,
      propertyType: write.propertyType,
      // De vuelta a `null`, que es lo que la columna nulable guarda: escribir
      // `undefined` en un `set` de Drizzle sería no tocar la columna, o sea un
      // borrado que no borra (18.27).
      reference: write.reference ?? null,
      contactMethod: write.contactMethod,
      contactValue: write.contactValue,
      // 18.38: solo puede venir cambiado hacia `broker`; la unica direccion
      // cerrada la refuso `planListingEdit` antes de llegar aca.
      publisherType: write.publisherType,
      // Los cinco SIEMPRE se escriben, incluso los `false` (18.37): el plan
      // ya resolvio cuales vienen del pedido, y omitir los `false` dejaria un
      // atributo imposible de sacar.
      hasPowerPlant: write.hasPowerPlant,
      hasRegularWater: write.hasRegularWater,
      isFurnished: write.isFurnished,
      hasSecurity: write.hasSecurity,
      hasAppliances: write.hasAppliances,
    })
    .where(
      and(
        eq(listings.id, listingId),
        eq(listings.publisherId, publisherId),
        eq(listings.status, "active"),
      ),
    )
    .returning({ id: listings.id });

  return updated.length > 0;
}

/**
 * El tamaño que un renglón de foto dibuja (tasks.md 18.26). Nombrado y no
 * escrito adentro de la consulta: `DerivativeName` es la unión que
 * `photo-derivation.port.ts` declara, así que un tamaño que dejara de
 * existir rompe acá al compilar en vez de devolver cero filas en producción.
 */
const THUMBNAIL_DERIVATIVE: DerivativeName = "thumb";

/**
 * tasks.md 18.21 — leer las fotos de un aviso: su orden y sus miniaturas.
 *
 * **Una clase al lado de `DrizzleListingActivation`, que es la que adjunta**,
 * y sólo de lectura: quitar fotos vive desde la 44.4 en la transacción de
 * `DrizzleListingEdit.applyEditRemovingPhotos` (AGENTS.md §3).
 */
export class DrizzleListingPhotoSet implements ListingPhotoOrderPort, ListingPhotoThumbnailPort {
  constructor(private readonly db: PublicationDatabase) {}

  /**
   * `ORDER BY position`, nunca el orden en que la tabla devuelve las filas: la
   * portada es la de `position` más baja y una consulta sin orden explícito la
   * elegiría por dónde quedó en el disco.
   */
  async listPhotoIdsInOrder(listingId: string): Promise<readonly string[]> {
    return photoIdsInOrderOf(this.db, listingId);
  }

  /**
   * tasks.md 18.26 — la misma lista, con la clave de R2 de cada miniatura.
   *
   * **`leftJoin` y no `innerJoin`, y la diferencia no es de estilo.** El
   * `innerJoin` que la cuadrícula usa puede permitírselo: un aviso sin
   * derivadas simplemente no se muestra en la lista de resultados. Acá el
   * renglón es el ÚNICO camino para quitar una foto, así que dejar afuera a la
   * que no tiene derivadas produciría una fila de `listing_photo` que el aviso
   * sigue mostrando y su dueño ya no puede sacar — un fallo abierto justo
   * donde AGENTS.md §7 pide el cerrado. Vuelve con `thumbKey` en `null` y
   * quien dibuja decide.
   *
   * **`name = 'thumb'` va en el `ON`, no en el `WHERE`.** En el `WHERE`
   * convertiría el `leftJoin` en un `innerJoin` de hecho: la fila sin derivada
   * trae `name` nulo, y `null = 'thumb'` no es verdadero, así que la foto que
   * este método existe para conservar sería la primera en desaparecer.
   *
   * `ORDER BY position`, como su hermana: la portada es la de `position` más
   * baja, y una consulta sin orden explícito la elegiría por dónde quedó en el
   * disco.
   */
  async listPhotoThumbnailsInOrder(listingId: string): Promise<readonly ListingPhotoThumbnail[]> {
    const rows = await this.db
      .select({ photoId: listingPhotos.id, thumbKey: listingPhotoDerivatives.key })
      .from(listingPhotos)
      .leftJoin(
        listingPhotoDerivatives,
        and(
          eq(listingPhotoDerivatives.photoId, listingPhotos.id),
          eq(listingPhotoDerivatives.name, THUMBNAIL_DERIVATIVE),
        ),
      )
      .where(eq(listingPhotos.listingId, listingId))
      .orderBy(asc(listingPhotos.position));

    return rows.map((row) => ({ photoId: row.photoId, thumbKey: row.thumbKey }));
  }
}

/** El cuerpo de `listPhotoIdsInOrder`, sobre la base o sobre un `tx`. */
async function photoIdsInOrderOf(db: PublicationDatabase, listingId: string): Promise<string[]> {
  const rows = await db
    .select({ id: listingPhotos.id })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId))
    .orderBy(asc(listingPhotos.position));

  return rows.map((row) => row.id);
}

/**
 * tasks.md 18.32 — las claves de R2 de UNA foto, para poder borrarlas. Se lee
 * ANTES de borrar la fila: `listing_photo_derivative` cuelga de `listing_photo`
 * con `ON DELETE cascade`, así que después devolvería cero claves.
 *
 * **`innerJoin` acá y `leftJoin` en `listPhotoThumbnailsInOrder`, y la
 * asimetría es la decisión.** Aquélla dibuja un renglón y una foto sin
 * derivadas tiene que seguir apareciendo; ésta produce la lista de lo que se
 * va a BORRAR, y una fila con la clave en `null` sería un `DELETE` contra un
 * objeto que no existe. **`listing_id` en el `WHERE` aunque `photo_id` sea
 * único**: la clave de la foto de un aviso ajeno no se lee ni por error.
 */
async function derivativeKeysOf(
  db: PublicationDatabase,
  listingId: string,
  photoId: string,
): Promise<string[]> {
  const rows = await db
    .select({ key: listingPhotoDerivatives.key })
    .from(listingPhotoDerivatives)
    .innerJoin(listingPhotos, eq(listingPhotos.id, listingPhotoDerivatives.photoId))
    .where(and(eq(listingPhotos.listingId, listingId), eq(listingPhotos.id, photoId)));

  return rows.map((row) => row.key);
}

/**
 * Borrar y renumerar, **siempre dentro de un `tx` que pone quien llama**:
 * sueltos dejarían un hueco visible, y el siguiente adjuntar —que pide
 * `position =` cuántas fotos hay— chocaría contra el índice único. Renumerar
 * es también lo que hace verdadero en la base el «quitar la portada asciende a
 * la siguiente» que `planPhotoRemoval` decide en memoria. `false` cuando la
 * fila ya no estaba.
 *
 * **Por qué el rodeo por los negativos y no `position = position - 1`.**
 * `listing_photo_position_unique` no es `DEFERRABLE`, así que Postgres lo
 * comprueba fila por fila DENTRO de la sentencia, y restar uno sobrevive sólo
 * si el plan visita las filas de menor a mayor, cosa que ningún `UPDATE`
 * promete. `k → -k-1` manda cada fila a un rango que ninguna otra ocupa, y
 * `-k-1 → k-1` la trae de vuelta a uno que ya quedó vacío: ningún paso puede
 * chocar consigo mismo bajo ningún orden.
 */
async function detachAndRenumber(
  tx: PublicationDatabase,
  listingId: string,
  photoId: string,
): Promise<boolean> {
  const removed = await tx
    .delete(listingPhotos)
    .where(and(eq(listingPhotos.listingId, listingId), eq(listingPhotos.id, photoId)))
    .returning({ position: listingPhotos.position });

  const gap = removed[0]?.position;
  if (gap === undefined) return false;

  await tx
    .update(listingPhotos)
    .set({ position: sql`-${listingPhotos.position} - 1` })
    .where(and(eq(listingPhotos.listingId, listingId), gt(listingPhotos.position, gap)));

  await tx
    .update(listingPhotos)
    .set({ position: sql`-${listingPhotos.position} - 2` })
    .where(and(eq(listingPhotos.listingId, listingId), lt(listingPhotos.position, 0)));

  return true;
}

export class DrizzleZoneCatalogue implements ZoneCataloguePort {
  constructor(private readonly db: PublicationDatabase) {}

  /**
   * Joined against `city` rather than read from `zone` alone. A zone row
   * whose city has been removed would otherwise still validate a draft, and
   * the insert would then fail on `listing`'s foreign key — a 500 in place of
   * the `cityId.unknown` the publisher can act on.
   */
  async listZonesForCity(cityId: string): Promise<readonly CuratedZone[]> {
    return this.db
      .select({ id: zones.id, cityId: zones.cityId })
      .from(zones)
      .innerJoin(cities, eq(cities.id, zones.cityId))
      .where(eq(zones.cityId, cityId));
  }
}
