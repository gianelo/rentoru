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

const { useActionState, estado } = vi.hoisted(() => {
  const estado: { actual: EstadoDeEdicion } = { actual: { motivos: [], medidas: {} } };
  const accionFalsa = vi.fn();
  return {
    estado,
    useActionState: vi.fn(() => [estado.actual, accionFalsa, false]),
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

function dibujar(actual: EstadoDeEdicion): string {
  estado.actual = actual;
  return renderToStaticMarkup(<EditarForm aviso={AVISO} estadoInicial={INICIAL} />);
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
});

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
    const html = dibujar({ motivos: ["photos.required"], medidas: {} });

    expect(html).toMatch(/<p[^>]*role="alert"[^>]*>No se pudo guardar:[^<]*Sube al menos una foto/);
    expect(html).not.toContain('id="photos-error"');
  });
});
