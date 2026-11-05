"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DrizzleContactVerificationEvidence,
  DrizzleVerifiedContacts,
} from "@/modules/identity/infrastructure/drizzle-verified-contact";
import { nextAuthSessionPort } from "@/modules/identity/infrastructure/session-port";
import {
  ActivateListingRejectedError,
  activateListing,
} from "@/modules/listing-publication/application/activate-listing";
import { attachPhotoToDraft } from "@/modules/listing-publication/application/attach-photo-to-draft";
import {
  EditListingRejectedError,
  editListing,
} from "@/modules/listing-publication/application/edit-listing";
import {
  attachPhotoToListing,
  requestListingPhotoUpload,
} from "@/modules/listing-publication/application/edit-listing-photos";
import { requestDraftPhotoUpload } from "@/modules/listing-publication/application/request-draft-photo-upload";
import { measureOf } from "@/modules/listing-publication/domain/carried-value";
import type { ListingEdit } from "@/modules/listing-publication/domain/listing-edit";
import {
  DrizzleListingActivation,
  DrizzleListingEdit,
  DrizzleListingPhotoSet,
  DrizzleZoneCatalogue,
} from "@/modules/listing-publication/infrastructure/drizzle-listing-repository";
import { deriveListingPhoto } from "@/modules/listing-publication/infrastructure/photo-derivatives";
import { createR2PhotoStorage } from "@/modules/listing-publication/infrastructure/r2-photo-storage";
import { DrizzlePhotoHash } from "@/modules/listing-trust/infrastructure/drizzle-photo-hash";
import { db } from "@/shared/db/client";
import { getTransactionalDatabase } from "@/shared/db/transactional-client";
import { FEATURES_DECLARED_FIELD, formChecked, formCount, formText } from "../publicar/step-values";
import type { EstadoDeEdicion } from "./editar-estado";

/**
 * tasks.md 9.28 — **las dos llamadas que no existían.**
 *
 * `activateListing` y `attachPhotoToDraft` llevaban una porción entera
 * construidos, probados y sin una sola ruta que los llamara: una inmobiliaria
 * podía importar cincuenta avisos y quedaban como borradores que nadie podía
 * fotografiar ni activar desde un navegador. Es la cuarta vez que este
 * trabajo encuentra la misma forma de defecto (el anti-fraude de fotos, la
 * pastilla de búsqueda, el motor de importación y `canImportListings` fueron
 * las tres anteriores). Este archivo la cierra.
 *
 * **Ninguna regla vive acá.** De quién es el borrador, si tiene fotos, si
 * puede activarse y qué se puede firmar lo contestan los tres casos de uso;
 * este archivo elige adaptadores y traduce su respuesta a una dirección.
 *
 * **Una acción de servidor es un endpoint HTTP público.** Que la llame un
 * componente nuestro no es una garantía sobre quién la llama, así que las
 * tres empiezan por la sesión — y ninguna acepta un `publisherId`: el id sale
 * siempre de la sesión, adentro del caso de uso.
 */

/**
 * Composición por pedido y no al importar el módulo: `createR2PhotoStorage`
 * lee seis variables de entorno y tira si falta una — a nivel de módulo eso
 * tumbaría la pantalla entera de quien sólo quiere mirar su lista.
 */
function photoDependencies() {
  const transactional = getTransactionalDatabase();
  const activation = new DrizzleListingActivation(transactional);

  return {
    sessionPort: nextAuthSessionPort,
    listings: activation,
    photos: activation,
    storage: createR2PhotoStorage(),
    derive: (source: Uint8Array) => deriveListingPhoto(Buffer.from(source)),
    computeHash: (source: Uint8Array) => computeHashOf(source),
    photoHashes: new DrizzlePhotoHash(transactional),
  };
}

