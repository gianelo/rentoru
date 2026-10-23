import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ComoContactarPage, { metadata } from "./page";

/**
 * tasks.md 23.4 — "Cómo contactar al dueño", derived from the real
 * keyed-with-a-message contact reveal (`components/molecules/ContactBlock.tsx`
 * and `contact-reveal/application/reveal-contact.ts`), never from a generic
 * "click to see the phone" description.
 */
describe("ComoContactarPage", () => {
  it("states the contact stays hidden until a message is written", () => {
    const markup = renderToStaticMarkup(<ComoContactarPage />);

    expect(markup).toContain("mensaje");
  });

  it("states signing in is required, and names both real sign-in paths", () => {
    const markup = renderToStaticMarkup(<ComoContactarPage />);

    expect(markup).toContain("Google");
    expect(markup).toContain("correo");
  });

  it("carries the same negotiation warning ContactBlock itself shows", () => {
    const markup = renderToStaticMarkup(<ComoContactarPage />);

    expect(markup).toContain("no participa en la negociación");
  });

  it("is indexable — the page carries no noindex directive", () => {
    expect(metadata.robots).toBeUndefined();
  });
});

describe("ComoContactarPage — F35.8", () => {
  it("F35.8: explains the reveal in neutral tuteo, not voseo", () => {
    const markup = renderToStaticMarkup(<ComoContactarPage />);

    expect(markup).toContain("pero lo mantiene tapado hasta que haces dos");
    expect(markup).toContain(">1. Entras</h2>");
    expect(markup).toContain(">2. Escribes un mensaje</h2>");
    expect(markup).toContain(">3. Ves el contacto y escribes por el canal que corresponda</h2>");
    expect(markup).toContain("Visita la propiedad y verifica quién es el dueño");

    for (const voseo of ["hacés", "Entrás", "Escribís", "escribís", "Visitá", "verificá"]) {
      expect(markup).not.toContain(voseo);
    }
  });
});
