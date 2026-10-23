import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SuggestionVocabulary } from "@/modules/listing-catalogue/domain/suggest-filters";
import type { SearchCriteria } from "@/modules/listing-search/domain/search-criteria";
import {
  ALTAMIRA,
  activeZonesFor,
  CHACAO,
  CITIES,
  coversFor,
  curatedZonesFor,
  DC_ALTAMIRA,
  DC_CHACAO,
  DISTRITO,
  facetsFor,
  matching,
} from "../catalogo-de-prueba";

/**
 * **La búsqueda con el script apagado** (tasks.md 11.2, 11.3 y 11.4).
 *
 * `renderToStaticMarkup` devuelve el marcado del servidor **sin marcas de
 * hidratación y sin ejecutar nada del cliente**: es la respuesta que sale de la
 * ruta, que es lo único que ve un rastreador o el navegador de WhatsApp cuando
 * el bundle no llega. Una prueba que pasara porque el navegador corrió el
 * script no estaría afirmando la pregunta.
 *
 * **No se comprueba leyendo `page.tsx`.** Este repositorio ya tuvo una prueba
 * que leía la hoja de estilos y afirmaba `grid-template-columns: 250px 1fr
 * 250px` mientras el encabezado se dibujaba invertido en los cuatro anchos: el
 * texto del archivo era verdad y el resultado era falso. La 11.4 en particular
 * se afirma por su resultado observable —el servidor ya filtró, y los controles
 * son direcciones— y no por la ausencia de una cadena en un archivo.
 *
 * **Ninguna pudo fallar primero, y se dice acá en vez de fingir un ciclo.** Las
 * tres describen comportamiento ya servido: son pruebas de caracterización.
 * Los dientes se los dan las mutaciones anotadas en `tasks.md`.
 */

const { search, countFacets, listCities } = vi.hoisted(() => ({
  search: vi.fn(),
  countFacets: vi.fn(),
  listCities: vi.fn(),
}));

vi.mock("@/shared/db/client", () => ({ db: {} }));
vi.mock("@/modules/identity/infrastructure/session-port", () => ({
  nextAuthSessionPort: { getSession: async () => null },
}));
vi.mock("@/modules/listing-catalogue/infrastructure/drizzle-catalogue", () => ({
  DrizzleCatalogue: class {
    listCities = listCities;
    // 27.1 slice C: la página ya no pide la taxonomía entera para el panel y
    // las sugerencias — pide sólo las zonas con avisos, ya contadas.
    listActiveZones = async (cityId: string) => activeZonesFor(cityId);
    // Corrección 27.1-C (`R4-zona-query-silent-widening`): `?zona=` resuelve
    // contra la taxonomía CURADA, nunca contra `activeZonesFor`.
    findZonesByTokens = async (cityId: string, tokens: readonly string[]) =>
      curatedZonesFor(cityId, tokens);
  },
}));
vi.mock("@/modules/listing-catalogue/domain/bounded-vocabulary", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/modules/listing-catalogue/domain/bounded-vocabulary")>();
  // Envuelve la función real: las sugerencias siguen siendo las que el
  // dominio calcula, y el espía sólo deja ver con qué la llamaron.
  return { ...actual, boundedVocabulary: vi.fn(actual.boundedVocabulary) };
});
vi.mock("@/modules/listing-search/infrastructure/drizzle-listing-search", () => ({
  DrizzleListingSearch: class {
    search = search;
  },
}));
vi.mock("@/modules/listing-search/infrastructure/drizzle-faceted-search", () => ({
  DrizzleFacetedSearch: class {
    countFacets = countFacets;
  },
}));
vi.mock("@/modules/listing-discovery/infrastructure/drizzle-listing-photos", () => ({
  DrizzleListingPhotos: class {
    coversFor = async (ids: readonly string[]) => coversFor(ids);
  },
}));

import { boundedVocabulary } from "@/modules/listing-catalogue/domain/bounded-vocabulary";
import CiudadPage, { generateMetadata } from "./page";

const suggestionsSpy = vi.mocked(boundedVocabulary);

beforeEach(() => {
  process.env.R2_BUCKET_PUBLIC_URL = "https://fotos.rentoru.test";
  search.mockReset();
  countFacets.mockReset();
  listCities.mockReset();
  listCities.mockResolvedValue(CITIES);
  suggestionsSpy.mockClear();
  search.mockImplementation(async (criteria: SearchCriteria) => matching(criteria));
  countFacets.mockImplementation(async (criteria: SearchCriteria, offered: readonly string[]) =>
    facetsFor(criteria, offered),
  );
});

