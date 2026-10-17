import { describe, expect, it } from "vitest";
import { publicationContactSchema } from "./publication-contact-schema";

const accepted = [
  ["whatsapp", "0412 123 4567"],
  ["whatsapp", "4121234567"],
  ["whatsapp", "+58 412 1234567"],
  ["whatsapp", "0058 412 1234567"],
  ["whatsapp", "584121234567"],
  ["whatsapp", "04246162812"],
  ["telefono", "(0212) 123-4567"],
  ["email", "contacto@example.invalid"],
] as const;
const rejected = [
  [undefined, "04121234567", "contactMethod", "required"],
  ["fax", "04121234567", "contactMethod", "required"],
  ["whatsapp", undefined, "contactValue", "required"],
  ["email", "  ", "contactValue", "required"],
  ["whatsapp", "042431244444", "contactValue", "invalid"],
  ["whatsapp", "0212 1234567", "contactValue", "invalid"],
  ["whatsapp", "+1 4121234567", "contactValue", "invalid"],
  ["whatsapp", "+58 0412 1234567", "contactValue", "invalid"],
  ["whatsapp", "0412ABC4567", "contactValue", "invalid"],
  ["whatsapp", "04121234567 ext 1", "contactValue", "invalid"],
  ["whatsapp", "(0412 1234567", "contactValue", "invalid"],
  ["whatsapp", "0412123456", "contactValue", "invalid"],
  ["email", "sin-arroba", "contactValue", "invalid"],
] as const;

describe("publicationContactSchema — application boundary, unchanged contact policy", () => {
  it.each(accepted)(
    "accepts %s %s without canonicalizing or mutating",
    (contactMethod, contactValue) => {
      const input = Object.freeze({ contactMethod, contactValue });
      expect(publicationContactSchema.safeParse(input)).toMatchObject({
        success: true,
        data: input,
      });
      expect(input).toEqual({ contactMethod, contactValue });
    },
  );
  it.each(rejected)(
    "rejects %s %s through the existing field code",
    (contactMethod, contactValue, field, cause) => {
      const input = Object.freeze({ contactMethod, contactValue });
      expect(publicationContactSchema.safeParse(input)).toMatchObject({
        success: false,
        error: { issues: [{ path: [field], message: `${field}.${cause}` }] },
      });
      expect(input).toEqual({ contactMethod, contactValue });
    },
  );
});
