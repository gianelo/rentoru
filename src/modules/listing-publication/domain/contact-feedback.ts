import { type ContactMethod, looksLikeEmail } from "./publishable-listing";
import { venezuelanPhoneIssue } from "./venezuelan-phone";

export type ContactIssue =
  | {
      readonly code:
        | "required"
        | "email"
        | "fixedWhatsapp"
        | "foreignCountry"
        | "internationalZero"
        | "notation";
    }
  | { readonly code: "length"; readonly digits: number; readonly expected: number };

/** Derived facts only: renderers never receive submitted text in their copy context. */
export interface ContactFeedback {
  readonly method: ContactMethod | undefined;
  readonly issue: ContactIssue | undefined;
}

/** Supplement admission with an explanation; never repair or authorize a value. */
export function contactFeedback(
  method: ContactMethod | undefined,
  value: string | undefined,
): ContactFeedback {
  const issue: ContactIssue | undefined =
    method === undefined
      ? undefined
      : value === undefined || value.trim() === ""
        ? { code: "required" }
        : method === "email"
          ? looksLikeEmail(value)
            ? undefined
            : { code: "email" }
          : venezuelanPhoneIssue(value, method);
  return { method, issue };
}
