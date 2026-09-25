import type { PriceHistogramView } from "@/modules/listing-search/domain/price-histogram-panel";
import type {
  AttributeChoice,
  BathroomChoice,
  HiddenField,
  RoomChoice,
  SearchPanelModel,
} from "@/modules/listing-search/domain/search-panel";
import { AppLink } from "../atoms/AppLink";
import { SegmentedControl } from "../atoms/SegmentedControl";
import { Switch } from "../atoms/Switch";
import { SearchFilterModal } from "./SearchFilterModal";
import styles from "./SearchPanel.module.css";

/**
 * **El panel de filtros: cuatro grupos — precio, habitaciones, quién publica y
 * atributos — dibujados como modal en todos los anchos.**
 *
 * Dos decisiones del fundador (2026-08-26) lo dejaron así, y las dos están
 * dibujadas en las láminas 7b y 7c:
 *
 * - **La barra lateral se fue, en todos los anchos** (14.33). *"Sin barra
 *   lateral: los filtros viven solo en el modal"*, y la lista gana el ancho
 *   entero — ocho avisos sobre el pliegue contra seis. Los filtros llegan por
 *   un solo camino: el control de filtro de la pastilla, que es *"la misma URL
 *   con el panel abierto desde el servidor"* (14i). **Por eso `open` es una
 *   lectura de la dirección** y no un manejador de clic: un panel que sólo
 *   existe cuando llega un script deja sin filtros a quien se quedó sin bundle,
 *   y en este mercado eso pasa todos los días (D13).
 * - **B1 dejó una sola secuencia en las tres medidas** (28.2). Abrir los cuatro
 *   grupos en escritorio quedó descartado: con los controles nuevos se vuelve
 *   un muro, y el fundador eligió un acordeón puro también para tablet y
 *   desktop. **Un solo marcado con punto de quiebre, nunca dos implementaciones**
 *   — es la regla que `SearchFilters` ya dejó escrita y que el `Nav` de la
 *   14.40 volvió a aplicar.
 *
 * **Por qué los grupos dejaron de ser `<details>`, que es un desvío anotado.**
 * El acordeón exclusivo del navegador (`<details name>`) resolvía el teléfono
 * sin una línea de JavaScript, pero no alcanza para la mejora con JavaScript:
 * mientras el modal está abierto, tocar opciones debe modificar un borrador y no
 * navegar. El marcado servido conserva enlaces y formulario reales; la isla
 * cliente sólo intercepta esos gestos cuando el bundle llegó.
 *
 * **Este componente no decide nada.** Recibe un `SearchPanelModel` ya armado
 * por `listing-search/domain/search-panel.ts`: cada opción llega con su
 * etiqueta, su conteo, si está elegida, si está deshabilitada y a qué dirección
 * lleva; cada grupo llega con la dirección que lo abre y si está abierto. La
 * regla permanente del fundador es la razón, y hay una mecánica encima: el
 * suelo de cobertura del 90 % llega a `domain/` y no llega a `components/`.
 *
 * **Sin JavaScript, y sin `"use client"`** (F14). Cada opción de una lista es
 * un enlace, y precio es un formulario `GET` que se lleva el resto del estado
 * en campos escondidos para no perderlo al enviar.
 *
 * Una opción deshabilitada se dibuja como `<span aria-disabled="true">` y no
 * como un enlace: no existe un enlace apagado, y dejarlo enlazado mandaría a
 * una pantalla vacía — lo que la regla transversal 4 prohíbe.
 */
