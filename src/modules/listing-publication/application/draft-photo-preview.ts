import {
  type DraftPhotoReading,
  type ReadDraftPhotoDependencies,
  readDraftPhoto,
} from "./read-draft-photo";

/** La identidad de presentación sólo restringe; la sesión y el núcleo autorizan. */
export async function readDraftPhotoPreview(
  publisherId: string,
  selection: string,
  identity: string | null,
  now: Date,
  dependencies: ReadDraftPhotoDependencies,
): Promise<DraftPhotoReading> {
  if (!/^(0|[1-9]\d*)$/.test(selection) || !identity) {
    return { ok: false, reason: "notFound" };
  }
  const index = Number(selection);
  return readDraftPhoto(publisherId, index, now, {
    storage: dependencies.storage,
    store: {
      ...dependencies.store,
      async load(owner, instant) {
        const draft = await dependencies.store.load(owner, instant);
        // Una URL posicional vieja nunca entrega la nueva ocupante del índice.
        return draft?.photos[index]?.key.split("/").at(-1) === identity ? draft : null;
      },
    },
  });
}
