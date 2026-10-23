import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
  PublicationDraft,
  PublishStepId,
} from "../../src/modules/listing-publication/domain/publication-steps";

/**
 * tasks.md 18.22 — **la anatomía que la pantalla de editar reusa, probada
 * donde nació.**
 *
 * **Por qué aparece recién ahora, y es un hallazgo y no un extra.** Al mover
 * `field` al dominio se corrió la mutación obligatoria: apuntar TODAS las
 * violaciones de publicar al campo `title` no ponía roja una sola prueba de
 * `app/publicar`. `PublishStep.tsx` —638 líneas, los nueve pasos— no tenía
 * archivo de pruebas: lo único que se afirmaba era que la tabla NOMBRA un
 * campo, nunca que el mensaje aterrice bajo ese control. O sea que la razón que
 * la 18.22 cita —«el mensaje va ANTES del campo que lo produjo»— estaba escrita
 * en un comentario y en ninguna aserción.
 *
 * Esto no prueba los nueve pasos. Prueba el mecanismo que las dos pantallas
 * comparten, en el paso donde es más barato mirarlo.
 */

// El componente arrastra la acción de servidor (que trae `next/headers` y la
// base entera) y el subidor de fotos, que es de cliente. Acá se miran los bytes
// que salen del servidor, no lo que pasa al recibirlos.
vi.mock("./actions", () => ({ submitStep: vi.fn() }));
vi.mock("./fotos/PhotoUploader", () => ({ PhotoUploader: () => null }));

import { PublishStep } from "./PublishStep";
import stepStyles from "./publish-steps.module.css";
import { DRAFT_EXPIRED_NOTICE } from "./step-copy";

const BORRADOR = {
  listing: { priceUsd: 610, title: "Apartamento en La Castellana" },
  photos: [],
} as unknown as PublicationDraft;

function dibujar(
  stepId: PublishStepId,
  violations: readonly string[],
  draft: PublicationDraft = BORRADOR,
): string {
  return renderToStaticMarkup(
    <PublishStep
      stepId={stepId}
      draft={draft}
      violations={violations as never}
      rail={[]}
      // Sin riel no hay mapa: esta prueba mira el error de campo, no la barra.
      jumpable={[]}
      progress={30}
      draftExpired={false}
      returningToReview={false}
      discardHref={null}
      primaryLabel="Siguiente"
      previousStep={null}
    />,
  );
}

/**
 * tasks.md 18.25 — **de dónde sale el «Vas N» que la pantalla dibuja.**
 *
 * Publicar NO tiene el defecto de editar, y la razón se prueba acá en vez de
 * afirmarse: el borrador que el paso dibuja es el que se acaba de guardar, así
 * que su descripción es la que se escribió y no una de la base. Lo único que
 * cambió con la 18.25 es que ahora viaja medida.
 */
describe("el contador de un paso cuenta lo que el borrador acaba de guardar (18.25)", () => {
  it("dice los caracteres escritos, en puntos de código", () => {
    // Diez caracteres astrales: con `String.length` diría 20, y el paso
    // rechazaría una descripción que su propio contador llamó suficiente.
    const borrador = {
      listing: { description: "🏠".repeat(10) },
      photos: [],
    } as unknown as PublicationDraft;

    expect(dibujar("descripcion", ["description.tooShort"], borrador)).toContain("Vas 10.");
  });

  it("sin descripción en el borrador no dibuja un cero que nadie escribió", () => {
    const html = dibujar("descripcion", ["description.tooShort"], {
      listing: {},
      photos: [],
    } as unknown as PublicationDraft);

    expect(html).toContain("Mínimo 120 caracteres.");
    expect(html).not.toContain("Vas");
  });
});