export function SearchPanel({ model }: { readonly model: SearchPanelModel }) {
  // Cerrado no dibuja nada. Dejarlo escondido con CSS sería marcado que un
  // lector de pantalla recorre igual, y una lista de filtros de la que nadie
  // avisó que estaba ahí.
  if (!model.open) return null;

  const openStep = model.steps.find((step) => step.open)?.id;

  return (
    <SearchFilterModal>
      {/* El `id` es el destino del filtro de la pastilla (`SearchPill`), que
      apunta a `…#filtros`.

      `role="dialog"` y **no `aria-modal`**: sin JavaScript no hay forma de
      atrapar el foco, y declarar `aria-modal="true"` sin atraparlo le promete
      a un lector de pantalla algo que no se cumple. El panel va primero en el
      documento, así que igual es lo primero que se alcanza. */}
      <section
        className={styles.panel}
        id="filtros"
        role="dialog"
        aria-label="Filtros de búsqueda"
        data-testid="search-panel"
      >
        <div className={styles.sheet}>
          <header className={styles.head}>
            <p className={styles.headTitle}>Buscar alquiler</p>
            {/* El «×» de la lámina, y es una dirección: cerrar el panel es la
              misma búsqueda sin el parámetro, así que tiene que poder abrirse
              en otra pestaña y funcionar con el script apagado. */}
            <AppLink
              className={styles.close}
              href={model.closeHref}
              aria-label="Cerrar los filtros"
              data-testid="search-panel-close"
              data-search-filter-close=""
            >
              ×
            </AppLink>
          </header>

          {/* Una dirección vieja que nombra un grupo que ya no existe abre el
            panel igual y lo dice (14.23b). El texto lo escribe el dominio. */}
          {model.openNotice === null ? null : (
            <p className={styles.notice} role="status">
              {model.openNotice}
            </p>
          )}

          <div className={styles.groups}>
            {model.steps.map((step) => (
              <section
                key={step.id}
                className={styles.group}
                id={`filtros-${step.id}`}
                // El estado abierto viaja en el marcado y la hoja de estilos lo
                // lee: B1 mantiene un solo cuerpo visible en móvil, tablet y
                // escritorio. Un solo marcado, tres medidas.
                data-open={step.open ? "" : undefined}
              >
                <h2 className={styles.summary}>
                  <AppLink className={styles.summaryLink} href={step.href}>
                    <span className={styles.position}>{step.position}</span>
                    <span className={styles.stepTitle}>{step.title}</span>
                    <span className={styles.stepValue}>{step.summary}</span>
                  </AppLink>
                </h2>

                <div className={styles.body}>
                  <p className={styles.question}>{step.question}</p>

                  {step.id === "precio" ? <PriceStep model={model} /> : null}
                  {step.id === "habitaciones" ? <RoomsStep model={model} /> : null}
                  {step.id === "publica" ? <PublisherStep model={model} /> : null}
                  {step.id === "atributos" ? <AttributesStep model={model} /> : null}
                </div>
              </section>
            ))}
          </div>

          <div className={styles.foot}>
            {/* «Limpiar todo» vuelve al valor por defecto TODO menos la ciudad
              (F8). La dirección ya la calculó el dominio; acá es un enlace
              porque es una dirección, y tiene que poder abrirse y pegarse. */}
            <AppLink className={styles.clear} href={model.clearAllHref} data-search-filter-clear="">
              Limpiar todo
            </AppLink>

            <div className={styles.confirmStack}>
              {model.confirm.kind !== "empty" || model.confirm.relief === null ? null : (
                <p className={styles.reliefText}>{model.confirm.relief.label}</p>
              )}
              {openStep === "precio" && model.confirm.kind === "results" ? (
                <button
                  className={styles.confirm}
                  type="submit"
                  form="search-price-form"
                  data-testid="search-confirm"
                  data-search-filter-confirm=""
                >
                  {model.confirm.label}
                </button>
              ) : (
                <AppLink
                  className={styles.confirm}
                  href={model.confirm.href}
                  data-testid="search-confirm"
                  data-search-filter-confirm=""
                >
                  {model.confirm.label}
                </AppLink>
              )}
            </div>
          </div>
        </div>
      </section>
    </SearchFilterModal>
  );
}

function PriceStep({ model }: { readonly model: SearchPanelModel }) {
  return (
    // Los dos extremos son opcionales, y al revés se intercambian en vez de dar
    // error (F5). El intercambio lo hace `buildSearchCriteria`, así que estos
    // campos ya vuelven en orden después de enviar.
    <form id="search-price-form" className={styles.price} method="get" action={model.price.action}>
      <Hidden fields={model.price.hidden} />
      <div className={styles.priceRow}>
        <label className={styles.field} htmlFor="precio-desde">
          <span className={styles.searchLabel}>Desde</span>
          <input
            className={styles.control}
            id="precio-desde"
            type="number"
            inputMode="numeric"
            min={0}
            name={model.price.minName}
            defaultValue={model.price.min}
            placeholder="$200"
          />
        </label>
        <label className={styles.field} htmlFor="precio-hasta">
          <span className={styles.searchLabel}>Hasta</span>
          <input
            className={styles.control}
            id="precio-hasta"
            type="number"
            inputMode="numeric"
            min={0}
            name={model.price.maxName}
            defaultValue={model.price.max}
            placeholder="$1000"
          />
        </label>
      </div>
      <PriceHistogram histogram={model.price.histogram} />
    </form>
  );
}

/**
 * **El dibujo del precio, o la negativa a dibujarlo** (F5, lámina 7b).
 *
 * No decide nada: qué barra queda dentro del rango, cómo se llama el lugar de
 * la frase y qué se dice por debajo de doce avisos vienen resueltos de
 * `price-histogram-panel.ts`. Acá sólo se escribe el marcado — el alto es el
 * único valor inline, porque es dato medido y no un tamaño del sistema.
 */
