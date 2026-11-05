"use client";

import { type ReactNode, useActionState } from "react";
import type { EditableListing } from "@/modules/listing-publication/application/ports/listing-edit.port";
import { COVER_PHOTO_INDEX } from "@/modules/listing-publication/domain/draft-photo-actions";
import { editablePublisherTypes } from "@/modules/listing-publication/domain/listing-edit";
import type { ChangedField } from "@/modules/listing-publication/domain/publication-steps";
import {
  MAX_PHOTOS_PER_LISTING,
  MAX_TITLE_CHARACTERS,
  MIN_DESCRIPTION_CHARACTERS,
} from "@/modules/listing-publication/domain/publishable-listing";
import {
  type ListingField,
  placeListingEditViolations,
} from "@/modules/listing-publication/domain/violation-field";
import { AppLink } from "../../../../components/atoms/AppLink";
import { LoadingOverlay } from "../../../../components/molecules/LoadingOverlay";
import { FieldError } from "../../../publicar/FieldError";
import { PHOTO_COVER_EXPLANATION } from "../../../publicar/photo-action-copy";
import styles from "../../../publicar/publish-steps.module.css";
import {
  CHANGE_FIELD_LABEL,
  CONTACT_METHOD_LABEL,
  FEATURE_LABELS,
  PROPERTY_TYPE_LABEL,
  PUBLISHER_TYPE_LABEL,
} from "../../../publicar/step-copy";
import { FEATURES_DECLARED_FIELD } from "../../../publicar/step-values";
import {
  listingEditViolationMessage,
  PUBLISHER_TYPE_ONE_WAY_NOTICE,
} from "../../../publicar/violation-copy";
import { guardarEdicion } from "../../actions";
import type { EstadoDeEdicion } from "../../editar-estado";
import fotoStyles from "./editar.module.css";

/** Una foto del aviso como la dibuja el renglón: datos planos del servidor. */
export interface FotoDelAviso {
  readonly photoId: string;
  /** `null` cuando falta la miniatura: el renglón se queda, sin `<img>`. */
  readonly thumbUrl: string | null;
  readonly alt: string;
}

/**
 * El formulario de «Guardar cambios», sacado de `page.tsx` en la fase 44 (G2)
 * para que `useActionState` devuelva lo escrito (44.2, S4).
 *
 * **Una sola fuente**: el estado. La página lo siembra desde la dirección
 * —así los enlaces viejos con `?motivos=` siguen valiendo— y cada negativa
 * del dominio lo reemplaza con los códigos, las medidas y los valores que se
 * enviaron. React lo dibuja antes de hidratar y Next lo vuelve a servir ante
 * un POST sin JavaScript. Las props cruzan la frontera del servidor, así que
 * son datos planos: los códigos crudos y no el reparto (un `Map` no cruza).
 */
