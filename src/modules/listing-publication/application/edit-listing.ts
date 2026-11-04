import type { SessionPort } from "../../identity/application/ports/session.port";
import { requireAuthenticatedSession } from "../../identity/application/require-authenticated-session";
import { planPhotosRemoval } from "../domain/draft-photo-actions";
import {
  type ListingEdit,
  type ListingEditViolation,
  planListingEdit,
} from "../domain/listing-edit";
import type { CuratedZone } from "../domain/publishable-listing";
import type { EditableListing, ListingEditPort } from "./ports/listing-edit.port";
import type { ListingEditWithPhotosPort } from "./ports/listing-edit-with-photos.port";
import type { ListingPhotoOrderPort } from "./ports/listing-photo-set.port";
import type { PhotoStoragePort } from "./ports/photo-storage.port";
import type { ZoneCataloguePort } from "./ports/zone-catalogue.port";

/**
 * Editar un aviso publicado (tasks.md 18.14).
 *
 * **Ninguna regla vive acá.** Qué campos puede tocar una edición y con qué
 * reglas se validan lo contesta `planListingEdit`, en el dominio y bajo el
 * piso del 90 %. Este caso de uso ordena las puertas: sesión, después la
 * lectura acotada, después el plan, y sólo entonces la escritura.
 *
 * **No hay `EditListingNotOwnedError`, y ahí se aparta deliberadamente de
 * `activateListing`.** Un borrador importado que no es tuyo es un id que sólo
 * podés haber tecleado; un aviso publicado tiene dirección pública, así que
 * «ese aviso no es tuyo» le confirmaría a cualquiera quién publicó cuál. El
 * aviso ajeno se contesta igual que el inexistente, como ya hacen
 * `/mis-avisos` y el revelado de contacto (AGENTS.md §7).
 */

export class EditListingNotFoundError extends Error {
  constructor(listingId: string) {
    super(`edit-listing: ${listingId} is not an editable listing of the caller.`);
    this.name = "EditListingNotFoundError";
  }
}

export class EditListingRejectedError extends Error {
  readonly violations: readonly ListingEditViolation[];

  constructor(violations: readonly ListingEditViolation[]) {
    super(`edit-listing: rejected (${violations.join(", ")})`);
    this.name = "EditListingRejectedError";
    this.violations = violations;
  }
}

/**
 * tasks.md 18.20 — **la lectura que precarga la pantalla de editar.**
 *
 * Vive acá y no en un archivo propio porque es la otra mitad de la MISMA
 * capacidad: mismo puerto, mismas dos puertas y —lo que de verdad importa— el
 * mismo `EditListingNotFoundError`. Si la pantalla refusara con un error
 * distinto del que refusa el guardado, un aviso ajeno sería distinguible de
 * uno inexistente en exactamente una de las dos, y basta una para contarlo.
 *
 * **No devuelve una decisión, devuelve la fila.** Qué campos se pueden tocar
 * lo sigue contestando `planListingEdit` cuando alguien guarda; acá no hay
 * ninguna regla nueva.
 */
export async function loadListingForEdit(
  request: { readonly listingId: string },
  dependencies: {
    readonly sessionPort: SessionPort;
    readonly listings: Pick<ListingEditPort, "findEditableById">;
  },
): Promise<EditableListing> {
  const session = await requireAuthenticatedSession(dependencies.sessionPort);

  const current = await dependencies.listings.findEditableById(request.listingId, session.userId);
  if (!current) {
    throw new EditListingNotFoundError(request.listingId);
  }

  // La misma comprobación redundante que hace `editListing`, y por la misma
  // razón: la garantía «sólo el dueño lo ve» no puede depender de que un
  // adaptador futuro se acuerde de pasar el segundo parámetro.
  if (current.publisherId !== session.userId) {
    throw new EditListingNotFoundError(request.listingId);
  }

  return current;
}

export interface EditListingRequest {
  readonly listingId: string;
  readonly edit: ListingEdit;
  /**
   * Fase 44 (44.4): las fotos marcadas «Quitar al guardar». Vacío o ausente
   * es el camino de siempre: un solo `UPDATE`, sin leer fotos ni tocar R2.
   */
  readonly photoIdsToRemove?: readonly string[];
}

export interface EditListingDependencies {
  readonly sessionPort: SessionPort;
  readonly zones: ZoneCataloguePort;
  readonly listings: ListingEditPort;
  /**
   * Sólo hace falta cuando hay marcas. Opcional para que quien edita sin
   * marcar no tenga que armar R2; un pedido con marcas y sin esto se niega.
   */
  readonly photoRemoval?: {
    readonly order: ListingPhotoOrderPort;
    readonly listings: ListingEditWithPhotosPort;
    /** Sólo `remove`: guardar no firma subidas ni lee objetos. */
    readonly storage: Pick<PhotoStoragePort, "remove">;
  };
}

