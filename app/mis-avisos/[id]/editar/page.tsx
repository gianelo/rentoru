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
import styles from "../../../publicar/publish-steps.module.css";
import { adjuntarFotoAlAviso, pedirDestinoDeFotoDelAviso } from "../../actions";
import type { EstadoDeEdicion } from "../../editar-estado";
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
 * los nueve pasos de publicar, y funciona con el script apagado.
 *
 * **Las fotos se agregan acá desde la 18.21, y se quitan al guardar desde la
 * 44.4b** (S2): cada una lleva una casilla dentro del formulario de guardar, y
 * `editListing` las quita en la misma transacción que los campos. Agregar
 * sigue siendo inmediato. El piso, el tope y el ascenso de la portada los
 * contesta el dominio.
 *
 * **Dónde se lee cada negativa lo decide el dominio** (tasks.md 18.22): antes
 * del campo que la produjo y anunciada, como hacen los nueve pasos, con el
 * MISMO `FieldError`. Desde la 44.2 las dibuja `EditarForm`, porque vuelven
 * en el estado de la acción; esta página sólo siembra el inicial.
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

  /**
   * Datos planos para el formulario de cliente (44.4b): la dirección se
   * compone acá porque la base del bucket es del servidor, y el texto
   * alternativo lo compone el dominio. **Una foto sin derivada conserva su
   * renglón**, con `thumbUrl` en `null`: es el único camino para quitarla.
   */
  const fotosDelAviso = fotos.map((foto, index) => ({
    photoId: foto.photoId,
    thumbUrl: foto.thumbKey === null ? null : photoUrl(fotosBaseUrl, foto.thumbKey),
    alt: photoAltText({ position: index, total: fotos.length, title: aviso.title, zone: "" }),
  }));

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

  /**
   * **El estado inicial del formulario, desde la dirección** (44.2). Desde la
   * fase 44 una negativa vuelve por `useActionState` y no por acá; leer la
   * dirección igual es lo que mantiene válidos los enlaces viejos con
   * `?motivos=`, y sembrar el estado con ella deja una sola fuente.
   *
   * Códigos, nunca frases. **Y una medida es una afirmación de afuera**
   * (AGENTS.md §7): `readCarriedMeasure` devuelve nada ante lo ausente y ante
   * lo inventado, y la frase sale sin contador antes que con un número falso
   * (tasks.md 18.25).
   */
  const estadoInicial: EstadoDeEdicion = {
    motivos: (query.motivos ?? "").split(",").filter((motivo) => motivo !== ""),
    medidas: {
      titleLength: readCarriedMeasure(query.largoTitulo),
      descriptionLength: readCarriedMeasure(query.largoDescripcion),
    },
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

            <EditarForm
              aviso={aviso}
              estadoInicial={estadoInicial}
              fotos={fotosDelAviso}
              subirFoto={
                /* El MISMO componente que sube una foto a un borrador
                   importado. Va como ranura dentro del formulario de guardar:
                   no dibuja ningún `<form>` ni `<button>`, y su archivo no
                   tiene `name`, así que no viaja con Guardar. Subir sigue
                   siendo inmediato; quitar espera a Guardar (44.4b). */
                <SubirFoto
                  listingId={aviso.id}
                  photoCount={fotos.length}
                  firmar={pedirDestinoDeFotoDelAviso}
                  adjuntar={adjuntarFotoAlAviso}
                  exito="Foto agregada a tu aviso."
                  chooserLabel="Elegir fotos"
                />
              }
            />
          </div>
        </Container>
      </main>
    </>
  );
}
