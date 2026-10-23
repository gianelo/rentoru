import { beforeEach, describe, expect, it, vi } from "vitest";

const { previewRenewal, renewListing, readRenewalSecret } = vi.hoisted(() => ({
  previewRenewal: vi.fn(),
  renewListing: vi.fn(),
  readRenewalSecret: vi.fn(),
}));
vi.mock("../../../src/shared/db/client", () => ({ db: {} }));
vi.mock("../../../src/modules/listing-lifecycle/infrastructure/drizzle-lifecycle", () => ({
  DrizzleLifecycleListings: class {},
}));
vi.mock("../../../src/modules/listing-lifecycle/infrastructure/lifecycle-config", () => ({
  readRenewalSecret,
}));
vi.mock("../../../src/modules/listing-lifecycle/application/renew-listing", () => ({
  previewRenewal,
  renewListing,
}));

import { GET, POST } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  readRenewalSecret.mockReturnValue("synthetic-secret");
});

const context = () => ({ params: Promise.resolve({ token: "token-sintético" }) });
const request = () => new Request("https://rentoru.invalid/renovar/token");

describe("F35.5 — HTML de renovación", () => {
  describe.each([
    ["GET", GET],
    ["POST", POST],
  ] as const)("%s", (_name, handler) => {
    it.each([
      ["expired", "Este enlace ya no sirve. Entra a tu cuenta para volver a publicar el aviso."],
      ["bad-signature", "Este enlace no es válido. Revisa que lo hayas copiado entero."],
      ["malformed", "Este enlace no es válido. Revisa que lo hayas copiado entero."],
    ])("%s conserva negativa y sirve tuteo", async (reason, copy) => {
      previewRenewal.mockResolvedValue({ status: "invalid", reason });
      renewListing.mockResolvedValue({ status: "invalid", reason });
      const response = await handler(request(), context());
      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
      const html = await response.text();
      expect(html).toContain(`<h1>Enlace no válido</h1><p>${copy}</p>`);
      expect(html).not.toContain("<form");
    });
  });

  it.each([
    ["GET", GET],
    ["POST", POST],
  ] as const)("%s sin configuración sigue cerrado", async (_name, handler) => {
    readRenewalSecret.mockReturnValue(null);
    const response = await handler(request(), context());
    expect(response.status).toBe(500);
    expect(await response.text()).toContain(
      "<h1>No se puede renovar ahora</h1><p>Vuelve a intentar en un rato.</p>",
    );
    expect(previewRenewal).not.toHaveBeenCalled();
    expect(renewListing).not.toHaveBeenCalled();
  });

  it("GET conserva formulario nativo, escape y fecha UTC sin renovar", async () => {
    previewRenewal.mockResolvedValue({
      status: "ready",
      listing: { title: '<Casa & "patio">', expiresAt: new Date("2026-09-01T02:00:00Z") },
    });
    const response = await GET(request(), context());
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("&lt;Casa &amp; &quot;patio&quot;&gt;");
    expect(html).toContain("1 de septiembre de 2026");
    expect(html).toContain(
      '<form method="post"><button type="submit">Renovar por 30 días</button></form>',
    );
    expect(renewListing).not.toHaveBeenCalled();
  });

  it("POST conserva éxito y fecha UTC", async () => {
    renewListing.mockResolvedValue({
      status: "renewed",
      expiresAt: new Date("2026-10-01T02:00:00Z"),
    });
    const response = await POST(request(), context());
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(
      "<h1>Listo, tu aviso está activo</h1><p>Vence el 1 de octubre de 2026.</p>",
    );
  });
});
