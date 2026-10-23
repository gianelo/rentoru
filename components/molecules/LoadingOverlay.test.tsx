import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoadingOverlay } from "./LoadingOverlay";
import styles from "./LoadingOverlay.module.css";

describe("LoadingOverlay presentation only", () => {
  it("announces the supplied label, hides R and offers a native exit", () => {
    const html = renderToStaticMarkup(
      <LoadingOverlay label="Cargando publicación…" href="/" exitLabel="Inicio" />,
    );
    expect(html).toMatch(/role="status" aria-live="polite"[^>]*>Cargando publicación…/);
    expect(html).toMatch(/aria-hidden="true"[^>]*>.*>R<\/span>/);
    expect(html).toMatch(/<a [^>]*href="\/"[^>]*>Inicio<\/a>/);
    expect(html).not.toMatch(/aria-modal|role="dialog"|<script|<button/);
  });

  it("renders another caller's label and destination without publication copy", () => {
    const html = renderToStaticMarkup(
      <LoadingOverlay label="Buscando…" href="/buscar" exitLabel="Volver a buscar" />,
    );
    expect(html).toContain("Buscando…");
    expect(html).toContain('href="/buscar"');
    expect(html).not.toContain("publicación");
  });
});

/**
 * 36.24 — with reduced motion the ring stopped and read as a frozen page. A
 * pulse on the ring alone still looked like a stuck spinner, so the whole mark
 * pulses and the ring turns a full accent circle: nothing is left that looks halted.
 */
describe("LoadingOverlay with reduced motion", () => {
  const css = readFileSync("components/molecules/LoadingOverlay.module.css", "utf8");
  const reduced =
    css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  it("serves the mark and ring the rule targets", () => {
    const { mark, ring } = styles;
    if (!mark || !ring) throw new Error("Missing mark or ring role");
    const html = renderToStaticMarkup(
      <LoadingOverlay label="Cargando…" href="/" exitLabel="Inicio" />,
    );
    expect(html).toContain(`class="${mark}"`);
    expect(html).toContain(`class="${ring}"`);
  });

  it("pulses the whole mark", () => {
    expect(reduced).toMatch(/\.mark\s*\{[^}]*animation:\s*pulse\s[^}]*infinite/);
  });

  it("stops the ring and drops its arc so it never reads as a halted spinner", () => {
    const ring = reduced.match(/\.ring\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(ring).toMatch(/animation:\s*none/);
    expect(ring).toMatch(/border-color:\s*var\(--accent\)/);
  });

  it("animates opacity only, never position or rotation", () => {
    const pulse = css.match(/@keyframes pulse\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    expect(pulse).toMatch(/opacity:/);
    expect(pulse).not.toMatch(/transform|rotate|translate|scale/);
  });
});
