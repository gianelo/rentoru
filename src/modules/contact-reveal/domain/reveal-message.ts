/**
 * Task 6.12/6.13 — a reveal now costs the tenant a written message to the
 * publisher (design.md, Open Questions: "Contact-reveal rate limit
 * threshold", RESOLVED 2026-08-24). Blank or whitespace-only input is
 * refused with the same rule the `NOT VALID` CHECK constraint on
 * `contact_reveal_event.message` enforces at the database (drizzle migration
 * for tasks.md 6.11): `length(btrim(message)) > 0`. The domain and the
 * constraint agree on what "a message" means, so a bug here cannot silently
 * disagree with the backstop the database provides.
 *
 * **The stored value is the original submission, not the trimmed one.** The
 * spec requires the event to hold "the message exactly as submitted" — trim
 * decides whether it is blank, it never rewrites what the tenant actually
 * wrote.
 */
import { safeReturnPath } from "@/modules/identity/domain/safe-return-destination";
import { safePublicListingPath } from "@/modules/listing-discovery/domain/listing-url";

const MARKER = "mensaje-requerido";
export const REVEAL_FEEDBACK_PARAM = "revelar";

/** The hidden form field is untrusted. Never carry its query or message into feedback. */
export function missingRevealMessageDestination(doorHref: string): string {
  const safe = safeReturnPath(doorHref);
  if (!safe) return "/";
  const pathname = new URL(safe, "https://destino.invalid").pathname;
  const detail = safePublicListingPath(pathname);
  return detail ? `${detail}?${REVEAL_FEEDBACK_PARAM}=${MARKER}` : "/";
}

export function revealMessageFeedback(raw: string | string[] | undefined): string | null {
  return raw === MARKER ? "Escribí un mensaje para revelar el contacto." : null;
}

export class MissingRevealMessageError extends Error {
  constructor() {
    super("reveal-contact: a message to the publisher is required to reveal contact.");
    this.name = "MissingRevealMessageError";
  }
}

export function requireRevealMessage(raw: string | null | undefined): string {
  const value = raw ?? "";

  if (value.trim().length === 0) {
    throw new MissingRevealMessageError();
  }

  return value;
}
