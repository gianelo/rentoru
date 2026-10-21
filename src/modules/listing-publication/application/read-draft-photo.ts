import { detectContentType, inspectUploadedPhoto } from "../domain/uploaded-photo";
import type { PhotoStoragePort } from "./ports/photo-storage.port";
import { tokenFromOwnedKey } from "./process-uploaded-photo";
import {
  type PublicationDraftDependencies,
  readPublicationDraft,
} from "./publication-draft-session";

export type DraftPhotoReading =
  | { readonly ok: true; readonly bytes: Uint8Array; readonly contentType: string }
  | { readonly ok: false; readonly reason: "notFound" | "unavailable" };

export interface ReadDraftPhotoDependencies extends PublicationDraftDependencies {
  readonly storage: Pick<PhotoStoragePort, "read">;
}

/**
 * Identidad del adaptador de sesión, nunca un propietario o clave del formulario.
 * `load` excluye vencidos; esta lectura no renueva ni barre el borrador.
 * Sólo entrega bytes admitidos y su MIME: ninguna clave o URL de incoming.
 */
export async function readDraftPhoto(
  publisherId: string | null | undefined,
  index: unknown,
  now: Date,
  { store, storage }: ReadDraftPhotoDependencies,
): Promise<DraftPhotoReading> {
  if (
    !publisherId?.trim() ||
    typeof index !== "number" ||
    !Number.isSafeInteger(index) ||
    index < 0
  ) {
    return { ok: false, reason: "notFound" };
  }

  try {
    const draft = await readPublicationDraft(publisherId, now, { store });
    const photo = draft?.photos[index];
    if (!photo || tokenFromOwnedKey(photo.key, publisherId) === null) {
      return { ok: false, reason: "notFound" };
    }

    const bytes = await storage.read(photo.key);
    const contentType = detectContentType(bytes);
    if (contentType === null || inspectUploadedPhoto(bytes, contentType).length > 0) {
      return { ok: false, reason: "notFound" };
    }
    return { ok: true, bytes, contentType };
  } catch {
    // El puerto no distingue objeto ausente de storage inaccesible. No inventar
    // un 404: el futuro borde HTTP puede responder 503 sin filtrar el error.
    return { ok: false, reason: "unavailable" };
  }
}
