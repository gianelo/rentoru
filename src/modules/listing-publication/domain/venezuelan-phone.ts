import type { ContactIssue } from "./contact-feedback";
import type { ContactMethod } from "./publishable-listing";

// CONATEL, 7.V.2025, published by ITU; format policy, not line/account verification.
// Country-specific policy stays here; adding countries does not change callers.
const VENEZUELA = {
  countryCode: "58",
  nationalLength: 10,
  mobile: new Set(["412", "414", "415", "416", "422", "424", "426"]),
  fixed: new Set([
    "212",
    "234",
    "235",
    "237",
    "238",
    "239",
    "240",
    "241",
    "242",
    "243",
    "244",
    "245",
    "246",
    "247",
    "248",
    "249",
    "251",
    "252",
    "253",
    "254",
    "255",
    "256",
    "257",
    "258",
    "259",
    "261",
    "262",
    "263",
    "264",
    "265",
    "266",
    "267",
    "268",
    "269",
    "271",
    "272",
    "273",
    "274",
    "275",
    "276",
    "277",
    "278",
    "279",
    "281",
    "282",
    "283",
    "284",
    "285",
    "286",
    "287",
    "288",
    "289",
    "291",
    "292",
    "293",
    "294",
    "295",
    "296",
    "400",
    "500",
    "501",
    "800",
  ]),
};

/** New valid numeric answers are canonical; email, absence and invalid text stay intact. */
export function contactValueForWrite(
  method: ContactMethod | undefined,
  value: string | undefined,
): string | undefined {
  return value !== undefined && (method === "whatsapp" || method === "telefono")
    ? (canonicalVenezuelanPhone(value, method) ?? value)
    : value;
}

/** Explain a refusal using the same country policy, without changing admission. */
export function venezuelanPhoneIssue(
  value: string,
  method: "whatsapp" | "telefono",
): ContactIssue | undefined {
  if (canonicalVenezuelanPhone(value, method) !== undefined) return undefined;
  if (method === "whatsapp" && canonicalVenezuelanPhone(value, "telefono") !== undefined) {
    return { code: "fixedWhatsapp" };
  }
  const notation = value.trim().replace(/[\s-]/g, "");
  if (!/^[+0-9()]+$/.test(notation)) return { code: "notation" };
  const country = VENEZUELA.countryCode;
  const international = notation.startsWith("+") || notation.startsWith("00");
  if (
    international &&
    !notation.startsWith(`+${country}`) &&
    !notation.startsWith(`00${country}`)
  ) {
    return { code: "foreignCountry" };
  }
  // Like admission, parentheses can wrap only the national prefix.
  if (!/^(?:\+58|0058|58)?(?:0?[0-9]{3}|\(0?[0-9]{3}\))[0-9]*$/.test(notation)) {
    return { code: "notation" };
  }
  const digits = notation.replace(/[+()]/g, "");
  const countryLength =
    notation.startsWith("+") || notation.startsWith(country)
      ? country.length
      : notation.startsWith("00")
        ? country.length + 2
        : 0;
  if (countryLength > 0 && digits.slice(countryLength).startsWith("0")) {
    return { code: "internationalZero" };
  }
  const expected = VENEZUELA.nationalLength + (countryLength || (digits.startsWith("0") ? 1 : 0));
  return digits.length !== expected
    ? { code: "length", digits: digits.length, expected }
    : { code: "notation" };
}

/** Accepted notation in, international value out; invalid text is never repaired. */
export function canonicalVenezuelanPhone(
  value: string,
  method: "whatsapp" | "telefono",
): string | undefined {
  const notation = value.trim().replace(/[\s-]/g, "");
  // Parentheses may wrap the national prefix, never arbitrary subscriber digits.
  if (!/^(?:\+58|0058|58)?(?:0?[0-9]{3}|\(0?[0-9]{3}\))[0-9]{7}$/.test(notation)) {
    return undefined;
  }
  const digits = notation.replace(/[()]/g, "");
  const national = digits.startsWith("+58")
    ? digits.slice(3)
    : digits.startsWith("0058")
      ? digits.slice(4)
      : digits.startsWith("58")
        ? digits.slice(2)
        : digits.startsWith("0")
          ? digits.slice(1)
          : digits;
  if (national.length !== VENEZUELA.nationalLength) return undefined;
  const prefix = national.slice(0, 3);
  const admitted =
    VENEZUELA.mobile.has(prefix) || (method === "telefono" && VENEZUELA.fixed.has(prefix));
  return admitted ? `+${VENEZUELA.countryCode}${national}` : undefined;
}
