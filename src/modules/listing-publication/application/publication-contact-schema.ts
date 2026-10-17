import { z } from "zod";
import { contactFeedback } from "../domain/contact-feedback";
import {
  type ContactMethod,
  type PublishViolation,
  validatePublishableListing,
} from "../domain/publishable-listing";

/** Contact-only shape; existing domain admission stays authoritative. No normalization. */
export const publicationContactSchema = z
  .object({
    contactMethod: z.enum(["whatsapp", "telefono", "email"], {
      errorMap: () => ({ message: "contactMethod.required" }),
    }),
    contactValue: z.string({ invalid_type_error: "contactValue.invalid" }).optional(),
  })
  .superRefine(({ contactMethod, contactValue }, context) => {
    const violation = validatePublishableListing({ contactMethod, contactValue }, []).find(
      (code) => code === "contactValue.required" || code === "contactValue.invalid",
    );
    if (violation) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contactValue"],
        message: violation,
        params: { contact: contactFeedback(contactMethod, contactValue) },
      });
    }
  });

/** Decisions for the presentation adapter; validation remains application-owned. */
export function publicationContactDecision(method: ContactMethod | undefined, value: string) {
  const result = publicationContactSchema.safeParse({ contactMethod: method, contactValue: value });
  const codes = result.success
    ? []
    : result.error.issues.map(({ message }) => message as PublishViolation);
  return {
    contact: contactFeedback(method, value),
    methodViolation: codes.find((code) => code === "contactMethod.required"),
    valueViolation: codes.find(
      (code) => code === "contactValue.required" || code === "contactValue.invalid",
    ),
  };
}
