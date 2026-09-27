import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ListingMeta, ListingMetaPart } from "./ListingMeta";

const metaCss = readFileSync("components/atoms/ListingMeta.module.css", "utf-8");

function block(css: string, selector: string): string {
  const match = css.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`falta el bloque .${selector}`);
  return match[1] ?? "";
}

/**
 * **Aserciones mudadas de sujeto a propósito, y sólo porque el sujeto se
 * mudó.** Las dos primeras vivían en `ListingCard.test.tsx` sobre
 * `ListingCard.module.css`; ese bloque ya no existe porque el papel
 * tipográfico se promovió acá. No es reapuntar una aserción a otra cosa —lo
 * que la 14.42 prohíbe—: es la misma afirmación sobre el mismo CSS, que ahora
 * vive en un solo archivo en vez de tres.
 *
 * Lo que **se dibuja** lo mide `tests/measure/layout.spec.ts` (22.3) en un
 * navegador de verdad, comparando la tarjeta contra `/mis-avisos`.
 */
describe("ListingMeta", () => {
  it("escribe la frase que le dan, sin recomponerla", () => {
    // Quién arma el texto es de cada superficie: `/mis-avisos` le agrega
    // `· ref. LC-0912`, que la lámina 14d dibuja y la cuadrícula no tiene.
    expect(renderToStaticMarkup(<ListingMeta>Chacao · 2 hab · 78 m²</ListingMeta>)).toContain(
      "Chacao · 2 hab · 78 m²",
    );
  });

  it("es un párrafo y no un div: es una línea de texto, no una caja", () => {
    expect(renderToStaticMarkup(<ListingMeta>Chacao</ListingMeta>).startsWith("<p")).toBe(true);
  });

  it("no atenúa texto con opacity — el gris es --soft", () => {
    // Regla transversal 3: `opacity` atenúa también el borde y el fondo, y
    // deja el contraste fuera de control.
    expect(metaCss).not.toMatch(/opacity\s*:/);
    expect(metaCss).toContain("color: var(--soft)");
  });

  /**
   * **Invertida a propósito (tasks.md 22.9, fundador 2026-09-06).** Hasta
   * acá el metadato de la tarjeta leía la escala genérica del sistema
   * (`--meta-fs`/`--meta-fw`, 12px/600); esta prueba afirmaba exactamente
   * eso, con este mismo nombre en sentido contrario. Medido contra los
   * 136px disponibles a 360px, esa escala en `--meta` (mono) pliega la
   * frase de muestra; en `--sans` entra con margen. El papel se promovió a
   * uno propio para que las otras diez superficies que sí leen
   * `--meta-fs`/`--meta-fw` no arrastren un cambio que sólo pidió la
   * tarjeta.
   */
  it("lee su propia escala de metadato, y no la genérica del sistema", () => {
    expect(metaCss).toContain("font-size: var(--card-meta-fs)");
    expect(metaCss).toContain("font-weight: var(--card-meta-fw)");
    expect(metaCss).not.toContain("var(--meta-fs)");
    expect(metaCss).not.toContain("var(--meta-fw)");
  });
});

/**
 * `ListingMetaPart` — la unidad que no se parte por dentro (tasks.md 22.47).
 * Lo que **se mide** en un navegador de verdad —que la unidad completa cae a
 * la línea de abajo en vez de partirse— vive en `tests/measure/lista.spec.ts`;
 * acá sólo se prueba lo que este átomo declara: la etiqueta, el contenido y
 * la regla de no partir.
 */
describe("ListingMetaPart", () => {
  it("envuelve el contenido en un <span>, no en un <p>", () => {
    const markup = renderToStaticMarkup(<ListingMetaPart>78 m²</ListingMetaPart>);
    expect(markup.startsWith("<span")).toBe(true);
    expect(markup).toContain("78 m²");
  });

  // Triangulación: un contenido distinto, para que la aserción de arriba no
  // pase por casualidad con un único texto fijo.
  it("con otro contenido sigue siendo el mismo envoltorio, no un texto fijo", () => {
    const markup = renderToStaticMarkup(<ListingMetaPart>Los Palos Grandes</ListingMetaPart>);
    expect(markup.startsWith("<span")).toBe(true);
    expect(markup).toContain("Los Palos Grandes");
  });

  it("nunca se parte por dentro: white-space: nowrap y nada más", () => {
    const parte = block(metaCss, "part");
    expect(parte.trim()).toBe("white-space: nowrap;");
  });
});

/**
 * **`wrap`, la salida deliberada de la 22.47 (tasks.md 28.7).** Con la
 * taxonomía real hay zonas como «Barrio Tierra Negra del Sector Bella
 * Vista» que no entran en NINGUNA línea del cuerpo de la tarjeta como una
 * sola unidad indivisible: `white-space: nowrap` no las manda a la línea de
 * abajo — no hay línea que las reciba enteras —, las desborda, y
 * `ListingCard.module.css`'s `.card { overflow: hidden }` las recorta en
 * silencio. El fundador lo dijo explícito: *«sé que decidimos que sea un
 * espacio fijo, pero cuando hay texto grande debería hacer el salto de
 * línea dinámicamente; no puede haber nada fijo»*.
 *
 * **Por qué es un prop y no un segundo componente.** `ListingMetaPart` ya
 * es la unidad exacta que cada consumidor envuelve; una unidad que necesita
 * fluir sigue siendo la misma unidad, sólo con otra regla de recorte. Las
 * unidades cortas —«2 hab», «78 m²»— nunca necesitan esto: no son lo
 * bastante largas para no entrar solas en una línea, así que perder la
 * protección de la 22.47 ahí no compraría nada y se quedan en `.part`.
 */
describe("ListingMetaPart — wrap (tasks.md 28.7)", () => {
  const metaSource = readFileSync("components/atoms/ListingMeta.tsx", "utf-8");

  it("`.partWrap` declara flujo normal y nada de la regla que sustituye", () => {
    expect(block(metaCss, "partWrap").trim()).toBe("white-space: normal;");
  });

  it("el prop `wrap` decide entre las dos clases, no abre una tercera copia del átomo", () => {
    expect(metaSource).toMatch(/wrap[?:]/);
    expect(metaSource).toContain("styles.partWrap");
    expect(metaSource).toContain("styles.part");
  });

  it("con contenido que no entra en ninguna línea, sigue siendo el mismo envoltorio", () => {
    const markup = renderToStaticMarkup(
      <ListingMetaPart wrap>Barrio Tierra Negra del Sector Bella Vista</ListingMetaPart>,
    );
    expect(markup.startsWith("<span")).toBe(true);
    expect(markup).toContain("Barrio Tierra Negra del Sector Bella Vista");
  });
});
