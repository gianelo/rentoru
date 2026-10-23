import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ComoReportarPage, { metadata } from "./page";

/**
 * tasks.md 23.6 (DECIDIDA 2026-09-04) — "Cómo reportar un aviso" EXPLICA
 * cómo se reporta y desde dónde; no reporta nada desde acá. Cada hecho que
 * esta prueba pide fue verificado contra el código real antes de escribirse
 * en la página, la misma disciplina que 23.4 ya siguió: la ruta de reportar
 * vive en la ficha (`app/alquiler/.../[slug]/reportar/page.tsx`), exige
 * sesión (`reportarAviso` redirige a `/signin` sin ella), y el umbral de
 * ocultamiento automático es tres cuentas distintas
 * (`listing-trust/domain/report-threshold.ts::AUTO_HIDE_REPORT_THRESHOLD`).
 */
describe("ComoReportarPage", () => {
  it("says reporting happens from the listing's own page, not from here", () => {
    const markup = renderToStaticMarkup(<ComoReportarPage />);

    expect(markup).toContain("Reportar este aviso");
  });

  it("states that reporting requires being signed in", () => {
    const markup = renderToStaticMarkup(<ComoReportarPage />);

    expect(markup).toContain("entrar con tu cuenta");
  });

  it("states one report counts per account, not per visit", () => {
    const markup = renderToStaticMarkup(<ComoReportarPage />);

    expect(markup).toContain("una vez por cuenta");
  });

  it("names the real auto-hide threshold — three distinct accounts, not an invented number", () => {
    const markup = renderToStaticMarkup(<ComoReportarPage />);

    expect(markup).toContain("tres cuentas distintas");
  });

  it("does not promise to reveal whether a specific report hid the listing", () => {
    const markup = renderToStaticMarkup(<ComoReportarPage />);

    expect(markup).toContain("No te vamos a decir");
  });

  it("points to Escribinos for anything that is not about a specific listing", () => {
    const markup = renderToStaticMarkup(<ComoReportarPage />);

    expect(markup).toContain("/ayuda/escribinos");
  });

  it("is indexable — the page carries no noindex directive", () => {
    expect(metadata.robots).toBeUndefined();
  });
});

describe("ComoReportarPage — F35.8", () => {
  it("F35.8: guides the report in neutral tuteo and names the contact screen «Escríbenos»", () => {
    const markup = renderToStaticMarkup(<ComoReportarPage />);

    expect(markup).toContain(
      "Reportar es por aviso, así que no se hace desde aquí: se hace desde la propia ficha del aviso\n        que quieres reportar.".replace(
        /\n\s+/g,
        " ",
      ),
    );
    expect(markup).toContain(">1. Abre el aviso</h2>");
    expect(markup).toContain("Entra a la ficha del aviso que te parece sospechoso");
    expect(markup).toContain(">2. Entras con tu cuenta</h2>");
    expect(markup).toContain(">3. Envías el reporte</h2>");
    expect(markup).toMatch(
      /Para cualquier otra cosa, escríbenos desde <a [^>]*href="\/ayuda\/escribinos"[^>]*>Escríbenos<\/a>\./,
    );

    for (const voseo of [
      "acá",
      "querés",
      "Abrí",
      "Entrá ",
      "Entrás",
      "Enviás",
      "scribinos<",
      "escribinos desde",
    ]) {
      expect(markup).not.toContain(voseo);
    }
  });
});
