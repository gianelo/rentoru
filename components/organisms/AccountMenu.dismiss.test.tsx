// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AccountMenu } from "./AccountMenu";

/**
 * El menú de cuenta (tasks.md 28.1), la instancia confirmada por el
 * fundador: *"ningún menú que abre se cierra, hay que darle de nuevo al
 * botón"*. `AccountMenu.test.tsx` ya prueba el marcado servido antes de
 * hidratar (`environment: "node"`, sin DOM); este archivo corre en
 * `happy-dom` porque el defecto que cierra ES una interacción real —clic
 * afuera, Escape— que ningún `renderToStaticMarkup` puede ejercitar.
 */
const BASE = {
  href: "/mis-avisos",
  triggerLabel: "Mis avisos",
  triggerLabelVisible: true,
  initials: "MF",
  imageUrl: null,
  panelTitle: "María Fernández",
  panelEmail: "maria.f@gmail.com",
  items: [{ label: "Mis avisos", href: "/mis-avisos" }],
};

describe("AccountMenu — se cierra de verdad (28.1)", () => {
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

  function openMenu(): HTMLAnchorElement {
    act(() => root.render(<AccountMenu {...BASE} />));
    const trigger = container.querySelector("a") as HTMLAnchorElement;
    act(() => trigger.click());
    return trigger;
  }

  it("un clic afuera cierra el panel", () => {
    openMenu();
    expect(container.querySelector('[role="menu"]')).not.toBeNull();

    act(() => {
      document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });

    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it("Escape cierra el panel", () => {
    openMenu();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it("al cerrar con Escape, el foco vuelve al control de cuenta", () => {
    const trigger = openMenu();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(document.activeElement).toBe(trigger);
  });

  it("aria-expanded refleja el estado, en los dos sentidos", () => {
    const trigger = openMenu();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("un clic DENTRO del panel no lo cierra", () => {
    openMenu();
    const itemLink = container.querySelector('[role="menuitem"]') as HTMLAnchorElement;

    act(() => {
      itemLink.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });

    expect(container.querySelector('[role="menu"]')).not.toBeNull();
  });
});
