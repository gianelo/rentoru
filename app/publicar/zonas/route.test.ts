import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, lookup } = vi.hoisted(() => ({
  getSession: vi.fn(),
  lookup: vi.fn(),
}));
vi.mock("@/modules/identity/infrastructure/session-port", () => ({
  nextAuthSessionPort: { getSession },
}));
vi.mock("@/shared/db/client", () => ({ db: {} }));
vi.mock("@/modules/listing-publication/infrastructure/drizzle-zone-vocabulary", () => ({
  DrizzleZoneVocabulary: class {
    lookup = lookup;
  },
}));

import { GET } from "./route";

beforeEach(() => {
  getSession.mockReset().mockResolvedValue({ userId: "publicador-1" });
  lookup.mockReset().mockResolvedValue({
    cities: [{ id: "dc", name: "Distrito Capital" }],
    zones: [{ id: "centro", name: "Centro", cityId: "dc", parentName: "Libertador" }],
    aliases: [{ zoneId: "centro", alias: "Bella Vista" }],
  });
});

const request = (query = "") => new Request(`https://rentoru.test/publicar/zonas${query}`);

function noStore(response: Response) {
  expect(response.headers.get("cache-control")).toBe("no-store");
}

describe("GET /publicar/zonas (transporte latente, no UI dinámica)", () => {
  it("entrega JSON con el nombre real y alcance de una zona encontrada por alias", async () => {
    lookup.mockImplementationOnce(async () => {
      expect(getSession).toHaveBeenCalledTimes(1);
      return {
        cities: [{ id: "dc", name: "Distrito Capital" }],
        zones: [{ id: "centro", name: "Centro", cityId: "dc", parentName: "Libertador" }],
        aliases: [{ zoneId: "centro", alias: "Bella Vista" }],
      };
    });
    const response = await GET(request("?q=Bella%20Vista"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    noStore(response);
    await expect(response.json()).resolves.toEqual([
      { zoneId: "centro", cityId: "dc", label: "Centro", scope: "Libertador · Distrito Capital" },
    ]);
    expect(lookup).toHaveBeenCalledExactlyOnceWith("Bella Vista");
  });

  it("sin sesión responde 401 antes de consultar el vocabulario", async () => {
    getSession.mockResolvedValueOnce(null);
    const response = await GET(request("?q=Bella"));
    expect(response.status).toBe(401);
    noStore(response);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each(["", "?q="])("sin consulta (%s) devuelve lista vacía sin I/O", async (query) => {
    const response = await GET(request(query));
    expect(response.status).toBe(200);
    noStore(response);
    await expect(response.json()).resolves.toEqual([]);
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each(["sesión", "vocabulario"])("un fallo de %s no filtra detalles", async (source) => {
    (source === "sesión" ? getSession : lookup).mockRejectedValueOnce(new Error("detalle privado"));
    const response = await GET(request("?q=Bella"));
    expect(response.status).toBe(500);
    noStore(response);
    await expect(response.json()).resolves.toEqual({ error: "internal_error" });
    if (source === "sesión") expect(lookup).not.toHaveBeenCalled();
  });
});
