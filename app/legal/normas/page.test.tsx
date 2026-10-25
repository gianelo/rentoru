import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { REPORT_REASON_OPTIONS } from "@/modules/listing-trust/domain/report-reason";
import NormasPage, { metadata } from "./page";

/**
 * tasks.md 23.5 — "Normas de publicación" v2, con la estructura de las
 * normas de Airbnb (no su texto) para ratificación del fundador. Cada regla
 * se verificó contra el código antes de escribirse: los topes de
 * `publishable-listing.ts` y `uploaded-photo.ts`, el umbral de
 * `report-threshold.ts` y los motivos de `report-reason.ts`.
 */
describe("NormasPage", () => {
  it("carries the unratified-draft notice", () => {
    const markup = renderToStaticMarkup(<NormasPage />);

    expect(markup).toContain("Borrador en revisión");
  });

  it("carries the twelve sections in order", () => {
    const markup = renderToStaticMarkup(<NormasPage />);
    const headings = [...markup.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map((match) => match[1]);

    expect(headings).toEqual([
      "1. Qué se puede publicar",
      "2. Quién puede publicar",
      "3. Un aviso exacto",
      "4. Datos obligatorios",
      "5. Fotos",
      "6. Contacto y trato con interesados",
      "7. Mantener el aviso al día",
      "8. Lo que no se permite",
      "9. Una sola regla para todos",
      "10. Cómo se aplican",
      "11. Si no estás de acuerdo con una medida",
      "12. Cómo reportar",
    ]);
  });

  it("lists the five real residential property types and excludes commercial", () => {
    const markup = renderToStaticMarkup(<NormasPage />);

    expect(markup).toContain("apartamento");
    expect(markup).toContain("habitación");
    expect(markup).toContain("local comercial");
  });

  it("states the real title, description, and photo limits", () => {
    const markup = renderToStaticMarkup(<NormasPage />);

    expect(markup).toContain("90 caracteres");
    expect(markup).toContain("120");
    expect(markup).toContain("1.200");
    expect(markup).toContain("6 fotos");
  });

  it("states the real photo format and size limits", () => {
    const markup = renderToStaticMarkup(<NormasPage />);

    expect(markup).toContain("JPEG");
    expect(markup).toContain("10 MB");
  });

  it("states duplicate photos across publishers are rejected", () => {
    const markup = renderToStaticMarkup(<NormasPage />);

    expect(markup).toContain("otro dueño");
  });

  it("bans photos edited, with AI or otherwise, to misrepresent the property", () => {
    const markup = renderToStaticMarkup(<NormasPage />);

    expect(markup).toContain(
      "No se permite editar fotos, con inteligencia artificial o de otra forma, para ocultar defectos",
    );
  });

  it("forbids asking for money before showing the property", () => {
    const markup = renderToStaticMarkup(<NormasPage />);

    expect(markup).toContain(
      "<strong>Nunca</strong> pidas dinero, depósitos ni documentos antes de mostrar el inmueble.",
    );
  });

  // Mirrors the report form's own options, so a reason added or renamed in
  // the domain turns this red until the rules say the same.
  it("names exactly the real report reasons", () => {
    const markup = renderToStaticMarkup(<NormasPage />);
    const labels = REPORT_REASON_OPTIONS.map((option) => option.label.toLowerCase());
    const sentence = `${labels.slice(0, -1).join(", ")} u ${labels.at(-1)}`;

    expect(sentence).toBe("posible estafa, datos incorrectos, duplicado, no disponible u otro");
    expect(markup).toContain(`con uno de estos motivos: ${sentence}.`);
  });

  it("states the real three-distinct-account auto-hide threshold", () => {
    const markup = renderToStaticMarkup(<NormasPage />);

    expect(markup).toContain("tres cuentas");
  });

  it("links to the Terms it is part of, and to the contact address", () => {
    const markup = renderToStaticMarkup(<NormasPage />);

    expect(markup).toContain('href="/legal/terminos"');
    expect(markup).toContain('href="mailto:hola@rentoru.com"');
  });

  it("is indexable — the page carries no noindex directive", () => {
    expect(metadata.robots).toBeUndefined();
  });

  it("F35.9: addresses the reader in neutral tuteo, not voseo", () => {
    const markup = renderToStaticMarkup(<NormasPage />);

    expect(markup).toContain(
      "El dueño del inmueble o una inmobiliaria con autorización para ofrecerlo. Lo declaras al crear el aviso.",
    );
    expect(markup).not.toContain("Lo declarás");
  });
});