/** El cuerpo servido de `/alquiler/<ciudad>`, sin ejecutar un solo script. */
async function servedBody(
  query: Record<string, string> = {},
  slug = "distrito-capital",
): Promise<string> {
  return renderToStaticMarkup(
    await CiudadPage({
      params: Promise.resolve({ ciudad: slug }),
      searchParams: Promise.resolve(query),
    }),
  );
}

/**
 * **El histograma viaja en el cuerpo servido** (14.12 rebanada C). Es una
 * decoración encima de un formulario `GET`: si necesitara un script para
 * aparecer, el panel de precio llegaría mudo justo donde el bundle no llega,
 * que es el navegador de WhatsApp (D13).
 */
describe("el histograma de precio se sirve desde el servidor", () => {
  it("las ocho barras y la frase salen en la respuesta, sin un solo script", async () => {
    // Doce avisos repartidos: por debajo del piso el dominio se niega, así que
    // una fixture más chica probaría la negativa y no el dibujo.
    countFacets.mockImplementation((criteria: SearchCriteria, offered: readonly string[]) => ({
      ...facetsFor(criteria, offered),
      byPriceBucket: [
        { count: 1, lowestUsd: 200, highestUsd: 240 },
        { count: 2, lowestUsd: 300, highestUsd: 380 },
        { count: 4, lowestUsd: 400, highestUsd: 495 },
        { count: 2, lowestUsd: 505, highestUsd: 590 },
        { count: 1, lowestUsd: 610, highestUsd: 690 },
        { count: 1, lowestUsd: 720, highestUsd: 780 },
        { count: 0 },
        { count: 1, lowestUsd: 1000, highestUsd: 1000 },
      ],
    }));

    const html = await servedBody({ filtros: "precio", min: "300", max: "700" });

    expect(html.split("data-placement=").length - 1).toBe(8);
    expect(html).toContain("la mayoría está entre");
    // Los dos rótulos del eje son avisos reales, no una escala fija.
    expect(html).toContain(">$200<");
    expect(html).toContain(">$1000<");
    // Y sigue sin costar un byte de cliente. Se afirma sobre el trozo del
    // histograma y no sobre la página entera: la pastilla trae los dos únicos
    // SVG en línea que el sistema permite, así que un `not.toMatch` global
    // estaría midiendo la pastilla y no el dibujo.
    // Los dos extremos del recorte se afirman antes de recortar: con uno
    // ausente `indexOf` devuelve -1 y el trozo sale vacío, que pasaría solo.
    expect(html).toContain('role="img"');
    const dibujo = html.slice(html.indexOf('role="img"'), html.indexOf("la mayoría"));
    expect(dibujo).not.toMatch(/<script|onclick|<canvas|<svg|<img/i);
    expect(dibujo).toContain("<span");
  });
});