export interface EditListingResult {
  readonly listingId: string;
  /** La foto que quedó de portada cuando se quitó la anterior; `null` si no cambió. */
  readonly coverChangedTo: string | null;
}

export async function editListing(
  request: EditListingRequest,
  dependencies: EditListingDependencies,
): Promise<EditListingResult> {
  const { sessionPort, zones, listings } = dependencies;

  // La sesión primero, antes de cualquier lectura: el mismo orden que
  // `publishListing`, `activateListing` y `revealContact`, y por la misma
  // razón — quien no entró no puede hacer que esta función toque el catálogo.
  const session = await requireAuthenticatedSession(sessionPort);

  const current = await listings.findEditableById(request.listingId, session.userId);
  if (!current) {
    throw new EditListingNotFoundError(request.listingId);
  }

  // Redundante con el `WHERE` del puerto, y a propósito: la garantía «sólo el
  // dueño edita» no puede depender de que un adaptador futuro se acuerde de
  // pasar el segundo parámetro. La integración prueba el `WHERE`; esto prueba
  // que el caso de uso no confía en él.
  if (current.publisherId !== session.userId) {
    throw new EditListingNotFoundError(request.listingId);
  }

  const curatedZones = await zones.listZonesForCity(current.cityId);

  const marked = request.photoIdsToRemove ?? [];
  if (marked.length > 0) {
    return editRemovingPhotos(request, current, curatedZones, marked, dependencies);
  }

  const plan = planListingEdit(current, curatedZones, request.edit);
  if (!plan.ok) {
    throw new EditListingRejectedError(plan.violations);
  }

  const applied = await listings.applyEdit(request.listingId, session.userId, plan.write);
  if (!applied) {
    // La fila era editable cuando la lectura de arriba la vio, y dejó de
    // serlo antes del `UPDATE`: venció, la ocultaron por reportes, o alguien
    // la borró. No hay nada que ESTA llamada pueda haber hecho, y reintentar
    // no es un estado al que volver.
    throw new EditListingNotFoundError(request.listingId);
  }

  return { listingId: current.id, coverChangedTo: null };
}

/**
 * Fase 44 (44.4, G3/D1) — **la edición y las fotos marcadas, planificadas
 * juntas ANTES de escribir y escritas juntas.** Ninguna regla vive acá: el
 * piso y la portada los contesta `planPhotosRemoval`, los campos
 * `planListingEdit` —que ve las fotos que QUEDAN, así el conteo que valida es
 * el que va a tener el aviso—.
 */
async function editRemovingPhotos(
  request: EditListingRequest,
  current: EditableListing,
  curatedZones: readonly CuratedZone[],
  marked: readonly string[],
  { photoRemoval }: EditListingDependencies,
): Promise<EditListingResult> {
  if (!photoRemoval) {
    // Falla cerrado (AGENTS.md §7): guardar los campos y callar las marcas
    // sería decirle «guardado» a quien pidió quitar una foto que sigue ahí.
    throw new Error("edit-listing: photoRemoval dependencies are required to remove photos.");
  }

  const ids = await photoRemoval.order.listPhotoIdsInOrder(current.id);
  const removal = planPhotosRemoval(ids, marked);
  const plan = planListingEdit(
    { ...current, photoCount: removal.ok ? removal.ids.length : current.photoCount },
    curatedZones,
    request.edit,
  );

  const violations: ListingEditViolation[] = removal.ok
    ? []
    : [`photosToRemove.${removal.refusal}`];
  if (!plan.ok) violations.push(...plan.violations);
  if (!removal.ok || !plan.ok) {
    throw new EditListingRejectedError(violations);
  }

  const outcome = await photoRemoval.listings.applyEditRemovingPhotos(
    current.id,
    current.publisherId,
    plan.write,
    removal.removed,
    // Lo que el plan vio: si la transacción encuentra otra cosa, se niega.
    ids,
  );
  if (!outcome.applied) {
    // Nada se escribió: la transacción se revirtió entera. Una marcada que
    // otra pestaña ya quitó, o un juego de fotos que cambió desde el plan, es
    // lo que el fundador pidió rechazar (L11); un aviso que dejó de ser
    // editable se contesta como el inexistente.
    if (outcome.reason === "photos") {
      throw new EditListingRejectedError(["photosToRemove.notFound"]);
    }
    throw new EditListingNotFoundError(current.id);
  }

  // **Después del commit, y gritando** (D12): con R2 primero, una escritura revertida
  // dejaría un aviso vivo apuntando a fotos borradas; así, lo peor es un
  // huérfano. Sin `try`: tragarse la falla es el silencio de la 18.23.
  for (const key of outcome.derivativeKeys) {
    await photoRemoval.storage.remove(key);
  }

  return { listingId: current.id, coverChangedTo: removal.coverChangedTo };
}
