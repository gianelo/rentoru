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
 * Las negativas prueban el mecanismo compartido; la matriz de copia recorre
 * los nueve componentes en SSR, no nueve rutas HTTP autenticadas.
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

describe("los nueve pasos muestran instrucciones en tuteo neutro (35.4)", () => {
  it.each([
    ["tipo", "¿Qué vas a alquilar?", null],
    ["zona", "¿En qué zona queda?", null],
    ["precio", "¿Cuánto pides al mes?", "En dólares, sin centavos."],
    [
      "tamano",
      "¿Cómo es de grande?",
      "Un estudio cuenta como 1 habitación. Si no tiene estacionamiento, déjalo en 0.",
    ],
    [
      "atributos",
      "¿Qué tiene?",
      "Marca lo que tenga. Lo que dejes sin marcar no se menciona en el aviso.",
    ],
    ["titulo", "Ponle un título", "Lo más importante primero. Es lo que se lee en la lista."],
    ["descripcion", "Cuenta lo que no se ve en las fotos", null],
    ["fotos", "Sube las fotos", "Entre 1 y 6."],
    ["quien", "¿Quién publica?", null],
  ] as const)("%s conserva su pregunta, ayuda y control de paso", (paso, pregunta, ayuda) => {
    const html = dibujar(paso, []);

    expect(html.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1]).toBe(pregunta);
    if (ayuda) expect(html).toContain(`<p class="${stepStyles.help}">${ayuda}</p>`);
    else expect(html.slice(html.indexOf("</h1>"))).not.toMatch(/^<\/h1><p/);
    expect(html).toContain(`name="step" value="${paso}"`);
    expect(html).toContain('type="submit"');
    expect(html).toContain("Siguiente</button>");
  });
});

/**
 * 35.4 — cada negativa se lee en tuteo neutro al lado de su campo. Los
 * literales se escriben a mano: importar la tabla afirmaría que es igual a sí
 * misma. El destino «paso 2» de las fotos se conserva tal como se sirve.
 */
describe("las negativas de cada paso se leen en tuteo neutro (35.4)", () => {
  it.each([
    [
      "quien",
      "publisherType.required",
      "✱ obligatorio. Elige si publicas como dueño o como inmobiliaria.",
    ],
    ["quien", "publisherType.invalid", "Elige una de las dos opciones: dueño o inmobiliaria."],
    ["tipo", "propertyType.required", "Dinos qué vas a alquilar."],
    ["tipo", "propertyType.invalid", "Elige una de las cinco opciones de la lista."],
    ["titulo", "title.required", "✱ obligatorio. Escribe un título, como lo dirías tú."],
    ["descripcion", "description.required", "✱ obligatorio. Cuenta cómo es el inmueble."],
    ["precio", "priceUsd.required", "✱ obligatorio. Pon el alquiler mensual en dólares."],
    ["zona", "cityId.required", "✱ obligatorio. Elige la ciudad."],
    ["zona", "zoneId.required", "✱ obligatorio. Elige la zona."],
    [
      "zona",
      "zoneId.notInCity",
      "Esa zona no pertenece a la ciudad elegida. Elige una de la lista.",
    ],
    [
      "tamano",
      "bathrooms.invalid",
      "Un número entero de baños. Cuenta el de servicio si lo tiene.",
    ],
    ["tamano", "parkingSpots.invalid", "Un número entero. Si no tiene, pon 0."],
    ["quien", "contactMethod.required", "✱ obligatorio. ¿Por dónde quieres que te escriban?"],
    ["quien", "contactMethod.invalid", "Elige WhatsApp, teléfono o correo."],
    ["quien", "contactValue.required", "✱ obligatorio. Pon el dato por el que te contactan."],
    [
      "quien",
      "contactValue.invalid",
      "Revisa el dato: un correo lleva @, y un teléfono solo números.",
    ],
    ["fotos", "photos.required", "✱ obligatorio. Sube al menos una foto en el paso 2."],
    ["fotos", "photos.tooMany", "Hasta 6 fotos por aviso. Elige las mejores."],
  ] as const)("%s sirve %s en tuteo", (paso, codigo, mensaje) => {
    expect(dibujar(paso, [codigo])).toContain(mensaje);
  });

  it("quién publica advierte la dirección cerrada en tuteo, antes del contacto", () => {
    const html = dibujar("quien", []);

    expect(html).toContain(
      "Aparece siempre en tu aviso. Después puedes corregirlo de dueño a inmobiliaria, " +
        "<strong>nunca al revés</strong>.",
    );
  });
});

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