// `sharp` y el dHash sólo se cargan cuando de verdad llega una foto: son la
// dependencia más pesada de este árbol y la pantalla de la lista no la usa.
async function computeHashOf(source: Uint8Array) {
  const { computeDHash } = await import("@/modules/listing-trust/infrastructure/sharp-dhash");
  return computeDHash(Buffer.from(source));
}

export interface DestinoDeFoto {
  readonly key: string;
  readonly url: string;
  /** Serializado: una `Date` no sobrevive el cruce hacia el componente cliente. */
  readonly expiresAt: string;
}

/**
 * Paso 1 de la subida: la firma. Falla cerrado — un borrador que no existe o
 * que es de otra cuenta no obtiene permiso de escritura (AGENTS.md §7).
 */
export async function pedirDestinoDeFoto(input: {
  readonly listingId: string;
  readonly contentType: string;
  readonly byteLength: number;
}): Promise<DestinoDeFoto> {
  const target = await requestDraftPhotoUpload(input, {
    sessionPort: nextAuthSessionPort,
    listings: new DrizzleListingActivation(db),
    storage: createR2PhotoStorage(),
  });

  return { key: target.key, url: target.url, expiresAt: target.expiresAt.toISOString() };
}

/**
 * Paso 2: adjuntar lo que ya está subido. **Pasa por
 * `processUploadedPhoto`**, adentro de `attachPhotoToDraft`, que es el único
 * punto por el que publicar y adjuntar pasan los dos — y donde vive el
 * rechazo por foto duplicada entre cuentas (tarea 4.7). Un camino de
 * importación que subiera fotos sin pasar por ahí reabriría el agujero que
 * esa tarea cerró.
 */
export async function adjuntarFotoAlBorrador(input: {
  readonly listingId: string;
  readonly key: string;
  readonly contentType: string;
}): Promise<{ readonly position: number }> {
  const result = await attachPhotoToDraft(
    {
      listingId: input.listingId,
      incomingKey: input.key,
      declaredContentType: input.contentType,
    },
    photoDependencies(),
  );

  // La ficha del aviso cuenta sus fotos y su estado; sin esto la lista
  // seguiría diciendo «faltan fotos» después de subir una.
  revalidatePath("/mis-avisos");

  return { position: result.position };
}

/**
 * tasks.md 18.21 — **las mismas dos mitades, sobre un aviso YA publicado.**
 *
 * No reusan las de arriba y no es duplicación: la puerta de aquéllas es
 * `findDraftById`, cuyo `WHERE` lleva `status = 'draft'` adentro. Ensancharlo
 * le abriría a `activateListing` una fila que ya está activa, así que va un
 * caso de uso al lado con `findEditableById` de puerta — la misma que ya
 * refusa un aviso ajeno, un borrador, un vencido y uno oculto como el mismo
 * `null`. Lo que sí se reusa entero es lo que importa: `processUploadedPhoto`,
 * el único punto por el que pasan publicar, adjuntar a un borrador y esto.
 */
export async function pedirDestinoDeFotoDelAviso(input: {
  readonly listingId: string;
  readonly contentType: string;
  readonly byteLength: number;
}): Promise<DestinoDeFoto> {
  const target = await requestListingPhotoUpload(input, {
    sessionPort: nextAuthSessionPort,
    listings: new DrizzleListingEdit(db),
    storage: createR2PhotoStorage(),
  });

  return { key: target.key, url: target.url, expiresAt: target.expiresAt.toISOString() };
}

export async function adjuntarFotoAlAviso(input: {
  readonly listingId: string;
  readonly key: string;
  readonly contentType: string;
}): Promise<{ readonly position: number }> {
  const transactional = getTransactionalDatabase();

  const result = await attachPhotoToListing(
    {
      listingId: input.listingId,
      incomingKey: input.key,
      declaredContentType: input.contentType,
    },
    {
      ...photoDependencies(),
      // La puerta del aviso publicado, en lugar de la del borrador. El resto
      // de la tubería —almacenamiento, derivadas, hash— es la misma.
      listings: new DrizzleListingEdit(transactional),
      photos: new DrizzleListingActivation(transactional),
    },
  );

  // La ficha pública y la lista cuentan las fotos del aviso.
  revalidatePath("/mis-avisos");
  revalidatePath(`/mis-avisos/${input.listingId}/editar`);

  return { position: result.position };
}

