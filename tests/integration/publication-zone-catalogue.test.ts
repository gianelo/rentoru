import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { StoredDraft } from "../../app/publicar/draft";
import {
  currentStepId,
  draftListingOf,
} from "../../src/modules/listing-publication/domain/publication-steps";
import { validatePublishableListing } from "../../src/modules/listing-publication/domain/publishable-listing";
import { type SeedDatabase, seedTaxonomy } from "../../src/shared/db/seed";

// Un solo handle para ambos callers; no se importan los specs unitarios ni
// sus mocks incompatibles. Sin DSN la suite falla, nunca salta los casos PG.
const { connection, handle } = await vi.hoisted(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is required for publication-zone-catalogue");
  const { Client } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const connection = new Client({ connectionString: url });
  return { connection, handle: drizzle(connection) };
});
vi.mock("@/shared/db/client", () => ({ db: handle }));
vi.mock("@/modules/identity/infrastructure/session-port", () => ({
  nextAuthSessionPort: { getSession: async () => ({ userId: "publicador-36.6" }) },
}));
vi.mock("../../app/_lib/require-session", () => ({
  requireSession: async () => ({ userId: "publicador-36.6", email: "36.6@rentas.invalid" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("../../app/publicar/actions", () => ({ submitStep: vi.fn() }));
vi.mock("../../app/publicar/fotos/PhotoUploader", () => ({ PhotoUploader: () => null }));
vi.mock("../../app/publicar/publication-context", () => ({
  readPublicationContext: async () => publicationContext(),
}));

import StepPage from "../../app/publicar/paso/[paso]/page";
import { GET } from "../../app/publicar/zonas/route";

function publicationContext() {
  const draft: StoredDraft = {
    listing: { propertyType: "apartamento" },
    photos: [],
    violations: [],
  };
  const violations = validatePublishableListing(draftListingOf(draft), []);
  return { draft, violations, currentStep: currentStepId(draft, violations), zoneName: null };
}

const CASES = [
  ["San Miguel", "dbcbaa62-9b6b-54ad-4fd8-8c13d27811f1"],
  ["San Rafael", "39a50c8d-c245-90e9-7f6e-cbda846ee04e"],
] as const;

describe("36.6 callers reales con catálogo PostgreSQL (entrada CI)", () => {
  beforeAll(async () => {
    await connection.connect();
    await seedTaxonomy(handle as unknown as SeedDatabase);
  }, 120_000);
  afterAll(async () => {
    await connection.end();
  });

  it.each(CASES)("sirve el radio de Urbanización %s", async (name, id) => {
    const query = `Urbanización ${name}`;
    const html = renderToStaticMarkup(
      await StepPage({
        params: Promise.resolve({ paso: "zona" }),
        searchParams: Promise.resolve({ q: query }),
      }),
    );
    const start = html.indexOf('name="step" value="zona"');
    expect(start).toBeGreaterThan(-1);
    const form = html.slice(start, html.indexOf("</form>", start));
    expect(form).toMatch(new RegExp(`<input[^>]*type="radio"[^>]*name="zoneId"[^>]*value="${id}"`));
    expect(form).toContain(`<span>${query}<span`);
    expect(form).toContain("Francisco Eugenio Bustamante · Maracaibo");
  });

  it.each(CASES)("entrega Urbanización %s por JSON", async (name, zoneId) => {
    const query = `Urbanización ${name}`;
    const response = await GET(
      new Request(`https://rentoru.test/publicar/zonas?q=${encodeURIComponent(query)}`),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const results = await response.json();
    expect(results.length).toBeLessThanOrEqual(8);
    expect(results).toContainEqual({
      zoneId,
      cityId: "05c26a6a-f2cb-1b98-e532-d2feaaad2de5",
      label: query,
      scope: "Francisco Eugenio Bustamante · Maracaibo",
    });
  });
});
