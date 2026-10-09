import { describe, expect, it } from "vitest";
import { descriptionGuidance } from "./description-guidance";
import { MAX_DESCRIPTION_CHARACTERS, MIN_DESCRIPTION_CHARACTERS } from "./publishable-listing";

describe("descriptionGuidance", () => {
  it.each([undefined, null, ""])("returns empty guidance for %s", (description) => {
    expect(descriptionGuidance(description)).toEqual({
      written: 0,
      minimum: 120,
      remaining: 120,
      progress: 0,
      sufficient: false,
    });
  });

  it("accepts an omitted description", () => {
    expect(descriptionGuidance()).toEqual({
      written: 0,
      minimum: 120,
      remaining: 120,
      progress: 0,
      sufficient: false,
    });
  });

  it.each([
    [1, 119, 1, false],
    [59, 61, 49, false],
    [60, 60, 50, false],
    [119, 1, 99, false],
    [120, 0, 100, true],
    [121, 0, 100, true],
  ] as const)(
    "reports the full model for %i ASCII characters",
    (written, remaining, progress, sufficient) => {
      expect(descriptionGuidance("a".repeat(written))).toEqual({
        written,
        minimum: 120,
        remaining,
        progress,
        sufficient,
      });
    },
  );

  it.each([
    ["one astral emoji", "😀", 1, 119, 1, false],
    ["119 astral emoji", "😀".repeat(119), 119, 1, 99, false],
    ["120 astral emoji", "😀".repeat(120), 120, 0, 100, true],
    ["121 astral emoji", "😀".repeat(121), 121, 0, 100, true],
    ["two combining code points", "e\u0301", 2, 118, 2, false],
  ] as const)(
    "counts Unicode code points for %s",
    (_label, description, written, remaining, progress, sufficient) => {
      expect(descriptionGuidance(description)).toEqual({
        written,
        minimum: 120,
        remaining,
        progress,
        sufficient,
      });
    },
  );

  // Minimum sufficiency is not the server's maximum-length validation.
  it.each([
    ["at the server maximum", MAX_DESCRIPTION_CHARACTERS, 1200],
    ["above the server maximum", MAX_DESCRIPTION_CHARACTERS + 1, 1201],
  ] as const)("remains sufficient %s", (_label, count, written) => {
    expect(MIN_DESCRIPTION_CHARACTERS).toBe(120);
    expect(descriptionGuidance("a".repeat(count))).toEqual({
      written,
      minimum: 120,
      remaining: 0,
      progress: 100,
      sufficient: true,
    });
  });
});
