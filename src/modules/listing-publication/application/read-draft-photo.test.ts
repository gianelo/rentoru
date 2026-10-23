import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasDraftExpired } from "../domain/draft-expiry";
import type { StoredPublicationDraft } from "../domain/publication-steps";
import { MAX_PHOTO_BYTES } from "../domain/uploaded-photo";
import { readDraftPhoto } from "./read-draft-photo";

const NOW = new Date("2026-09-03T12:00:00Z");
const OWNER = "publisher-1";
const key = (token: string) => `incoming/${OWNER}/${token.repeat(32)}`;
const JPEG = Uint8Array.of(0xff, 0xd8, 0xff);
const PNG = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
const WEBP = Uint8Array.of(82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80);
let draft: StoredPublicationDraft | null;
let expiresAt: Date;
const storage = {
  read: vi.fn(async (_key: string) => JPEG),
  put: vi.fn(),
  remove: vi.fn(),
  createUploadTarget: vi.fn(),
};
const store = {
  load: vi.fn(async (_publisherId: string, now: Date) =>
    hasDraftExpired(expiresAt, now) ? null : draft,
  ),
  save: vi.fn(),
  discard: vi.fn(),
};

async function read(index: unknown = 0, publisherId: string | null = OWNER) {
  const before = structuredClone(draft);
  const now = new Date(NOW);
  const result = await readDraftPhoto(publisherId, index, now, { store, storage });
  expect(draft).toEqual(before);
  expect(now).toEqual(NOW);
  expect(store.save).not.toHaveBeenCalled();
  expect(store.discard).not.toHaveBeenCalled();
  expect(storage.put).not.toHaveBeenCalled();
  expect(storage.remove).not.toHaveBeenCalled();
  expect(storage.createUploadTarget).not.toHaveBeenCalled();
  return result;
}

beforeEach(() => {
  vi.clearAllMocks();
  expiresAt = new Date(NOW.getTime() + 1);
  draft = {
    listing: { title: "Sala y cocina" },
    photos: [
      { key: key("b"), name: "Sala", bytes: JPEG.length },
      { key: key("a"), name: "Cocina", bytes: JPEG.length },
    ],
    violations: [],
  };
  store.load.mockImplementation(async (_publisherId, now) =>
    hasDraftExpired(expiresAt, now) ? null : draft,
  );
  storage.read.mockResolvedValue(JPEG);
});

describe("lectura privada de una foto del borrador vigente", () => {
  it.each([null, "", "   "])("sin identidad (%s) no consulta nada", async (identity) => {
    expect(await read(0, identity)).toEqual({ ok: false, reason: "notFound" });
    expect(store.load).not.toHaveBeenCalled();
    expect(storage.read).not.toHaveBeenCalled();
  });

  it.each([-1, 0.5, NaN, Infinity, "0", null, Number.MAX_SAFE_INTEGER + 1])(
    "rechaza selección no entera exacta: %s",
    async (index) => {
      expect(await read(index)).toEqual({ ok: false, reason: "notFound" });
      expect(store.load).not.toHaveBeenCalled();
      expect(storage.read).not.toHaveBeenCalled();
    },
  );

  it.each([0, -1])("el borrador vencido (%sms) no llega a storage", async (offset) => {
    expiresAt = new Date(NOW.getTime() + offset);
    expect(await read()).toEqual({ ok: false, reason: "notFound" });
    expect(store.load).toHaveBeenCalledWith(OWNER, NOW);
    expect(storage.read).not.toHaveBeenCalled();
  });

  it("sin borrador no lee storage", async () => {
    draft = null;
    expect(await read()).toEqual({ ok: false, reason: "notFound" });
    expect(storage.read).not.toHaveBeenCalled();
  });

  it("un índice fuera del arreglo no elige otra foto", async () => {
    expect(await read(2)).toEqual({ ok: false, reason: "notFound" });
    expect(storage.read).not.toHaveBeenCalled();
  });

  it.each([
    `incoming/other/${"a".repeat(32)}`,
    `incoming/${OWNER}/../${"a".repeat(32)}`,
    `${key("a")}/extra`,
    `incoming/${OWNER}/`,
    `incoming/${OWNER}/${"A".repeat(32)}`,
    "https://example.invalid/foto.webp",
  ])("rechaza clave ajena o malformada antes de leer: %s", async (incomingKey) => {
    if (!draft) throw new Error("fixture sin borrador");
    draft = { ...draft, photos: [{ ...draft.photos[0]!, key: incomingKey }] };
    expect(await read()).toEqual({ ok: false, reason: "notFound" });
    expect(storage.read).not.toHaveBeenCalled();
  });

  it.each([0, 1])("lee sólo la selección %s sin ordenar ni cambiar portada", async (index) => {
    expect(await read(index)).toEqual({ ok: true, bytes: JPEG, contentType: "image/jpeg" });
    expect(store.load).toHaveBeenCalledExactlyOnceWith(OWNER, NOW);
    expect(storage.read).toHaveBeenCalledExactlyOnceWith(key(index === 0 ? "b" : "a"));
  });

  it.each([
    [JPEG, "image/jpeg"],
    [PNG, "image/png"],
    [WEBP, "image/webp"],
  ] as const)("admite bytes con MIME detectado: %s", async (bytes, contentType) => {
    const before = bytes.slice();
    storage.read.mockResolvedValue(bytes);
    expect(await read()).toEqual({ ok: true, bytes, contentType });
    expect(bytes).toEqual(before);
  });

  it.each([
    new Uint8Array(),
    new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"),
    new TextEncoder().encode("<html>no es una foto</html>"),
    JPEG.slice(0, 2),
  ])("rechaza bytes vacíos, truncados o no admitidos: %s", async (bytes) => {
    storage.read.mockResolvedValue(bytes);
    expect(await read()).toEqual({ ok: false, reason: "notFound" });
  });

  it.each([0, 1])("aplica el techo real de bytes, diferencia %s", async (extra) => {
    const bytes = new Uint8Array(MAX_PHOTO_BYTES + extra);
    bytes.set(JPEG);
    storage.read.mockResolvedValue(bytes);
    const result = await read();
    expect(result.ok).toBe(extra === 0);
    if (result.ok) {
      expect(result.bytes).toBe(bytes);
      expect(result.contentType).toBe("image/jpeg");
    } else {
      expect(result.reason).toBe("notFound");
    }
  });

  it.each(["borrador", "storage"])("falla cerrado si %s es inaccesible", async (boundary) => {
    const failure = new Error("inaccesible");
    if (boundary === "borrador") store.load.mockRejectedValue(failure);
    else storage.read.mockRejectedValue(failure);
    expect(await read()).toEqual({ ok: false, reason: "unavailable" });
    if (boundary === "borrador") expect(storage.read).not.toHaveBeenCalled();
  });
});
