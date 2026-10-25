import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TerminosPage, { metadata } from "./page";

/**
 * tasks.md 23.5 — "Términos y condiciones" v2, drafted by the agent on
 * Airbnb's structure (not its text) for the founder to ratify. Every product
 * fact asserted here was verified against the real source first:
 * `publishable-listing.ts`, `expiry.ts`, `auth.ts`, `report-threshold.ts`.
 * The operator is deliberately anonymous (founder decision, 2026-10-24).
 */
describe("TerminosPage", () => {
  it("carries the unratified-draft notice", () => {
    const markup = renderToStaticMarkup(<TerminosPage />);

    expect(markup).toContain("Borrador en revisión");
  });

  it("identifies the operator as an anonymous natural person, reachable by email", () => {
    const markup = renderToStaticMarkup(<TerminosPage />);

    expect(markup).toContain("operado por su titular, persona natural domiciliada");
    expect(markup).toContain('href="mailto:hola@rentoru.com"');
    expect(markup).not.toMatch(/cédula|RIF|\[NOMBRE/);
  });

  // The name promises the site's own name and the body never looked at it,
  // so a rename left this green with the old brand still on the page
  // (tasks.md 26.13). Both halves are asserted now.
  it("states rentoru.com takes no part in the deal between the parties", () => {
    const markup = renderToStaticMarkup(<TerminosPage />);

    expect(markup).toContain("rentoru.com («Rentoru») es un proyecto");
    expect(markup).toContain("<strong>No</strong> participa en la negociación");
  });

  it("names the two real publisher roles, owner and broker", () => {
    const markup = renderToStaticMarkup(<TerminosPage />);

    expect(markup).toContain("dueño");
    expect(markup).toContain("inmobiliaria");
  });

  it("states the real thirty-day listing lifetime", () => {
    const markup = renderToStaticMarkup(<TerminosPage />);

    expect(markup).toContain("Un aviso dura 30 días.");
  });

  it("names both real sign-in paths — Google and the emailed link", () => {
    const markup = renderToStaticMarkup(<TerminosPage />);

    expect(markup).toContain(
      "Se entra con una cuenta de Google o con un enlace enviado por correo.",
    );
  });

  it("states the real three-distinct-account auto-hide threshold", () => {
    const markup = renderToStaticMarkup(<TerminosPage />);

    expect(markup).toContain("tres cuentas distintas");
  });

  it("links to the three sibling documents it incorporates", () => {
    const markup = renderToStaticMarkup(<TerminosPage />);

    for (const href of ["/legal/privacidad", "/legal/cookies", "/legal/normas"]) {
      expect(markup).toContain(`href="${href}"`);
    }
  });

  it("carries the twenty-one clauses in order, ending with contact", () => {
    const markup = renderToStaticMarkup(<TerminosPage />);
    const headings = [...markup.matchAll(/<h2[^>]*>(\d+)\. /g)].map((match) => Number(match[1]));

    expect(headings).toEqual(Array.from({ length: 21 }, (_, index) => index + 1));
    expect(markup).toContain(">21. Contacto</h2>");
  });

  it("submits disputes to Venezuelan courts without naming a city", () => {
    const markup = renderToStaticMarkup(<TerminosPage />);

    expect(markup).toContain(
      "se someterá a los tribunales competentes de la República Bolivariana de Venezuela",
    );
    expect(markup).not.toMatch(/tribunales[^.]*(Caracas|Maracaibo)/);
  });

  it("is indexable — the page carries no noindex directive", () => {
    expect(metadata.robots).toBeUndefined();
  });

  it("F35.9: addresses the reader in neutral tuteo, not voseo", () => {
    const markup = renderToStaticMarkup(<TerminosPage />);

    expect(markup).toContain(
      "Visita el inmueble y verifica quién es el dueño antes de entregar cualquier pago.",
    );
    expect(markup).not.toContain("Visitá el inmueble");
  });
});
