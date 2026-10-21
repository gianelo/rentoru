import { expect, it, vi } from "vitest";
import { readDraftPhotoPreview } from "./draft-photo-preview";

it("el identificador sólo restringe la foto del borrador de sesión; no concede acceso", async () => {
  const token = "a".repeat(32);
  const bytes = Uint8Array.of(0xff, 0xd8, 0xff);
  const store = {
    load: vi.fn(async () => ({
      listing: {},
      photos: [{ key: `incoming/owner/${token}`, name: "Sala", bytes: 3 }],
      violations: [],
    })),
    save: vi.fn(),
    discard: vi.fn(),
  };
  const storage = { read: vi.fn(async () => bytes) };
  const read = (identity: string) =>
    readDraftPhotoPreview("owner", "0", identity, new Date(), { store, storage });
  expect(await read("b".repeat(32))).toEqual({ ok: false, reason: "notFound" });
  expect(storage.read).not.toHaveBeenCalled();
  expect(await read(token)).toEqual({ ok: true, bytes, contentType: "image/jpeg" });
  expect(store.load).toHaveBeenCalledTimes(2);
  expect(store.save).not.toHaveBeenCalled();
  expect(store.discard).not.toHaveBeenCalled();
});
