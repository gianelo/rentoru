import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { collectionsFor, coversFor, listCities, getSession } = vi.hoisted(() => ({
  collectionsFor: vi.fn(),
  getSession: vi.fn(async (): Promise<{ name: string; email: string } | null> => null),
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
  nextAuthSessionPort: { getSession },
}));
vi.mock("./_lib/nav-account", () => ({ readNavAccountFlags: async () => ({}) }));

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
    expect(html).not.toContain("Gratis para publicar. Sin comisión.");
  });

  it("mantiene la ciudad seleccionada vacía como regreso y consulta la otra sin pedir sus fotos", async () => {
    const html = await served("distrito-capital");
    expect(html).toMatch(/aria-current="true"[^>]*href="\/"[^>]*>Distrito Capital/);
    expect(html).toContain('href="/?ciudad=maracaibo"');
    expect(html).toContain("Todavía no hay avisos disponibles en Distrito Capital");
    expect(coversFor).toHaveBeenCalledWith([]);
  });

  it("sirve la ciudad seleccionada con oferta sin sustituirla por la landing vacía", async () => {
    const html = await served("maracaibo");
    expect(html).toMatch(/aria-current="true"[^>]*href="\/"[^>]*>Maracaibo/);
    expect(html).not.toContain('href="/?ciudad=distrito-capital"');
    expect(html).toContain("Apartamento en Maracaibo");
    expect(html).not.toContain("Gratis para publicar. Sin comisión.");
    expect(coversFor).toHaveBeenCalledWith(["mar-1"]);
  });

  it("sirve un vacío gramatical sin ciudades habilitadas ni destino inventado", async () => {
    listCities.mockResolvedValueOnce([]);
    collectionsFor.mockResolvedValueOnce(new Map());
    const html = await served();
    expect(html).toContain(
      "Todavía no hay avisos disponibles. Consulta las ciudades habilitadas antes de publicar.",
    );
    expect(html).not.toContain("en ,");
    expect(html).not.toContain('href="/?ciudad=');
    expect(html).not.toContain("Publicar un aviso");
    expect(html).not.toContain('href="/publicar"');
    expect(html).toContain('method="get"');
  });

  it("no promete publicar en ningún Nav de una cuenta con sesión sin ciudades", async () => {
    getSession.mockResolvedValueOnce({ name: "María", email: "m@example.com" });
    listCities.mockResolvedValueOnce([]);
    collectionsFor.mockResolvedValueOnce(new Map());
    const html = await served();
    expect(html).not.toContain('href="/publicar"');
    expect(html).not.toContain("Publicar una propiedad");
    expect(html).toContain('href="/mis-avisos"');
  });

  it("sirve la landing global con hechos verificables y sin falsas fichas", async () => {
    collectionsFor.mockResolvedValue(new Map());
    const html = await served();
    expect(html).toContain("Gratis para publicar. Sin comisión.");
    expect(html).toContain("Distrito Capital y Maracaibo");
    expect(html).toContain("Publicación y búsqueda");
    expect(html).toContain("Gratis");
    expect(html).toContain("Comisión de Rentoru");
    expect(html).toContain("Ninguna");
    expect(html).toContain("WhatsApp tras registrarse");
    expect(html).toContain("Rentoru no recibe pagos ni escribe contratos.");
    expect(html).toContain('href="/publicar"');
    expect(html).not.toContain('href="/?ciudad=');
  });

  it("sitúa el vacío sólo en la ciudad elegida y deja volver sin JavaScript", async () => {
    const html = await served("distrito-capital");
    expect(html).toContain("Gratis para publicar. Sin comisión.");
    expect(html).toMatch(/Todavía no hay avisos disponibles en Distrito Capital/);
    expect(html).not.toContain("Todavía no hay avisos disponibles en Maracaibo");
    expect(html).toMatch(/aria-current="true"[^>]*href="\/"[^>]*>Distrito Capital/);
    expect(html).toContain('href="/?ciudad=maracaibo"');
    expect(html).toContain('href="/publicar"');
  });

  it("no confunde una fila sin portada disponible con una oferta visible", async () => {
    coversFor.mockResolvedValueOnce(new Map());
    const html = await served("maracaibo");
    expect(html).toContain("Todavía no hay avisos disponibles en Maracaibo");
    expect(html).not.toContain("Apartamento en Maracaibo");
    expect(html).toMatch(/aria-current="true"[^>]*href="\/"[^>]*>Maracaibo/);
  });

  it("un slug inválido no queda seleccionado", async () => {
    const html = await served("narnia");
    expect(html).not.toContain('aria-current="true"');
    expect(html).toContain('href="/?ciudad=maracaibo"');
    expect(html).not.toContain("Gratis para publicar. Sin comisión.");
  });
});
