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
