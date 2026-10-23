import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  currentStepId,
  draftListingOf,
  type PublishStepId,
  stepViolations,
} from "@/modules/listing-publication/domain/publication-steps";
import {
  type CuratedZone,
  validatePublishableListing,
} from "@/modules/listing-publication/domain/publishable-listing";
import type { StoredDraft } from "../../draft";
import styles from "../../publish-steps.module.css";

/**
 * **El mensaje de campo de los seis pasos que quedaban** (tasks.md 18.24).
 *
 * La 18.22 dejó escrita la regla —*«el mensaje va ANTES del campo que lo
 * produjo»*, anunciado con `aria-invalid` y `aria-describedby`, porque *«un
 * borde rojo es invisible para quien no distingue colores y para el modo de
 * alto contraste»*— y la dejó viviendo en un comentario. La 18.25, la 18.17 y
 * la 18.7 la afirmaron sobre los pasos 3, 7 y 2. Los otros seis —1, 4, 5, 6, 8
 * y 9— no tenían una sola aserción, sobre un archivo de 723 líneas.
 *
 * **Es caracterización, y decirlo importa.** Las seis pantallas ya están
 * servidas, así que estas pruebas no pudieron verse rojas antes de existir: no
 * hay RED que fingir. Lo que les da filo son las mutaciones corridas contra
 * cada aserción —con este archivo y sin él—, anotadas en el cuerpo del PR.
 *
 * **Se renderiza la RUTA y no el componente**, igual que `riel-y-boton` y
 * `atributos-y-zona`. La razón no es uniformidad: lo que la pantalla dibuja
 * son las violaciones del ÚLTIMO INTENTO —`page.tsx` pasa `draft.violations`,
 * que es lo que `actions.ts` guardó en la cookie— y no las que el borrador
 * produce ahora. Escribirle `violations` a mano al componente mediría una
 * pantalla que nadie sirve, y de paso se perdería el reparto que hace
 * `stepViolations`: un error de fotos en el paso 4 apunta a un campo que esa
 * pantalla no dibuja.
 *
 * **Ninguna afirmación de acá es una regla.** Son decisiones del dominio
 * leídas en el marcado.
 */

const { redirect, notFound } = vi.hoisted(() => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ redirect, notFound }));
vi.mock("@/shared/db/client", () => ({ db: {} }));
vi.mock("@/modules/listing-publication/infrastructure/drizzle-zone-vocabulary", () => ({
  DrizzleZoneVocabulary: class {
    lookup = async () => ({ cities: [], zones: [], aliases: [] });
  },
}));
vi.mock("../../../_lib/require-session", () => ({
  requireSession: async () => ({ userId: "publicador-1", email: "dueno@ejemplo.com" }),
}));
vi.mock("../../actions", () => ({ submitStep: vi.fn() }));
/**
 * El subidor es de cliente y no aporta marcado de servidor, así que los otros
 * archivos lo apagan. Acá se lo reemplaza por una MARCA: la mitad de la regla
 * de la 18.22 que el paso 8 tiene que cumplir es qué va antes que él, y con un
 * `null` esa posición no existe.
 */
vi.mock("../../fotos/PhotoUploader", async () => {
  const { createElement } = await import("react");
  return { PhotoUploader: () => createElement("p", { id: "subidor-de-fotos" }, "las fotos") };
});
vi.mock("../../publication-context", () => ({
  readPublicationContext: async () => contextoDe(borrador),
}));

import StepPage from "./page";

const ZONES: readonly CuratedZone[] = [{ id: "altamira", cityId: "dc" }];

/** Ciento cuarenta y tantos caracteres: pasa el mínimo de 120 sin rozarlo. */
const DESCRIPCION =
  "Apartamento luminoso en piso alto, con vista abierta y closets en las dos habitaciones. Cocina equipada, agua diaria y una cuadra del metro.";

/** Los nueve pasos contestados y válidos. Cada prueba le saca lo que necesita. */
function borradorCompleto(): StoredDraft {
  return {
    listing: {
      propertyType: "apartamento",
      cityId: "dc",
      zoneId: "altamira",
      priceUsd: 450,
      rooms: 3,
      bathrooms: 2,
      parkingSpots: 1,
      areaM2: 90,
      title: "Apartamento en Altamira con vista al Ávila",
      description: DESCRIPCION,
      publisherType: "owner",
      contactMethod: "whatsapp",
      contactValue: "04121234567",
    },
    photos: [{ key: "publicador-1/sala.jpg", name: "sala.jpg", bytes: 120_000 }],
    featuresDeclared: true,
    violations: [],
  };
}

