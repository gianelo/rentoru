import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SegmentedControl } from "./SegmentedControl";

const css = readFileSync("components/atoms/SegmentedControl.module.css", "utf-8");

const OPTIONS = [
  {
    key: "1",
    label: "1",
    chosen: false,
    disabled: false,
    href: "/alquiler/maracaibo?hab=1",
  },
  {
    key: "2",
    label: "2",
    chosen: true,
    disabled: false,
    href: "/alquiler/maracaibo",
  },
  {
    key: "3",
    label: "3+",
    chosen: false,
    disabled: true,
    href: "/alquiler/maracaibo?hab=3",
  },
] as const;

describe("SegmentedControl", () => {
  it("dibuja un enlace por opción, no un input ni un botón", () => {
    const markup = renderToStaticMarkup(<SegmentedControl options={OPTIONS} />);

    expect(markup).toContain('href="/alquiler/maracaibo?hab=1"');
    expect(markup).not.toContain("<input");
    expect(markup).not.toContain("<button");
  });

  it("la opción elegida lleva aria-current sin imprimir conteos", () => {
    const markup = renderToStaticMarkup(<SegmentedControl options={OPTIONS} />);

    expect(markup).toMatch(/aria-current="true"[^>]*>[\s\S]*?>2</);
    expect(markup).not.toContain(">8<");
    expect(markup).not.toContain(">0<");
  });

  it("una opción deshabilitada se dibuja como span sin enlace, y no como ancla apagada", () => {
    const markup = renderToStaticMarkup(<SegmentedControl options={OPTIONS} />);

    expect(markup).toMatch(/<span[^>]*aria-disabled="true"[^>]*>[\s\S]*?3\+/);
    expect(markup).not.toContain('href="/alquiler/maracaibo?hab=3"');
  });

  it("ninguna opción usa aria-pressed: el rol es link, no button", () => {
    const markup = renderToStaticMarkup(<SegmentedControl options={OPTIONS} />);

    expect(markup).not.toContain("aria-pressed");
  });

  /**
   * 16.24: el fundador fijó 44 el 2026-08-27. La lámina 7b dibuja 40 para el
   * segmentado, y esa decisión posterior manda sobre la lámina.
   */
  it("el alto mínimo del segmento es --target-min (44), no los 40 de la lámina", () => {
    const bloque = css.match(/\.segment\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(bloque).toContain("min-block-size: var(--target-min)");
    expect(bloque).not.toContain("40px");
  });

  it("el borde del segmento es --strong, tal como dibuja la lámina 7b", () => {
    const bloque = css.match(/\.segment\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(bloque).toContain("border: 1px solid var(--strong)");
  });
});
