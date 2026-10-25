import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CookiesPage, { metadata } from "./page";

/**
 * tasks.md 23.5 — "Uso de cookies" v3, on Airbnb's structure (not its text)
 * for the founder to ratify. Names only the cookies this repository sets
 * today: Auth.js's session cookie (default name, no `cookies` override in
 * auth.ts) and `rentas_enlace` (`enlace.ts`, 15 min). No analytics or
 * advertising script exists anywhere in the repository (verified by search
 * first). The source's bracketed "[CONFIRMAR …]" note is PDF-only and must
 * never be served.
 */
describe("CookiesPage", () => {
  it("carries the unratified-draft notice", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).toContain("Borrador en revisión");
  });

  it("carries the nine sections in order", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);
    const headings = [...markup.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map((match) => match[1]);

    expect(headings).toEqual([
      "1. Qué son las cookies",
      "2. Por qué las usamos",
      "3. Qué cookies usamos",
      "4. Lo que no usamos",
      "5. Registros del servidor",
      "6. Terceros",
      "7. Tus opciones",
      "8. Cambios",
      "9. Contacto",
    ]);
  });

  it("never serves the PDF-only confirmation note", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).not.toContain("CONFIRMAR");
    expect(markup).not.toContain("[");
  });

  it("names the real session cookie and the real sign-in-link cookie", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).toContain("<code>authjs.session-token</code>");
    expect(markup).toContain("<code>rentas_enlace</code>");
  });

  it("states both cookies are httpOnly", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).toContain("Las dos son <em>httpOnly</em>");
  });

  it("states the real session lifetime: thirty days without activity", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).toContain("30 días sin actividad");
  });

  it("states the real 15-minute lifetime of the sign-in-link cookie", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).toContain("15 minutos");
  });

  it("states there is no advertising or analytics cookie", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).toContain("Ninguna sirve para publicidad, analítica o seguimiento.");
  });

  it("links to the privacy page and the contact address", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).toContain('href="/legal/privacidad"');
    expect(markup).toContain('href="mailto:hola@rentoru.com"');
  });

  it("is indexable — the page carries no noindex directive", () => {
    expect(metadata.robots).toBeUndefined();
  });

  it("F35.9: addresses the reader in neutral tuteo, not voseo", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).toContain("Sin ella no puedes publicar ni ver el contacto de un aviso.");
    expect(markup).toContain("Solo se escribe cuando pides el enlace por correo.");
    expect(markup).toContain(
      "Puedes bloquear o borrar las cookies desde la configuración de tu navegador.",
    );

    expect(markup).not.toContain("Sin ella no podés publicar");
    expect(markup).not.toContain("cuando pedís el enlace");
    expect(markup).not.toContain("Podés bloquear");
  });
});
