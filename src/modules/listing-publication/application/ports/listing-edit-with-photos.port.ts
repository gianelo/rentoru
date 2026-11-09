import type { ListingEditWrite } from "../../domain/listing-edit";

/**
 * Fase 44 (44.4, G3/D1) — **guardar la edición y quitar las fotos marcadas
 * como una sola escritura.**
 *
 * **Un puerto al lado de `ListingEditPort`, no un método más adentro**
 * (AGENTS.md §3): `applyEdit` reescribe columnas de `listing` y nada más, y
 * quien edita sin marcar fotos sigue usándolo tal cual. Éste toca dos tablas y
 * por eso existe aparte: lo que promete es la atomicidad, no un `UPDATE`.
 */
export type EditRemovingPhotosOutcome =
  | {
      readonly applied: true;
      /** Las claves de R2 de las fotos quitadas, leídas antes del cascade. */
      readonly derivativeKeys: readonly string[];
    }
  | {
      readonly applied: false;
      /**
       * `listing`: el aviso dejó de ser editable por esta cuenta (el mismo
       * compare-and-swap de `applyEdit`). `photos`: alguna marcada ya no era de
       * este aviso. En los dos casos no se escribió nada.
       */
      readonly reason: "listing" | "photos";
    };

export interface ListingEditWithPhotosPort {
  /**
   * Todo en UNA transacción: leer las claves de las marcadas, borrarlas y
   * renumerar, y el `UPDATE` guardado por `publisher_id` y `status = 'active'`.
   * Cualquier faltante revierte todo. Las claves vuelven sólo tras el commit,
   * así que quien las borre de R2 nunca borra las de una foto que sigue.
   *
   * **`expectedPhotoIds` es el conjunto sobre el que el dominio planeó**, en
   * orden. Con la fila del aviso bloqueada, si las fotos ya no son ésas vuelve
   * `photos` sin escribir: el piso se decidió sobre otro aviso, y dos guardados
   * a la vez no pueden dejarlo sin fotos. Comparar no es decidir; el piso lo
   * sigue contestando `planPhotosRemoval`.
   *
   * **`order` es el orden final de las que quedan** (44.5), portada primero:
   * la transacción deja cada una en su índice. Quitar sin reordenar manda el
   * mismo orden de antes sin las quitadas.
   */
  applyEditRemovingPhotos(
    listingId: string,
    publisherId: string,
    write: ListingEditWrite,
    photoIds: readonly string[],
    expectedPhotoIds: readonly string[],
    order: readonly string[],
  ): Promise<EditRemovingPhotosOutcome>;
}
