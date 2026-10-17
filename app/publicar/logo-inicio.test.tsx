import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  currentStepId,
  draftListingOf,
} from "@/modules/listing-publication/domain/publication-steps";
import { validatePublishableListing } from "@/modules/listing-publication/domain/publishable-listing";
import type { StoredDraft } from "./draft";

// Sólo sesión y fronteras de I/O: rutas, dominio, AppLink y fotos son reales.
vi.mock("../_lib/require-session", () => ({
  requireSession: async () => ({ userId: "publicador-1", email: "dueno@ejemplo.com" }),
}));
vi.mock("@/shared/db/client", () => ({ db: {} }));
vi.mock("./actions", () => ({ submitStep: vi.fn(), publishFromReview: vi.fn() }));
vi.mock("./fotos/actions", () => ({ requestUploadTargets: vi.fn() }));
vi.mock("@/modules/listing-search/infrastructure/drizzle-zone-price-tally", () => ({
  DrizzleZonePriceTally: class {
    async tallyForZone() {
      return [];
    }
  },
}));
vi.mock("./publication-context", () => ({
  readPublicationContext: async () => {
    const violations = validatePublishableListing(draftListingOf(DRAFT), [
      { id: "altamira", cityId: "dc" },
    ]);
    return {
      draft: DRAFT,
      violations,
      currentStep: currentStepId(DRAFT, violations),
      zoneName: "Altamira",
    };
  },
}));

import StepPage from "./paso/[paso]/page";
import ReviewPage from "./revisar/page";

const DRAFT: StoredDraft = {
  listing: {
    propertyType: "apartamento",
    cityId: "dc",
    zoneId: "altamira",
    priceUsd: 450,
    rooms: 3,
    bathrooms: 2,
    parkingSpots: 1,
    areaM2: 90,
    title: "Apartamento en Altamira con vista abierta",
    description: "Piso alto, luminoso, con vista abierta al Ávila. ".repeat(4),
    publisherType: "owner",
    contactMethod: "whatsapp",
    contactValue: "04125550134",
  },
  photos: [{ key: "publicador-1/sala.webp", name: "Sala", bytes: 168_000 }],
  featuresDeclared: true,
  violations: [],
};

// Destinos explícitos: no calcular la expectativa con el código bajo prueba.
const STEPS = [
  ["tipo", null],
  ["zona", "tipo"],
  ["precio", "zona"],
  ["tamano", "precio"],
  ["atributos", "tamano"],
  ["titulo", "atributos"],
  ["descripcion", "titulo"],
  ["fotos", "descripcion"],
  ["quien", "fotos"],
] as const;

function headerOf(html: string): string {
  const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1];
  expect(header).toBeDefined();
  return header ?? "";
}

function expectHomeBrand(header: string) {
  // El contenido identifica la marca, no la × ni otro enlace a Inicio.
  const brand = header.match(/<a\b([^>]*)>Rentoru<\/a>/)?.[1];
  expect(brand, "marca textual enlazada dentro del header").toBeDefined();
  expect(brand).toMatch(/\bhref="\/"/);
  expect(brand).toMatch(/\baria-label="Rentoru, ir al inicio"/);
  expect(header).toContain("Guardado");
  expect(header).toMatch(
    /<a\b(?=[^>]*href="\/")(?=[^>]*aria-label="Salir de publicar")[^>]*>×<\/a>/,
  );
}

describe("logo Inicio de publicar (F36.2)", () => {
  for (const volver of [undefined, "revisar"] as const) {
    it.each(STEPS)(
      `paso %s conserva marca y Atrás (volver=${volver ?? "flujo"})`,
      async (paso, previous) => {
        const html = renderToStaticMarkup(
          await StepPage({
            params: Promise.resolve({ paso }),
            searchParams: Promise.resolve(volver ? { volver } : {}),
          }),
        );
        const header = headerOf(html);
        expectHomeBrand(header);
        if (previous) {
          const back = header.match(
            /<a\b([^>]*aria-label="Volver al paso anterior"[^>]*)>←<\/a>/,
          )?.[1];
          expect(back).toContain(
            `href="/publicar/paso/${previous}${volver ? "?volver=revisar" : ""}"`,
          );
        } else {
          expect(header).not.toContain('aria-label="Volver al paso anterior"');
        }
        expect(header).toContain(`${STEPS.findIndex(([id]) => id === paso) + 1} / 9`);
        expect(html).toContain("<form");
        if (paso === "fotos") {
          expect(html).toContain("Sala");
          expect(html).toContain('type="file"');
        }
      },
    );
  }

  it("revisar conserva marca Inicio y Cambiar al paso", async () => {
    const html = renderToStaticMarkup(await ReviewPage({ searchParams: Promise.resolve({}) }));
    expectHomeBrand(headerOf(html));
    for (const paso of ["tipo", "precio", "tamano", "atributos", "descripcion", "fotos", "quien"]) {
      expect(html).toMatch(
        new RegExp(`<a\\b[^>]*href="/publicar/paso/${paso}\\?volver=revisar"[^>]*>Cambiar</a>`),
      );
    }
    expect(html).toContain("1 foto");
    expect(html).toContain("Publicar aviso");
    expect(html).toContain("<form");
  });
});