export function EditarForm({
  aviso,
  estadoInicial,
  fotos,
  subirFoto,
}: {
  readonly aviso: EditableListing;
  readonly estadoInicial: EstadoDeEdicion;
  /** En el orden del aviso: la primera es la portada. */
  readonly fotos: readonly FotoDelAviso[];
  /** `SubirFoto`, que sube al instante y no anida ningún `<form>`. */
  readonly subirFoto?: ReactNode;
}) {
  const [estado, accion, guardando] = useActionState(guardarEdicion, estadoInicial);
  const { medidas, valores } = estado;
  // Las marcas sobreviven a una negativa (44.4b, G3).
  const marcadas = new Set(estado.fotosAQuitar ?? []);
  // **Dónde va cada negativa lo decide el dominio** (tasks.md 18.22): acá sólo
  // se dibuja lo que ya viene repartido.
  const negativas = placeListingEditViolations(estado.motivos);

  const mensaje = (field: ListingField): string | undefined => {
    const codigo = negativas.byField.get(field);
    return codigo === undefined ? undefined : listingEditViolationMessage(codigo, medidas);
  };
  const invalido = (field: ListingField) =>
    negativas.byField.has(field)
      ? { "aria-invalid": "true" as const, "aria-describedby": `${field}-error` }
      : {};
  const claseControl = (field: ListingField) =>
    negativas.byField.has(field) ? ` ${styles.controlInvalid}` : "";

  // Vacía para una inmobiliaria, que no tiene a dónde ir (18.38).
  const publisherTypes = editablePublisherTypes(aviso.publisherType);

  return (
    <form action={accion} method="post" className={`${styles.form} ${fotoStyles.conFotos}`}>
      {/* L12: el indicador global (F36.3) mientras guarda, el mismo de
          importar. Sin JavaScript queda el del navegador. La salida es un
          enlace real a esta pantalla. */}
      {guardando ? (
        <LoadingOverlay
          label="Guardando los cambios…"
          href={`/mis-avisos/${aviso.id}/editar`}
          exitLabel="Dejar de esperar"
        />
      ) : null}
      {/* La acción vuelve a acotarlo a la sesión: que este campo diga
          un id no es una afirmación sobre de quién es. */}
      <input type="hidden" name="listingId" value={aviso.id} />

      {/*
        **Sólo las que no tienen campo en esta pantalla.** Las demás se leen
        al lado del control que las produjo, como hace publicar. Este bloque
        queda para lo que una edición no manda —fotos, zona, ciudad— y para un
        código inventado en la dirección: tragárselas dejaría un formulario que
        se niega a guardar sin decir por qué (AGENTS.md §7). Vive acá y no en
        la página porque depende del estado que devuelve la acción.
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
        **Las fotos, dentro del formulario desde la 44.4b** (S2): «al momento
        que se guarden los cambios es que se guarda ese quitar foto». Cada
        una lleva su casilla; marcarla no borra nada, destildarla es el
        «Deshacer», y el aspecto lo da `:has(:checked)`, sin JavaScript.
      */}
      <section className={styles.choices} aria-labelledby="fotos-titulo">
        <h2 className={styles.legend} id="fotos-titulo">
          Fotos
        </h2>
        <p className={styles.help}>
          {fotos.length} de {MAX_PHOTOS_PER_LISTING}. {PHOTO_COVER_EXPLANATION}. Las fotos nuevas se
          agregan al subirlas; las que marques se quitan al guardar.
        </p>
        <ul className={styles.results}>
          {fotos.map((foto, index) => (
            <li key={foto.photoId} className={`${styles.photoRow} ${fotoStyles.foto}`}>
              {foto.thumbUrl === null ? null : (
                /* Derivada ya generada al subir, con egreso cero desde R2:
                   el optimizador de la plataforma es un recurso medido. */
                // biome-ignore lint/performance/noImgElement: derivada ya generada, egreso cero desde R2
                <img
                  className={styles.photoThumb}
                  src={foto.thumbUrl}
                  alt={foto.alt}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <span className={styles.photoName}>
                <span className={fotoStyles.nombre}>
                  {nombreDeFoto(index)}
                  {index === COVER_PHOTO_INDEX ? " (portada)" : ""}
                </span>
                <span className={fotoStyles.marcada}>Se quitará al guardar</span>
              </span>
              <label className={styles.choice}>
                <input
                  className={`${styles.choiceInput} ${fotoStyles.quitar}`}
                  type="checkbox"
                  name="quitarFoto"
                  value={foto.photoId}
                  defaultChecked={marcadas.has(foto.photoId)}
                  aria-label={`Quitar al guardar: ${nombreDeFoto(index)}`}
                  aria-describedby={
                    negativas.byField.has("photosToRemove") ? "photosToRemove-error" : undefined
                  }
                />
                <span>Quitar al guardar</span>
              </label>
            </li>
          ))}
        </ul>
        {/* Debajo de la lista, que es su control (L8). */}
        <FieldError id="photosToRemove-error" message={mensaje("photosToRemove")} />
        {subirFoto}
      </section>

      <div>
        <label className={styles.label} htmlFor="title">
          {etiqueta("title")}
        </label>
        <input
          id="title"
          name="title"
          type="text"
          className={`${styles.control}${claseControl("title")}`}
          defaultValue={valores?.title ?? aviso.title}
          maxLength={MAX_TITLE_CHARACTERS * 2}
          {...invalido("title")}
        />
        {/* `FieldError` es el MISMO de los nueve pasos, movido a su
            archivo en vez de copiado: dos maneras de anunciar un mismo
            tipo de error es como un producto se contradice. Va debajo del
            control y antes de la ayuda (L8). */}
        <FieldError id="title-error" message={mensaje("title")} />
      </div>

      <div>
        <label className={styles.label} htmlFor="description">
          {etiqueta("description")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={8}
          className={`${styles.control} ${styles.textarea}${claseControl("description")}`}
          defaultValue={valores?.description ?? aviso.description}
          {...invalido("description")}
        />
        <FieldError id="description-error" message={mensaje("description")} />
        <p className={styles.help}>Mínimo {MIN_DESCRIPTION_CHARACTERS} caracteres.</p>
      </div>

      <div>
        <label className={styles.label} htmlFor="priceUsd">
          {etiqueta("priceUsd")}
        </label>
        {/* `inputMode` y no `type="number"`, igual que el paso 3: un
            campo numérico esconde lo que no puede parsear. */}
        <input
          id="priceUsd"
          name="priceUsd"
          type="text"
          inputMode="numeric"
          className={`${styles.control}${claseControl("priceUsd")}`}
          defaultValue={valores?.priceUsd ?? aviso.priceUsd}
          {...invalido("priceUsd")}
        />
        <FieldError id="priceUsd-error" message={mensaje("priceUsd")} />
      </div>

      <div className={styles.numbers}>
        {(
          [
            ["rooms", aviso.rooms],
            ["bathrooms", aviso.bathrooms],
            // Cero es una respuesta y no un hueco, igual que en el paso
            // 4: se dibuja el cero en vez de dejar el campo vacío.
            ["parkingSpots", aviso.parkingSpots],
            ["areaM2", aviso.areaM2],
          ] as const
        ).map(([name, value]) => (
          // La fila no se rompe y su mensaje va debajo de ella (L8).
          <div key={name}>
            <div className={styles.numberRow}>
              <label className={styles.label} htmlFor={name}>
                {etiqueta(name)}
              </label>
              <input
                id={name}
                name={name}
                type="text"
                inputMode="numeric"
                className={`${styles.control} ${styles.numberControl}${claseControl(name)}`}
                defaultValue={valores?.[name] ?? value}
                {...invalido(name)}
              />
            </div>
            <FieldError id={`${name}-error`} message={mensaje(name)} />
          </div>
        ))}
      </div>

      {/*
        **El tipo de inmueble y la referencia, desde la 18.27.** «Se
        puede corregir cualquier dato menos el de la zona» (fundador,
        2026-09-01). Los dos estaban cerrados porque la tabla campo por
        campo del 2026-08-29 no los nombraba, no porque cambiarlos
        rompiera nada: ninguno de los dos está en la URL del aviso.
      */}
      <fieldset
        className={styles.choices}
        aria-describedby={negativas.byField.has("propertyType") ? "propertyType-error" : undefined}
      >
        <legend className={styles.legend}>{etiqueta("propertyType")}</legend>
        {Object.entries(PROPERTY_TYPE_LABEL).map(([value, label]) => (
          <label key={value} className={styles.choice}>
            <input
              className={styles.choiceInput}
              type="radio"
              name="propertyType"
              value={value}
              defaultChecked={(valores?.propertyType ?? aviso.propertyType) === value}
            />
            <span>{label}</span>
          </label>
        ))}
        <FieldError id="propertyType-error" message={mensaje("propertyType")} />
      </fieldset>

      <div>
        <label className={styles.label} htmlFor="reference">
          {etiqueta("reference")}
        </label>
        <input
          id="reference"
          name="reference"
          type="text"
          className={`${styles.control}${claseControl("reference")}`}
          defaultValue={valores?.reference ?? aviso.reference ?? ""}
          {...invalido("reference")}
        />
        <FieldError id="reference-error" message={mensaje("reference")} />
        {/* Y se dice que se puede vaciar: es el único campo del aviso
            donde borrar el contenido es una corrección válida, y sin la
            frase nadie sabría que dejarlo en blanco la saca. */}
        <p className={styles.help}>Opcional. Déjala en blanco para eliminarla.</p>
      </div>

      {/*
        **Los cinco atributos de la F6, desde la 18.37**: eran los
        únicos campos del aviso que se filtran y no se podían corregir.

        **El campo oculto es lo que hace que esto funcione sin
        JavaScript**, y su porqué vive en `FEATURES_DECLARED_FIELD`. Va
        DENTRO de este formulario, así que destildar las cinco y guardar
        ya es «no tiene ninguna» — el POST aparte del paso 5 no hace
        falta acá, donde los nueve pasos son uno solo.
      */}
      <fieldset className={styles.choices}>
        <legend className={styles.legend}>{etiqueta("hasPowerPlant")}</legend>
        <input type="hidden" name={FEATURES_DECLARED_FIELD} value="1" />
        {FEATURE_LABELS.map(([field, label]) => (
          <label key={field} className={styles.choice}>
            <input
              className={styles.choiceInput}
              type="checkbox"
              name={field}
              // Marcada viaja en el `FormData` y destildada no viaja, así
              // que después de un envío la presencia ES la respuesta.
              defaultChecked={valores ? field in valores : aviso[field]}
            />
            <span>{label}</span>
          </label>
        ))}
        {/* **Se dice lo que una casilla marcada afirma, y nada sobre la
            que no.** `false` es «no lo declaró» y jamás «no lo tiene»
            (`search-criteria.ts`): destildar saca el aviso de esa
            búsqueda, no lo mete en la contraria. */}
        <p className={styles.help}>Marca lo que tiene. Quien busca puede filtrar por cada uno.</p>
      </fieldset>

      {/* **El grupo, no un radio.** Tres opciones excluyentes no tienen
          un control único al que apuntar, así que se describe el
          conjunto y no se marca ninguno como el inválido — marcar el
          primero diría que ése es el problema. */}
      <fieldset
        className={styles.choices}
        aria-describedby={
          negativas.byField.has("contactMethod") ? "contactMethod-error" : undefined
        }
      >
        <legend className={styles.legend}>{etiqueta("contactMethod")}</legend>
        {(["whatsapp", "telefono", "email"] as const).map((value) => (
          <label key={value} className={styles.choice}>
            <input
              className={styles.choiceInput}
              type="radio"
              name="contactMethod"
              value={value}
              defaultChecked={(valores?.contactMethod ?? aviso.contactMethod) === value}
            />
            <span>{CONTACT_METHOD_LABEL[value]}</span>
          </label>
        ))}
        <FieldError id="contactMethod-error" message={mensaje("contactMethod")} />
      </fieldset>

      <div>
        <label className={styles.label} htmlFor="contactValue">
          {etiqueta("contactValue")}
        </label>
        <input
          id="contactValue"
          name="contactValue"
          type="text"
          className={`${styles.control}${claseControl("contactValue")}`}
          defaultValue={valores?.contactValue ?? aviso.contactValue}
          {...invalido("contactValue")}
        />
        <FieldError id="contactValue-error" message={mensaje("contactValue")} />
        {/* «El que reveló, reveló. Si entra de nuevo que vea el
            contacto nuevo» (fundador, 2026-08-29). La evidencia del
            revelado no guarda el valor, así que cambiarlo no reescribe
            una sola fila de lo que ya pasó. */}
        <p className={styles.help}>Se muestra solo a quien inicie sesión.</p>
      </div>

      {/*
        **Quién publica, en un solo sentido** (tasks.md 18.38): dueño →
        inmobiliaria sí, la vuelta no. **A quién se le ofrece el control
        lo contesta el dominio** con `editablePublisherTypes`, no un
        `if` de esta pantalla — para una inmobiliaria la lista viene
        vacía porque no hay a dónde ir, y ofrecerle un control
        prometería algo que la guarda va a negar.

        **Y no dibujar el control nunca fue la garantía.** Una acción de
        servidor es un endpoint HTTP público, así que la mitad que de
        verdad cierra la dirección es la del dominio; ésta sólo evita
        prometer lo imposible.
      */}
      <fieldset
        className={styles.choices}
        aria-describedby={
          negativas.byField.has("publisherType") ? "publisherType-error" : undefined
        }
      >
        <legend className={styles.legend}>{etiqueta("publisherType")}</legend>
        {publisherTypes.length === 0 ? (
          <p className={styles.help}>{PUBLISHER_TYPE_LABEL[aviso.publisherType]}</p>
        ) : (
          publisherTypes.map((value) => (
            <label key={value} className={styles.choice}>
              <input
                className={styles.choiceInput}
                type="radio"
                name="publisherType"
                value={value}
                defaultChecked={(valores?.publisherType ?? aviso.publisherType) === value}
              />
              <span>{PUBLISHER_TYPE_LABEL[value]}</span>
            </label>
          ))
        )}
        <FieldError id="publisherType-error" message={mensaje("publisherType")} />
        {/* **Antes de guardar, no después en una negativa.** Una vez
            guardado `broker` la guarda cierra la vuelta, así que decirlo
            recién en el rechazo llegaría cuando ya no evita nada. */}
        <p className={styles.warning}>{PUBLISHER_TYPE_ONE_WAY_NOTICE}</p>
      </fieldset>

      <div className={styles.actions}>
        {/* Junto a Guardar, y sólo con una marcada (CSS `:has`). */}
        <p className={fotoStyles.recuerda}>Recuerda: la foto marcada se eliminará al guardar.</p>
        <button type="submit" className={styles.primary}>
          Guardar cambios
        </button>
        <AppLink className={styles.secondary} href="/mis-avisos">
          Cancelar
        </AppLink>
      </div>
    </form>
  );
}

/**
 * Cómo se llama una foto de un aviso publicado: su posición, base uno.
 * `listing_photo` no guarda nombre ni `alt_text`, a propósito.
 */
function nombreDeFoto(index: number): string {
  return `Foto ${index + 1}`;
}

/**
 * La etiqueta de un campo, de la ÚNICA lista de nombres en castellano del
 * repositorio (`CHANGE_FIELD_LABEL`). Sólo se pone en mayúscula la primera
 * letra: eso es presentación, no un nombre nuevo. Una segunda lista al lado de
 * aquélla es la que después queda diciendo el nombre viejo de un campo.
 */
function etiqueta(field: ChangedField): string {
  const label = CHANGE_FIELD_LABEL[field];
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}
