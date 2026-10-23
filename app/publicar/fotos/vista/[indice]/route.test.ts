import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";

const doubles = vi.hoisted(() => ({
  session: vi.fn(),
  load: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
  discard: vi.fn(),
}));
vi.mock("@/modules/identity/infrastructure/session-port", () => ({
  nextAuthSessionPort: { getSession: doubles.session },
}));
vi.mock("../../../draft", () => ({ publicationDraftDependencies: () => ({ store: doubles }) }));
vi.mock("@/modules/listing-publication/infrastructure/r2-photo-storage", () => ({
  createR2PhotoStorage: () => doubles,
}));
const token = "a".repeat(32);
const key = `incoming/owner/${token}`;
const bytes = Uint8Array.of(0xff, 0xd8, 0xff);
let draft: {
  listing: Record<string, never>;
  photos: { key: string; name: string; bytes: number }[];
  violations: [];
};
beforeEach(() => {
  vi.clearAllMocks();
  draft = { listing: {}, photos: [{ key, name: "Sala", bytes: 3 }], violations: [] };
  doubles.session.mockResolvedValue({ userId: "owner" });
  doubles.load.mockImplementation(async () => draft);
  doubles.read.mockResolvedValue(bytes);
});
async function get(index = "0", identity = token) {
  const before = structuredClone(draft);
  const response = await GET(
    new Request(
      `https://rentoru.test/publicar/fotos/vista/${index}?foto=${identity}&publisherId=other&key=other`,
    ),
    { params: Promise.resolve({ indice: index }) },
  );
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(draft).toEqual(before);
  expect(doubles.save).not.toHaveBeenCalled();
  expect(doubles.discard).not.toHaveBeenCalled();
  return response;
}
it("sirve bytes admitidos sólo desde la identidad de sesión, sin URLs públicas", async () => {
  const response = await get();
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/jpeg");
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  expect(doubles.load.mock.calls[0]?.[0]).toBe("owner");
  expect(doubles.read).toHaveBeenCalledExactlyOnceWith(key);
});
it.each([
  ["image/png", [137, 80, 78, 71, 13, 10, 26, 10]],
  ["image/webp", [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]],
] as const)("conserva MIME y bytes admitidos: %s", async (mime, signature) => {
  const admitted = Uint8Array.from(signature);
  doubles.read.mockResolvedValue(admitted);
  const response = await get();
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe(mime);
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(admitted);
});
it("sin sesión no carga borrador ni storage", async () => {
  doubles.session.mockResolvedValue(null);
  const response = await get();
  expect(response.status).toBe(401);
  expect(await response.text()).toBe("");
  expect(doubles.load).not.toHaveBeenCalled();
  expect(doubles.read).not.toHaveBeenCalled();
});
it.each(["-1", "1", "01", "1.5", "NaN"])("selección inválida %s no lee bytes", async (index) => {
  const response = await get(index);
  expect(response.status).toBe(404);
  expect(await response.text()).toBe("");
  expect(doubles.read).not.toHaveBeenCalled();
});
it.each(["ausente", "ajena", "reordenada"])("falla cerrado para foto %s", async (kind) => {
  if (kind === "ausente") doubles.load.mockResolvedValue(null);
  const photo = draft.photos[0];
  if (!photo) throw new Error("Falta foto de prueba");
  if (kind === "ajena") photo.key = `incoming/other/${token}`;
  if (kind === "reordenada") photo.key = `incoming/owner/${"b".repeat(32)}`;
  const response = await get();
  expect(response.status).toBe(404);
  expect(await response.text()).toBe("");
  expect(doubles.read).not.toHaveBeenCalled();
});
it("no admite una identidad ausente ni bytes no admitidos", async () => {
  expect((await get("0", "")).status).toBe(404);
  expect(doubles.read).not.toHaveBeenCalled();
  doubles.read.mockResolvedValue(new TextEncoder().encode("<svg>privado</svg>"));
  const response = await get();
  expect(response.status).toBe(404);
  expect(await response.text()).toBe("");
});
it.each(["session", "load", "read"] as const)(
  "error opaco de %s sin filtrar datos",
  async (port) => {
    doubles[port].mockRejectedValue(new Error("secreto interno"));
    const response = await get();
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
  },
);
