import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  currentStepId,
  draftListingOf,
} from "@/modules/listing-publication/domain/publication-steps";
import { validatePublishableListing } from "@/modules/listing-publication/domain/publishable-listing";
import type { StoredDraft } from "./draft";

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
  DrizzleZoneVocabulary: class {
    lookup = async () => ({ cities: [], zones: [], aliases: [] });
  },
}));
vi.mock("@/modules/listing-search/infrastructure/drizzle-zone-price-tally", () => ({
  DrizzleZonePriceTally: class {},
}));
vi.mock("../_lib/require-session", () => ({
  requireSession: async () => ({ userId: "publisher-test" }),
}));
vi.mock("./actions", () => ({ submitStep: vi.fn() }));
vi.mock("./fotos/PhotoUploader", () => ({ PhotoUploader: () => null }));
vi.mock("./publication-context", () => ({
  readPublicationContext: async () => {
    const draft: StoredDraft = {
      listing: { propertyType: "apartamento", reference: "Referencia guardada" },
      photos: [],
      violations: [],
    };
    const violations = validatePublishableListing(draftListingOf(draft), []);
    return {
      draft,
      violations,
      currentStep: currentStepId(draft, violations),
      draftExpired: false,
    };
  },
}));

import StepPage from "./paso/[paso]/page";

async function served(volver?: string) {
  return renderToStaticMarkup(
    await StepPage({
      params: Promise.resolve({ paso: "zona" }),
      searchParams: Promise.resolve({ q: "No inferir ciudad", volver }),
    }),
  );
}

function reportHref(html: string) {
  const match = html.match(/<a[^>]*href="([^"]+)"[^>]*>Avisanos<\/a>/);
  expect(match, "native Avisanos anchor").not.toBeNull();
  return match?.[1]?.replaceAll("&amp;", "&");
}

describe("missing zone entry served by the real publication route", () => {
  it("opens internal contextual Escribinos without copying the zone query", async () => {
    const html = await served();
    expect(reportHref(html)).toBe("/ayuda/escribinos?motivo=zona-faltante");
    expect(html).not.toContain("mailto:");
    expect(html).toContain('value="Referencia guardada"');
  });

  it("carries review return mode through the real caller", async () => {
    expect(reportHref(await served("revisar"))).toBe(
      "/ayuda/escribinos?motivo=zona-faltante&volver=revisar",
    );
  });

  it("does not forward an arbitrary return mode", async () => {
    expect(reportHref(await served("https://outside.invalid"))).toBe(
      "/ayuda/escribinos?motivo=zona-faltante",
    );
  });
});
