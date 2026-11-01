import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DrizzleBulkImportAccounts } from "@/modules/broker-bulk-import/infrastructure/drizzle-bulk-import-account";
import { resolveNavAccount, resolveNavPublish } from "@/modules/identity/domain/nav-account";
import { nextAuthSessionPort } from "@/modules/identity/infrastructure/session-port";
import { homeSearchForm } from "@/modules/listing-catalogue/domain/search-destination";
import { photoAltText, photoUrl } from "@/modules/listing-discovery/domain/listing-photo-view";
import { readPhotoPublicBaseUrl } from "@/modules/listing-discovery/infrastructure/photo-public-base-url";
import {
  EditListingNotFoundError,
  loadListingForEdit,
} from "@/modules/listing-publication/application/edit-listing";
import { loadListingPhotosForEdit } from "@/modules/listing-publication/application/edit-listing-photos";
import { readCarriedMeasure } from "@/modules/listing-publication/domain/carried-value";
import { COVER_PHOTO_INDEX } from "@/modules/listing-publication/domain/draft-photo-actions";
import { MAX_PHOTOS_PER_LISTING } from "@/modules/listing-publication/domain/publishable-listing";
import { placeListingEditViolations } from "@/modules/listing-publication/domain/violation-field";
import {
  DrizzleListingEdit,
  DrizzleListingPhotoSet,
} from "@/modules/listing-publication/infrastructure/drizzle-listing-repository";
import { db } from "@/shared/db/client";
import { AppLink } from "../../../../components/atoms/AppLink";
import { Container } from "../../../../components/layout/Container";
import type { SearchPillProps } from "../../../../components/molecules/SearchPill";
import { Nav } from "../../../../components/organisms/Nav";
import { requireSession } from "../../../_lib/require-session";
import {
  coverChangedNotice,
  PHOTO_ACTION_COPY,
  PHOTO_COVER_EXPLANATION,
  photoActionLabel,
  photoRemovalRefusalMessage,
} from "../../../publicar/photo-action-copy";
import styles from "../../../publicar/publish-steps.module.css";
import {
  listingEditViolationMessage,
  type PublishCopyContext,
} from "../../../publicar/violation-copy";
import { adjuntarFotoAlAviso, pedirDestinoDeFotoDelAviso, quitarFotoDelAviso } from "../../actions";
import { SubirFoto } from "../../SubirFoto";
import { EditarForm } from "./EditarForm";

export const metadata: Metadata = {
  title: "Editar aviso — Rentoru",
  // 26.12 — **sin canónica, y por eso fuera del índice.** Es la misma llamada
  // que hace `reportar/page.tsx`: no es contenido. La pantalla vive detrás de
  // una sesión y de la propiedad del aviso, así que un rastreador sólo ve la
  // redirección a la puerta; y su ruta lleva un `[id]` que esta metadata
  // estática no resuelve, de modo que no hay dirección canónica que declarar.
  // Declarar `noindex` y una canónica a la vez serían dos señales que se
  // contradicen, así que va la que dice la verdad.
  robots: { index: false, follow: false },
};

// De quién es el aviso y si sigue activo se lee en cada pedido: un aviso que
// venció hace un minuto no puede quedar horneado como editable.
export const dynamic = "force-dynamic";