/**
 * El disparador de activación. **Un `<form>` de verdad**, así que llega como
 * `FormData` y funciona con el script apagado: `/mis-avisos` está exento del
 * piso de la ruta de lectura por la compresión de fotos (AGENTS.md §2), no
 * por esto.
 *
 * **La negativa viaja en la dirección.** `activateListing` re-valida en etapa
 * `"activation"` y puede refusar; sin JavaScript no hay dónde devolverle un
 * valor a la pantalla, así que los códigos vuelven como parámetros y la
 * página los traduce al lado del aviso que los pidió. Los códigos son los
 * estables del dominio, nunca la frase — la copia se decide en una tabla, no
 * en una URL.
 */
export async function activarBorrador(formData: FormData): Promise<void> {
  const listingId = String(formData.get("listingId") ?? "");

  let violations: readonly string[] | null = null;
  try {
    await activateListing(
      { listingId },
      {
        sessionPort: nextAuthSessionPort,
        zones: new DrizzleZoneCatalogue(db),
        listings: new DrizzleListingActivation(getTransactionalDatabase()),
        // tasks.md 19.15 — los mismos dos que `publicar/fotos/publication.ts`
        // arma, y con la misma repartición: la lectura contra el cliente
        // normal, la escritura contra el transaccional.
        contactEvidence: new DrizzleContactVerificationEvidence(db),
        verifiedContacts: new DrizzleVerifiedContacts(getTransactionalDatabase()),
      },
    );
  } catch (error) {
    // Sólo la negativa del validador se dibuja. Un borrador que no existe o
    // que es de otro no produce una explicación: sube, y Next responde como
    // ante cualquier otro fallo — decirle a un desconocido «ese borrador no
    // es tuyo» ya sería contarle que existe.
    if (!(error instanceof ActivateListingRejectedError)) throw error;
    violations = error.violations;
  }

  revalidatePath("/mis-avisos");

  // Fuera del `try`: `redirect` funciona tirando, y atraparlo acá adentro lo
  // convertiría en «un error inesperado» silenciosamente.
  redirect(
    violations === null
      ? "/mis-avisos"
      : `/mis-avisos?fallo=${encodeURIComponent(listingId)}&motivos=${encodeURIComponent(violations.join(","))}`,
  );
}

/**
 * Lo que el formulario de editar posteó, en el vocabulario del dominio.
 *
 * **Nada se decide acá.** Los dos lectores vienen de `step-values.ts`, así que
 * un precio vacío sale `null` (no 0, ver `formCountOrBlank`) y uno escrito
 * «quinientos» sale `NaN`, que `validatePublishableListing` ya rechaza como
 * `priceUsd.invalid`.
 * Lo único que esta capa resuelve es la forma: `FormData` habla en cadenas.
 *
 * **`publisherType` se lee aunque la pantalla no lo dibuje**, y esa es la
 * diferencia entre una garantía y una omisión. Una acción de servidor es un
 * endpoint HTTP público: descartarlo acá aceptaría en silencio un pedido que
 * el producto refusa. Se manda como llegó y lo juzga el dominio, que lo mira
 * dos veces — `publisherType.immutable` si cambia, y `publisherType.invalid`
 * si además no es ninguno de los dos. El `as` afirma la forma, nunca el
 * valor, que es el mismo reparto que `readStepAnswers` ya usa para el paso 9.
 *
 * **Los cinco atributos viajan juntos o no viajan** (18.37), y el porqué está
 * en `FEATURES_DECLARED_FIELD`. **Qué significa la ausencia no se decide acá**:
 * llega al dominio como los cinco `undefined` y lo contesta el `?? current` de
 * `writeFor`, igual que cualquier otro campo sin contestar.
 */
