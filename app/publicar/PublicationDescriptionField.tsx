"use client";

import { useState } from "react";
import { descriptionGuidance } from "@/modules/listing-publication/domain/description-guidance";
import type { DraftListing } from "@/modules/listing-publication/domain/publishable-listing";
import { FieldError } from "./FieldError";
import styles from "./publish-steps.module.css";

interface PublicationDescriptionFieldProps {
  readonly listing: DraftListing;
  readonly error: string | undefined;
}

export function PublicationDescriptionField({ listing, error }: PublicationDescriptionFieldProps) {
  const [text, setText] = useState(listing.description);
  const guidance = descriptionGuidance(text);
  return (
    <div>
      <FieldError id="description-error" message={error} />
      <label className={styles.srOnly} htmlFor="description">
        Descripción
      </label>
      <textarea
        id="description"
        name="description"
        rows={8}
        className={`${styles.control} ${styles.textarea} ${error ? styles.controlInvalid : ""}`}
        value={text ?? ""}
        onChange={(event) => setText(event.currentTarget.value)}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? "description-error" : undefined}
      />
      {/* Un minimo se muestra como progreso, no como castigo. */}
      <div className={styles.meter}>
        <div className={styles.meterFill} style={{ inlineSize: `${guidance.progress}%` }} />
      </div>
      <p className={styles.counterLine}>
        <span className={guidance.sufficient ? undefined : styles.counterShort}>
          {guidance.sufficient ? "ya alcanza" : `te faltan ${guidance.remaining} caracteres`}
        </span>
        <span>
          {guidance.written} / {guidance.minimum}
        </span>
      </p>
    </div>
  );
}
