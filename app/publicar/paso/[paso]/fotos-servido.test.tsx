import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  currentStepId,
  draftListingOf,
} from "@/modules/listing-publication/domain/publication-steps";
import { validatePublishableListing } from "@/modules/listing-publication/domain/publishable-listing";
import type { StoredDraft } from "../../draft";

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/shared/db/client", () => ({ db: {} }));
vi.mock("@/modules/listing-publication/infrastructure/drizzle-zone-vocabulary", () => ({
  DrizzleZoneVocabulary: class {},
}));
vi.mock("@/modules/listing-search/infrastructure/drizzle-zone-price-tally", () => ({
  DrizzleZonePriceTally: class {},
}));
vi.mock("../../../_lib/require-session", () => ({
  requireSession: async () => ({ userId: "publisher-1" }),
}));
vi.mock("../../actions", () => ({
  submitStep: Object.assign(vi.fn(), {
    $$FORM_ACTION: () => ({
      name: "$ACTION_ID_photos-test",
      method: "post",
      action: "/publicar/paso/fotos",
      encType: "multipart/form-data",
      data: null,
    }),
  }),
}));
vi.mock("../../fotos/actions", () => ({ requestUploadTargets: vi.fn() }));
vi.mock("../../publication-context", () => ({
  readPublicationContext: async () => {
    const violations = validatePublishableListing(draftListingOf(draft), [
      { id: "altamira", cityId: "dc" },
    ]);
    return { draft, violations, currentStep: currentStepId(draft, violations) };
  },
}));

import StepPage from "./page";

let draft: StoredDraft;
const photos = [
  { key: "publisher-1/sala.webp", name: "Sala", bytes: 40_000 },
  { key: "publisher-1/cocina.webp", name: "Cocina", bytes: 41_000 },
  { key: "publisher-1/balcon.webp", name: "Balcón", bytes: 42_000 },
];

// Render the real uploader through the route; double only backend boundaries.
describe("fotos servidas por la ruta real", () => {
  it.each([
    ["vacío", false, false, false],
    ["guardado", true, false, false],
    ["desde revisar", true, true, false],
    ["rechazo del servidor", true, false, true],
  ] as const)("conserva copia y formulario: %s", async (_name, saved, review, error) => {
    draft = {
      listing: {
        propertyType: "apartamento",
        cityId: "dc",
        zoneId: "altamira",
        priceUsd: 450,
        rooms: 3,
        bathrooms: 2,
        parkingSpots: 1,
        areaM2: 90,
        title: "Apartamento en Altamira",
        description: "Una propiedad con cocina y habitaciones amplias. ".repeat(4),
        publisherType: "owner",
      },
      featuresDeclared: true,
      photos: saved ? photos : [],
      violations: error ? ["photos.tooMany"] : [],
    };
    const html = renderToStaticMarkup(
      await StepPage({
        params: Promise.resolve({ paso: "fotos" }),
        searchParams: Promise.resolve(review ? { volver: "revisar" } : {}),
      }),
    );
    const input = html.match(/<input\b[^>]*\btype="file"[^>]*>/)?.[0];
    const inputId = input?.match(/\bid="([^"]+)"/)?.[1];
    expect(input).toContain('multiple=""');
    expect(input).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(html).toContain(`for="${inputId}"`);
    expect(html).toContain(saved ? ">+ Agregar más<" : ">Elegir fotos<");
    expect(html).not.toContain("Elegir del teléfono");
    expect(html).not.toMatch(/no borra la foto de tu teléfono/i);
    expect(html.split("Es la foto principal de tu aviso")).toHaveLength(2);
    expect(html).not.toContain("se ve en la lista y arriba del aviso");
    expect(html).toMatch(/<form\b[^>]*\baction="[^"]+"[^>]*\bmethod="post"/);
    expect(html).toContain('name="step" value="fotos"');
    expect(html).toContain(review ? "Guardar y volver a revisar" : "Seguir");
    expect(html.includes('id="photos-error"')).toBe(error);
    const fields = [
      ...html.matchAll(/name="(photoKey|photoName|photoBytes)" value="([^"]*)"/g),
    ].map((match) => [match[1], match[2]]);
    expect(fields).toEqual(
      saved
        ? photos.flatMap((photo) => [
            ["photoKey", photo.key],
            ["photoName", photo.name],
            ["photoBytes", String(photo.bytes)],
          ])
        : [],
    );
    if (saved) {
      expect(html).toContain(">Portada<");
      expect(html).toContain('aria-label="Quitar del aviso: Cocina"');
      expect(html).toContain('aria-label="Hacer portada: Cocina"');
      const menus = [...html.matchAll(/<details\b[^>]*>[\s\S]*?<\/details>/g)]
        .map(([menu]) => menu)
        .filter((menu) => menu.includes('aria-label="Acciones de '));
      expect(menus).toHaveLength(3);
      for (const [index, photo] of photos.entries()) {
        const menu = menus[index];
        expect(menu).not.toMatch(/^<details\b[^>]*\bopen(?:\s|=|>)/);
        expect(menu).toContain(`aria-label="Acciones de ${photo.name}"`);
        expect(menu).toContain(`aria-label="Quitar del aviso: ${photo.name}"`);
        expect(menu).toMatch(/>Quitar del aviso<\/span>/);
      }
      expect(menus[1]).toContain('aria-label="Mover arriba: Cocina"');
      expect(menus[1]).toContain('aria-label="Mover abajo: Cocina"');
      expect(menus[1]).toContain('aria-label="Hacer portada: Cocina"');
    }
  });
});
