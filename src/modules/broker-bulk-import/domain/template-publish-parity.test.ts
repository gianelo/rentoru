import { describe, expect, it } from "vitest";
import type { DraftListing } from "../../listing-publication/domain/publishable-listing";
import { IMPORT_TEMPLATE_HEADER } from "./build-import-template-rows";
import { IMPORT_COLUMN_ALLOWLIST } from "./csv-import-columns";

/**
 * tasks.md 45.3 (#290, S2): «validar que la plantilla de CSV sea la correcta
 * con los campos específicos de publicación». Every field publish knows is
 * either a template column or an exclusion with its reason written here.
 * `satisfies Record<keyof DraftListing, …>` turns a new publish field into a
 * typecheck failure until someone decides what import does with it.
 */
const PUBLISH_FIELD_IN_IMPORT = {
  title: "titulo",
  description: "descripcion",
  priceUsd: "precio_usd",
  cityId: "ciudad",
  zoneId: "zona",
  propertyType: "tipo_inmueble",
  rooms: "habitaciones",
  bathrooms: "banos",
  areaM2: "metros2",
  parkingSpots: "estacionamientos",
  hasPowerPlant: "planta_electrica",
  hasRegularWater: "agua_regular",
  isFurnished: "amoblado",
  hasSecurity: "vigilancia",
  hasAppliances: "linea_blanca",
  reference: "punto_referencia",
  contactMethod: { excluded: "se pide una vez en la pantalla de importar (45.2, G1)" },
  contactValue: { excluded: "se pide una vez en la pantalla de importar (45.2, G1)" },
  publisherType: { excluded: "quien importa es siempre una inmobiliaria («broker»)" },
  photoCount: { excluded: "las fotos se agregan después, aviso por aviso, en Mis avisos" },
} as const satisfies Record<keyof DraftListing, string | { readonly excluded: string }>;

const mapped = Object.values(PUBLISH_FIELD_IN_IMPORT).filter(
  (value): value is Extract<typeof value, string> => typeof value === "string",
);

describe("plantilla = campos de publicar (45.3)", () => {
  it("every publish field mapped to a column is in the template header", () => {
    for (const header of mapped) expect(IMPORT_TEMPLATE_HEADER).toContain(header);
  });

  it("the template has no column publish does not know, besides the idempotency key", () => {
    const headers = IMPORT_COLUMN_ALLOWLIST.map((column) => column.header);
    expect(headers.filter((header) => !(mapped as readonly string[]).includes(header))).toEqual([
      "referencia_externa",
    ]);
  });
});
