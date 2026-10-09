// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({
  submitStep: Object.assign(vi.fn(), {
    $$FORM_ACTION: () => ({
      name: "$ACTION_ID_description-test",
      method: "post",
      action: "/publicar/paso/descripcion",
      encType: "multipart/form-data",
      data: null,
    }),
  }),
}));
vi.mock("./fotos/PhotoUploader", () => ({ PhotoUploader: () => null }));

import { PublishStep, type PublishStepProps } from "./PublishStep";
import styles from "./publish-steps.module.css";

const props: PublishStepProps = {
  stepId: "descripcion",
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
      description: "a".repeat(119),
    },
    photos: [{ key: "publicador-1/sala.jpg", name: "sala.jpg", bytes: 120_000 }],
    featuresDeclared: true,
  },
  violations: [],
  rail: [],
  jumpable: [],
  progress: 67,
  draftExpired: false,
  returningToReview: false,
  discardHref: null,
  primaryLabel: "Seguir",
  previousStep: "titulo",
  zoneName: "Altamira",
};
let container: HTMLDivElement;
let root: Root;

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("missing description-step control");
  return value;
}
function input() {
  return required(container.querySelector<HTMLTextAreaElement>("#description"));
}
function expectLive(value: string, count: number, guide: string, progress: number) {
  expect(input().value).toBe(value);
  const counter = required(container.querySelector(`.${styles.counterLine}`));
  expect(counter.textContent).toContain(`${count} / 120`);
  expect(counter.textContent).toContain(guide);
  const fill = required(container.querySelector<HTMLElement>(`.${styles.meterFill}`));
  expect(fill.style.inlineSize).toBe(`${progress}%`);
}
function edit(value: string, inputType: string) {
  act(() => {
    // Bypass React's tracker; paste means the resulting input, not OS clipboard access.
    required(Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set).call(
      input(),
      value,
    );
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

describe("la descripción viva en el PublishStep existente", () => {
  it("teclear, pegar y borrar actualiza guía y progreso sin perder foco ni el POST", () => {
    const control = input();
    const saved = JSON.stringify(props.draft);
    control.focus();
    expectLive("a".repeat(119), 119, "te faltan 1 caracteres", 99);
    for (const [value, count, guide, progress, inputType] of [
      ["a".repeat(120), 120, "ya alcanza", 100, "insertText"],
      ["🏠".repeat(120), 120, "ya alcanza", 100, "insertFromPaste"],
      ["a".repeat(119), 119, "te faltan 1 caracteres", 99, "deleteContentBackward"],
      ["", 0, "te faltan 120 caracteres", 0, "deleteContentBackward"],
      ["a".repeat(1201), 1201, "ya alcanza", 100, "insertFromPaste"],
    ] as const) {
      edit(value, inputType);
      expectLive(value, count, guide, progress);
      expect(input()).toBe(control);
      expect(document.activeElement).toBe(control);
      expect(control.hasAttribute("maxlength")).toBe(false);
      expect(control.getAttribute("aria-invalid")).toBeNull();
      expect(container.querySelector("#description-error")).toBeNull();
      const label = container.querySelector('label[for="description"]');
      expect(label?.textContent).toBe("Descripción");
      const form = required(control.form);
      expect(form.getAttribute("method")).toBe("post");
      expect(new FormData(form).get("description")).toBe(value);
      expect(new FormData(form).get("step")).toBe("descripcion");
      expect(form.querySelector('button[type="submit"]')?.textContent).toBe("Seguir");
    }
    expect(JSON.stringify(props.draft)).toBe(saved);
    act(() => root.render(<PublishStep {...props} stepId="titulo" />));
    const cardTitle = container.querySelector(`.${styles.previewTitle}`);
    const cardPrice = container.querySelector(`.${styles.previewPrice}`);
    const cardMeta = container.querySelector(`.${styles.previewMeta}`);
    expect(cardTitle?.textContent).toBe("Título guardado");
    expect(cardPrice?.textContent).toBe("$450");
    expect(cardMeta?.textContent).toBe("Altamira · 3 hab · 90 m²");
  });

  it("un rerender conserva lo tecleado; solo otro texto guardado reinicia el campo", () => {
    const control = input();
    edit("🏠".repeat(120), "insertFromPaste");
    act(() => root.render(<PublishStep {...props} />));
    expect(input()).toBe(control);
    expectLive("🏠".repeat(120), 120, "ya alcanza", 100);
    const draft = { ...props.draft, listing: { ...props.draft.listing, description: "Casa" } };
    act(() => root.render(<PublishStep {...props} draft={draft} />));
    expectLive("Casa", 4, "te faltan 116 caracteres", 3);
    expect(new FormData(required(input().form)).get("description")).toBe("Casa");
  });
});
