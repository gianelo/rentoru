import { describe, expect, it, vi } from "vitest";
import { searchPublicationZones } from "./search-publication-zones";

// Vocabulario amplio: el alias encuentra una zona sin avisos; el dominio
// conserva su nombre real, prioridad y unicidad, no las filas del puerto.
const vocabulary = {
  cities: [{ id: "dc", name: "Distrito Capital" }],
  zones: [
    { id: "bella", name: "Bella Vista", cityId: "dc", parentName: null },
    { id: "centro", name: "Centro", cityId: "dc", parentName: "Libertador" },
    { id: "otra", name: "Otra", cityId: "dc", parentName: null },
  ],
  aliases: [
    { zoneId: "centro", alias: "Bella Vista" },
    { zoneId: "centro", alias: "Bella" },
  ],
};

describe("búsqueda compartida de zonas de publicación", () => {
  it("consulta el puerto con el texto original y devuelve decisiones del dominio", async () => {
    const lookup = vi.fn().mockResolvedValue(vocabulary);
    const result = await searchPublicationZones("Bella", { lookup });

    expect(lookup).toHaveBeenCalledExactlyOnceWith("Bella");
    expect(result).toEqual([
      { zoneId: "centro", cityId: "dc", label: "Centro", scope: "Libertador · Distrito Capital" },
      { zoneId: "bella", cityId: "dc", label: "Bella Vista", scope: "Distrito Capital" },
    ]);
  });

  it("sin texto no consulta el vocabulario", async () => {
    const lookup = vi.fn();
    await expect(searchPublicationZones("", { lookup })).resolves.toEqual([]);
    expect(lookup).not.toHaveBeenCalled();
  });
});
