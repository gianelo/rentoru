import { describe, expect, it } from "vitest";
import { publicationZoneSelection } from "./publication-zone-selection";

const option = { zoneId: "alta", cityId: "dc", label: "Altamira", scope: "Chacao · DC" };

describe("publicationZoneSelection", () => {
  it("no duplica la elección presente ni cambia etiquetas, alcance u orden", () => {
    expect(publicationZoneSelection([option, option], option)).toEqual({
      results: [option],
      retained: null,
    });
  });
  it("retiene la elección actual fuera de resultados, incluso sin resultados", () => {
    const current = { zoneId: "nueva", label: "Zona nueva", scope: "Maracaibo" };
    expect(publicationZoneSelection([option], current)).toEqual({
      results: [option],
      retained: current,
    });
    expect(publicationZoneSelection([], current)).toEqual({ results: [], retained: current });
    expect(publicationZoneSelection([], null)).toEqual({ results: [], retained: null });
  });
});
