import type { PublicationZoneOption } from "./zone-search";

export interface PublicationZoneSelection {
  readonly zoneId: string;
  readonly label: string;
  readonly scope?: string;
}

/** La elección sigue disponible aunque otra búsqueda no la encuentre. */
export function publicationZoneSelection(
  results: readonly PublicationZoneOption[],
  selected: PublicationZoneSelection | null,
): {
  readonly results: readonly PublicationZoneOption[];
  readonly retained: PublicationZoneSelection | null;
} {
  const seen = new Set<string>();
  const unique = results.filter((option) => {
    if (seen.has(option.zoneId)) return false;
    seen.add(option.zoneId);
    return true;
  });
  return {
    results: unique,
    retained: selected && !seen.has(selected.zoneId) ? selected : null,
  };
}