function leerEdicion(formData: FormData): ListingEdit {
  return {
    title: formText(formData, "title"),
    description: formText(formData, "description"),
    priceUsd: formCountOrBlank(formData, "priceUsd"),
    rooms: formCountOrBlank(formData, "rooms"),
    bathrooms: formCountOrBlank(formData, "bathrooms"),
    areaM2: formCountOrBlank(formData, "areaM2"),
    // El unico campo numerico del aviso donde el vacio ES una respuesta, igual
    // que en el paso 4: un anexo sin puesto es un aviso normal, y nadie deberia
    // tener que escribir un cero para corregirlo.
    parkingSpots: formCount(formData, "parkingSpots") ?? 0,
    propertyType: formText(formData, "propertyType") as ListingEdit["propertyType"],
    /**
     * **En blanco es «ninguna», y no «no la mandes»** (18.27). Es el unico campo
     * opcional del aviso, asi que las dos ausencias significan cosas distintas y
     * el dominio las distingue: `""` borra la seña, `undefined` deja la de ayer.
     * `formText` colapsa las dos en `undefined`, que dejaria la referencia
     * imposible de sacar desde la pantalla — asi que acá se conserva la
     * diferencia que el formulario mandó, sin decidir nada sobre ella.
     */
    reference: formData.has("reference") ? (formText(formData, "reference") ?? "") : undefined,
    contactMethod: formText(formData, "contactMethod") as ListingEdit["contactMethod"],
    contactValue: formText(formData, "contactValue"),
    publisherType: formText(formData, "publisherType") as ListingEdit["publisherType"],
    ...leerAtributos(formData),
  };
}

/**
 * Fase 44 (S5) — **la misma diferencia que la referencia, para los cuatro
 * números obligatorios.** `formCount` colapsa «en blanco» y «no viajó» en
 * `undefined`, y el dominio lee eso como «no lo toqué»: borrar el precio y
 * guardar se daba por bueno con el de ayer. Acá sólo se conserva lo que el
 * formulario mandó —`null` en blanco, `undefined` ausente—; rechazarlo lo
 * decide `planListingEdit`.
 */
function formCountOrBlank(formData: FormData, name: string): number | null | undefined {
  if (formData.has(name) && formText(formData, name) === undefined) return null;
  return formCount(formData, name);
}

/** Los cinco de la F6, o ninguno. **La marca es la respuesta**, no las casillas. */
function leerAtributos(formData: FormData): Partial<ListingEdit> {
  if (!formData.has(FEATURES_DECLARED_FIELD)) return {};

  return {
    hasPowerPlant: formChecked(formData, "hasPowerPlant"),
    hasRegularWater: formChecked(formData, "hasRegularWater"),
    isFurnished: formChecked(formData, "isFurnished"),
    hasSecurity: formChecked(formData, "hasSecurity"),
    hasAppliances: formChecked(formData, "hasAppliances"),
  };
}

/**
 * tasks.md 18.20 — **la ruta que le faltaba a `editListing`.**
 *
 * La regla (`planListingEdit`), el caso de uso (`editListing`), el puerto y el
 * adaptador shipearon enteros y probados sin un solo llamador. Esto es el
 * llamador: un `<form>` de verdad, así que llega como `FormData` y funciona con
 * el script apagado.
 *
 * **Ninguna regla vive acá.** Qué campos puede tocar una edición y con qué
 * reglas se validan lo contesta el dominio; este archivo elige adaptadores y
 * traduce la respuesta.
 *
 * **Fase 44 (S4): una negativa ya no redirige, devuelve.** «le di a guardar
 * aviso y ahí se reinició todo»: la dirección sólo podía llevar códigos, y la
 * página volvía a pintar la base. Ahora vuelve un `EstadoDeEdicion` por
 * `useActionState`, que React dibuja antes de hidratar y Next vuelve a servir
 * ante un POST sin JavaScript. La negativa sigue viajando como código y nunca
 * como frase: la copia la decide `listingEditViolationMessage`. Un aviso ajeno
 * o inexistente no produce ningún estado: sube, porque decirle a un
 * desconocido «ese aviso no es tuyo» ya sería contarle que existe.
 */
