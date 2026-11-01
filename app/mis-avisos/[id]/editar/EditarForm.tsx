"use client";

import type { EditableListing } from "@/modules/listing-publication/application/ports/listing-edit.port";
import { editablePublisherTypes } from "@/modules/listing-publication/domain/listing-edit";
import type { ChangedField } from "@/modules/listing-publication/domain/publication-steps";
import {
  MAX_TITLE_CHARACTERS,
  MIN_DESCRIPTION_CHARACTERS,
} from "@/modules/listing-publication/domain/publishable-listing";
import {
  type ListingField,
  placeListingEditViolations,
} from "@/modules/listing-publication/domain/violation-field";
import { AppLink } from "../../../../components/atoms/AppLink";
import { FieldError } from "../../../publicar/FieldError";
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
  type PublishCopyContext,
} from "../../../publicar/violation-copy";
import { guardarEdicion } from "../../actions";

/**
 * El formulario de «Guardar cambios», sacado tal cual de `page.tsx` en la
 * fase 44 (G2): `useActionState` sólo vive en un componente de cliente, y la
 * 44.2 lo necesita para devolver lo escrito. Este movimiento no cambia un byte
 * del HTML servido.
 *
 * Las props cruzan la frontera del servidor, así que son datos planos: los
 * códigos crudos de la dirección y no el reparto ya hecho (un `Map` no cruza).
 * El reparto lo vuelve a contestar el MISMO dominio que usa la página.
 */
export function EditarForm({
  aviso,
  motivos,
  medidas,
}: {
  readonly aviso: EditableListing;
  readonly motivos: readonly string[];
  readonly medidas: PublishCopyContext;
}) {
  const negativas = placeListingEditViolations(motivos);

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
    <form action={guardarEdicion} method="post" className={styles.form}>
      {/* La acción vuelve a acotarlo a la sesión: que este campo diga
          un id no es una afirmación sobre de quién es. */}
      <input type="hidden" name="listingId" value={aviso.id} />

      <div>
        {/* `FieldError` es el MISMO de los nueve pasos, movido a su
            archivo en vez de copiado: dos maneras de anunciar un mismo
            tipo de error es como un producto se contradice. */}
        <FieldError id="title-error" message={mensaje("title")} />
        <label className={styles.label} htmlFor="title">
          {etiqueta("title")}
        </label>
        <input
          id="title"
          name="title"
          type="text"
          className={`${styles.control}${claseControl("title")}`}
          defaultValue={aviso.title}
          maxLength={MAX_TITLE_CHARACTERS * 2}
          {...invalido("title")}
        />
      </div>

      <div>
        <FieldError id="description-error" message={mensaje("description")} />
        <label className={styles.label} htmlFor="description">
          {etiqueta("description")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={8}
          className={`${styles.control} ${styles.textarea}${claseControl("description")}`}
          defaultValue={aviso.description}
          {...invalido("description")}
        />
        <p className={styles.help}>Mínimo {MIN_DESCRIPTION_CHARACTERS} caracteres.</p>
      </div>

      <div>
        <FieldError id="priceUsd-error" message={mensaje("priceUsd")} />
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
          defaultValue={aviso.priceUsd}
          {...invalido("priceUsd")}
        />
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
          <div key={name} className={styles.numberRow}>
            <FieldError id={`${name}-error`} message={mensaje(name)} />
            <label className={styles.label} htmlFor={name}>
              {etiqueta(name)}
            </label>
            <input
              id={name}
              name={name}
              type="text"
              inputMode="numeric"
              className={`${styles.control} ${styles.numberControl}${claseControl(name)}`}
              defaultValue={value}
              {...invalido(name)}
            />
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
        <FieldError id="propertyType-error" message={mensaje("propertyType")} />
        <legend className={styles.legend}>{etiqueta("propertyType")}</legend>
        {Object.entries(PROPERTY_TYPE_LABEL).map(([value, label]) => (
          <label key={value} className={styles.choice}>
            <input
              className={styles.choiceInput}
              type="radio"
              name="propertyType"
              value={value}
              defaultChecked={aviso.propertyType === value}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <div>
        <FieldError id="reference-error" message={mensaje("reference")} />
        <label className={styles.label} htmlFor="reference">
          {etiqueta("reference")}
        </label>
        <input
          id="reference"
          name="reference"
          type="text"
          className={`${styles.control}${claseControl("reference")}`}
          defaultValue={aviso.reference ?? ""}
          {...invalido("reference")}
        />
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
              defaultChecked={aviso[field]}
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
        <FieldError id="contactMethod-error" message={mensaje("contactMethod")} />
        <legend className={styles.legend}>{etiqueta("contactMethod")}</legend>
        {(["whatsapp", "telefono", "email"] as const).map((value) => (
          <label key={value} className={styles.choice}>
            <input
              className={styles.choiceInput}
              type="radio"
              name="contactMethod"
              value={value}
              defaultChecked={aviso.contactMethod === value}
            />
            <span>{CONTACT_METHOD_LABEL[value]}</span>
          </label>
        ))}
      </fieldset>

      <div>
        <FieldError id="contactValue-error" message={mensaje("contactValue")} />
        <label className={styles.label} htmlFor="contactValue">
          {etiqueta("contactValue")}
        </label>
        <input
          id="contactValue"
          name="contactValue"
          type="text"
          className={`${styles.control}${claseControl("contactValue")}`}
          defaultValue={aviso.contactValue}
          {...invalido("contactValue")}
        />
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
        <FieldError id="publisherType-error" message={mensaje("publisherType")} />
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
                defaultChecked={aviso.publisherType === value}
              />
              <span>{PUBLISHER_TYPE_LABEL[value]}</span>
            </label>
          ))
        )}
        {/* **Antes de guardar, no después en una negativa.** Una vez
            guardado `broker` la guarda cierra la vuelta, así que decirlo
            recién en el rechazo llegaría cuando ya no evita nada. */}
        <p className={styles.warning}>{PUBLISHER_TYPE_ONE_WAY_NOTICE}</p>
      </fieldset>

      <div className={styles.actions}>
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
 * La etiqueta de un campo, de la ÚNICA lista de nombres en castellano del
 * repositorio (`CHANGE_FIELD_LABEL`). Sólo se pone en mayúscula la primera
 * letra: eso es presentación, no un nombre nuevo. Una segunda lista al lado de
 * aquélla es la que después queda diciendo el nombre viejo de un campo.
 */
function etiqueta(field: ChangedField): string {
  const label = CHANGE_FIELD_LABEL[field];
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}