describe("landing de ciudad vacía servida", () => {
  it("sirve La Guaira sin encabezado de resultados en su slug canónico", async () => {
    listCities.mockResolvedValue([{ id: "ciudad-lg", name: "La Guaira" }, ...CITIES]);
    search.mockResolvedValue([]);
    countFacets.mockImplementation(
      async (criteria: SearchCriteria, offered: readonly string[]) => ({
        ...facetsFor(criteria, offered),
        cityTotal: 0,
        total: 0,
      }),
    );
    const html = await servedBody({}, "la-guaira");
    expect(html).toContain("La Guaira");
    expect(html).toMatch(/<div class="[^"]*container[^"]*"><section[^>]*>/);
    expect(html).toContain("Gratis para publicar. Sin comisión.");
    expect(html).toContain('href="/publicar"');
    expect(html).toMatch(/<form[^>]*action="\/"[^>]*method="get"/);
    expect(html).not.toContain("Alquiler en La Guaira");
  });

  it("caracteriza metadata canónica y filtros de La Guaira", async () => {
    listCities.mockResolvedValue([{ id: "ciudad-lg", name: "La Guaira" }, ...CITIES]);
    const params = Promise.resolve({ ciudad: "la-guaira" });
    const canonical = await generateMetadata({ params, searchParams: Promise.resolve({}) });
    expect(canonical.alternates).toEqual({ canonical: "/alquiler/la-guaira" });
    const filtered = await generateMetadata({
      params,
      searchParams: Promise.resolve({ min: "5000" }),
    });
    expect(filtered.robots).toEqual({ index: false, follow: true });
    expect(filtered.alternates).toBeUndefined();
  });

  it("sirve la landing completa y el GET de Nav en la ciudad canónica sin avisos", async () => {
    search.mockResolvedValue([]);
    countFacets.mockImplementation(
      async (criteria: SearchCriteria, offered: readonly string[]) => ({
        ...facetsFor(criteria, offered),
        cityTotal: 0,
        total: 0,
      }),
    );
    const html = await servedBody();
    expect(html).toContain("Gratis para publicar. Sin comisión.");
    expect(html).toContain("Todavía no hay avisos disponibles en Distrito Capital");
    expect(html).toContain('href="/publicar"');
    expect(html).toContain("Comisión de Rentoru");
    expect(html).toContain("WhatsApp tras registrarse");
    expect(html).toContain("Rentoru no recibe pagos ni escribe contratos.");
    expect(html).toMatch(/<form[^>]*action="\/"[^>]*method="get"/);
  });

  it("no confunde una búsqueda filtrada ni avisos sin portada con ciudad vacía", async () => {
    const filtered = await servedBody({ min: "5000" });
    expect(filtered).not.toContain("Gratis para publicar. Sin comisión.");
    expect(filtered).toContain("0 propiedades activas");
    search.mockResolvedValue([]);
    const missingPhoto = await servedBody();
    expect(missingPhoto).not.toContain("Gratis para publicar. Sin comisión.");
    expect(missingPhoto).toContain("Los avisos de esta página todavía no tienen foto.");
  });

  it("no invita a publicar si la query está refinada aunque cityTotal sea cero", async () => {
    search.mockResolvedValue([]);
    countFacets.mockImplementation(
      async (criteria: SearchCriteria, offered: readonly string[]) => ({
        ...facetsFor(criteria, offered),
        cityTotal: 0,
        total: 0,
      }),
    );
    expect(await servedBody({ min: "5000" })).not.toContain("Gratis para publicar. Sin comisión.");
  });
});

