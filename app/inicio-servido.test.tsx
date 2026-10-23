import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
vi.mock("@/modules/listing-catalogue/infrastructure/drizzle-search-vocabulary", () => ({
  DrizzleSearchVocabulary: class {
    lookup = async (typed: string) => ({
      cities: (await listCities()).filter((city) =>
        city.name.toLowerCase().includes(typed.toLowerCase()),
      ),
      zones: [],
      aliases: [],
    });
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

async function served(city?: string, q?: string): Promise<string> {
  return renderToStaticMarkup(
    await InicioPage({ searchParams: Promise.resolve({ ciudad: city, q }) }),
  );
}

afterEach(() => vi.unstubAllEnvs());

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("HOME_SSR_TIMING_DIAGNOSTICS", undefined);
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
  it("emits preview-dev timing through the served caller without changing HTML or leaking values", async () => {
    getSession.mockResolvedValue({ name: "PRIVATE_NAME", email: "PRIVATE_EMAIL" });
    const baseline = await served();
    vi.stubEnv("HOME_SSR_TIMING_DIAGNOSTICS", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "dev");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      expect(await served()).toBe(baseline);
      expect(log).toHaveBeenCalledTimes(1);
      const line = String(log.mock.calls[0]?.[0]);
      expect(JSON.parse(line)).toEqual({
        schema: "home-ssr-timing/v1",
        dataPreparationMs: expect.any(Number),
        phasesMs: {
          cities: expect.any(Number),
          activeZones: expect.any(Number),
          collections: expect.any(Number),
          covers: expect.any(Number),
          session: expect.any(Number),
          navFlags: expect.any(Number),
        },
      });
      expect(line).not.toContain("PRIVATE_");
      expect(line).not.toContain("mar-1");
      expect(line).not.toContain("fotos.example");
    } finally {
      log.mockRestore();
      getSession.mockResolvedValue(null);
    }
  });

  it.each([
    ["production", "dev"],
    ["preview", "staging"],
  ])("preserves served HTML without timing in %s/%s", async (environment, branch) => {
    const baseline = await served();
    vi.stubEnv("HOME_SSR_TIMING_DIAGNOSTICS", "1");
    vi.stubEnv("VERCEL_ENV", environment);
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", branch);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      expect(await served()).toBe(baseline);
      expect(log).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("F35.3: sirve la pregunta neutra en label y placeholder del inicio", async () => {
    const html = await served();
    expect(html).toMatch(
      /<label[^>]*for="pastilla-de-busqueda"[^>]*>¿En qué zona buscas\?<\/label>/,
    );
    expect(html).toMatch(
      /<input[^>]*id="pastilla-de-busqueda"[^>]*placeholder="¿En qué zona buscas\?"[^>]*name="q"[^>]*value=""/,
    );
    expect(html).toMatch(/<form[^>]*action="\/"[^>]*method="get"/);
    expect(html).toContain('href="/?ciudad=maracaibo"');
  });

  it("F35.3: sirve la ayuda desconocida completa con texto recortado y escapado", async () => {
    const html = await served(undefined, '  <nave> & "espacial"  ');
    expect(html).toMatch(
      /<p[^>]*>No reconocimos «&lt;nave&gt; &amp; &quot;espacial&quot;». Prueba con una zona, una ciudad o un tipo de vivienda\.<\/p>/,
    );
    expect(html).toContain('value="&lt;nave&gt; &amp; &quot;espacial&quot;"');
    expect(html).not.toContain("<nave>");
    expect(html).not.toContain("No reconocimos «  ");
    expect(html).not.toContain("sin resultados");
    expect(html).toMatch(/<form[^>]*action="\/"[^>]*method="get"/);
  });

  it("omite ciudad vacía, muestra la disponible y conserva la copia actual", async () => {
    const html = await served();
    expect(html).toContain('href="/?ciudad=maracaibo"');
    expect(html).not.toContain('href="/?ciudad=distrito-capital"');
    expect(html).not.toContain("Todavía no hay avisos publicados");
    expect(html).toContain("Apartamento en Maracaibo");
    expect(html).not.toContain("Gratis para publicar. Sin comisión.");
  });

  it("oculta todas las fichas en ciudad seleccionada vacía y conserva Nav y GET", async () => {
    const html = await served("distrito-capital");
    expect(html).not.toContain('aria-label="Ciudades"');
    expect(html).not.toContain('href="/?ciudad=maracaibo"');
    expect(html).toContain('href="/"');
    expect(html).toContain('method="get"');
    expect(html).toContain("Todavía no hay avisos disponibles en Distrito Capital");
    expect(coversFor).toHaveBeenCalledWith([]);
  });

  it.each(["visible", "vacía", "sin portada"] as const)(
    "prioriza solo la primera portada renderizada con la colección reciente %s",
    async (recent) => {
      const row = (id: string) => ({
        id,
        title: `Apartamento ${id}`,
        priceUsd: 350,
        rooms: 2,
        areaM2: 65,
        publisherType: "owner",
        cityName: "Maracaibo",
        zoneName: "Centro",
      });
      collectionsFor.mockImplementationOnce(
        async (specs: { key: string }[]) =>
          new Map(
            specs.map(({ key }) => {
              const rows =
                key === "recientes" && recent !== "vacía"
                  ? [row("recent-1"), row("recent-2")]
                  : key === "ciudad:mcbo" || key === "presupuesto"
                    ? [row("mar-1"), row("mar-2")]
                    : [];
              return [key, { rows, total: rows.length, zoneCount: rows.length ? 1 : 0 }];
            }),
          ),
      );
      if (recent === "sin portada") {
        coversFor.mockImplementationOnce(
          async (ids: string[]) =>
            new Map(
              ids
                .filter((id) => !id.startsWith("recent-"))
                .map((id) => [
                  id,
                  { keys: { thumb: "thumb.webp", card: "card.webp" }, photoCount: 1 },
                ]),
            ),
        );
      }

      const html = await served();
      const images = [...html.matchAll(/<img\b[^>]*>/g)].map(([image]) => image);
      expect(images).toHaveLength(recent === "visible" ? 6 : 4);
      expect(images[0]).toContain(`Apartamento ${recent === "visible" ? "recent-1" : "mar-1"}`);
      expect(images[0]).toContain('loading="eager"');
      expect(images[0]).toMatch(/\bfetchpriority="high"/i);
      for (const image of images.slice(1)) {
        expect(image).toContain('loading="lazy"');
        expect(image).not.toMatch(/\bfetchpriority=/i);
      }
    },
  );

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
    expect(html).not.toContain('aria-label="Ciudades"');
    expect(html).not.toContain('href="/?ciudad=maracaibo"');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/publicar"');
  });

  it("no confunde una fila sin portada disponible con una oferta visible", async () => {
    coversFor.mockResolvedValueOnce(new Map());
    const html = await served("maracaibo");
    expect(html).toContain("Todavía no hay avisos disponibles en Maracaibo");
    expect(html).not.toContain("Apartamento en Maracaibo");
    expect(html).not.toMatch(/<img\b|\bfetchpriority=/i);
    expect(html).not.toContain('aria-label="Ciudades"');
    expect(html).toContain('href="/"');
  });

  it("un slug inválido no queda seleccionado", async () => {
    const html = await served("narnia");
    expect(html).not.toContain('aria-current="true"');
    expect(html).toContain('href="/?ciudad=maracaibo"');
    expect(html).not.toContain("Gratis para publicar. Sin comisión.");
  });
});