describe("un paso de publicar sirve la negativa al lado de su campo (18.22)", () => {
  /**
   * El mensaje ANTES del control, con su `id`, y el control anunciado. La razón
   * está escrita en `violation-copy.ts` y no es estética: «un borde rojo es
   * invisible para quien no distingue colores y para el modo de alto
   * contraste».
   */
  it("pone el mensaje antes del control que lo produjo y lo anuncia", () => {
    const html = dibujar("precio", ["priceUsd.invalid"]);

    expect(html).toContain('id="priceUsd-error"');
    expect(html).toContain('aria-describedby="priceUsd-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html.indexOf("Solo el número, en dólares")).toBeLessThan(html.indexOf('id="priceUsd"'));
  });

  /**
   * **El par, y es el que la mutación pedía.** Sin él, mandar toda violación al
   * mismo campo pasaría la anterior: un mensaje de precio bajo el título se
   * lee como si el título estuviera mal.
   */
  it("una negativa de otro campo no marca este control", () => {
    const html = dibujar("precio", ["title.required"]);

    expect(html).not.toContain('aria-invalid="true"');
    expect(html).not.toContain('id="priceUsd-error"');
  });

  /** Y sin negativas no se anuncia nada: el silencio no miente. */
  it("sin negativas ningún control se anuncia inválido", () => {
    const html = dibujar("precio", []);

    expect(html).not.toContain("aria-invalid");
    expect(html).not.toContain("-error");
  });

  /**
   * tasks.md 18.7 — **la misma anatomía para la seña del paso 2.** Es el único
   * control de ese paso que no es la zona, y su negativa tenía dónde nacer
   * (`reference.tooLong`) pero ningún lugar donde leerse: sin esto, quien pega
   * un párrafo entero recibe un botón que no avanza y un campo sin marca.
   */
  it("la negativa de la seña se lee antes del campo que la produjo", () => {
    const html = dibujar("zona", ["reference.tooLong"]);

    expect(html).toContain('id="reference-error"');
    expect(html).toContain('aria-describedby="reference-error"');
    expect(html.indexOf("Máximo 120 caracteres para la referencia")).toBeLessThan(
      html.indexOf('id="reference"'),
    );
  });

  /**
   * **El par, y sin él la anterior aceptaría las dos respuestas.** La zona y la
   * seña son dos controles del mismo paso: un mensaje de zona colgado del campo
   * de la seña diría que la seña está mal.
   */
  it("la negativa de la zona no marca el campo de la seña", () => {
    const html = dibujar("zona", ["zoneId.required"]);

    expect(html).toContain('id="zoneId-error"');
    expect(html).not.toContain('id="reference-error"');
    expect(html).not.toContain('aria-describedby="reference-error"');
  });
});

/**
 * 36.23 — el aviso de borrador vencido salía pegado a la primera opción: usa
 * `.warning`, que no deja margen porque Revisar, Editar y el contacto la
 * ubican ellos mismos. El aviso lleva el rol que separa una advertencia del formulario que la
 * sigue, sin tocar `.warning`.
 */
describe("aviso de borrador vencido", () => {
  it("deja el mismo espacio que el formulario entre el aviso y las opciones", () => {
    const html = renderToStaticMarkup(
      <PublishStep
        stepId="tipo"
        draft={BORRADOR}
        violations={[] as never}
        rail={[]}
        jumpable={[]}
        progress={0}
        draftExpired={true}
        returningToReview={false}
        discardHref={null}
        primaryLabel="Seguir"
        previousStep={null}
      />,
    );
    const role = stepStyles.warningBeforeForm;
    if (!role) throw new Error("Falta el rol CSS del aviso de borrador vencido");
    const aviso = html.match(/<p class="([^"]*)" role="status">([^<]*)<\/p>/);
    expect(aviso?.[2]).toBe(DRAFT_EXPIRED_NOTICE.replace(/"/g, "&quot;"));
    expect(aviso?.[1]?.split(" ")).toEqual([stepStyles.warning, role]);

    const css = readFileSync("app/publicar/publish-steps.module.css", "utf8");
    expect(css).toMatch(/\.warningBeforeForm\s*\{\s*margin-bottom:\s*16px;\s*\}/);
    // `.warning` sigue sin margen: sus otros lugares no cambian.
    expect(css).toMatch(/\.warning\s*\{[^}]*margin:\s*0;[^}]*\}/);
  });
});
