import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DatosPage, { metadata } from "./page";

/**
 * tasks.md 23.5 — "Tratamiento de datos", drafted by the agent for the
 * founder to ratify. A data inventory distinct from `/legal/privacidad`'s
 * general framework, traced to real columns (`contact_reveal_event` in
 * schema.ts) and the real processors already named on the privacy page.
 */
describe("DatosPage", () => {
  it("carries the unratified-draft notice", () => {
    const markup = renderToStaticMarkup(<DatosPage />);

    expect(markup).toContain("Borrador en revisión");
  });

  it("cross-links the general privacy policy rather than repeating it", () => {
    const markup = renderToStaticMarkup(<DatosPage />);

    expect(markup).toContain('href="/legal/privacidad"');
  });

  it("names the real contact-reveal record: listing, city, moment and message", () => {
    const markup = renderToStaticMarkup(<DatosPage />);

    expect(markup).toContain("qué aviso");
    expect(markup).toContain("mensaje");
  });

  // Same rule as /legal/privacidad (founder, 2026-10-25): categories, not names.
  it("describes infrastructure processors by category without naming them", () => {
    const markup = renderToStaticMarkup(<DatosPage />);

    expect(markup).toContain("<strong>Google</strong>");
    expect(markup).toContain("proveedores de envío de correo");
    for (const provider of ["Resend", "Vercel", "Neon", "Cloudflare", "AWS", "Amazon"]) {
      expect(markup).not.toContain(provider);
    }
  });

  it("states data is not sold and no advertising profile is built", () => {
    const markup = renderToStaticMarkup(<DatosPage />);

    expect(markup).toContain("no vendemos");
  });

  it("is indexable — the page carries no noindex directive", () => {
    expect(metadata.robots).toBeUndefined();
  });

  it("F35.9: addresses the reader in neutral tuteo, not voseo", () => {
    const markup = renderToStaticMarkup(<DatosPage />);

    expect(markup).toContain(
      "Este texto detalla, dato por dato, qué guardamos sobre ti y para qué. <a",
    );
    expect(markup).toContain(
      "Política de privacidad</a> explica el marco general; aquí está el inventario.</p>",
    );
    expect(markup).toContain(
      "</strong> — el que eliges mostrar al publicar. Sirve para que quien vea tu aviso pueda escribirte.",
    );
    expect(markup).toContain(
      "no compartimos tu contacto con nadie fuera de quien tú eliges que lo vea. Para cualquier pregunta sobre este tratamiento, escribe a <a",
    );

    expect(markup).not.toContain("qué guardamos sobre vos");
    expect(markup).not.toContain("acá está el inventario");
    expect(markup).not.toContain("el que elegís mostrar");
    expect(markup).not.toContain("quien vos elegís que lo vea");
    expect(markup).not.toContain("este tratamiento, escribí a");
  });
});
