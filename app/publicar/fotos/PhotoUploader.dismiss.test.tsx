// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoUploader, type UploadedPhoto } from "./PhotoUploader";

vi.mock("./actions", () => ({ requestUploadTargets: vi.fn() }));

/**
 * El menú de tres puntos (tasks.md 28.1), la segunda instancia confirmada por
 * el fundador. `PhotoUploader.test.tsx` corre en `environment: "node"` y su
 * propia cabecera dice que no puede ver "el clic que abre el menú" — este
 * archivo existe exactamente para esa interacción, en `happy-dom`.
 *
 * **El `<details>` nativo sigue siendo el mecanismo real.** No se reemplaza
 * por un `<div>` con estado: se vuelve controlado (`open` + `onToggle`) para
 * que la primitiva compartida pueda cerrarlo desde afuera, y sin JavaScript
 * el atributo `open` nunca se adjunta —React nunca lo serializa—, así que el
 * navegador sigue abriendo y cerrando con su propio mecanismo, intacto.
 */
const DOS: readonly UploadedPhoto[] = [
  { key: "k1", name: "Sala", bytes: 40_000 },
  { key: "k2", name: "Cocina", bytes: 41_000 },
];

describe("PhotoUploader — el menú de tres puntos se cierra de verdad (28.1)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function openFirstMenu(): HTMLElement {
    act(() => root.render(<PhotoUploader initial={DOS} />));
    const summary = container.querySelector("summary") as HTMLElement;
    act(() => summary.click());
    return summary;
  }

  it("un clic afuera cierra el menú de acciones", () => {
    openFirstMenu();
    const details = container.querySelector("details") as HTMLDetailsElement;
    expect(details.open).toBe(true);

    act(() => {
      document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });

    expect(details.open).toBe(false);
  });

  it("Escape cierra el menú de acciones", () => {
    openFirstMenu();
    const details = container.querySelector("details") as HTMLDetailsElement;

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(details.open).toBe(false);
  });

  it("al cerrar con Escape, el foco vuelve al botón de tres puntos", () => {
    const summary = openFirstMenu();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(document.activeElement).toBe(summary);
  });

  it.each([0, 1])(
    "Escape cierra el menú %i después de abrir, cerrar y reabrir antes de los efectos",
    (index) => {
      const firstSummary = openFirstMenu();
      // Deja cerrado el otro menú antes de ejercitar el segundo: su capa
      // global no debe competir por el foco con el disclosure bajo prueba.
      if (index === 1) act(() => firstSummary.click());
      const menus = container.querySelectorAll("details");
      const details = menus[index] as HTMLDetailsElement;
      const summary = details.querySelector("summary") as HTMLElement;
      const otherSummary = menus[1 - index]?.querySelector("summary");

      // Clics nativos reales, sin sustituir toggle: DOM y estado React pueden
      // diferir dentro del mismo act. Esto no prueba Enter en un navegador.
      act(() => {
        if (details.open) summary.click();
        summary.click();
        expect(details.open).toBe(true);
        summary.click();
        expect(details.open).toBe(false);
        summary.click();
        expect(details.open).toBe(true);
        const target =
          index === 0 ? summary : (details.querySelector("button") as HTMLButtonElement);
        target.focus();
        const escapeEvent = new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        });
        target.dispatchEvent(escapeEvent);

        expect(details.open).toBe(false);
        expect(document.activeElement).toBe(summary);
        expect(document.activeElement).not.toBe(otherSummary);
        expect(escapeEvent.defaultPrevented).toBe(true);
      });
      expect(details.open).toBe(false);
      expect(document.activeElement).toBe(summary);
    },
  );

  it("un clic DENTRO del menú no lo cierra", () => {
    openFirstMenu();
    const details = container.querySelector("details") as HTMLDetailsElement;
    const actionButton = details.querySelector("button") as HTMLButtonElement;

    act(() => {
      actionButton.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });

    expect(details.open).toBe(true);
  });
});
