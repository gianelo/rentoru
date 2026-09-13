// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * tasks.md 28.11 — el doble de la acción de servidor. `signOutAction` importa
 * `auth.ts` por importación diferida (sólo al invocarse, ver su propio
 * comentario), así que esta suite no necesita `DATABASE_URL` para renderizar
 * el menú — sólo la reemplaza para comprobar que SE LLAMA, sin ejecutar la
 * de verdad.
 */
const { signOutAction } = vi.hoisted(() => ({ signOutAction: vi.fn(async () => undefined) }));
vi.mock("@/modules/identity/infrastructure/sign-out-action", () => ({ signOutAction }));

const { AccountMenu } = await import("./AccountMenu");

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

  /**
   * tasks.md 28.11 — «el menú de cuenta no tiene cómo cerrar sesión». La
   * medición del fundador y el barrido de la 28.10: `signOut|cerrar sesión`
   * no aparecía en ninguna parte de `app/` ni `components/`.
   */
  describe("«Cerrar sesión» (28.11)", () => {
    beforeEach(() => {
      signOutAction.mockClear();
    });

    it("el panel abierto la ofrece dentro de un <form>, nunca de un enlace", () => {
      openMenu();
      const boton = container.querySelector(
        'form button[type="submit"]',
      ) as HTMLButtonElement | null;

      expect(boton).not.toBeNull();
      expect(boton?.textContent).toContain("Cerrar sesión");
      // El mecanismo: un POST de verdad, no un `<a>` con `onClick` — un `GET`
      // que termina una sesión es el defecto que esta tarea cierra.
      expect(boton?.closest("a")).toBeNull();
    });

    it("usarlo llama a la acción de servidor que cierra la sesión, y no navega", () => {
      openMenu();
      const form = container.querySelector("form") as HTMLFormElement;

      act(() => {
        form.requestSubmit();
      });

      expect(signOutAction).toHaveBeenCalledTimes(1);
    });
  });
});
