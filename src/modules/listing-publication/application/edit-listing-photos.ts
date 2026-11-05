import type { SessionPort } from "../../identity/application/ports/session.port";
import type { PhotoHashPort } from "../../listing-trust/application/ports/photo-hash.port";
import { MAX_PHOTOS_PER_LISTING } from "../domain/publishable-listing";
import { MAX_PHOTO_BYTES } from "../domain/uploaded-photo";
import { loadListingForEdit } from "./edit-listing";
import type { ListingEditPort } from "./ports/listing-edit.port";
import type { ListingPhotoAttachmentPort } from "./ports/listing-photo-attachment.port";
import type {
  ListingPhotoThumbnail,
  ListingPhotoThumbnailPort,
} from "./ports/listing-photo-set.port";
import type { PhotoDerivationPort } from "./ports/photo-derivation.port";
import type { PhotoHashComputationPort } from "./ports/photo-hash-computation.port";
import type { PhotoStoragePort, UploadTarget } from "./ports/photo-storage.port";
import { processUploadedPhoto } from "./process-uploaded-photo";

/**
 * tasks.md 18.21 — **agregar fotos a un aviso YA publicado y listar las que
 * tiene.** Quitarlas ya no vive acá: desde la 44.4 se marcan y se quitan al
 * guardar, dentro de `editListing`.
 *
 * **Por qué no es `attachPhotoToDraft`.** Su propio docstring ya lo dejó
 * escrito: «an `active` listing cannot reach this function at all», porque su
 * puerta es `findDraftById`, cuyo `WHERE` lleva `status = 'draft'` adentro.
 * Un aviso publicado es otro sujeto, y ensanchar aquel `WHERE` le abriría a
 * `activateListing` una fila que ya está activa. Así que van casos de uso AL
 * LADO, con la misma tubería y otra puerta.
 *
 * **La puerta es `loadListingForEdit`, literalmente la misma función que usa
 * la pantalla de editar** — no una copia de su `WHERE`. Refusa un aviso
 * ajeno, un borrador, un vencido y uno oculto con el MISMO
 * `EditListingNotFoundError` que ya refusa un id inexistente, y vuelve a
 * comparar `publisherId` contra la sesión por si un adaptador futuro se
 * olvida del segundo parámetro. Reusarla es lo que garantiza que tocar las
 * fotos no se convierta en el camino por el que un desconocido averigua que un
 * aviso existe (AGENTS.md §7).
 *
 * **`processUploadedPhoto` sigue siendo el único punto de paso**, llamado acá
 * VERBATIM igual que en `publishListing` y en `attachPhotoToDraft`: es donde
 * vive el rechazo por hash perceptual entre cuentas (tarea 4.7), y un camino
 * de adjuntar que no pase por ahí reabre el agujero que esa tarea cerró.
 *
 * **Ninguna regla nueva.** El tope es `MAX_PHOTOS_PER_LISTING`, la misma
 * constante que `planListingEdit` aplica en etapa `"activation"`. Acá sólo se
 * ordenan las puertas.
 */

export class ListingPhotoLimitReachedError extends Error {
  constructor(listingId: string) {
    super(
      `edit-listing-photos: ${listingId} already holds ${MAX_PHOTOS_PER_LISTING} photos, ` +
        "the maximum a listing may carry.",
    );
    this.name = "ListingPhotoLimitReachedError";
  }
}

/** La puerta de las tres, y la única lectura que las tres necesitan. */
type EditableListingGate = {
  readonly sessionPort: SessionPort;
  readonly listings: Pick<ListingEditPort, "findEditableById">;
};

export interface RequestListingPhotoUploadRequest {
  readonly listingId: string;
  /** Lo que el navegador va a subir. Se fija en la firma, nunca se acepta después. */
  readonly contentType: string;
  /** El largo exacto que el navegador ya midió tras comprimir. */
  readonly byteLength: number;
}

/**
 * El permiso de escritura, pedido **antes** de subir. Falla cerrado por la
 * misma razón que `requestDraftPhotoUpload`: un presignado repartido para un
 * aviso ajeno o uno que ya llegó al tope llena un prefijo con bytes que nadie
 * va a poder adjuntar.
 */
