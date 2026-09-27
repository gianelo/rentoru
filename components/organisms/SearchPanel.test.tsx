import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildSearchPanel,
  type SearchPanelInput,
} from "@/modules/listing-search/domain/search-panel";
import { SearchPanel } from "./SearchPanel";

const COUNTS = {
  total: 16,
  byZone: { chacao: 12, altamira: 9, rosal: 0 },
  byMinRooms: { 1: 16, 2: 9, 3: 4, 4: 0 },
  byMinBathrooms: { 1: 16, 2: 7, 3: 0 },
  byAttribute: {
    hasPowerPlant: 9,
    hasRegularWater: 12,
    isFurnished: 4,
    hasParking: 11,
    hasSecurity: 0,
    hasAppliances: 3,
  },
  byPublisherType: { owner: 11, broker: 5 },
  withoutFilter: {
    zone: 40,
    price: 22,
    rooms: 31,
    bathrooms: 31,
    publisherType: 25,
    hasPowerPlant: 18,
    hasRegularWater: 19,
    isFurnished: 20,
    hasParking: 24,
    hasSecurity: 21,
    hasAppliances: 23,
    area: 27,
  },
  byPriceBucket: [
    { count: 1, lowestUsd: 200, highestUsd: 240 },
    { count: 2, lowestUsd: 300, highestUsd: 380 },
    { count: 4, lowestUsd: 400, highestUsd: 495 },
    { count: 3, lowestUsd: 505, highestUsd: 590 },
    { count: 3, lowestUsd: 610, highestUsd: 690 },
    { count: 1, lowestUsd: 720, highestUsd: 780 },
    { count: 1, lowestUsd: 880, highestUsd: 880 },
    { count: 1, lowestUsd: 1000, highestUsd: 1000 },
  ],
  cityTotal: 70,
} as const;

const INPUT: SearchPanelInput = {
  basePath: "/alquiler/distrito-capital",
  cityPath: "/alquiler/distrito-capital",
  query: {},
  cityName: "Distrito Capital",
  zones: [
    { id: "chacao", name: "Chacao", slug: "chacao", path: "/alquiler/distrito-capital/chacao" },
    {
      id: "altamira",
      name: "Altamira",
      slug: "altamira",
      path: "/alquiler/distrito-capital/altamira",
    },
    {
      id: "rosal",
      name: "El Rosal",
      slug: "el-rosal",
      path: "/alquiler/distrito-capital/el-rosal",
    },
  ],
  chosenZoneIds: [],
  counts: COUNTS,
  criteria: {},
};

// El panel es un estado de la dirección (14.33): cerrado no dibuja nada, así
// que casi todo lo que hay que mirar vive detrás de este parámetro.
const ABIERTO = { filtros: "todos" };

function render(overrides: Partial<SearchPanelInput> = {}) {
  return renderToStaticMarkup(
    <SearchPanel model={buildSearchPanel({ ...INPUT, query: ABIERTO, ...overrides })} />,
  );
}

const SOURCE = readFileSync(new URL("./SearchPanel.tsx", import.meta.url), "utf8");

describe("el acordeón funciona con JavaScript apagado (F14)", () => {
  it("no es un componente de cliente", () => {
    // La directiva sólo cuenta al principio del archivo; nombrarla dentro de
    // un comentario que explica por qué NO está no la convierte en una.
    expect(SOURCE.trimStart().startsWith('"use client"')).toBe(false);
    expect(SOURCE.trimStart().startsWith("'use client'")).toBe(false);
  });

  it("cada grupo se abre con un enlace, así que el servidor decide cuál queda abierto", () => {
    // Antes eran `<details name>`, el acordeón exclusivo del navegador. Se
    // cambió por enlaces cuando el panel dejó de ser barra lateral (14.32):
    // en escritorio los cuatro grupos van abiertos a la vez, y ninguna hoja de
    // estilos puede volver a abrir de forma confiable un `<details>` cerrado.
    // Un solo marcado con punto de quiebre, nunca dos implementaciones.
    const markup = render();

    expect(markup).not.toContain("<details");
    for (const group of ["precio", "habitaciones", "publica", "atributos"]) {
      expect(markup).toContain(`href="/alquiler/distrito-capital?filtros=${group}"`);
    }
  });

  it("no cuelga ni un manejador de eventos", () => {
    expect(render()).not.toMatch(/onclick|onchange|oninput|onsubmit/i);
  });

  it("cada opción es un enlace o un formulario GET", () => {
    const markup = render();

    expect(markup).toContain('method="get"');
    expect(markup).toContain("<a ");
  });
});