/** El mismo borrador sin los campos que se nombren. */
function sin(...campos: readonly string[]): StoredDraft {
  const base = borradorCompleto();
  const listing = { ...base.listing } as Record<string, unknown>;
  for (const campo of campos) delete listing[campo];
  return { ...base, listing: listing as StoredDraft["listing"] };
}

/**
 * El borrador que deja abierto ESE paso: completo salvo lo que ese paso
 * pregunta, que es lo que lo vuelve el primero incompleto.
 *
 * **Los nombres se escriben a mano y no salen de `STEP_LISTING_FIELDS`**:
 * preguntarle a la misma tabla que el sujeto usa afirmaría que la tabla es
 * igual a sí misma.
 */
function abre(paso: PublishStepId): StoredDraft {
  switch (paso) {
    case "tipo":
      return sin("propertyType");
    case "tamano":
      return sin("rooms", "areaM2");
    case "atributos":
      return { ...borradorCompleto(), featuresDeclared: false };
    case "titulo":
      return sin("title");
    case "fotos":
      return { ...borradorCompleto(), photos: [] };
    default:
      return sin("publisherType", "contactMethod", "contactValue");
  }
}

let borrador: StoredDraft = borradorCompleto();
/** Un paso al que se llega sin haber enviado nada todavía no tiene negativas. */
let huboIntento = true;

beforeEach(() => {
  borrador = borradorCompleto();
  huboIntento = true;
});

function contextoDe(draft: StoredDraft) {
  const violations = validatePublishableListing(draftListingOf(draft), ZONES);
  const currentStep = currentStepId(draft, violations);
  return {
    // Lo que la cookie lleva es lo que `actions.ts` guardó del último intento:
    // `stepViolations(stepId, …)`, sólo las del paso que se envió.
    draft: { ...draft, violations: huboIntento ? stepViolations(currentStep, violations) : [] },
    violations,
    currentStep,
    zoneName: "Altamira",
  };
}

async function servido(paso: PublishStepId): Promise<string> {
  return renderToStaticMarkup(
    await StepPage({
      params: Promise.resolve({ paso }),
      searchParams: Promise.resolve({}),
    }),
  );
}

/** Sólo el `<fieldset>` de esa leyenda: el paso 9 dibuja dos, y el 1 otro más. */
function conjunto(html: string, leyenda: string): string {
  const marca = html.indexOf(`>${leyenda}</legend>`);
  expect(marca).toBeGreaterThan(-1);
  const desde = html.lastIndexOf("<fieldset", marca);
  return html.slice(desde, html.indexOf("</fieldset>", desde));
}

/** Devuelve la etiqueta del control, y falla si no está dibujado. */
function control(alcance: string, name: string): string {
  const match = new RegExp(`<(?:input|textarea)[^>]*name="${name}"[^>]*>`).exec(alcance);
  if (!match) throw new Error(`no se dibuja el control name="${name}"`);
  return match[0];
}

/** La clase tal cual, para compararla con otra: su nombre es un hash del CSS. */
function clase(etiqueta: string): string {
  return /class="([^"]*)"/.exec(etiqueta)?.[1] ?? "";
}

/**
 * «Va antes» exige que las dos cosas estén.
 *
 * Sin las dos primeras líneas esto no afirma nada: `indexOf` devuelve −1 para
 * lo que no está, y −1 es menor que cualquier posición. Una pantalla que
 * dejara de dibujar el mensaje pasaría todas las aserciones de orden.
 */
function antesDe(alcance: string, primero: string, segundo: string): void {
  expect(alcance).toContain(primero);
  expect(alcance).toContain(segundo);
  expect(alcance.indexOf(primero)).toBeLessThan(alcance.indexOf(segundo));
}

