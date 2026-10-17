// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({
  submitStep: Object.assign(vi.fn(), {
    $$FORM_ACTION: () => ({
      name: "$ACTION_ID_contact-test",
      method: "post",
      action: "/publicar/paso/quien",
      encType: "multipart/form-data",
      data: null,
    }),
  }),
}));
vi.mock("./fotos/PhotoUploader", () => ({ PhotoUploader: () => null }));

import { PublishStep, type PublishStepProps } from "./PublishStep";
import styles from "./publish-steps.module.css";

const props: PublishStepProps = {
  stepId: "quien",
  draft: {
    listing: { contactMethod: "whatsapp", contactValue: "04246162812" },
    photos: [],
    featuresDeclared: true,
  },
  violations: [],
  rail: [],
  jumpable: [],
  progress: 90,
  draftExpired: false,
  returningToReview: false,
  discardHref: null,
  primaryLabel: "Seguir",
  previousStep: "fotos",
  zoneName: undefined,
};
let container: HTMLDivElement;
let root: Root;
function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("missing contact-step control");
  return value;
}
function control() {
  return required(container.querySelector<HTMLInputElement>("#contactValue"));
}
function error() {
  const node = container.querySelector<HTMLParagraphElement>("#contact-error");
  return node?.hidden ? null : node;
}
function edit(value: string) {
  act(() => {
    required(Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set).call(
      control(),
      value,
    );
    control().dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
}
function blur() {
  act(() => {
    control().dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
}
function channel(value: string) {
  act(() => {
    required(
      container.querySelector<HTMLInputElement>(`input[name="contactMethod"][value="${value}"]`),
    ).click();
  });
}
const lengthMessage = "El número para WhatsApp tiene 12 dígitos. Este formato requiere 11.";
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
it("waits for first blur, then reports the exact cause below the input", () => {
  edit("042431244444");
  expect(error()).toBeNull();
  blur();
  expect(error()?.textContent).toBe(lengthMessage);
  expect(control().getAttribute("aria-invalid")).toBe("true");
  expect(control().classList.contains(required(styles.controlInvalid))).toBe(true);
  expect(control().getAttribute("aria-describedby")).toBe("contact-error contact-help");
  expect(container.innerHTML.indexOf('id="contact-error"')).toBeGreaterThan(
    container.innerHTML.indexOf('id="contactValue"'),
  );
});
it("corrects live after blur without normalization, focus loss or form changes", () => {
  edit("042431244444");
  blur();
  expect(error()?.textContent).toBe(lengthMessage);
  const input = control();
  input.focus();
  edit("0412 123 4567");
  expect(error()).toBeNull();
  expect(control()).toBe(input);
  expect(document.activeElement).toBe(input);
  expect(input.getAttribute("aria-invalid")).toBeNull();
  expect(input.classList.contains(required(styles.controlInvalid))).toBe(false);
  expect(input.getAttribute("aria-describedby")).toBe("contact-help");
  const data = new FormData(required(input.form));
  expect(data.get("contactValue")).toBe("0412 123 4567");
  expect(data.get("contactMethod")).toBe("whatsapp");
  expect(data.get("step")).toBe("quien");
  expect(props.draft.listing.contactValue).toBe("04246162812");
});
it("recomputes the cause when the channel changes after blur", () => {
  edit("0212 1234567");
  blur();
  expect(error()?.textContent).toBe(
    "Este número es fijo. Selecciona Llamada; WhatsApp requiere un móvil venezolano.",
  );
  channel("telefono");
  expect(error()).toBeNull();
  channel("email");
  expect(error()?.textContent).toContain("correo");
  expect(error()?.textContent).not.toMatch(/teléfono|WhatsApp/);
  expect(new FormData(required(control().form)).get("contactMethod")).toBe("email");
  expect(control().value).toBe("0212 1234567");
});
it("keeps the server rejection visible immediately and allows live correction", () => {
  act(() =>
    root.render(
      <PublishStep
        {...props}
        draft={{
          ...props.draft,
          listing: { contactMethod: "whatsapp", contactValue: "042431244444" },
        }}
        violations={["contactValue.invalid"]}
      />,
    ),
  );
  expect(error()?.textContent).toBe(lengthMessage);
  edit("04246162812");
  expect(error()).toBeNull();
});