export async function guardarEdicion(
  _estadoAnterior: EstadoDeEdicion,
  formData: FormData,
): Promise<EstadoDeEdicion> {
  const listingId = String(formData.get("listingId") ?? "");
  const edicion = leerEdicion(formData);
  const fotosAQuitar = leerFotosAQuitar(formData);
  const transactional = getTransactionalDatabase();
  const listings = new DrizzleListingEdit(transactional);

  let violations: readonly string[] | null = null;
  let portadaCambio = false;
  try {
    const result = await editListing(
      { listingId, edit: edicion, photoIdsToRemove: fotosAQuitar },
      {
        sessionPort: nextAuthSessionPort,
        zones: new DrizzleZoneCatalogue(db),
        listings,
        // Fase 44 (44.4b): sólo con marcas. Sin ellas el guardado es el de
        // siempre y no arma R2, que lee seis variables y tira si falta una.
        // Transaccional y no HTTP: quitar y guardar van en UNA transacción.
        photoRemoval:
          fotosAQuitar.length === 0
            ? undefined
            : {
                order: new DrizzleListingPhotoSet(transactional),
                listings,
                storage: createR2PhotoStorage(),
              },
      },
    );
    // Quien quitó la portada cambió la cara del aviso: Mis avisos lo dice.
    portadaCambio = Boolean(result.coverChangedTo);
  } catch (error) {
    if (!(error instanceof EditListingRejectedError)) throw error;
    violations = error.violations;
  }

  revalidatePath("/mis-avisos");

  if (violations !== null) {
    return {
      motivos: violations,
      /**
       * tasks.md 18.25 — **el contador cuenta lo que se envió, o no cuenta.**
       * «Vas N» tiene que ser el largo de lo que se acaba de rechazar, no el
       * de la guardada, que es otra. Se mide acá porque `formText` ya recortó
       * los espacios igual que el validador, y en puntos de código como él. Un
       * campo ausente no manda medida: la frase sale sin contador antes que
       * con un cero (AGENTS.md §7).
       */
      medidas: {
        titleLength: measureOf(edicion.title),
        descriptionLength: measureOf(edicion.description),
      },
      valores: valoresEnviados(formData),
      // Las marcas sobreviven a la negativa (G3): `valores` guarda una por
      // nombre y aquí hay varias con el mismo.
      fotosAQuitar,
    };
  }

  // Fuera del `try`: `redirect` funciona tirando, y atraparlo adentro lo
  // convertiria en «un error inesperado» silenciosamente.
  redirect(portadaCambio ? "/mis-avisos?portada=1" : "/mis-avisos");
}

/**
 * Fase 44 (44.4b) — las casillas «Quitar al guardar». Forma y nada más: una
 * casilla vacía o repetida no es una marca. Si se puede quitar lo contesta
 * `editListing`.
 */
function leerFotosAQuitar(formData: FormData): string[] {
  const ids = new Set<string>();
  for (const value of formData.getAll("quitarFoto")) {
    if (typeof value === "string" && value.trim() !== "") ids.add(value);
  }
  return [...ids];
}

/**
 * Lo escrito, de vuelta tal cual: cadenas crudas, nunca leídas — el «abc» del
 * precio vuelve «abc». El `listingId` no vuelve porque el formulario ya lo
 * dibuja desde el aviso.
 */
function valoresEnviados(formData: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [name, value] of formData) {
    if (name !== "listingId" && name !== "quitarFoto" && typeof value === "string") {
      valores[name] = value;
    }
  }
  return valores;
}