describe("jerarquía de quién publica (36.12)", () => {
  it("sirve un solo H1 y conserva la leyenda nativa con srOnly, sin aria-hidden", async () => {
    huboIntento = false;
    borrador = abre("quien");

    const html = await servido("quien");
    const campo = conjunto(html, "¿Quién publica?");
    const leyenda = campo.match(/<legend[^>]*>¿Quién publica\?<\/legend>/g);

    expect(html.match(/<h1\b[^>]*>¿Quién publica\?<\/h1>/g)).toHaveLength(1);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(leyenda).toHaveLength(1);
    expect(campo).not.toContain("aria-hidden");
    expect(clase(leyenda?.[0] ?? "")).toBe(styles.srOnly);
  });

  it("conserva ambos labels y radios sin respuesta ni selección por defecto", async () => {
    huboIntento = false;
    borrador = abre("quien");

    const campo = conjunto(await servido("quien"), "¿Quién publica?");
    const labels = campo.match(/<label\b[^>]*>[\s\S]*?<\/label>/g) ?? [];

    expect(labels).toHaveLength(2);
    for (const [index, value, texto] of [
      [0, "owner", "Soy el dueño"],
      [1, "broker", "Inmobiliaria o corredor"],
    ] as const) {
      const label = labels[index];
      if (label === undefined) throw new Error(`no se dibuja el label de ${value}`);
      const radio = control(label, "publisherType");
      expect(radio).toContain('type="radio"');
      expect(radio).toContain(`value="${value}"`);
      expect(label).toContain(`<span>${texto}</span>`);
      expect(radio).not.toContain("checked");
    }
  });

  it.each(["owner", "broker"] as const)(
    "conserva exclusivamente la respuesta %s y la leyenda visible del contacto",
    async (publisherType) => {
      const base = borradorCompleto();
      borrador = { ...base, listing: { ...base.listing, publisherType } };

      const html = await servido("quien");
      const campo = conjunto(html, "¿Quién publica?");
      const radios = campo.match(/<input\b[^>]*name="publisherType"[^>]*>/g) ?? [];
      const seleccionados = radios.filter((radio) => radio.includes("checked"));

      expect(radios).toHaveLength(2);
      expect(seleccionados).toHaveLength(1);
      expect(seleccionados[0]).toContain(`value="${publisherType}"`);
      expect(conjunto(html, "¿Cómo te contactan?")).toContain(
        `<legend class="${styles.legend}">¿Cómo te contactan?</legend>`,
      );
    },
  );
});

/** 35.4 — el riel recibe el resumen de `stepSummary` y concuerda en número. */
describe("el riel resume los atributos en singular y en plural (35.4)", () => {
  it.each([
    [{ hasPowerPlant: true }, ">1 atributo<"],
    [{ hasPowerPlant: true, hasSecurity: true }, ">2 atributos<"],
  ])("con %o dice %s", async (atributos, resumen) => {
    const base = borradorCompleto();
    borrador = { ...base, listing: { ...base.listing, ...atributos } };

    expect(await servido("quien")).toContain(resumen);
  });
});

