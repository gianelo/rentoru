import { describe, expect, it } from "vitest";
import { isListingId } from "./listing-id";

const ID = "0b6f2c9e-4d1a-4f7b-9c3e-2a5d8e1f7b40";

describe("isListingId (37.3)", () => {
  it("accepts only a UUID, because the id arrives in a URL anyone can rewrite", () => {
    expect(isListingId(ID)).toBe(true);
    expect(isListingId(ID.toUpperCase())).toBe(true);
    for (const value of ["", "abc", `${ID}x`, `x${ID}`, "1; DROP", undefined, [ID]]) {
      expect(isListingId(value)).toBe(false);
    }
  });
});
