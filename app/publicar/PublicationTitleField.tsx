"use client";

import { useState } from "react";
import {
  characterCount,
  type DraftListing,
  MAX_TITLE_CHARACTERS,
} from "@/modules/listing-publication/domain/publishable-listing";
import { FieldError } from "./FieldError";
import styles from "./publish-steps.module.css";

interface PublicationTitleFieldProps {
  readonly listing: DraftListing;
  readonly error: string | undefined;
  readonly zoneName: string | undefined;
}

export function PublicationTitleField({ listing, error, zoneName }: PublicationTitleFieldProps) {
  const [title, setTitle] = useState(listing.title);
  return (
    <div>
      <FieldError id="title-error" message={error} />
      <label className={styles.srOnly} htmlFor="title">
        Título
      </label>
      <input
        id="title"
        name="title"
        type="text"
        className={`${styles.control} ${error ? styles.controlInvalid : ""}`}
        value={title ?? ""}
        onChange={(event) => setTitle(event.currentTarget.value)}
        maxLength={MAX_TITLE_CHARACTERS * 2}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? "title-error" : undefined}
      />
      <p className={styles.counterLine}>
        <span>Sin mayúsculas sostenidas.</span>
        <span>
          {characterCount(title ?? "")} / {MAX_TITLE_CHARACTERS}
        </span>
      </p>
      <div className={styles.preview}>
        <p className={styles.previewLabel}>Así se va a ver</p>
        <p className={styles.previewPrice}>${listing.priceUsd ?? "—"}</p>
        <p className={styles.previewTitle}>{title ?? "Tu título"}</p>
        <p className={styles.previewMeta}>
          {zoneName ?? "Tu zona"} · {listing.rooms ?? "—"} hab · {listing.areaM2 ?? "—"} m²
        </p>
      </div>
    </div>
  );
}
