import type { ChangeEventHandler } from "react";
import type { PublicationZoneSelection } from "../../src/modules/listing-publication/domain/publication-zone-selection";
import { MAX_REFERENCE_CHARACTERS } from "../../src/modules/listing-publication/domain/publishable-listing";
import type { PublicationZoneOption } from "../../src/modules/listing-publication/domain/zone-search";
import { FieldError } from "./FieldError";
import styles from "./publish-steps.module.css";

/** Mismo GET, también cuando el script no llega. */
export function PublicationZoneSearchControl({
  query,
  onChange,
  action,
  loading = false,
}: {
  readonly query?: string;
  readonly onChange?: ChangeEventHandler<HTMLInputElement>;
  readonly loading?: boolean;
  readonly action?: string;
}) {
  return (
    <form method="get" className={styles.search} action={action}>
      <label className={styles.srOnly} htmlFor="q">
        Buscá tu zona
      </label>
      <div className={styles.searchField}>
        <input
          id="q"
          name="q"
          type="search"
          className={`${styles.control} ${loading ? styles.searchBusy : ""}`}
          defaultValue={query ?? ""}
          placeholder="Buscá tu zona"
          onChange={onChange}
          aria-busy={loading || undefined}
        />
        {loading ? <span className={styles.searchSpinner} aria-hidden="true" /> : null}
        <span className={styles.srOnly} role="status" aria-live="polite">
          {loading ? "Buscando zonas…" : ""}
        </span>
      </div>
      <button type="submit" className={styles.searchButton}>
        Buscar
      </button>
    </form>
  );
}

export function PublicationZoneResultControls({
  results,
  retained,
  selectedId,
  onSelect,
}: {
  readonly results: readonly PublicationZoneOption[];
  readonly retained: PublicationZoneSelection | null;
  readonly selectedId?: string;
  readonly onSelect?: (option: PublicationZoneSelection) => void;
}) {
  function selectionProps(option: PublicationZoneSelection) {
    return onSelect
      ? { checked: selectedId === option.zoneId, onChange: () => onSelect(option) }
      : { defaultChecked: selectedId === option.zoneId };
  }
  return (
    <>
      {results.length > 0 ? (
        <ul className={styles.results}>
          {results.map((option) => (
            <li key={option.zoneId}>
              <label className={styles.choice}>
                <input
                  className={styles.choiceInput}
                  type="radio"
                  name="zoneId"
                  value={option.zoneId}
                  {...selectionProps(option)}
                />
                <span>
                  {option.label}
                  <span className={styles.resultScope}>{option.scope}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
      {retained ? (
        <label className={styles.choice}>
          <input
            className={styles.choiceInput}
            type="radio"
            name="zoneId"
            value={retained.zoneId}
            {...selectionProps(retained)}
          />
          <span>
            {retained.label}
            {retained.scope ? <span className={styles.resultScope}>{retained.scope}</span> : null}
          </span>
        </label>
      ) : null}
    </>
  );
}

/** Independiente de la lista: una respuesta no remonta este campo. */
export function PublicationZoneReference({
  reference,
  error,
}: {
  readonly reference?: string;
  readonly error?: string;
}) {
  return (
    <div>
      <FieldError id="reference-error" message={error} />
      <label className={styles.label} htmlFor="reference">
        Referencia
      </label>
      <input
        id="reference"
        name="reference"
        type="text"
        className={`${styles.control} ${error ? styles.controlInvalid : ""}`}
        defaultValue={reference ?? ""}
        placeholder="Frente a la plaza"
        maxLength={MAX_REFERENCE_CHARACTERS * 2}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? "reference-error" : undefined}
      />
      <p className={styles.help}>Opcional. No se publica la dirección.</p>
    </div>
  );
}