describe("cada paso lee su negativa al lado del control que la produjo (18.24)", () => {
  /**
   * **El par de todo lo que sigue, y por eso va primero.** Cada aserción de
   * abajo dice dónde aterriza un mensaje; una pantalla que dibujara el mensaje
   * SIEMPRE las pasaría todas. Se pide además el control de cada paso, que
   * falla si no está: «no dice nada» sobre una pantalla vacía no es silencio.
   */
  it.each([
    ["tipo", 'name="propertyType"'],
    ["tamano", 'name="rooms"'],
    ["titulo", 'name="title"'],
    ["fotos", 'id="subidor-de-fotos"'],
    ["quien", 'name="contactValue"'],
  ] as const)(
    "el paso %s abierto sin intento previo no dice ninguna negativa",
    async (paso, sonda) => {
      huboIntento = false;
      borrador = abre(paso);

      const html = await servido(paso);

      expect(html).toContain(sonda);
      expect(html).not.toContain("-error");
    },
  );

  /**
   * Paso 1. El mensaje va DENTRO del `<fieldset>`, entre la leyenda y la
   * primera opción, que es el orden en el que un lector de pantalla lo
   * encuentra. Ninguna de las cinco lleva `aria-describedby`, así que la
   * posición es todo lo que hay: se afirma la posición.
   */
  it("el paso 1 dice la negativa del tipo dentro de su fieldset, antes de la primera opción", async () => {
    borrador = abre("tipo");

    const campo = conjunto(await servido("tipo"), "Tipo de propiedad");

    expect(campo).toContain('id="propertyType-error"');
    antesDe(campo, "Dinos qué vas a alquilar.", 'name="propertyType"');
    // El par: las cinco opciones se siguen dibujando. Un fieldset que sólo
    // dibujara el mensaje pasaría la aserción de orden.
    expect(campo.match(/type="radio"/g)).toHaveLength(5);
  });

  /**
   * Paso 4. Sus cuatro controles comparten UN solo mensaje, y el orden del
   * `??` decide cuál se dice. Con dos campos vacíos se dice el de
   * habitaciones y el de los metros no se dice: no es un hueco, es que la
   * pantalla no tiene dónde poner el segundo.
   */
  it("el paso 4 dice una sola de sus cuatro negativas, la primera de su lista", async () => {
    borrador = sin("rooms", "areaM2");

    const html = await servido("tamano");

    expect(html).toContain("¿Cuántas habitaciones tiene?");
    expect(html).not.toContain("¿Cuántos metros cuadrados tiene?");
    expect(html.match(/id="tamano-error"/g)).toHaveLength(1);
    // El par: los cuatro controles están dibujados, así que lo que falta es el
    // mensaje del segundo y no el campo.
    for (const campo of ["rooms", "bathrooms", "parkingSpots", "areaM2"]) control(html, campo);
  });

  /**
   * Paso 4, la otra mitad. **Es la desviación de la regla de la 18.22 y se
   * afirma tal como se sirve**: el mensaje de los metros cuadrados se lee
   * arriba de todo, antes del campo de habitaciones, y su propio campo no lo
   * nombra. Anotada en el PR, no arreglada acá.
   */
  it("la negativa de los metros se lee antes del campo de habitaciones, y el suyo no la anuncia", async () => {
    borrador = sin("areaM2");

    const html = await servido("tamano");

    expect(html).toContain("¿Cuántos metros cuadrados tiene?");
    antesDe(html, 'id="tamano-error"', 'id="rooms"');
    expect(control(html, "areaM2")).not.toContain("aria-");
  });

  /**
   * Paso 5. **Es el único de los nueve sin lugar donde leer un mensaje, y es
   * seguro por una razón que se mide en vez de suponerse**: ni con el aviso
   * entero en blanco hay una sola violación cuyo paso sea el 5.
   */
  it("el paso 5 no dibuja ninguna negativa, porque el dominio no le manda ninguna", async () => {
    borrador = abre("atributos");

    const html = await servido("atributos");

    expect(html).not.toContain("-error");
    expect(html.match(/type="checkbox"/g)).toHaveLength(5);

    // `parkingSpots: 1.5` y no un borrador vacío: el paso 4 es el vecino con
    // un campo opcional, y un aviso en blanco no llega a producir su negativa.
    // Sin ese medio puesto de auto, mudar `parkingSpots.invalid` al paso 5
    // dejaría esta aserción en verde con el mensaje tragado.
    const todoMal = validatePublishableListing(
      draftListingOf({ listing: { parkingSpots: 1.5 }, photos: [] }),
      ZONES,
    );
    expect(todoMal).toContain("parkingSpots.invalid");
    expect(stepViolations("atributos", todoMal)).toEqual([]);
  });

  /** Paso 6, y es el que cumple la regla entera: antes, anunciado y marcado. */
  it("el paso 6 dice la negativa antes del título y anuncia el control", async () => {
    borrador = abre("titulo");

    const html = await servido("titulo");

    antesDe(html, 'id="title-error"', 'id="title"');
    expect(control(html, "title")).toContain('aria-invalid="true"');
    expect(control(html, "title")).toContain('aria-describedby="title-error"');
  });

  /**
   * Paso 6, la medida. La 18.25 probó el «Vas N» de la descripción; el título
   * lo dice con su propia cuenta y además dibuja el contador, así que los dos
   * números tienen que ser el mismo.
   *
   * **90 y 95 escritos a mano**: derivarlos de `MAX_TITLE_CHARACTERS` o del
   * largo del literal sería preguntarle a la misma constante que el sujeto usa.
   */
  it("la negativa del título largo trae lo escrito, y el contador dice el mismo número", async () => {
    const base = borradorCompleto();
    borrador = { ...base, listing: { ...base.listing, title: "a".repeat(95) } };

    const html = await servido("titulo");

    expect(html).toContain("Máximo 90 caracteres. Vas 95.");
    expect(html).toContain("95 / 90");
  });

  /**
   * Paso 8. El mensaje antes del subidor.
   *
   * **Contradicción anotada, no arreglada**: la frase manda al «paso 2» y las
   * fotos son el paso 8 (`STEP_COPY.fotos.number`). Se afirma lo que se sirve.
   */
  it("el paso 8 dice la negativa antes del subidor de fotos", async () => {
    borrador = abre("fotos");

    const html = await servido("fotos");

    expect(html).toContain("Sube al menos una foto en el paso 2.");
    antesDe(html, 'id="photos-error"', 'id="subidor-de-fotos"');
  });

  /**
   * Paso 9, que dibuja DOS fieldsets y por eso necesita dos mensajes. Acotado
   * a cada uno: un mensaje de quién publica leído en el bloque del contacto
   * diría que el contacto está mal.
   */
  it.each([
    ["+1 212 555 0134", "Para WhatsApp, usa un número venezolano: el código de país es +58."],
    [
      "+58 0412 1234567",
      "Después de +58 o 0058, no incluyas el 0 inicial del número para WhatsApp.",
    ],
    [
      "02121234567",
      "Este número es fijo. Selecciona Llamada; WhatsApp requiere un móvil venezolano.",
    ],
    [
      "0412 1234567 ext 2",
      "Revisa el formato y el prefijo del número para WhatsApp. Se permiten espacios, guiones y paréntesis alrededor del prefijo, no letras ni extensiones.",
    ],
    ["0412123456", "El número para WhatsApp tiene 10 dígitos. Este formato requiere 11."],
  ])("sirve negativa y conserva el contacto rechazado %s", async (contactValue, message) => {
    const base = borradorCompleto();
    borrador = { ...base, listing: { ...base.listing, contactValue } };
    const html = await servido("quien");
    expect(html).toContain(message);
    expect(html.indexOf('id="contact-error"')).toBeGreaterThan(html.indexOf('id="contactValue"'));
    expect(conjunto(html, "¿Cómo te contactan?")).not.toContain("-error");
    expect(control(html, "contactValue")).toContain(`value="${contactValue}"`);
    expect(conjunto(html, "¿Cómo te contactan?").match(/type="radio"/g)).toHaveLength(3);
  });

  it.each(["0412 123 4567", "4121234567", "+58 412 1234567", "0058 412 1234567", "584121234567"])(
    "sirve el formato admitido %s sin negativa",
    async (contactValue) => {
      const base = borradorCompleto();
      borrador = { ...base, listing: { ...base.listing, contactValue } };
      const html = await servido("quien");
      expect(html).not.toContain('id="contact-error"');
      expect(control(html, "contactValue")).toContain(`value="${contactValue}"`);
    },
  );

  it("sirve teléfono fijo sin negativa ni cambio de canal", async () => {
    const base = borradorCompleto();
    borrador = {
      ...base,
      listing: { ...base.listing, contactMethod: "telefono", contactValue: "02121234567" },
    };
    const html = await servido("quien");
    expect(html).not.toContain('id="contact-error"');
    expect(control(html, "contactValue")).toContain('value="02121234567"');
  });

  it("el paso 9 pone la negativa de quién publica en su fieldset y no en el del contacto", async () => {
    borrador = sin("publisherType");

    const html = await servido("quien");

    expect(conjunto(html, "¿Quién publica?")).toContain('id="publisherType-error"');
    expect(conjunto(html, "¿Cómo te contactan?")).not.toContain("-error");
    expect(conjunto(html, "¿Cómo te contactan?").match(/type="radio"/g)).toHaveLength(3);
  });

  /** El par exacto, en la otra dirección. */
  it("el paso 9 pone la negativa del contacto en su fieldset y no en el de quién publica", async () => {
    borrador = sin("contactMethod");

    const html = await servido("quien");

    expect(conjunto(html, "¿Cómo te contactan?")).toContain('id="contact-method-error"');
    expect(conjunto(html, "¿Cómo te contactan?")).toContain(
      'aria-describedby="contact-method-error"',
    );
    expect(html).not.toContain('id="contact-error"');
    expect(conjunto(html, "¿Quién publica?")).not.toContain("-error");
    expect(conjunto(html, "¿Quién publica?").match(/type="radio"/g)).toHaveLength(2);
  });

  /** F36.14 corrige el hallazgo: causa bajo el input, borde y vínculo accesible. */
  it("el dato rechazado vincula su causa debajo del control y conserva la ayuda", async () => {
    borrador = borradorCompleto();
    const sano = control(await servido("quien"), "contactValue");

    const base = borradorCompleto();
    borrador = { ...base, listing: { ...base.listing, contactValue: "no-es-un-telefono" } };
    const html = await servido("quien");
    const roto = control(html, "contactValue");

    expect(html).toContain(
      "Revisa el formato y el prefijo del número para WhatsApp. Se permiten espacios, guiones y paréntesis alrededor del prefijo, no letras ni extensiones.",
    );
    expect(html.indexOf('id="contact-error"')).toBeGreaterThan(html.indexOf('id="contactValue"'));
    expect(clase(roto)).toContain(clase(sano));
    expect(clase(roto)).not.toEqual(clase(sano));
    expect(roto).toContain('aria-invalid="true"');
    expect(roto).toContain('aria-describedby="contact-error contact-help"');
    expect(sano).not.toContain("aria-invalid");
    expect(sano).toContain('aria-describedby="contact-help"');
    expect(html).toContain('id="contact-help"');
  });
});