describe("el CTA fijo de aplicar filtros (28.8)", () => {
  it("el botón principal dice «Aplicar filtros» y no imprime conteos", () => {
    const markup = render();
    const confirm = /data-testid="search-confirm"[\s\S]*?>([^<>]*)<\//.exec(markup)?.[1];

    expect(confirm).toBe("Aplicar filtros");
    expect(markup).not.toContain("Ver 16 avisos");
  });

  it("con cero resultados mantiene el CTA fijo y explica la salida arriba", () => {
    const markup = render({
      counts: { ...COUNTS, total: 0 },
      criteria: { minPriceUsd: 900 },
      relief: {
        label: "Quitar el precio y ver 14",
        resultCount: 14,
        href: "/alquiler/distrito-capital",
      },
    });

    expect(markup).toContain("Quitar el precio y ver 14");
    expect(markup).toContain("Aplicar filtros");
    expect(markup).not.toContain("<button disabled");
    expect(markup).toMatch(/<p[^>]*>[\s\S]*Quitar el precio y ver 14[\s\S]*<\/p>/);
    expect(markup).toMatch(/data-testid="search-confirm"[^>]*>[\s\S]*Aplicar filtros/);
  });

  it("con un solo resultado el botón lleva a la ficha", () => {
    const markup = render({
      counts: { ...COUNTS, total: 1 },
      onlyListingHref: "/alquiler/distrito-capital/chacao/apto-84512",
    });

    expect(markup).toContain("/alquiler/distrito-capital/chacao/apto-84512");
    expect(markup).toContain("Aplicar filtros");
  });
});

describe("lo que cada grupo muestra", () => {
  it("la ubicación no está en ninguna parte del panel (14.36)", () => {
    // «Este panel ya no repite ciudad ni zona: eso lo resuelve el buscador de
    // la pastilla, y tenerlo en los dos lugares era el problema» (lámina 7b).
    const markup = render({ chosenZoneIds: ["chacao"], query: { ...ABIERTO, zona: "chacao" } });

    expect(markup).not.toContain("¿En qué ciudad?");
    expect(markup).not.toContain("¿Qué zonas?");
    expect(markup).not.toContain("Maracaibo");
    expect(markup).not.toContain("Buscar una zona");
  });

  it("los cuatro grupos, con su título y su pregunta", () => {
    const markup = render();

    for (const title of ["Precio", "Habitaciones", "Quién publica", "La propiedad tiene"]) {
      expect(markup).toContain(title);
    }
    expect(markup).toContain("¿Quién publica el aviso?");
  });

  it("una opción con cero se ofrece sin enlace: ninguna lleva a un vacío", () => {
    // El escalón de 4 habitaciones tiene cero, y `hasSecurity` también.
    expect(render()).toContain('aria-disabled="true"');
  });

  it("el precio conserva un submit visible sin volver a decir «Usar este precio»", () => {
    const markup = render();

    expect(markup).toContain('method="get"');
    expect(markup).toContain('name="min"');
    expect(markup).toContain('name="max"');
    expect(markup).toMatch(/<button[^>]*type="submit"[^>]*>Aplicar filtros<\/button>/);
    expect(markup).not.toContain("Usar este precio");
    expect(markup).not.toContain("Usar esta superficie");
  });

  it("no imprime notas ni conteos de faceta, aunque conserva opciones apagadas", () => {
    const markup = render();

    expect(markup).not.toContain("9 de 16");
    expect(markup).not.toContain("0 de 16");
    expect(markup).toContain('aria-disabled="true"');
  });

  it("las habitaciones con el «4+» del último escalón", () => {
    expect(render()).toContain("4+");
  });

  /**
   * **Los baños, en el mismo grupo que las habitaciones** (14.45, lámina 7b:
   * los dibuja uno debajo del otro en una sola columna). Se mira el
   * encabezado propio y el «3+», que es lo que distingue «tres o más» de
   * «exactamente tres».
   */
  it("los baños con su encabezado y el «3+» del último escalón", () => {
    const markup = render();

    expect(markup).toContain("Baños");
    expect(markup).toContain("3+");
    expect(markup).not.toContain(">7<");
  });

  /**
   * **Los metros² salieron del panel entero (28.18).** Decisión del fundador,
   * 2026-09-14: *«vamos a quitar este filtro. Ojo solo quitar de acá nada
   * más»*. Lo que queda por probar es la negativa: ni el campo ni su
   * formulario aparecen en el marcado, con o sin `?metros=` en la dirección.
   */
  it("los metros² ya no tienen control en el panel", () => {
    expect(render()).not.toContain('id="metros-desde"');
    expect(render()).not.toContain('name="metros"');
    expect(render()).not.toContain("Superficie mínima");
    expect(render({ query: { ...ABIERTO, metros: "70" } })).not.toContain('id="metros-desde"');
  });

  it("«Limpiar todo» está siempre a la vista (F8)", () => {
    expect(render()).toContain("Limpiar todo");
  });
});