describe("la búsqueda sin JavaScript", () => {
  it("29.1: sirve un formulario GET y un enlace de destino sin depender de sugerencias", async () => {
    const html = await servedBody();
    expect(html).toMatch(/<form[^>]*action="\/"[^>]*method="get"/);
    expect(html).toContain('name="q"');
    expect(html).toMatch(
      /<label[^>]*for="pastilla-de-busqueda"[^>]*>¿En qué zona buscas\?<\/label>/,
    );
    expect(html).toMatch(
      /<input[^>]*id="pastilla-de-busqueda"[^>]*placeholder="¿En qué zona buscas\?"[^>]*name="q"[^>]*value="Distrito Capital"/,
    );
    // La sugerencia de zona aparece al escribir; el HTML inicial enlaza a la ficha.
    expect(html).toMatch(
      /href="\/alquiler\/distrito-capital\/altamira\/penthouse-en-altamira-dc-2(?:\?[^"]*)?"/,
    );
  });
  it.each<Record<string, string>>([{}, { min: "300", pag: "2" }])(
    "sirve la salida móvil a Inicio sin filtros (%j)",
    async (query) => {
      const html = await servedBody(query);
      expect(html).toMatch(
        /<a[^>]*data-testid="results-mobile-back"[^>]*aria-label="Volver a Inicio"[^>]*href="\/"[^>]*>← Inicio<\/a>/,
      );
    },
  );

  it("sirve limpiar todo junto al título sólo con filtros activos", async () => {
    const filtered = await servedBody({ min: "300" });
    expect(filtered).toMatch(
      /<h1[^>]*>[^<]*<\/h1>\s*<a[^>]*data-testid="mobile-clear-all"[^>]*href="\/alquiler\/distrito-capital"[^>]*>Limpiar todo<\/a>/,
    );
    expect(await servedBody()).not.toContain('data-testid="mobile-clear-all"');
  });
  it("sirve cuatro enlaces de orden con filtros, ciudad y página reiniciada", async () => {
    const html = await servedBody({ min: "300", pag: "2", orden: "fecha-asc" });
    const menu = html.match(/<details[^>]*data-testid="order-menu"[\s\S]*?<\/details>/)?.[0];

    expect(menu).toContain("Ordenar por");
    expect(menu).toContain('href="/alquiler/distrito-capital?min=300"');
    expect(menu).toContain('href="/alquiler/distrito-capital?min=300&amp;orden=fecha-asc"');
    expect(menu).toContain('href="/alquiler/distrito-capital?min=300&amp;orden=precio-asc"');
    expect(menu).toContain('href="/alquiler/distrito-capital?min=300&amp;orden=precio-desc"');
    expect(menu).not.toContain("pag=2");
  });
  /** 11.3 */
  it("trae los resultados en el cuerpo de la respuesta", async () => {
    const html = await servedBody();

    expect(html).toContain(DC_CHACAO.title);
    expect(html).toContain(DC_ALTAMIRA.title);
    expect(html).toContain("$450");
    expect(html).toContain("2 propiedades activas");
    expect(html).toContain("Son los 2 avisos que coinciden");
    expect(html).toContain(">2 avisos</span>");
  });

  /**
   * 11.2 — **la dirección copiada es el estado de la búsqueda.**
   *
   * Los avisos circulan acá por WhatsApp: quien pega una búsqueda filtrada y
   * quien la abre tienen que ver lo mismo. Reabrir con otros filtros no es una
   * molestia, es una mentira sobre lo que se compartió.
   *
   * Se afirma sobre las tres caras de la selección a la vez, porque cada una
   * puede sobrevivir sola mientras las otras se pierden: las fichas de filtro
   * puesto, los campos del panel con su valor, y los resultados ya recortados.
   */
  it("una dirección con filtros reabre con esos mismos filtros puestos", async () => {
    const html = await servedBody({ min: "300", max: "800", hab: "2", filtros: "precio" });

    expect(html).toContain("¿Cuánto puedes pagar al mes?");
    expect(html).toContain("1 propiedad activa");
    expect(html).toContain(">1 aviso</span>");
    expect(html).toContain("Es el único aviso que coincide");
    expect(html).toMatch(
      /href="\/alquiler\/distrito-capital\?hab=2&amp;filtros=precio">Quitar el precio y ver 2<\/a>/,
    );

    // Las fichas de «filtro puesto» dicen cuáles están puestos y cómo sacarlos.
    // Se afirma sobre la etiqueta del «×» y no sobre el texto suelto: «2 hab»
    // también lo escribe la línea de cada tarjeta, y una afirmación que dos
    // lugares distintos pueden satisfacer no está afirmando cuál de los dos.
    expect(html).toContain('data-testid="filter-chips"');
    expect(html).toContain('aria-label="Quitar $300 – $800"');
    expect(html).toContain('aria-label="Quitar 2 hab"');

    // Y el panel abierto vuelve con los dos extremos escritos: reabrir un panel
    // vacío obligaría a teclear otra vez lo que la dirección ya traía.
    expect(html).toMatch(/name="min"[^>]*value="300"/);
    expect(html).toMatch(/name="max"[^>]*value="800"/);

    // El recorte es el mismo que vio quien copió: el de $450 entra, el de
    // $1200 no. Sin esta afirmación las dos de arriba pasarían sobre una
    // pantalla que dibuja los filtros y devuelve el catálogo entero.
    expect(html).toContain(DC_CHACAO.title);
    expect(html).not.toContain(DC_ALTAMIRA.title);
  });

  /**
   * 11.4 — **el servidor ya filtró, y los controles son direcciones.**
   *
   * Se afirma por el resultado observable y no por lo que diga el archivo: que
   * la respuesta CAMBIE con la dirección es lo que prueba que el recorte ocurrió
   * antes de que existiera la respuesta, y no en una capa de cliente que nunca
   * llega. Un `not.toContain("use client")` sobre el fuente sería verde con el
   * filtrado hecho dentro de un componente hijo.
   */
  it("el recorte ocurre antes de la respuesta y no en una capa de cliente", async () => {
    const barata = await servedBody({ max: "500" });
    const cara = await servedBody({ min: "1000" });

    // Dos direcciones, dos cuerpos distintos: el servidor decidió, no el
    // navegador.
    expect(barata).toContain(DC_CHACAO.title);
    expect(barata).not.toContain(DC_ALTAMIRA.title);
    expect(cara).toContain(DC_ALTAMIRA.title);
    expect(cara).not.toContain(DC_CHACAO.title);

    // Y el criterio le llegó al puerto ya traducido desde la query.
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ maxPriceUsd: 500 }));
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ minPriceUsd: 1000 }));
  });

  /**
   * 11.4, la otra mitad: **la paginación es una dirección, no un manejador.**
   *
   * Recortar a 24 sin ofrecer los enlaces ya estuvo publicado acá, y truncar en
   * silencio es peor que no traer nada porque nadie puede verlo. Con el script
   * apagado, un botón que pagina en el cliente es exactamente ese truncamiento.
   */
  it("pasar de página es seguir un enlace, con el script apagado", async () => {
    countFacets.mockImplementation(
      async (criteria: SearchCriteria, offered: readonly string[]) => ({
        ...facetsFor(criteria, offered),
        total: 30,
      }),
    );

    const html = await servedBody();

    expect(html).toContain('aria-label="Paginación"');
    expect(html).toContain('href="/alquiler/distrito-capital?pag=2"');
    expect(html).toContain('rel="next"');
    // Un `<button>` acá sería la capa de cliente: sin script no envía nada, y
    // la dirección de la página 2 deja de poder pegarse en un chat.
    expect(html).not.toMatch(/<button[^>]*>\s*Siguiente/);
    // El panel de filtros es un formulario nativo por la misma razón.
    const filtros = await servedBody({ filtros: "precio" });
    expect(filtros).toMatch(/<form[^>]*action="\/alquiler\/distrito-capital"[^>]*method="get"/);
    expect(filtros).toContain("Aplicar filtros");
    expect(filtros).not.toContain("Usar este precio");
  });

  /**
   * **La 16.9 en la ruta de la ciudad, que también ES una búsqueda** (14.24).
   *
   * Va acá y no sólo en la zona porque las dos pantallas tienen que componer el
   * MISMO origen y son dos archivos distintos: la que se olvidara del cuarto
   * argumento dejaría a media mitad del producto perdiendo los filtros al
   * volver, sin romper nada visible. Es exactamente la forma en que la 16.9
   * estuvo abierta con todo su dominio ya escrito y probado.
   *
   * Se lee sobre el cuerpo servido: probar la regla y probar que la pantalla la
   * INSTALA son dos afirmaciones distintas, y sólo una la ve un render.
   */
  it("cuelga de cada tarjeta la búsqueda entera, para que la vuelta la traiga (16.9)", async () => {
    const html = await servedBody({ max: "500", pag: "2", filtros: "precio" });

    const ficha = /href="(\/alquiler\/distrito-capital\/[^"]+)"/.exec(html)?.[1];
    expect(ficha).toBeDefined();

    const volver = new URL(
      (ficha as string).replaceAll("&amp;", "&"),
      "https://rentoru.com",
    ).searchParams.get("volver");

    // Literal, no derivado de las mismas funciones que compone la página: la
    // página en la que alguien estaba parado viaja, el panel abierto no.
    expect(volver).toBe("/alquiler/distrito-capital?max=500&pag=2");
  });
});

