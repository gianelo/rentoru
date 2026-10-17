import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoadingOverlay } from "./LoadingOverlay";

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