describe("el ancla del engranaje", () => {
  it("el panel se llama «filtros», que es adónde apunta la barra resumen", () => {
    // En el teléfono el panel queda debajo de la cuadrícula. El engranaje de
    // El filtro de la pastilla lleva a `…#filtros`: sin este `id` el enlace recarga
    // la misma pantalla y no lleva a ninguna parte visible.
    expect(render()).toContain('id="filtros"');
  });

  it("ninguna opción marca su estado con un atributo que su rol no admite", () => {
    // Un enlace tiene rol `link`, y `aria-pressed` pertenece al rol `button`:
    // ningún lector de pantalla lo anuncia. Es marcado que parece accesible y
    // no lo es, y por eso el estado elegido viaja en `aria-current`.
    const markup = render({ chosenZoneIds: ["chacao"], criteria: { minRooms: 2 } });

    expect(markup).not.toContain("aria-pressed");
    expect(markup).toContain('aria-current="true"');
  });
});

/**
 * **El panel es un estado de la página, no una barra lateral** (14.33, lámina
 * 7c: *"Sin barra lateral: los filtros viven solo en el modal"*).
 */
describe("el panel como modal en todos los anchos (14.33)", () => {
  it("cerrado no dibuja nada: no hay filtros escondidos ocupando lugar", () => {
    const markup = renderToStaticMarkup(
      <SearchPanel model={buildSearchPanel({ ...INPUT, query: {} })} />,
    );

    expect(markup).toBe("");
  });

  it("abierto es un diálogo con nombre, y con una salida visible", () => {
    const markup = render();

    expect(markup).toContain('role="dialog"');
    expect(markup).toMatch(/aria-label="Cerrar los filtros"/);
    // La salida es una dirección de verdad: se puede abrir en otra pestaña y
    // funciona con el script apagado, igual que todo el camino de lectura.
    expect(markup).toMatch(/<a[^>]*href="\/alquiler\/distrito-capital"/);
  });

  it("una dirección vieja abre el panel y lo explica, en vez de romperlo", () => {
    const markup = render({ query: { filtros: "zona" } });

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain("ya no existe");
  });

  /**
   * **`?metros=` guardado de antes de la 28.18 es la misma cortesía** que un
   * grupo viejo (arriba): sin `filtros`, el panel estaría cerrado por defecto,
   * y un filtro que ya no existe pero sigue siendo ignorado en silencio es
   * exactamente el filtro fantasma que la tarea pide evitar.
   */
  it("una dirección con `?metros=` abre el panel igual y lo explica", () => {
    const markup = render({ query: { metros: "70" } });

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain("metros cuadrados");
    expect(markup).toContain("ya no existe");
  });

  it("el grupo abierto se marca en el marcado, que es lo que la hoja de estilos lee", () => {
    const markup = render({ query: { filtros: "atributos" } });

    expect(markup.match(/data-open=""/g)).toHaveLength(1);
    expect(markup).toMatch(
      /id="filtros-atributos"[^>]*data-open=""|data-open=""[^>]*id="filtros-atributos"/,
    );
  });
});