/**
 * **La búsqueda dice qué le corrigió al precio** (14.13, F5).
 *
 * El dominio ya intercambiaba un rango invertido desde la 14.6, y callado. Se
 * lee sobre el cuerpo servido porque **decidir la frase y dibujarla son dos
 * afirmaciones distintas**, y sólo la segunda la ve un render — que es cómo la
 * 16.9 estuvo abierta con todo su dominio escrito y probado.
 */
describe("F35.3: estados neutros y direcciones conservadas", () => {
  it("explica el vacío y ofrece quitar el precio sin perder la ciudad", async () => {
    const html = await servedBody({ min: "5000" });
    expect(html).toContain(
      "Ningún aviso coincide: «Desde $5000» es el filtro que deja la búsqueda en cero.",
    );
    expect(html).toMatch(/href="\/alquiler\/distrito-capital">Quitar el precio y ver 2<\/a>/);
    expect(html).not.toContain('data-testid="listing-card"');
  });

  it("explica la página inexistente y enlaza a la última con el filtro", async () => {
    const html = await servedBody({ max: "500", pag: "2" });
    expect(html).toContain("Esa página ya no existe: la búsqueda tiene 1.");
    expect(html).toMatch(/href="\/alquiler\/distrito-capital\?max=500">Ver la última<\/a>/);
    expect(html).not.toContain('data-testid="search-close"');
  });

  it.each([
    ["filtros", "zona", "grupo de filtros", "max=500"],
    ["metros", "70", "filtro de metros cuadrados", "metros=70&amp;max=500"],
  ])(
    "explica el parámetro obsoleto %s sin perder el precio",
    async (param, value, label, query) => {
      const html = await servedBody({ [param]: value, max: "500" });
      expect(html).toContain(
        `Esa dirección pedía un ${label} que ya no existe. El panel se abrió igual.`,
      );
      expect(html).toContain('data-testid="search-panel"');
      expect(html).toMatch(/name="max"[^>]*value="500"/);
      expect(html).toContain(
        `data-search-filter-close="" href="/alquiler/distrito-capital?${query}"`,
      );
    },
  );

  it("no inventa avisos obsoletos sin esos parámetros", async () => {
    expect(await servedBody({ max: "500" })).not.toContain("El panel se abrió igual.");
  });
});

