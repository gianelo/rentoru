import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ComoPublicarPage, { metadata } from "./page";

/**
 * tasks.md 23.4 — "Cómo publicar un aviso", derived from the nine real
 * publish steps (`app/publicar/step-copy.ts`), never from generic
 * classified-ad boilerplate.
 */
describe("ComoPublicarPage", () => {
  it("names all nine real publish steps, in order", () => {
    const markup = renderToStaticMarkup(<ComoPublicarPage />);

    const steps = [
      "Tipo",
      "Zona",
      "Precio",
      "Tamaño",
      "Qué tiene",
      "Título",
      "Descripción",
      "Fotos",
      "Quién publica",
    ];

    let lastIndex = -1;
    for (const step of steps) {
      const index = markup.indexOf(step);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });

  it("states publishing needs an account, and names both real sign-in paths", () => {
    const markup = renderToStaticMarkup(<ComoPublicarPage />);

    expect(markup).toContain("Google");
    expect(markup).toContain("correo");
  });

  it("states the real thirty-day listing lifetime, not an invented number", () => {
    const markup = renderToStaticMarkup(<ComoPublicarPage />);

    expect(markup).toContain("30 días");
  });

  it("is indexable — the page carries no noindex directive", () => {
    expect(metadata.robots).toBeUndefined();
  });
});

describe("ComoPublicarPage — F35.8", () => {
  it("F35.8: describes the nine steps and what follows in neutral tuteo, not voseo", () => {
    const markup = renderToStaticMarkup(<ComoPublicarPage />);

    for (const phrase of [
      "Eliges qué vas a alquilar: apartamento, casa, quinta, anexo o habitación.",
      "Buscas la zona donde queda. La ciudad la determina la zona.",
      "Pones cuánto pides al mes, en dólares.",
      "Marcas lo que tenga: planta eléctrica, agua regular, amoblado, vigilancia 24 h, línea blanca.",
      "Le pones un título. Es lo primero que se lee en la lista.",
      "Cuentas lo que no se ve en las fotos, hasta 1.200 caracteres.",
      "Subes entre 1 y 6 fotos.",
      "Dices si publicas como dueño o como inmobiliaria, y dejas un contacto.",
      "y puedes editarlo en cualquier momento desde «Mis avisos».",
    ]) {
      expect(markup).toContain(phrase);
    }
    for (const voseo of [
      "Elegís",
      "Buscás",
      "Ponés",
      "pedís",
      "Marcás",
      "ponés",
      "Contás",
      "Subís",
      "Decís",
      "publicás",
      "dejás",
      "podés",
    ]) {
      expect(markup).not.toContain(voseo);
    }
  });
});
