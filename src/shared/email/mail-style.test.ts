import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAIL_STYLE } from "./mail-style";

/**
 * Los valores del correo no pueden desviarse del sistema (38.2). Un cliente
 * de correo no entiende `var()`, así que `mail-style.ts` los escribe resueltos;
 * esta prueba lee `src/styles/tokens.css` y exige que cada uno sea el del
 * token, en el tema claro que se publica (`menta`, S4) y la estructura
 * `compacto`, que es donde `--disp` y `--meta` se resuelven.
 */
const CSS = readFileSync("src/styles/tokens.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function block(selector: string): string {
  const start = CSS.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`tokens.css sin ${selector}`);
  return CSS.slice(start, CSS.indexOf("\n}", start));
}

const SCOPES = ['[data-theme="menta"]', '[data-layout="compacto"]', ":root"].map(block);

function token(name: string): string {
  for (const scope of SCOPES) {
    const match = scope.match(new RegExp(`\\s${name}:\\s*([^;]+);`));
    if (!match?.[1]) continue;
    const value = match[1].trim();
    const alias = value.match(/^var\((--[\w-]+)\)$/);
    return alias?.[1] ? token(alias[1]) : value;
  }
  throw new Error(`tokens.css no declara ${name}`);
}

const PAIRS: ReadonlyArray<[keyof typeof MAIL_STYLE, string]> = [
  ["ink", "--ink"],
  ["soft", "--soft"],
  ["accent", "--accent"],
  ["accentInk", "--accent-ink"],
  ["surface", "--surface"],
  ["page", "--page"],
  ["bg", "--bg"],
  ["line", "--line"],
  ["warn", "--warn"],
  ["warnBg", "--warn-bg"],
  ["radius", "--r"],
  ["sans", "--sans"],
  ["mono", "--disp"],
  ["mono", "--meta"],
  ["bodyFs", "--ficha-body-fs"],
  ["bodyLh", "--ficha-body-lh"],
  ["titleFs", "--title-fs"],
  ["titleFw", "--title-fw"],
  ["titleLh", "--title-lh"],
  ["brandFs", "--card-price-fs"],
  ["brandLs", "--brand-ls"],
  ["brandbarH", "--brandbar-h"],
  ["metaFs", "--meta-fs"],
  ["metaFw", "--meta-fw"],
  ["secondaryLh", "--secondary-lh"],
  ["factFs", "--ficha-title-fs"],
  ["factFw", "--ficha-title-fw"],
  ["actionH", "--action-h"],
];

describe("la tabla resuelta del correo", () => {
  it.each(PAIRS)("%s es el valor de %s", (key, name) => {
    expect(MAIL_STYLE[key]).toBe(token(name));
  });

  it("no tiene un valor que la prueba no compare", () => {
    expect(new Set(PAIRS.map(([key]) => key))).toEqual(new Set(Object.keys(MAIL_STYLE)));
  });
});
