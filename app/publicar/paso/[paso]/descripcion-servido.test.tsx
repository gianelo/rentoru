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
      name: "$ACTION_ID_description-test",
      method: "post",
      action: "/publicar/paso/descripcion",
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
import StepPage, { metadata } from "./page";

let draft: StoredDraft;

// Real route/validation chooses props and errors; backend ports alone are doubled.
describe("la descripción guardada servida por StepPage", () => {
  it.each([
    ["guardada corta", "a".repeat(119), 119, "te faltan 1 caracteres", 99, null],
    ["último intento rechazado", "a".repeat(1201), 1201, "ya alcanza", 100, "description.tooLong"],
  ] as const)(
    "conserva %s sin JavaScript",
    async (_label, description, count, guide, progress, error) => {
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
          title: "Título guardado",
          description,
        },
        photos: [{ key: "publicador-1/sala.jpg", name: "sala.jpg", bytes: 120_000 }],
        featuresDeclared: true,
        violations: error ? [error] : [],
      };
      const html = renderToStaticMarkup(
        await StepPage({
          params: Promise.resolve({ paso: "descripcion" }),
          searchParams: Promise.resolve({}),
        }),
      );
      const control = html.match(/<textarea\b[^>]*\bid="description"[^>]*>/)?.[0];
      expect(control).toContain('name="description"');
      expect(control).not.toMatch(/maxlength=/i);
      expect(html).toMatch(new RegExp(`<textarea\\b[^>]*>${description}</textarea>`));
      expect(html).toMatch(/<label\b[^>]*\bfor="description"[^>]*>Descripción<\/label>/);
      expect(html).toContain(`${count} / 120`);
      expect(html).toContain(guide);
      expect(html).toContain(`class="${styles.meterFill}" style="inline-size:${progress}%"`);
      // Same server-reference protocol as title SSR: native markup, not an HTTP submission.
      const form = html.match(/<form\b[^>]*>/)?.[0];
      expect(form).toContain('action="/publicar/paso/descripcion"');
      expect(form).toContain('method="post"');
      expect(form).toContain('encType="multipart/form-data"');
      expect(html).toContain('type="hidden" name="$ACTION_ID_description-test"');
      expect(html).toContain('type="hidden" name="step" value="descripcion"');
      expect(html).toContain('type="submit"');
      expect(html).toMatch(/href="\/publicar\/paso\/titulo"[^>]*>Título<\/a>/);
      expect(html).toMatch(/href="\/publicar\/paso\/zona"[^>]*>Altamira<\/a>/);
      expect(metadata).toMatchObject({
        title: "Publicar — Rentoru",
        alternates: { canonical: "/publicar" },
      });
      if (error) {
        expect(html).toContain("Máximo 1200 caracteres. Vas 1201.");
        expect(html.indexOf('id="description-error"')).toBeGreaterThan(-1);
        expect(html.indexOf('id="description-error"')).toBeLessThan(
          html.indexOf('id="description"'),
        );
        expect(control).toContain('aria-invalid="true"');
        expect(control).toContain('aria-describedby="description-error"');
      } else {
        expect(html).not.toContain('id="description-error"');
        expect(control).not.toContain('aria-invalid="true"');
      }
    },
  );
});
