const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 37.3 — the Listo screen reads `?id=` from its URL, and anyone can type
 * another value there. Only a UUID reaches the database: anything else would
 * make Postgres reject the cast, and a rejected query is a 500, not a refusal.
 */
export function isListingId(value: unknown): value is string {
  return typeof value === "string" && LISTING_ID.test(value);
}