export async function requestListingPhotoUpload(
  request: RequestListingPhotoUploadRequest,
  dependencies: EditableListingGate & { readonly storage: PhotoStoragePort },
): Promise<UploadTarget> {
  const listing = await openForPhotos(request.listingId, dependencies);

  return dependencies.storage.createUploadTarget({
    // Del aviso, cuyo dueño `loadListingForEdit` ya comparó dos veces contra
    // la sesión: es el segmento que hace inútil la URL filtrada de una cuenta
    // para escribir en el espacio de otra.
    publisherId: listing.publisherId,
    contentType: request.contentType,
    byteLength: request.byteLength,
    maxBytes: MAX_PHOTO_BYTES,
  });
}

export interface AttachPhotoToListingRequest {
  readonly listingId: string;
  /** La clave que `requestListingPhotoUpload` emitió. Se revisa río abajo. */
  readonly incomingKey: string;
  /** Lo que el navegador declaró. Se compara contra los bytes, nunca se cree. */
  readonly declaredContentType: string;
}

export interface AttachPhotoToListingDependencies extends EditableListingGate {
  readonly photos: ListingPhotoAttachmentPort;
  readonly storage: PhotoStoragePort;
  readonly derive: PhotoDerivationPort;
  readonly computeHash: PhotoHashComputationPort;
  readonly photoHashes: PhotoHashPort;
  readonly now?: () => Date;
}

export async function attachPhotoToListing(
  request: AttachPhotoToListingRequest,
  dependencies: AttachPhotoToListingDependencies,
): Promise<{ readonly listingId: string; readonly position: number }> {
  const { photos, storage, derive, computeHash, photoHashes } = dependencies;
  const now = dependencies.now ?? (() => new Date());

  const listing = await openForPhotos(request.listingId, dependencies);

  const processed = await processUploadedPhoto(
    {
      publisherId: listing.publisherId,
      incomingKey: request.incomingKey,
      declaredContentType: request.declaredContentType,
    },
    { storage, derive, computeHash, photoHashes },
  );

  // Contada, jamás declarada por el pedido: es el mismo número que el
  // validador usa para el piso y el tope.
  const position = listing.photoCount;
  const attachedAt = now();
  const { photoId } = await photos.attachPhoto(
    listing.id,
    { position, derivatives: processed.derivatives },
    attachedAt,
  );

  // Sólo ahora: `listing_photo_hash.photo_id` referencia `listing_photo.id`,
  // así que el hash no puede escribirse antes de que exista la fila que nombra.
  await photoHashes.record({ photoId, hash: processed.hash, recordedAt: attachedAt });

  return { listingId: listing.id, position };
}

/**
 * Las fotos del aviso, **en el orden en que se muestran**, para dibujarlas.
 *
 * Vive acá y no en la pantalla por la misma razón que `loadListingForEdit`
 * vive al lado de `editListing`: si la lectura refusara con un error distinto
 * del que refusa el borrado, un aviso ajeno sería distinguible de uno
 * inexistente en exactamente una de las dos, y basta una para contarlo.
 *
 * **No comprueba el tope**: un aviso lleno sigue mostrando sus fotos, porque
 * leer no es agregar.
 *
 * **Desde la 18.26 vuelve también la clave de la miniatura**, y por eso la
 * dependencia cambió de `order` a `thumbnails`. No es un dato más: sin ella la
 * pantalla sólo puede nombrar cada foto por su ordinal, y quien tiene seis
 * parecidas elige a ciegas y puede quitar la que no era. Componer la URL sigue
 * siendo de quien dibuja —`photoUrl` recibe la base pública como argumento
 * justamente para eso—, así que acá vuelve la clave y nunca una dirección.
 */
export async function loadListingPhotosForEdit(
  request: { readonly listingId: string },
  dependencies: EditableListingGate & { readonly thumbnails: ListingPhotoThumbnailPort },
): Promise<readonly ListingPhotoThumbnail[]> {
  const listing = await openForPhotos(request.listingId, dependencies, { checkCeiling: false });
  return dependencies.thumbnails.listPhotoThumbnailsInOrder(listing.id);
}

/**
 * La puerta, una sola vez para las tres. **Propiedad antes que tope**, el
 * mismo orden que `attachPhotoToDraft`: el aviso de un desconocido no debe
 * revelar ni siquiera cuántas fotos tiene.
 */
async function openForPhotos(
  listingId: string,
  { sessionPort, listings }: EditableListingGate,
  options: { readonly checkCeiling?: boolean } = {},
) {
  const listing = await loadListingForEdit({ listingId }, { sessionPort, listings });

  if (options.checkCeiling !== false && listing.photoCount >= MAX_PHOTOS_PER_LISTING) {
    throw new ListingPhotoLimitReachedError(listingId);
  }

  return listing;
}
