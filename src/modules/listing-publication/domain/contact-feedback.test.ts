import { describe, expect, it } from "vitest";
import { type ContactIssue, contactFeedback } from "./contact-feedback";
import { type ContactMethod, validatePublishableListing } from "./publishable-listing";

const cases: readonly [ContactMethod | undefined, string | undefined, ContactIssue | undefined][] =
  [
    ["whatsapp", "", { code: "required" }],
    ["telefono", undefined, { code: "required" }],
    ["email", "  ", { code: "required" }],
    ["whatsapp", "042431244444", { code: "length", digits: 12, expected: 11 }],
    ["whatsapp", "0412123456", { code: "length", digits: 10, expected: 11 }],
    ["telefono", "212123456", { code: "length", digits: 9, expected: 10 }],
    ["whatsapp", "0212 1234567", { code: "fixedWhatsapp" }],
    ["whatsapp", "+1 4121234567", { code: "foreignCountry" }],
    ["telefono", "0057 4121234567", { code: "foreignCountry" }],
    ["whatsapp", "+58 0412 1234567", { code: "internationalZero" }],
    ["whatsapp", "0412ABC4567", { code: "notation" }],
    ["whatsapp", "04121234567 ext 1", { code: "notation" }],
    ["whatsapp", "(0412 1234567", { code: "notation" }],
    ["telefono", "9991234567", { code: "notation" }],
    ["email", "sin-arroba", { code: "email" }],
    ["email", "contacto@example.invalid", undefined],
    ["whatsapp", "04246162812", undefined],
    ["telefono", "(0212) 123-4567", undefined],
    [undefined, "04121234567", undefined],
  ];

describe("contactFeedback — diagnosis, never admission or repair", () => {
  it.each(cases)(
    "diagnoses %s %s with the existing admission unchanged",
    (method, value, issue) => {
      const before = validatePublishableListing({ contactMethod: method, contactValue: value }, []);
      expect(contactFeedback(method, value)).toEqual({ method, issue });
      expect(
        validatePublishableListing({ contactMethod: method, contactValue: value }, []),
      ).toEqual(before);
    },
  );
});