/**
 * `/mis-avisos/[id]/editar` — tasks.md 18.20, el llamador que le faltaba a
 * `editListing`: la regla, el caso de uso, el puerto y el adaptador shipearon
 * enteros y probados sin que ninguna ruta los invocara, así que un dueño no
 * podía corregir su precio aunque el dominio supiera cómo.
 *
 * **Acá no se decide nada** (AGENTS.md §1). Qué campos puede tocar una edición
 * lo contesta `planListingEdit`; si este aviso es editable y de quién es lo
 * contesta `loadListingForEdit`; qué dice cada negativa lo contesta la misma
 * tabla de castellano que usa publicar.
 *
 * **El `[id]` no se convierte en nada.** Viaja como la cadena opaca que es
 * hasta el `WHERE`, que ya está acotado a `publisher_id` y a
 * `status = 'active'`: un id inventado, uno ajeno, un borrador, un vencido y
 * uno oculto vuelven todos como el mismo `null` y salen por el mismo
 * `notFound()`. Convertirlo en un valor del dominio antes de consultar sería
 * una regla en la capa que el piso del 90% no alcanza — es como esta misma
 * semana se llegó a «Cambiaste undefined».
 *
 * **El formulario de guardar vive en `EditarForm.tsx`**, un componente de
 * cliente para que la fase 44 pueda devolver los valores rechazados (G2). Sigue
 * siendo un `<form method="post">` nativo hacia una Server Action, igual que
 * los nueve pasos de publicar, y funciona con el script apagado. Los
 * formularios de cada foto siguen nativos en este archivo.
 *
 * **Las fotos se agregan y se quitan acá desde la 18.21**, y con su propio
 * `<form>` cada una: no viajan con «Guardar cambios» porque no son un campo
 * del pedido — `photoCount` sale de contar filas y nunca de la edición. Quién
 * puede agregar y quitar lo contesta `edit-listing-photos.ts` con la MISMA
 * puerta que esta pantalla ya usó para leer el aviso; el piso, el tope y el
 * ascenso de la portada los contesta el dominio.
 *
 * **Dónde se lee cada negativa lo decide el dominio** (tasks.md 18.22): antes
 * del campo que la produjo y anunciada, como hacen los nueve pasos, con el
 * MISMO `FieldError`. El bloque de arriba queda sólo para lo que una edición no
 * manda y para un código inventado en la dirección.
 */
