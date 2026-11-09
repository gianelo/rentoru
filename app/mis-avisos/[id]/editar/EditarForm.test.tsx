// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EstadoDeEdicion } from "../../editar-estado";

/**
 * Fase 44 (44.2, S4) — **lo escrito vuelve.** «le di a guardar aviso y ahí se
 * reinició todo»: precio, habitaciones y metros volvían a lo guardado.
 *
 * `useActionState` se dobla para fijar el estado que React dibujaría después
 * de una negativa; que la acción lo devuelva lo prueba `actions.test.ts`. Acá
 * se prueba que cada control pinta lo enviado antes que lo guardado.
 */

const { useActionState, estado, accionFalsa } = vi.hoisted(() => {
  const estado: { actual: EstadoDeEdicion; pendiente: boolean } = {
    actual: { motivos: [], medidas: {} },
    pendiente: false,
  };
  const accionFalsa = vi.fn();
  return {
    estado,
    accionFalsa,
    useActionState: vi.fn(() => [estado.actual, accionFalsa, estado.pendiente]),
  };
});

vi.mock("react", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useActionState,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/mis-avisos" }));
vi.mock("../../actions", () => ({ guardarEdicion: vi.fn() }));

import { guardarEdicion } from "../../actions";
import { EditarForm } from "./EditarForm";

const AVISO = {
  id: "aviso-1",
  publisherId: "dueno-1",
  publisherType: "owner" as const,
  propertyType: "apartamento" as const,
  cityId: "dc",
  zoneId: "altamira",
  title: "Apartamento amoblado en La Castellana",
  description: "Piso alto con vista abierta, cocina equipada y vigilancia 24 horas.",
  priceUsd: 610,
  rooms: 3,
  areaM2: 128,
  bathrooms: 2,
  parkingSpots: 1,
  reference: "Frente a la panadería",
  hasPowerPlant: true,
  hasRegularWater: false,
  isFurnished: false,
  hasSecurity: false,
  hasAppliances: false,
  contactMethod: "whatsapp" as const,
  contactValue: "04121234567",
  photoCount: 3,
};

const INICIAL: EstadoDeEdicion = { motivos: [], medidas: {} };
// Por ruta y no por `import.meta.url`, que en happy-dom no es un `file:`.
const CSS = "app/mis-avisos/[id]/editar/editar.module.css";

const FOTOS = [
  { photoId: "foto-a", thumbUrl: "https://fotos.example/a.webp", alt: "Foto 1 de 3" },
  { photoId: "foto-b", thumbUrl: null, alt: "Foto 2 de 3" },
  { photoId: "foto-c", thumbUrl: "https://fotos.example/c.webp", alt: "Foto 3 de 3" },
];

function dibujar(actual: EstadoDeEdicion, pendiente = false): string {
  estado.actual = actual;
  estado.pendiente = pendiente;
  return renderToStaticMarkup(
    <EditarForm
      aviso={AVISO}
      estadoInicial={INICIAL}
      fotos={FOTOS}
      subirFoto={<p>RANURA DE SUBIR</p>}
    />,
  );
}

/** La etiqueta del control, y falla si no está dibujado. */
function control(html: string, name: string, value?: string): string {
  const conValor = value === undefined ? "" : `[^>]*value="${value}"`;
  const match = new RegExp(`<input[^>]*name="${name}"${conValor}[^>]*/>`).exec(html);
  if (!match) throw new Error(`no se dibuja el control name="${name}" ${value ?? ""}`);
  return match[0];
}

beforeEach(() => {
  useActionState.mockClear();
  accionFalsa.mockClear();
});

/** Los ids que viajan como `ordenFoto`, en el orden de los bytes. */
function ordenServido(html: string): string[] {
  return [...html.matchAll(/name="ordenFoto" value="([^"]+)"/g)].map((match) => match[1] ?? "");
}

/** El renglón de una foto, desde su `<li>` hasta el cierre. */
function renglon(html: string, photoId: string): string {
  const orden = html.indexOf(`name="ordenFoto" value="${photoId}"`);
  expect(orden, photoId).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<li", orden), html.indexOf("</li>", orden));
}

describe("EditarForm — lo escrito vuelve después de una negativa (44.2)", () => {
  it("siembra useActionState con la acción de guardar y el estado de la página", () => {
    dibujar(INICIAL);

    expect(useActionState).toHaveBeenCalledWith(guardarEdicion, INICIAL);
  });

  it("con valores enviados, cada control pinta lo enviado y no lo guardado", () => {
    const html = dibujar({
      motivos: ["description.tooShort"],
      medidas: { descriptionLength: 5 },
      valores: {
        title: "Casa con patio",
        description: "corto",
        priceUsd: "abc",
        rooms: "4",
        propertyType: "casa",
        contactMethod: "telefono",
        featuresDeclared: "1",
        hasSecurity: "on",
      },
    });

    expect(control(html, "title")).toContain('value="Casa con patio"');
    expect(html).toMatch(/<textarea[^>]*name="description"[^>]*>corto<\/textarea>/);
    expect(html).not.toContain("Piso alto con vista abierta");
    // Crudo: el «abc» vuelve tal cual, para que se vea qué se rechazó.
    expect(control(html, "priceUsd")).toContain('value="abc"');
    expect(control(html, "rooms")).toContain('value="4"');
    expect(control(html, "propertyType", "casa")).toContain('checked=""');
    expect(control(html, "propertyType", "apartamento")).not.toContain("checked");
    expect(control(html, "contactMethod", "telefono")).toContain('checked=""');
    expect(control(html, "contactMethod", "whatsapp")).not.toContain("checked");
    // Una casilla marcada viaja en el `FormData`; una destildada no viaja.
    expect(control(html, "hasSecurity")).toContain('checked=""');
    expect(control(html, "hasPowerPlant")).not.toContain("checked");
    expect(html).toContain("Vas 5.");
  });

  it("sin valores enviados, cada control pinta lo guardado", () => {
    const html = dibujar(INICIAL);

    expect(control(html, "title")).toContain(`value="${AVISO.title}"`);
    expect(html).toContain(`>${AVISO.description}</textarea>`);
    expect(control(html, "priceUsd")).toContain('value="610"');
    expect(control(html, "rooms")).toContain('value="3"');
    expect(control(html, "propertyType", "apartamento")).toContain('checked=""');
    expect(control(html, "contactMethod", "whatsapp")).toContain('checked=""');
    expect(control(html, "hasPowerPlant")).toContain('checked=""');
    expect(control(html, "hasSecurity")).not.toContain("checked");
    expect(control(html, "reference")).toContain('value="Frente a la panadería"');
  });

  it("una negativa con campo se lee al lado de ese campo, que se anuncia inválido", () => {
    const html = dibujar({ motivos: ["priceUsd.invalid"], medidas: {} });

    expect(html).toContain('id="priceUsd-error"');
    expect(control(html, "priceUsd")).toContain('aria-invalid="true"');
    expect(html).toContain("Solo el número, en dólares");
    expect(html).not.toContain('role="alert"');
  });

  /**
   * 44.3 (S5): «hizo como si se guardara pero no se guardó». Un numérico en
   * blanco ya no se traga: vuelve como `X.required`, y esta prueba fija que
   * el HTML servido lo dice al lado de CADA uno de los cuatro, con el campo
   * vacío tal como se envió y no con el valor de ayer.
   */
  it("precio, habitaciones, baños y metros en blanco se anuncian obligatorios junto a su campo", () => {
    const html = dibujar({
      motivos: ["priceUsd.required", "rooms.required", "bathrooms.required", "areaM2.required"],
      medidas: {},
      valores: { priceUsd: "", rooms: "", bathrooms: "", areaM2: "" },
    });

    for (const name of ["priceUsd", "rooms", "bathrooms", "areaM2"]) {
      expect(html, name).toContain(`id="${name}-error"`);
      expect(control(html, name), name).toContain('aria-invalid="true"');
      expect(control(html, name), name).toContain('value=""');
    }
    expect(html).toContain("Pon el alquiler mensual en dólares");
    expect(html).toContain("¿Cuántas habitaciones tiene?");
    expect(html).toContain("¿Cuántos metros cuadrados tiene?");
    expect(html).not.toContain('value="610"');
    expect(html).not.toContain('role="alert"');
  });

  it("una negativa sin campo se dice en el bloque de arriba, anunciada", () => {
    estado.pendiente = false;
    const html = dibujar({ motivos: ["photos.required"], medidas: {} });

    expect(html).toMatch(/<p[^>]*role="alert"[^>]*>No se pudo guardar:[^<]*Sube al menos una foto/);
    expect(html).not.toContain('id="photos-error"');
  });
});

/**
 * Fase 44 (44.4b, S2) — «si yo no he guardado los cambios todavía las fotos
 * se eliminan». Quitar ya no borra: marca, y la marca viaja con Guardar.
 */
describe("EditarForm — quitar fotos al guardar (44.4b)", () => {
  it("cada foto trae su casilla «Quitar al guardar» dentro del formulario que guarda", () => {
    const html = dibujar(INICIAL);
    const abre = html.indexOf("<form");
    const cierra = html.indexOf("</form>");

    for (const { photoId } of FOTOS) {
      const casilla = control(html, "quitarFoto", photoId);
      expect(casilla).toContain('type="checkbox"');
      expect(casilla).not.toContain("checked");
      expect(html.indexOf(casilla)).toBeGreaterThan(abre);
      expect(html.indexOf(casilla)).toBeLessThan(cierra);
    }
    expect(html).toContain('aria-label="Quitar al guardar: Foto 2"');
    // 44.5b: «Portada» pasó de un paréntesis a su chip (lámina, estado 5).
    expect(renglon(html, "foto-a")).toMatch(/Foto 1 <span[^>]*>Portada<\/span>/);
    // Subir sigue siendo inmediato y vive en la sección, antes de los campos.
    expect(html.indexOf("RANURA DE SUBIR")).toBeLessThan(html.indexOf('name="title"'));
  });

  it("después de una negativa, las marcadas vuelven marcadas y las demás no", () => {
    const html = dibujar({ motivos: ["title.required"], medidas: {}, fotosAQuitar: ["foto-b"] });

    expect(control(html, "quitarFoto", "foto-b")).toContain('checked=""');
    expect(control(html, "quitarFoto", "foto-a")).not.toContain("checked");
  });

  it("cada renglon dice que se quitará, y el aviso de Guardar recuerda que se elimina", () => {
    const html = dibujar(INICIAL);
    const aviso = html.indexOf("Recuerda: la foto marcada se eliminará al guardar.");

    expect(html.split("Se quitará al guardar").length - 1).toBe(FOTOS.length);
    expect(aviso).toBeGreaterThan(html.indexOf('name="contactValue"'));
    expect(aviso).toBeLessThan(html.indexOf("Guardar cambios"));
  });

  it("la negativa de quitar fotos se lee debajo de la lista y cada casilla la anuncia", () => {
    const html = dibujar({ motivos: ["photosToRemove.notFound"], medidas: {} });
    const error = html.indexOf('id="photosToRemove-error"');

    expect(error).toBeGreaterThan(html.indexOf(control(html, "quitarFoto", "foto-c")));
    expect(error).toBeLessThan(html.indexOf('name="title"'));
    expect(control(html, "quitarFoto", "foto-a")).toContain(
      'aria-describedby="photosToRemove-error"',
    );
    expect(html).toContain("Esa foto ya no está. Revisa y vuelve a guardar.");
    expect(html).not.toContain('role="alert"');
  });

  it("mientras guarda dibuja el indicador global, con su salida a esta misma pantalla", () => {
    const html = dibujar(INICIAL, true);

    expect(html).toContain("Guardando los cambios…");
    expect(html).toContain('href="/mis-avisos/aviso-1/editar"');
    expect(html).toContain("Dejar de esperar");
    expect(dibujar(INICIAL, false)).not.toContain("Guardando los cambios…");
  });

  /** Sin JavaScript: la marca se ve por CSS, y sin `opacity` (AA, lámina). */
  it("la foto marcada y el aviso se muestran con :has(:checked), sin opacidad", () => {
    const css = readFileSync(CSS, "utf8");

    expect(css).toMatch(/\.foto:has\(\.quitar:checked\)/);
    expect(css).toMatch(/:has\(\.quitar:checked\) \.recuerda/);
    expect(css).not.toContain("opacity");
  });
});

/**
 * Fase 44 (44.5b, S6) — «no me deja cambiar cuál es la portada». El orden
 * vuelve en el estado (sin JavaScript, después de un botón o de una
 * negativa); la página no puede sembrarlo, así que se fija acá.
 */
describe("EditarForm — portada y orden al guardar (44.5b)", () => {
  it("con un orden de vuelta, dibuja las fotos en ese orden y anuncia la portada nueva", () => {
    const html = dibujar({ ...INICIAL, ordenFotos: ["foto-c", "foto-a", "foto-b"] });

    expect(ordenServido(html)).toEqual(["foto-c", "foto-a", "foto-b"]);
    expect(html).toMatch(
      /<p[^>]*role="status"[^>]*>Foto 3 es la nueva portada\. Se aplica al guardar\.<\/p>/,
    );
    // Cada foto conserva su nombre: es su identidad, no su lugar.
    const portada = renglon(html, "foto-c");
    expect(portada).toMatch(/Foto 3 <span[^>]*>Portada<\/span>/);
    expect(portada).toContain("Se ve primero en los resultados");
    expect(portada).toContain('aria-label="Quitar al guardar: Foto 3"');
    expect(portada).not.toContain('value="makeCover:foto-c"');
    expect(portada).not.toContain('value="moveUp:foto-c"');
    expect(portada).toContain('value="moveDown:foto-c"');
    expect(renglon(html, "foto-a")).toContain("Posición 2 · era la portada");
    expect(renglon(html, "foto-a")).toContain('value="makeCover:foto-a"');
    expect(renglon(html, "foto-b")).toContain("Posición 3");
    expect(renglon(html, "foto-b")).not.toContain("era la portada");
    expect(renglon(html, "foto-b")).not.toContain('value="moveDown:foto-b"');
  });

  it("el chip de la portada usa el nivel 2 de la lámina, sólo con tokens", () => {
    const chip = /\.portada \{[^}]*\}/.exec(readFileSync(CSS, "utf8"))?.[0] ?? "";

    expect(chip).toContain("background: var(--tint)");
    expect(chip).toContain("border: 1px solid var(--accent)");
    expect(chip).toContain("color: var(--accent)");
  });

  it("la misma portada con otro orden dice sólo que el orden se aplica al guardar", () => {
    const html = dibujar({ ...INICIAL, ordenFotos: ["foto-a", "foto-c", "foto-b"] });

    expect(html).toMatch(/role="status"[^>]*>El nuevo orden se aplica al guardar\.<\/p>/);
    expect(html).not.toContain("nueva portada");
  });

  it("sin cambios no anuncia nada, y el orden es el del aviso", () => {
    const html = dibujar(INICIAL);

    expect(ordenServido(html)).toEqual(["foto-a", "foto-b", "foto-c"]);
    expect(html).toMatch(/role="status"[^>]*><\/p>/);
  });

  it("un orden con una foto que ya no está y sin una nueva dibuja las del aviso", () => {
    const html = dibujar({ ...INICIAL, ordenFotos: ["foto-z", "foto-c"] });

    expect(ordenServido(html)).toEqual(["foto-c", "foto-a", "foto-b"]);
    expect(html).not.toContain("foto-z");
  });

  /**
   * Con JavaScript el botón no viaja (L17): reordena en el navegador con la
   * MISMA función del dominio, sin envío y sin el indicador de espera.
   */
  it("con JavaScript, «Hacer portada» reordena en el navegador sin enviar el formulario", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    estado.actual = INICIAL;
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    act(() => root.render(<EditarForm aviso={AVISO} estadoInicial={INICIAL} fotos={FOTOS} />));

    act(() => {
      container.querySelector<HTMLButtonElement>('button[value="makeCover:foto-c"]')?.click();
    });

    const orden = () =>
      [...container.querySelectorAll<HTMLInputElement>('input[name="ordenFoto"]')].map(
        (input) => input.value,
      );
    expect(orden()).toEqual(["foto-c", "foto-a", "foto-b"]);
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Foto 3 es la nueva portada. Se aplica al guardar.",
    );
    expect(accionFalsa).not.toHaveBeenCalled();

    // Un estado nuevo de la acción (una negativa) manda sobre el local.
    estado.actual = { ...INICIAL, ordenFotos: ["foto-b", "foto-a", "foto-c"] };
    act(() => root.render(<EditarForm aviso={AVISO} estadoInicial={INICIAL} fotos={FOTOS} />));
    expect(orden()).toEqual(["foto-b", "foto-a", "foto-c"]);

    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
});
