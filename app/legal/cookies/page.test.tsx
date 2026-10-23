import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CookiesPage, { metadata } from "./page";

/**
 * tasks.md 23.5 — "Uso de cookies", drafted by the agent for the founder to
 * ratify. Names only the cookies this repository sets today: Auth.js's
 * session cookie (default name, no `cookies` override in auth.ts) and
 * `rentas_enlace` (`enlace.ts`, 15 min). No analytics/advertising script
 * exists anywhere in the repository (verified by search first).
 */
describe("CookiesPage", () => {
  it("carries the unratified-draft notice", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).toContain("Borrador en revisión");
  });

  it("names the real session cookie and the real sign-in-link cookie", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).toContain("authjs.session-token");
    expect(markup).toContain("rentas_enlace");
  });

  it("states the real 15-minute lifetime of the sign-in-link cookie", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).toContain("15 minutos");
  });

  it("states there is no advertising or analytics cookie", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).toContain("publicidad");
    expect(markup).toContain("analítica");
  });

  it("is indexable — the page carries no noindex directive", () => {
    expect(metadata.robots).toBeUndefined();
  });

  it("F35.9: addresses the reader in neutral tuteo, not voseo", () => {
    const markup = renderToStaticMarkup(<CookiesPage />);

    expect(markup).toContain(
      "La escribe Auth.js cuando entras con Google o con el enlace por correo; es <code>httpOnly</code> y dura mientras tu sesión esté activa. Sin ella no puedes publicar un aviso ni ver el contacto de un dueño.",
    );
    expect(markup).toContain(
      "Se escribe sólo cuando pides que te enviemos un enlace por correo, es <code>httpOnly</code>,",
    );
    expect(markup).toContain(">¿Puedes navegar sin ellas?</h2>");

    expect(markup).not.toContain("cuando entrás con Google");
    expect(markup).not.toContain("Sin ella no podés publicar");
    expect(markup).not.toContain("cuando pedís que te enviemos");
    expect(markup).not.toContain("¿Podés navegar sin ellas?");
  });
});
