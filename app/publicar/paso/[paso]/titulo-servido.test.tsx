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
  requireSession: async () => ({ userId: "publicador-1", email: "dueno@ejemplo.com" }),
}));
vi.mock("../../actions", () => ({
  submitStep: Object.assign(vi.fn(), {
    $$FORM_ACTION: () => ({
      name: "$ACTION_ID_title-test",
      method: "post",
      action: "/publicar/paso/titulo",
      encType: "multipart/form-data",
      data: null,
    }),
  }),
}));
vi.mock("../../fotos/PhotoUploader", () => ({ PhotoUploader: () => null }));
vi.mock("../../publication-context", () => ({
  readPublicationContext: async () => {
    const violations = validatePublishableListing(draftListingOf(draft), [
      { id: "altamira", cityId: "dc" },
    ]);
    return {
      draft,
      violations,
      currentStep: currentStepId(draft, violations),
      zoneName: "Altamira",
    };
  },
}));

import styles from "../../publish-steps.module.css";
import StepPage from "./page";

let draft: StoredDraft;

// The real page chooses step errors and props; only backend ports are doubled.
describe("el título guardado servido por la ruta real", () => {
  it.each([
    ["guardado con Unicode", "🏠".repeat(90), 90, false],
    ["último intento rechazado", "a".repeat(91), 91, true],
  ] as const)("conserva %s sin ejecutar JavaScript", async (_label, title, count, error) => {
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
        title,
      },
      photos: [{ key: "publicador-1/sala.jpg", name: "sala.jpg", bytes: 120_000 }],
      featuresDeclared: true,
      violations: error ? ["title.tooLong"] : [],
    };
    const html = renderToStaticMarkup(
      await StepPage({
        params: Promise.resolve({ paso: "titulo" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const control = html.match(/<input\b[^>]*\bid="title"[^>]*>/)?.[0];
    expect(control).toContain(`value="${title}"`);
    expect(control).toContain('name="title"');
    expect(control).toContain('maxLength="180"');
    expect(html).toMatch(/<label\b[^>]*\bfor="title"[^>]*>Título<\/label>/);
    // Server-reference metadata preserves POST markup, not proof of an HTTP submission.
    const form = html.match(/<form\b[^>]*>/)?.[0];
    expect(form).toMatch(/\baction="[^"]+"/);
    expect(form).toContain('method="post"');
    expect(html).toContain('type="hidden" name="step" value="titulo"');
    expect(html).toContain('type="submit"');
    expect(html).toContain(`${count} / 90`);
    expect(html).toContain(`class="${styles.previewTitle}">${title}</p>`);
    expect(html).toContain(`class="${styles.previewPrice}">$450</p>`);
    expect(html).toContain(`class="${styles.previewMeta}">Altamira · 3 hab · 90 m²</p>`);
    if (error) {
      expect(html).toContain("Máximo 90 caracteres. Vas 91.");
      expect(html.indexOf('id="title-error"')).toBeGreaterThan(-1);
      expect(html.indexOf('id="title-error"')).toBeLessThan(html.indexOf('id="title"'));
      expect(control).toContain('aria-invalid="true"');
      expect(control).toContain('aria-describedby="title-error"');
    } else {
      expect(html).not.toContain('id="title-error"');
      expect(control).not.toContain('aria-invalid="true"');
    }
  });
});