describe("lo que la búsqueda le corrigió al precio, dicho (14.13)", () => {
  it("dice que intercambió los dos extremos, con los números que se pidieron", async () => {
    const html = await servedBody({ min: "900", max: "300" });

    expect(html).toContain("Pediste de $900 a $300");
    // Y muestra los resultados del rango corregido: el aviso de $450 entra, y
    // con el rango tal cual se pidió no habría entrado nunca.
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ minPriceUsd: 300, maxPriceUsd: 900 }),
    );
  });

  it("nombra el precio real cuando el mínimo pedido no lo alcanza ninguno", async () => {
    // $5000 en Distrito Capital: la lista vuelve vacía y la causa es invisible.
    // El más caro cuesta $1200, y sale de los cubos que la MISMA consulta trajo.
    const html = await servedBody({ min: "5000" });

    expect(html).toContain("Ningún alquiler llega a $5000");
    expect(html).toContain("$1200");
  });

  it("una búsqueda que no se corrigió no dice nada", async () => {
    // El otro lado: una frase que saliera siempre pasaría las dos de arriba.
    const html = await servedBody({ min: "450", max: "1200" });

    expect(html).not.toContain("Pediste de");
    expect(html).not.toContain("se ajustó");
    expect(html).not.toContain("Ningún alquiler");
  });
});

/** Corrección 27.1-C, `R4-zona-query-silent-widening` (CRÍTICO, resiliencia):
 * `?zona=` contra la taxonomía CURADA, no `activeZonesFor` — si no, una zona
 * curada sin avisos ensancharía la búsqueda a la ciudad entera en silencio. */
describe("`?zona=` con una zona curada sin avisos activos (R4)", () => {
  it("busca vacía esa zona, y no ensancha a toda la ciudad", async () => {
    const html = await servedBody({ zona: "el-hatillo" });

    expect(html).toContain("0 propiedades activas");
    // Si hubiera ensanchado a la ciudad, las dos de Distrito Capital
    // aparecerían acá.
    expect(html).not.toContain(DC_CHACAO.title);
    expect(html).not.toContain(DC_ALTAMIRA.title);
  });
});

/** Corrección 27.1-C, `R3-suggestion-count-scope-unproved` (CRÍTICO,
 * confiabilidad): las sugerencias cuentan contra `counts.byZone` (ESTE
 * pedido), no `activeZones` (ciudad entera). Se envuelve la función real con
 * un espía y no se lee el marcado: `SearchSuggestions` es una isla de
 * cliente que no dibuja nada hasta que alguien escribe. */
describe("las sugerencias cuentan el criterio de ESTE pedido (R3)", () => {
  it("una zona sin avisos bajo el filtro puesto no se sugiere, y la fuente es la real", async () => {
    // $1000 de mínimo deja afuera el único aviso de Chacao ($450) y adentro
    // el de Altamira ($1200): bajo ESTE criterio, Chacao queda en cero aunque
    // activeZones la cuente con un aviso vivo en la ciudad entera.
    await servedBody({ min: "1000" });

    expect(suggestionsSpy).toHaveBeenCalledWith(
      CITIES,
      activeZonesFor(DISTRITO.id),
      expect.any(Object),
    );
    const suggested = suggestionsSpy.mock.results[0]?.value as SuggestionVocabulary;
    const suggestedIds = suggested.zones.map((zone) => zone.id);
    // La negativa sola pasaría vacía con un `byZone` vacío a mano: la
    // positiva de Altamira es la que obliga a que el conteo sea el real.
    expect(suggestedIds).not.toContain(CHACAO.id);
    expect(suggestedIds).toContain(ALTAMIRA.id);
  });
});
