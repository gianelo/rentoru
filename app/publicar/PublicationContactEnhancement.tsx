"use client";
import { useEffect, useState } from "react";
import { publicationContactDecision } from "@/modules/listing-publication/application/publication-contact-schema";
import type { ContactMethod } from "@/modules/listing-publication/domain/publishable-listing";
import { FieldError } from "./FieldError";
import styles from "./publish-steps.module.css";
import { PUBLISH_VIOLATION_COPY } from "./violation-copy";

/** Own only feedback pixels. Native inputs, raw text and submission remain untouched. */
export function PublicationContactEnhancement({
  field,
  message,
  initiallyTouched,
}: {
  field: "value" | "method";
  message: string | undefined;
  initiallyTouched: boolean;
}) {
  const [liveMessage, setLiveMessage] = useState(message);
  useEffect(() => {
    setLiveMessage(message);
    const input = document.getElementById("contactValue") as HTMLInputElement | null;
    const form = input?.form;
    const group = form?.querySelector('[name="contactMethod"]')?.closest("fieldset");
    if (!input || !form || !group) return;
    const control = input,
      methodGroup = group;
    let touched = initiallyTouched;
    function update() {
      const method = form?.querySelector<HTMLInputElement>('[name="contactMethod"]:checked')
        ?.value as ContactMethod | undefined;
      const decision = publicationContactDecision(method, control.value);
      const code = field === "value" ? decision.valueViolation : decision.methodViolation;
      setLiveMessage(
        code ? PUBLISH_VIOLATION_COPY[code].message({ contact: decision.contact }) : undefined,
      );
      const target = field === "value" ? control : methodGroup;
      if (code) target.setAttribute("aria-invalid", "true");
      else target.removeAttribute("aria-invalid");
      if (field === "value") {
        const invalidClass = styles.controlInvalid;
        if (invalidClass) control.classList.toggle(invalidClass, Boolean(code));
        control.setAttribute(
          "aria-describedby",
          code ? "contact-error contact-help" : "contact-help",
        );
      } else if (code) methodGroup.setAttribute("aria-describedby", "contact-method-error");
      else methodGroup.removeAttribute("aria-describedby");
    }
    function onBlur(event: Event) {
      if (event.target === control) {
        touched = true;
        update();
      }
    }
    function onInput(event: Event) {
      if (touched && event.target === control) update();
    }
    function onChange(event: Event) {
      if (
        touched &&
        event.target instanceof HTMLInputElement &&
        event.target.name === "contactMethod"
      )
        update();
    }
    form.addEventListener("focusout", onBlur);
    form.addEventListener("input", onInput);
    form.addEventListener("change", onChange);
    return () => {
      form.removeEventListener("focusout", onBlur);
      form.removeEventListener("input", onInput);
      form.removeEventListener("change", onChange);
    };
  }, [field, message, initiallyTouched]);
  return (
    <div aria-live="polite" hidden={!liveMessage}>
      <FieldError
        id={field === "value" ? "contact-error" : "contact-method-error"}
        message={liveMessage}
      />
    </div>
  );
}
