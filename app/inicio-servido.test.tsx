import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { collectionsFor, coversFor, listCities } = vi.hoisted(() => ({
  collectionsFor: vi.fn(),
  coversFor: vi.fn(
    async (ids: string[]) =>
      new Map(
        ids.map((id) => [id, { keys: { thumb: "thumb.webp", card: "card.webp" }, photoCount: 1 }]),
      ),
  ),
  listCities: vi.fn(async () => [
    { id: "dc", name: "Distrito Capital" },
    { id: "mcbo", name: "Maracaibo" },
  ]),
}));
vi.mock("@/shared/db/client", () => ({ db: {} }));
vi.mock("@/modules/listing-catalogue/infrastructure/drizzle-catalogue", () => ({
  DrizzleCatalogue: class {
    listCities = listCities;
  },
}));
vi.mock("@/modules/listing-discovery/infrastructure/drizzle-active-zones", () => ({
  DrizzleActiveZones: class {
    listActiveZones = async () => [];
  },
}));
vi.mock("@/modules/listing-discovery/infrastructure/drizzle-home-collections", () => ({
  DrizzleHomeCollections: class {
    collectionsFor = collectionsFor;
  },
}));
vi.mock("@/modules/listing-discovery/infrastructure/drizzle-listing-photos", () => ({
  DrizzleListingPhotos: class {
    coversFor = coversFor;
  },
}));
vi.mock("@/modules/listing-discovery/infrastructure/photo-public-base-url", () => ({
  readPhotoPublicBaseUrl: () => "https://fotos.example",
}));
vi.mock("@/modules/identity/infrastructure/session-port", () => ({
  nextAuthSessionPort: { getSession: async () => null },
}));
vi.mock("./_lib/nav-account", () => ({ readNavAccountFlags: async () => ({}) }));
vi.mock("@/../components/organisms/Nav", () => ({ Nav: () => null }));

import InicioPage from "./page";

async function served(city?: string): Promise<string> {
  return renderToStaticMarkup(
    await InicioPage({ searchParams: Promise.resolve(city ? { ciudad: city } : {}) }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  collectionsFor.mockImplementation(
    async (specs: { key: string }[]) =>
      new Map(
        specs.map(({ key }) => [
          key,
          {
            rows:
              key === "ciudad:mcbo" || key === "disponibilidad:mcbo"
                ? [
                    {
                      id: "mar-1",
                      title: "Apartamento en Maracaibo",
                      priceUsd: 350,
                      rooms: 2,
                      areaM2: 65,
                      publisherType: "owner",
                      cityName: "Maracaibo",
                      zoneName: "Centro",
                    },
                  ]
                : [],
            total: key === "ciudad:mcbo" || key === "disponibilidad:mcbo" ? 1 : 0,
            zoneCount: key === "ciudad:mcbo" || key === "disponibilidad:mcbo" ? 1 : 0,
          },
        ]),
      ),
  );
});

describe("selector del inicio servido", () => {
  it("omite ciudad vacía, muestra la disponible y conserva la copia actual", async () => {
    const html = await served();
    expect(html).toContain('href="/?ciudad=maracaibo"');
    expect(html).not.toContain('href="/?ciudad=distrito-capital"');
    expect(html).not.toContain("Todavía no hay avisos publicados");
    expect(html).toContain("Apartamento en Maracaibo");
  });

  it("mantiene la ciudad seleccionada vacía como regreso y consulta la otra sin pedir sus fotos", async () => {
    const html = await served("distrito-capital");
    expect(html).toMatch(/aria-current="true"[^>]*href="\/"[^>]*>Distrito Capital/);
    expect(html).toContain('href="/?ciudad=maracaibo"');
    expect(html).toContain("Todavía no hay avisos publicados");
    expect(coversFor).toHaveBeenCalledWith([]);
  });

  it("un slug inválido no queda seleccionado", async () => {
    const html = await served("narnia");
    expect(html).not.toContain('aria-current="true"');
    expect(html).toContain('href="/?ciudad=maracaibo"');
    expect(html).not.toContain("Todavía no hay avisos publicados");
  });
});
