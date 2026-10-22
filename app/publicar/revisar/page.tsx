import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppLink } from "@/../components/atoms/AppLink";
import { measureOf } from "@/modules/listing-publication/domain/carried-value";
import {
  isDraftReadyForReview,
  PUBLISH_STEP_ORDER,
  type PublishStepId,
  parseDraftChanges,
} from "@/modules/listing-publication/domain/publication-steps";
import { requireSession } from "../../_lib/require-session";
import { publishFromReview } from "../actions";
import { readPublicationContext } from "../publication-context";
import styles from "../publish-steps.module.css";
import { changeNoticeMessage, FEATURE_LABELS, STEP_COPY, stepSummary } from "../step-copy";
import {
  PUBLISH_VIOLATION_COPY,
  PUBLISHER_TYPE_ONE_WAY_LEAD,
  PUBLISHER_TYPE_ONE_WAY_STRESS,
} from "../violation-copy";
import reviewStyles from "./review.module.css";

export const metadata: Metadata = {
  title: "Revisá tu aviso — Rentoru",
  // 26.12 — relativa: `metadataBase` le pone la base una sola vez.
  alternates: { canonical: "/publicar/revisar" },
};

interface ReviewPageProps {
  /**
   * Los tres pedazos del "qué cambió", uno por campo. La frase se arma acá y
   * no en la URL, y **nada de esto se cree**: un paso escribe hasta cuatro
   * campos, así que llegan repetidos —una cadena cuando es uno solo, un
   * arreglo cuando son varios— y una barra de direcciones se escribe a mano.
   */
  readonly searchParams: Promise<{
    campo?: string | string[];
    antes?: string | string[];
    ahora?: string | string[];
  }>;
}

/** Un valor repetido llega como arreglo; uno solo, como cadena. */
function list(value: string | string[] | undefined): readonly string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Revisar, antes de publicar.
 *
 * **Esta pantalla es una de las tres cosas que compensan el costo de nueve
 * pasos**, y no es un lujo: nadie recuerda qué escribió nueve pasos atrás. Sin
 * ella, la única forma de comprobar el aviso sería recorrerlo entero de nuevo.
 *
 * Cada bloque tiene su "Cambiar", y ese enlace vuelve **al paso**, no al
 * principio — llevando `volver=revisar`, que es lo que hace que el botón de
 * allá diga "Guardar y volver a revisar" y que guardar traiga de vuelta acá.
 */
