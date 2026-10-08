// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({
  submitStep: Object.assign(vi.fn(), {
    $$FORM_ACTION: () => ({
      name: "$ACTION_ID_title-test",
      method: "post",
      action: "/publicar/paso/titulo",
      encType: "multipart/form-data",
      data: null,
    }),
  }),
}));
vi.mock("./fotos/PhotoUploader", () => ({ PhotoUploader: () => null }));

import { PublishStep, type PublishStepProps } from "./PublishStep";
import styles from "./publish-steps.module.css";

const props: PublishStepProps = {
  stepId: "titulo",
  draft: {
    listing: {
      propertyType: "apartamento",
      cityId: "dc",
      zoneId: "altamira",
      priceUsd: 450,
      rooms: 3,
      bathrooms: 2,
      parkingSpots: 1,
      areaM2: 90,
      title: "Título guardado",
    },
    photos: [{ key: "publicador-1/sala.jpg", name: "sala.jpg", bytes: 120_000 }],
    featuresDeclared: true,
  },
  violations: [],
  rail: [
    {
      id: "titulo",
      number: 6,
      label: "Título",
      summary: "Título guardado",
      done: true,
      navigable: true,
      current: true,
    },
  ],
  jumpable: [],
  progress: 56,
  draftExpired: false,
  returningToReview: false,
  discardHref: null,
  primaryLabel: "Seguir",
  previousStep: "atributos",
  zoneName: "Altamira",
};
let container: HTMLDivElement;
let root: Root;

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("missing title-step control");
  return value;
}
function input() {
  return required(container.querySelector<HTMLInputElement>("#title"));
}
function text(className: string | undefined) {
  return required(container.getElementsByClassName(required(className)).item(0)).textContent;
}
function expectLive(value: string, count: number) {
  expect(text(styles.counterLine)).toContain(`${count} / 90`);
  expect(text(styles.previewTitle)).toBe(value);
  expect(input().value).toBe(value);
}
function edit(value: string, inputType: string) {
  act(() => {
    // Bypass React's value tracker, as in the existing zone enhancement tests.
    required(Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set).call(
      input(),
      value,
    );
    // Simulates the resulting input event, not an OS clipboard operation.
    input().dispatchEvent(new InputEvent("input", { bubbles: true, inputType }));
  });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("unexpected network request");
    }),
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<PublishStep {...props} />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("el título vivo en PublishStep, no en un componente aislado", () => {
  it("teclear, pegar y borrar actualiza la tarjeta sin perder foco ni metadatos", () => {
    const control = input();
    control.focus();
    expectLive("Título guardado", 15);
    for (const [value, count, inputType] of [
      ["Casa", 4, "insertText"],
      ["Casa con patio", 14, "insertFromPaste"],
      ["Casa", 4, "deleteContentBackward"],
      ["", 0, "deleteContentBackward"],
    ] as const) {
      edit(value, inputType);
      expectLive(value, count);
      expect(input()).toBe(control);
      expect(document.activeElement).toBe(control);
      expect(text(styles.previewPrice)).toBe("$450");
      expect(text(styles.previewMeta)).toBe("Altamira · 3 hab · 90 m²");
      const form = required(control.form);
      expect(form.getAttribute("method")).toBe("post");
      expect(new FormData(form).get("title")).toBe(value);
      expect(new FormData(form).get("step")).toBe("titulo");
    }
    expect(props.draft.listing.title).toBe("Título guardado");
  });

  it.each([
    ["90 puntos de código astrales", "🏠".repeat(90), 90],
    ["91 caracteres ASCII", "a".repeat(91), 91],
  ])("cuenta %s sin truncar ni validar en el cliente", (_label, value, count) => {
    expect(input().maxLength).toBe(180);
    edit(value, "insertFromPaste");
    expectLive(value, count);
    expect(input().getAttribute("aria-invalid")).toBeNull();
    expect(container.querySelector("#title-error")).toBeNull();
    expect(new FormData(required(input().form)).get("title")).toBe(value);
  });
});