export default async function EditarAvisoPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const session = await requireSession(`/mis-avisos/${id}/editar`);

  const [bulkImportAccount, aviso, fotos] = await Promise.all([
    new DrizzleBulkImportAccounts(db).findAccount(session.userId),
    loadListingForEdit(
      { listingId: id },
      { sessionPort: nextAuthSessionPort, listings: new DrizzleListingEdit(db) },
    ).catch((error: unknown) => {
      // Ajeno, inexistente, borrador, vencido y oculto salen por la misma
      // puerta. Cualquier otro fallo sube: una pantalla que dibujara igual ante
      // un error de base estaría mintiendo (AGENTS.md §7).
      if (error instanceof EditListingNotFoundError) return null;
      throw error;
    }),
    // La MISMA puerta, así que un aviso ajeno tampoco muestra sus fotos y sale
    // por el mismo `notFound()`.
    loadListingPhotosForEdit(
      { listingId: id },
      {
        sessionPort: nextAuthSessionPort,
        listings: new DrizzleListingEdit(db),
        thumbnails: new DrizzleListingPhotoSet(db),
      },
    ).catch((error: unknown) => {
      if (error instanceof EditListingNotFoundError) return [];
      throw error;
    }),
  ]);

  if (!aviso) notFound();

  /**
   * **Después del `notFound()`, y el orden es la garantía.** Un aviso ajeno se
   * contesta como uno inexistente pase lo que pase con la configuración: leer
   * la base antes haría que un despliegue sin `R2_BUCKET_PUBLIC_URL`
   * distinguiera un id ajeno (500) de uno inventado (404), que es exactamente
   * lo que `loadListingForEdit` se escribió para cerrar.
   *
   * **Y se niega en vez de dibujar de menos** (AGENTS.md §7). Volver en
   * silencio al ordinal sería regresar al daño que la 18.26 cierra —elegir
   * entre seis fotos parecidas por un número— con la diferencia de que ahora
   * nadie lo vería: un despliegue mal configurado se vería igual que uno
   * correcto.
   */
  const fotosBaseUrl = readPhotoPublicBaseUrl();

  // **Y acá tampoco se paga** (14.56): esta pantalla edita un aviso PROPIO y
  // `loadListingForEdit` ya contestó `notFound()` para un id ajeno o
  // inexistente, así que haber llegado hasta esta línea es la respuesta del
  // `EXISTS` — con la fila delante. Preguntarlo de nuevo sería un viaje para
  // confirmar lo que el `notFound()` de arriba ya garantizó.
  const account = resolveNavAccount(
    { name: session.name, email: session.email },
    {
      bulkImportEnabled: bulkImportAccount?.bulkImportEnabled ?? false,
      hasListings: true,
    },
  );
  const form = homeSearchForm();
  const pill: SearchPillProps = {
    action: form.action,
    name: form.name,
    value: form.value,
    placeholder: form.label,
    submitLabel: form.submitLabel,
    // Vacía por contrato (diseño 14i): es el estado de /mis-avisos.
    state: { kind: "empty" },
  };

  // Códigos, nunca frases: es lo que vuelve en la dirección cuando el dominio
  // se niega y no hay JavaScript donde devolver un valor.
  const motivos = (query.motivos ?? "").split(",").filter((motivo) => motivo !== "");

  // **Dónde va cada negativa lo decide el dominio** (tasks.md 18.22), no esta
  // pantalla: `placeListingEditViolations` reparte entre los campos que un
  // pedido de edición manda y las que no tienen ninguno. Acá sólo se dibuja lo
  // que ya viene decidido.
  const negativas = placeListingEditViolations(motivos);

  /**
   * **El contador cuenta lo que se envió, o no cuenta** (tasks.md 18.25).
   *
   * Antes esto era `{ title: aviso.title }` y el «Vas N» de la descripción
   * salía 0, porque lo que se acababa de escribir no volvía. Pasarle
   * `aviso.description` habría dicho el largo de la GUARDADA, que tampoco es la
   * que se rechazó: las dos son un número que nadie escribió. Lo que vuelve es
   * la medida de lo enviado, que es lo único que la frase dibuja y lo único que
   * cabe en una dirección (18.19).
   *
   * **Un parámetro es una afirmación de afuera** (AGENTS.md §7):
   * `readCarriedMeasure` devuelve nada ante lo ausente y ante lo inventado, y
   * la frase sale sin contador antes que con un número falso.
   */
  const medidas: PublishCopyContext = {
    titleLength: readCarriedMeasure(query.largoTitulo),
    descriptionLength: readCarriedMeasure(query.largoDescripcion),
  };
  return (
    <>
      <Nav
        account={account}
        publish={resolveNavPublish(account)}
        pill={pill}
        signInHref={`/signin?callbackUrl=${encodeURIComponent(`/mis-avisos/${id}/editar`)}`}
      />
      <main className={styles.paginaEditar}>
        <Container>
          <div className={styles.column}>
            {/* Se entra desde Mis avisos, así que se sale hacia ahí. */}
            <AppLink href="/mis-avisos">← Mis avisos</AppLink>
            <h1 className={styles.title}>Editar aviso</h1>
            <p className={styles.help}>
              Los cambios se ven enseguida en tu aviso. Quien ya vio tu contacto no lo pierde.
            </p>

            {/*
              **Sólo las que no tienen campo en esta pantalla.** Las demás se
              leen al lado del control que las produjo, como hace publicar. Este
              bloque queda para lo que una edición no manda —fotos, zona,
              ciudad, tipo de inmueble, puestos— y para un código inventado en la
              dirección: tragárselas dejaría un formulario que se niega a guardar
              sin decir por qué (AGENTS.md §7).
            */}
            {negativas.elsewhere.length === 0 ? null : (
              <p className={styles.error} role="alert">
                No se pudo guardar:{" "}
                {negativas.elsewhere
                  .map((motivo) => listingEditViolationMessage(motivo, medidas))
                  .join(" · ")}
              </p>
            )}

            {/*
              **Las fotos, antes del formulario y fuera de él.** Cada una lleva
              su propio `<form method="post">`, así que anidarlas adentro del de
              guardar sería marcado inválido y haría que quitar una enviara la
              edición entera. Y se guardan al tocarlas: `photoCount` sale de
              contar filas, nunca de un campo del pedido.
            */}
            <section className={styles.choices} aria-labelledby="fotos-titulo">
              <h2 className={styles.legend} id="fotos-titulo">
                Fotos
              </h2>
              <p className={styles.help}>
                {fotos.length} de {MAX_PHOTOS_PER_LISTING}. {PHOTO_COVER_EXPLANATION}. Se guardan al
                tocarlas, sin esperar a «Guardar cambios».
              </p>

              {/* La negativa vuelve como código, y la copia la decide la tabla
                  del paso 8 — no una segunda lista de castellano. */}
              {query.foto === undefined ? null : (
                <p className={styles.error} role="alert">
                  {photoRemovalRefusalMessage(query.foto)}
                </p>
              )}

              {/* Quien quita la portada cambió la cara del aviso sin pedirlo,
                  así que se anuncia con nombre en vez de callarse. */}
              {query.portada === "1" && fotos.length > 0 ? (
                <p className={styles.help} role="status">
                  {coverChangedNotice(nombreDeFoto(COVER_PHOTO_INDEX))}
                </p>
              ) : null}

              <ul className={styles.results}>
                {fotos.map((foto, index) => (
                  <li key={foto.photoId} className={styles.photoRow}>
                    {/*
                      **La foto, no su ordinal** (tasks.md 18.26). Antes de
                      esto el renglón decía «Foto 4» y nada más, así que quien
                      tiene seis parecidas elegía a ciegas y podía quitar la
                      que no era, sobre su propio aviso y sin vuelta atrás.

                      `<img>` y no `next/image` por la misma razón que la
                      cuadrícula y el visor: el optimizador de la plataforma es
                      un recurso medido del plan gratuito, y estas derivadas ya
                      salen de R2 con egreso cero.

                      **La miniatura, nunca la foto entera**: los cuatro
                      tamaños existen para que un teléfono con datos caros no
                      descargue seis imágenes de pantalla completa para elegir
                      una.

                      **Una foto sin derivada conserva su renglón**, sin
                      `<img>`: filtrarla dejaría una fila que el aviso muestra
                      y su dueño no puede sacar, porque este renglón es el
                      único camino para quitarla (AGENTS.md §7).
                    */}
                    {foto.thumbKey === null ? null : (
                      /* `next/image` optimiza contra un servicio medido del
                         plan gratuito; estas derivadas YA se generaron una vez
                         al subir, en cuatro tamaños, justamente para salir de
                         R2 con egreso cero. Pasarlas por el optimizador
                         gastaría una transformación paga por una imagen que ya
                         está en el tamaño que se dibuja. */
                      // biome-ignore lint/performance/noImgElement: derivada ya generada, egreso cero desde R2
                      <img
                        className={styles.photoThumb}
                        src={photoUrl(fotosBaseUrl, foto.thumbKey)}
                        /* **El texto alternativo es producto, no decoración**,
                           y lo compone el dominio: la posición va primero
                           porque quien usa lector de pantalla necesita saber
                           dónde está antes que qué mira. Un `alt="foto"`
                           escrito acá sería peor que ninguno. Sin zona: el
                           dueño ya sabe dónde está su aviso, y traerla pediría
                           una segunda lectura para una coma. */
                        alt={photoAltText({
                          position: index,
                          total: fotos.length,
                          title: aviso.title,
                          zone: "",
                        })}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <span className={styles.photoName}>
                      {nombreDeFoto(index)}
                      {index === COVER_PHOTO_INDEX ? " (portada)" : ""}
                    </span>
                    {/* Un `<form>` de verdad: quitar funciona con el script
                        apagado, a diferencia de agregar, que comprime en el
                        teléfono antes de que los bytes salgan. */}
                    <form action={quitarFotoDelAviso} method="post">
                      <input type="hidden" name="listingId" value={aviso.id} />
                      <input type="hidden" name="photoId" value={foto.photoId} />
                      <button
                        type="submit"
                        className={styles.secondary}
                        aria-label={photoActionLabel("remove", nombreDeFoto(index))}
                      >
                        {PHOTO_ACTION_COPY.remove.label}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>

              {/* El MISMO componente que sube una foto a un borrador importado:
                  cambia la puerta del servidor, no la secuencia. */}
              <SubirFoto
                listingId={aviso.id}
                photoCount={fotos.length}
                firmar={pedirDestinoDeFotoDelAviso}
                adjuntar={adjuntarFotoAlAviso}
                exito="Foto agregada a tu aviso."
                chooserLabel="Elegir fotos"
              />
            </section>

            <EditarForm aviso={aviso} motivos={motivos} medidas={medidas} />
          </div>
        </Container>
      </main>
    </>
  );
}

/**
 * Cómo se llama una foto de un aviso publicado.
 *
 * **Su posición es el único nombre que tiene**, y no es una carencia de esta
 * pantalla: `listing_photo` no guarda ni nombre de archivo ni `alt_text`, a
 * propósito —«pedirle a quien llena el formulario de pie y con una mano que
 * describa seis fotografías produce campos vacíos, no accesibilidad»—. Base
 * uno para quien lee, igual que `photoAltText`: «Foto 0» no es algo que nadie
 * diga en voz alta.
 */
function nombreDeFoto(index: number): string {
  return `Foto ${index + 1}`;
}