function PriceHistogram({ histogram }: { readonly histogram: PriceHistogramView }) {
  if (histogram.kind === "insufficient") {
    return <p className={styles.histogramNotice}>{histogram.notice}</p>;
  }

  return (
    <div className={styles.histogram}>
      {/* Una fila de barras es una imagen de datos: se anuncia como una sola
          imagen con el dibujo dicho en palabras, en vez de ocho cajas vacías
          que un lector de pantalla recorrería sin poder decir nada de ellas. */}
      <div className={styles.bars} role="img" aria-label={histogram.caption}>
        {histogram.bars.map((bar, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: la identidad de un cubo ES su lugar en el eje
            key={index}
            className={styles.bar}
            data-placement={bar.placement}
            style={{ blockSize: `${bar.heightPercent}%` }}
          />
        ))}
      </div>
      <div className={styles.axis} aria-hidden="true">
        <span>{histogram.fromLabel}</span>
        <span>{histogram.toLabel}</span>
      </div>
      {histogram.summary === null ? null : (
        <p className={styles.histogramSummary}>{histogram.summary}</p>
      )}
    </div>
  );
}

/**
 * **Habitaciones y baños, en el mismo grupo** (14.45). La lámina 7b los dibuja
 * uno debajo del otro en la misma columna, con un encabezado cada uno: es el
 * grupo que el fundador llamó «tamaño». Los baños llevan `<h3>` y no otro
 * `<p class=question>` porque son una sección del grupo, y un lector de
 * pantalla tiene que poder saltar a ella.
 */
function RoomsStep({ model }: { readonly model: SearchPanelModel }) {
  return (
    <>
      <SegmentedControl options={model.rooms.map(toSegmentedOption)} />
      <h3 className={styles.question}>Baños</h3>
      <SegmentedControl options={model.bathrooms.map(toSegmentedOption)} />
    </>
  );
}

/**
 * `RoomChoice` y `BathroomChoice` son la misma forma con otro nombre de
 * campo (`room.step`); el control segmentado no necesita saber cuál de las
 * dos está dibujando.
 */
function toSegmentedOption(option: RoomChoice | BathroomChoice) {
  return {
    key: String(option.step),
    label: option.label,
    chosen: option.chosen,
    disabled: option.disabled,
    href: option.href,
  };
}

/**
 * **Quién publica, su propio grupo** (14.32). Estaba metido dentro del paso de
 * habitaciones porque en el teléfono los cuatro pasos eran otros cuatro; la
 * lámina 7b lo dibuja con encabezado propio, y el fundador lo nombra aparte.
 */
function PublisherStep({ model }: { readonly model: SearchPanelModel }) {
  return (
    <ul className={styles.options}>
      <li>
        <AppLink
          className={styles.option}
          href={model.publisher.href}
          aria-current={model.publisher.chosen ? "true" : undefined}
          data-chosen={model.publisher.chosen ? "" : undefined}
        >
          <span className={styles.optionName}>
            {model.publisher.chosen ? "✓ " : ""}
            {model.publisher.label}
            <span className={styles.note}>{model.publisher.note}</span>
          </span>
        </AppLink>
      </li>
    </ul>
  );
}

function AttributesStep({ model }: { readonly model: SearchPanelModel }) {
  return (
    <>
      <ul className={styles.options}>
        {model.attributes.map((attribute) => (
          <AttributeOptionItem key={attribute.attribute} attribute={attribute} />
        ))}
      </ul>
      {/* La frase de la lámina 7b, y no es cortesía: un atributo sin marcar no
          significa que la propiedad no lo tenga, y sin decirlo el filtro se lee
          como una afirmación sobre la propiedad. */}
      <p className={styles.note}>
        Sólo se muestra lo que el dueño declaró. Un atributo sin marcar no significa que la
        propiedad no lo tenga.
      </p>
    </>
  );
}

/**
 * **El interruptor de la 7b** (tasks.md 22.11) reemplaza el prefijo «✓ »: el
 * estado elegido se lee en la posición y el relleno de la perilla, no sólo en
 * el color, y `aria-current` sigue siendo lo que un lector de pantalla
 * anuncia — el `Switch` es puramente decorativo (`aria-hidden`).
 */
function AttributeOptionItem({ attribute }: { readonly attribute: AttributeChoice }) {
  const body = (
    <>
      <span className={styles.attributeHead}>
        <span className={styles.optionName}>{attribute.label}</span>
        <Switch on={attribute.chosen} />
      </span>
    </>
  );

  return (
    <li>
      {attribute.disabled ? (
        <span className={styles.attribute} aria-disabled="true">
          {body}
        </span>
      ) : (
        // Rol `link` otra vez, y el mismo cambio: `aria-pressed` sobre un
        // enlace es marcado que se lee accesible y no lo es.
        <AppLink
          className={styles.attribute}
          href={attribute.href}
          aria-current={attribute.chosen ? "true" : undefined}
          data-chosen={attribute.chosen ? "" : undefined}
        >
          {body}
        </AppLink>
      )}
    </li>
  );
}

/**
 * El resto de la búsqueda, escondida dentro del formulario.
 *
 * Un `<form method="get">` reemplaza la query entera por sus propios campos:
 * sin esto, enviar el precio borraría las zonas y las habitaciones que ya
 * estaban puestas. Qué campos son lo decide el dominio.
 */
function Hidden({ fields }: { readonly fields: readonly HiddenField[] }) {
  return (
    <>
      {fields.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}
    </>
  );
}