export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const session = await requireSession("/publicar/revisar");

  const { campo, antes, ahora } = await searchParams;
  const { draft, violations, currentStep, zoneName } = await readPublicationContext(session.userId);

  // La regla la contesta el dominio: acá no se decide quién puede ver esta
  // pantalla, sólo qué se hace con la respuesta. Escrita a ojo tenía dos casos
  // borde que fallan en direcciones opuestas — el paso 5, que no produce
  // violaciones, y el paso 9, que es el mismo que `currentStepId` devuelve
  // cuando ya no falta ninguno.
  if (!isDraftReadyForReview(draft, violations)) {
    redirect(`/publicar/paso/${currentStep}`);
  }

  const { listing } = draft;
  const declared = FEATURE_LABELS.filter(([field]) => listing[field] === true).map(
    ([, label]) => label,
  );
  const totalBytes = draft.photos.reduce((sum, photo) => sum + photo.bytes, 0);

  // Qué llegó por la URL lo decide el dominio, no esta página: un campo
  // inventado o dos valores iguales salen de acá como "no hay nada que decir".
  const notice = changeNoticeMessage(parseDraftChanges(list(campo), list(antes), list(ahora)));

  const rows: ReadonlyArray<{ step: PublishStepId; term: string; value: string }> = [
    {
      step: "tipo",
      term: "Tipo y zona",
      value: `${stepSummary("tipo", draft, { zoneName }) ?? ""} · ${zoneName ?? ""}`,
    },
    { step: "precio", term: "Precio", value: `$${listing.priceUsd} al mes` },
    {
      step: "tamano",
      term: "Tamaño",
      value: `${listing.rooms} hab · ${listing.bathrooms} baños · ${listing.areaM2} m² · ${listing.parkingSpots ?? 0} puestos`,
    },
    {
      step: "atributos",
      term: "Tiene",
      // "Ninguno" y no una celda vacía: quien contestó "No tiene ninguna"
      // contestó, y un blanco al lado de seis filas llenas se lee como roto.
      value: declared.length > 0 ? declared.join(" · ") : "Ninguno",
    },
    { step: "descripcion", term: "Descripción", value: listing.description ?? "" },
    {
      step: "fotos",
      term: "Fotos",
      value: `${draft.photos.length} ${draft.photos.length === 1 ? "foto" : "fotos"} · ${Math.round(totalBytes / 1024)} KB`,
    },
    {
      step: "quien",
      term: "Publicás como",
      value: `${stepSummary("quien", draft, { zoneName }) ?? ""} ${listing.contactValue ?? ""}`,
    },
  ];

  return (
    <div className={`${styles.shell} ${reviewStyles.shell}`}>
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <AppLink className={styles.brand} href="/" aria-label="Rentoru, ir al inicio">
            Rentoru
          </AppLink>
          <span className={styles.saved}>Guardado</span>
          <AppLink className={styles.exit} href="/" aria-label="Salir de publicar">
            ×
          </AppLink>
        </div>
      </header>

      <div className={reviewStyles.review}>
        <main className={reviewStyles.reviewBody}>
          <h1 className={reviewStyles.title}>Revisá tu aviso</h1>

          {/* Regla 4 de la sección 4: se dice qué cambió. Sin esto nadie sabe
              si se guardó, y quien no sabe vuelve a entrar al paso a
              comprobarlo — o publica sin comprobarlo, que es peor. */}
          {notice ? (
            <p className={styles.notice} role="status">
              ↩ {notice}
            </p>
          ) : null}

          {/* Lo que `publishListing` rechazó al intentar publicar. Llega acá y
              no al paso, porque es acá donde se apretó el botón — y el enlace
              "Cambiar" de cada bloque es el camino de vuelta al campo. */}
          {draft.violations.map((violation) => (
            <p key={violation} className={styles.error} role="alert">
              {/* Medidas y no texto (tasks.md 18.25): el contador dibuja un
                  número, y se cuenta acá, donde el borrador que se acaba de
                  escribir está a mano. */}
              {PUBLISH_VIOLATION_COPY[violation].message({
                descriptionLength: measureOf(listing.description),
                titleLength: measureOf(listing.title),
              })}
            </p>
          ))}

          <dl className={reviewStyles.list}>
            {rows.map((row) => (
              <div key={row.step} className={reviewStyles.row}>
                <dt className={reviewStyles.term}>{row.term}</dt>
                <dd className={reviewStyles.value} data-step={row.step}>
                  {row.value}
                  {row.step === "fotos" ? (
                    <ol className={reviewStyles.photos} aria-label="Fotos en orden">
                      {draft.photos.map((photo, index) => (
                        <li key={photo.key}>
                          <figure>
                            {/* biome-ignore lint/performance/noImgElement: lectura privada con cookie, nunca mediante proxy público de optimización. */}
                            <img
                              src={`/publicar/fotos/vista/${index}?foto=${encodeURIComponent(photo.key.split("/").at(-1) ?? "")}`}
                              alt={photo.name}
                            />
                            <figcaption>
                              <strong>{index === 0 ? "1 · Portada" : index + 1}</strong>
                              <span>{photo.name}</span>
                            </figcaption>
                          </figure>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </dd>
                {/* Vuelve AL PASO, no al principio, y avisa de dónde vino. */}
                <AppLink
                  className={reviewStyles.change}
                  href={`/publicar/paso/${row.step}?volver=revisar`}
                  aria-label={`Cambiar ${STEP_COPY[row.step].railLabel}`}
                >
                  Cambiar
                </AppLink>
              </div>
            ))}
          </dl>

          {/* La misma advertencia de Quién publica y Editar: 18.38 permite
              corregir dueño a inmobiliaria, pero no volver atrás. */}
          <p className={styles.warning}>
            {PUBLISHER_TYPE_ONE_WAY_LEAD}
            <strong>{PUBLISHER_TYPE_ONE_WAY_STRESS}</strong>.
          </p>

          <form action={publishFromReview} method="post" className={reviewStyles.actions}>
            <button type="submit" className={styles.primary}>
              Publicar aviso
            </button>
            <AppLink className={styles.secondary} href={`/publicar/paso/${PUBLISH_STEP_ORDER[0]}`}>
              Volver al formulario
            </AppLink>
          </form>
        </main>
      </div>
    </div>
  );
}
