// @vitest-environment happy-dom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useDismissLayer } from "./useDismissLayer";

/**
 * La primitiva de capa descartable (tasks.md 28.1). **Este archivo corre en
 * `happy-dom` y no en `node`** — a diferencia del resto de `components/`,
 * que sólo puede medir el marcado que sale antes de hidratar
 * (`renderToStaticMarkup`). Un clic afuera y una tecla Escape de verdad no
 * existen sin un DOM que los reciba, y es exactamente esa ausencia la que
 * dejó pasar el defecto que esta tarea cierra (tasks.md, cabecera de la Fase
 * 28: "ninguna prueba puede ponerse roja porque un menú no cierre").
 *
 * Un botón de prueba y un panel de prueba, con el hook en el medio — nada de
 * `AccountMenu` ni `PhotoUploader` acá: ésos tienen su propia prueba de
 * adopción. Ésta prueba SÓLO el mecanismo compartido.
 */
function TestMenu({ onDismiss }: { readonly onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  const { triggerRef, panelRef } = useDismissLayer<HTMLButtonElement, HTMLDivElement>(open, () => {
    setOpen(false);
    onDismiss();
  });

  return (
    <div>
      <button type="button" ref={triggerRef} onClick={() => setOpen((current) => !current)}>
        Abrir
      </button>
      {open ? (
        <div ref={panelRef} role="menu">
          <button type="button">Adentro</button>
        </div>
      ) : null}
      <button type="button">Afuera</button>
    </div>
  );
}

describe("useDismissLayer — la primitiva compartida (28.1)", () => {
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

  function open(): void {
    const trigger = container.querySelector("button") as HTMLButtonElement;
    act(() => trigger.click());
  }

  it("un clic afuera cierra el panel", () => {
    let dismissed = false;
    act(() => root.render(<TestMenu onDismiss={() => (dismissed = true)} />));
    open();
    expect(container.querySelector('[role="menu"]')).not.toBeNull();

    const outside = container.querySelectorAll("button")[2] as HTMLButtonElement;
    act(() => {
      outside.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });

    expect(dismissed).toBe(true);
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it("un clic ADENTRO del panel no lo cierra", () => {
    let dismissed = false;
    act(() => root.render(<TestMenu onDismiss={() => (dismissed = true)} />));
    open();

    const inside = container.querySelector('[role="menu"] button') as HTMLButtonElement;
    act(() => {
      inside.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });

    expect(dismissed).toBe(false);
    expect(container.querySelector('[role="menu"]')).not.toBeNull();
  });

  it("Escape cierra el panel", () => {
    let dismissed = false;
    act(() => root.render(<TestMenu onDismiss={() => (dismissed = true)} />));
    open();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(dismissed).toBe(true);
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it("al cerrar, el foco vuelve al control que abrió", () => {
    act(() => root.render(<TestMenu onDismiss={() => {}} />));
    open();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    const trigger = container.querySelector("button") as HTMLButtonElement;
    expect(document.activeElement).toBe(trigger);
  });
});