describe("la limpieza de previews y conteos retirados (28.8)", () => {
  it("el botón fijo sale del servidor sin ejecutar una línea de script", () => {
    const markup = render();
    expect(markup).toContain("Aplicar filtros");
  });

  it("las opciones tocables ya no llevan adelantos de conteo", () => {
    const markup = render();
    expect(markup).not.toContain("data-preview=");
  });

  it("las opciones ya no imprimen adelantos de conteo", () => {
    const markup = render();
    expect(markup).not.toContain("data-preview=");

    // Y las tres apagadas se dibujan como `<span aria-disabled>`, sin dirección
    // que tocar y por lo tanto sin número impreso.
    expect(markup.split('aria-disabled="true"').length - 1).toBe(3);
  });

  it("el botón fijo no monta una región viva de conteo", () => {
    expect(render()).not.toContain('aria-live="polite"');
  });

  it("con el panel cerrado no hay ni un número adelantado dando vueltas", () => {
    expect(renderToStaticMarkup(<SearchPanel model={buildSearchPanel(INPUT)} />)).toBe("");
  });
});

/**
 * **El histograma del paso de precio** (F5, tasks 14.12 rebanada C). El modelo
 * lo arma el dominio de verdad, así que lo que se afirma acá son los bytes que
 * salen del servidor y no un modelo escrito a mano.
 */
describe("el histograma dice dónde está la oferta antes de elegir", () => {
  it("dibuja una barra por cubo, con su alto medido adentro del marcado", () => {
    const markup = render();

    expect(markup.split("data-placement=").length - 1).toBe(8);
    // La barra más alta llega a 100: el alto es dato y va inline, porque
    // `SISTEMA.md` prohíbe el color, el radio y el tamaño escritos a mano —
    // ocho alturas medidas no son ninguna de las tres.
    expect(markup).toContain("block-size:100%");
  });

  it("marca cuáles quedan dentro del rango elegido y cuáles fuera", () => {
    const markup = render({ criteria: { minPriceUsd: 250, maxPriceUsd: 700 } });

    // Los cubos de la fixture van de $200 a $1000: el de abajo termina en
    // $240 y los tres de arriba arrancan en $720, así que ninguno de los
    // cuatro tiene un solo aviso que el rango $250–$700 admita.
    expect(markup.split('data-placement="outside"').length - 1).toBe(4);
    expect(markup.split('data-placement="within"').length - 1).toBe(4);
  });

  it("sin precio puesto ninguna queda afuera: no hay nada que excluya", () => {
    const markup = render();

    expect(markup).not.toContain('data-placement="outside"');
    expect(markup).toContain('data-placement="within"');
  });

  it("la frase nombra el lugar y nunca sirve «En ,»", () => {
    const markup = render({ chosenZoneIds: ["chacao", "altamira"] });

    expect(markup).toContain("En Chacao y Altamira, la mayoría está entre");
    expect(markup).not.toContain("En ,");
  });

  it("una fila de barras es una imagen de datos, y se dice en palabras", () => {
    // El color solo es «invisible para quien no distingue colores y para el
    // modo de alto contraste» (violation-copy.ts). Las barras van
    // `role="img"` con el dibujo escrito al lado.
    const markup = render({ criteria: { minPriceUsd: 250, maxPriceUsd: 700 } });

    expect(markup).toContain('role="img"');
    expect(markup).toContain("dentro del rango elegido");
  });

  it("por debajo de doce avisos dice cuántos hay en vez de dibujar cero barras", () => {
    const pocos = { ...COUNTS, byPriceBucket: [{ count: 4, lowestUsd: 300, highestUsd: 480 }] };
    const markup = render({ counts: pocos });

    expect(markup).toContain("Con 4 avisos no alcanza");
    expect(markup).not.toContain("data-placement=");
    // Y el formulario sigue entero: lo que se calla es el dibujo.
    expect(markup).toContain('id="precio-desde"');
  });
});
