import { describe, expect, it } from "vitest";
import { whatsAppShareHref } from "./whatsapp-share";

const PARTS = {
  typeLabel: "Apartamento",
  zoneName: "Los Palos Grandes",
  priceUsd: 450,
  listingPath: "/alquiler/distrito-capital/los-palos-grandes/apartamento-0b6f2c9e",
};

const decoded = (href: string | null) =>
  decodeURIComponent((href ?? "").replace("https://wa.me/?text=", ""));

describe("whatsAppShareHref (37.5)", () => {
  it("writes the approved message with the listing's absolute address", () => {
    const href = whatsAppShareHref(PARTS, "https://rentoru.com");
    expect(href?.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decoded(href)).toBe(
      "Mira este aviso en Rentoru: Apartamento en Los Palos Grandes, $450 al mes. https://rentoru.com/alquiler/distrito-capital/los-palos-grandes/apartamento-0b6f2c9e",
    );
  });

  it("encodes the text so spaces, accents and the address survive the URL", () => {
    const href = whatsAppShareHref({ ...PARTS, typeLabel: "Habitación" }, "https://rentoru.com/");
    expect(href).not.toMatch(/ /);
    expect(decoded(href)).toContain("Habitación en Los Palos Grandes");
    expect(decoded(href)).toContain(" https://rentoru.com/alquiler/");
  });

  it("refuses to share a relative or unknown address: no base, no link", () => {
    for (const base of ["", "rentoru.com", "/", "javascript:alert(1)", "ftp://rentoru.com"]) {
      expect(whatsAppShareHref(PARTS, base)).toBeNull();
    }
  });
});
