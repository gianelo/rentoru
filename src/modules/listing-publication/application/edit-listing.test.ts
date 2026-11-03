import { describe, expect, it, vi } from "vitest";
import type { SessionPort } from "../../identity/application/ports/session.port";
import { UnauthenticatedError } from "../../identity/application/require-authenticated-session";
import {
  EditListingNotFoundError,
  EditListingRejectedError,
  editListing,
  loadListingForEdit,
} from "./edit-listing";
import type { EditableListing, ListingEditPort } from "./ports/listing-edit.port";
import type { EditRemovingPhotosOutcome } from "./ports/listing-edit-with-photos.port";
import type { ZoneCataloguePort } from "./ports/zone-catalogue.port";

/**
 * tasks.md 18.14 — el camino de escritura de una edición, probado contra
 * dobles.
 *
 * **Lo que un doble NO puede probar, y por eso hay además una integración**
 * (`tests/integration/listing-edit.test.ts`): que el `UPDATE` de verdad lleva
 * `publisher_id` y `status = 'active'` en su `WHERE`. Un doble prueba el
 * doble. Acá se prueba lo que este caso de uso decide: el orden de las
 * puertas, que un aviso ajeno se conteste igual que uno inexistente, y que
 * ninguna negativa escriba.
 */

const OWNER = "user-owner";
const STRANGER = "user-stranger";
const CITY = "city-distrito-capital";
const ZONE = "zone-chacao";
const LISTING = "listing-1";

const VALID_DESCRIPTION =
  "Apartamento en piso alto con vista abierta, cocina equipada con linea blanca, " +
  "planta electrica del edificio, vigilancia 24 horas y agua regular por tanque propio.";

function listing(overrides: Partial<EditableListing> = {}): EditableListing {
  return {
    id: LISTING,
    publisherId: OWNER,
    publisherType: "owner",
    propertyType: "apartamento",
    hasPowerPlant: false,
    hasRegularWater: false,
    isFurnished: false,
    hasSecurity: false,
    hasAppliances: false,
    cityId: CITY,
    zoneId: ZONE,
    title: "Apartamento amoblado en La Castellana",
    description: VALID_DESCRIPTION,
    priceUsd: 610,
    rooms: 3,
    areaM2: 128,
    bathrooms: 2,
    parkingSpots: 1,
    contactMethod: "whatsapp",
    contactValue: "04121234567",
    photoCount: 3,
    ...overrides,
  };
}

function sessionPortReturning(userId: string | null): SessionPort {
  return {
    async getSession() {
      return userId ? { userId, email: null, name: null } : null;
    },
  };
}

const zones: ZoneCataloguePort = {
  async listZonesForCity(cityId) {
    return cityId === CITY ? [{ id: ZONE, cityId: CITY }] : [];
  },
};

function portReturning(found: EditableListing | null, applied = true) {
  const findEditableById = vi.fn(async () => found);
  const applyEdit = vi.fn(async () => applied);
  return { findEditableById, applyEdit } satisfies ListingEditPort;
}

describe("editListing — la puerta, y el aviso ajeno que se contesta como inexistente", () => {
  it("sin sesión no toca el catálogo", async () => {
    const listings = portReturning(listing());

    await expect(
      editListing(
        { listingId: LISTING, edit: {} },
        { sessionPort: sessionPortReturning(null), zones, listings },
      ),
    ).rejects.toBeInstanceOf(UnauthenticatedError);

    expect(listings.findEditableById).not.toHaveBeenCalled();
  });

  it("busca el aviso acotado a QUIEN ESTÁ EN LA SESIÓN, nunca a un id del pedido", async () => {
    const listings = portReturning(listing());

    await editListing(
      { listingId: LISTING, edit: {} },
      { sessionPort: sessionPortReturning(OWNER), zones, listings },
    );

    expect(listings.findEditableById).toHaveBeenCalledWith(LISTING, OWNER);
  });

  it("un aviso que la consulta no devuelve es «no existe», y no escribe nada", async () => {
    const listings = portReturning(null);

    await expect(
      editListing(
        { listingId: LISTING, edit: { priceUsd: 700 } },
        { sessionPort: sessionPortReturning(OWNER), zones, listings },
      ),
    ).rejects.toBeInstanceOf(EditListingNotFoundError);

    expect(listings.applyEdit).not.toHaveBeenCalled();
  });

  it("un aviso de otra cuenta da EXACTAMENTE el mismo error que uno inexistente, y no escribe", async () => {
    // No hay `EditListingNotOwnedError`: decirle a un desconocido «ese aviso
    // no es tuyo» ya le cuenta que existe (AGENTS.md §7).
    const listings = portReturning(listing({ publisherId: STRANGER }));

    await expect(
      editListing(
        { listingId: LISTING, edit: { priceUsd: 700 } },
        { sessionPort: sessionPortReturning(OWNER), zones, listings },
      ),
    ).rejects.toBeInstanceOf(EditListingNotFoundError);

    expect(listings.applyEdit).not.toHaveBeenCalled();
  });

  it("si el UPDATE no encuentra la fila que la lectura vio, contesta «no existe» en vez de mentir", async () => {
    const listings = portReturning(listing(), false);

    await expect(
      editListing(
        { listingId: LISTING, edit: { priceUsd: 700 } },
        { sessionPort: sessionPortReturning(OWNER), zones, listings },
      ),
    ).rejects.toBeInstanceOf(EditListingNotFoundError);
  });
});

describe("editListing — lo que escribe y lo que refusa (18.14)", () => {
  it("escribe los dieciséis campos editables con el catálogo de zonas de SU ciudad", async () => {
    const listings = portReturning(listing());

    const result = await editListing(
      {
        listingId: LISTING,
        edit: { priceUsd: 700, contactMethod: "email", contactValue: "d@example.com" },
      },
      { sessionPort: sessionPortReturning(OWNER), zones, listings },
    );

    expect(result).toEqual({ listingId: LISTING, coverChangedTo: null });
    expect(listings.applyEdit).toHaveBeenCalledWith(LISTING, OWNER, {
      title: "Apartamento amoblado en La Castellana",
      description: VALID_DESCRIPTION,
      priceUsd: 700,
      rooms: 3,
      bathrooms: 2,
      areaM2: 128,
      parkingSpots: 1,
      propertyType: "apartamento",
      // Sin seña en el aviso, y se escribe igual: el `set` la lleva SIEMPRE,
      // porque «sin referencia» es un valor y no una columna que no se toca.
      reference: undefined,
      contactMethod: "email",
      contactValue: "d@example.com",
      // 18.38: el pedido no lo trajo, así que se escribe el vigente.
      publisherType: "owner",
      // Los cinco de la F6 (18.37), tal como el aviso los tenía: el pedido no
      // los trajo, así que `?? current` los deja donde estaban.
      hasPowerPlant: false,
      hasRegularWater: false,
      isFurnished: false,
      hasSecurity: false,
      hasAppliances: false,
    });
  });

  it("volver de inmobiliaria a dueño se refusa nombrando la violación, y no escribe nada", async () => {
    const listings = portReturning(listing({ publisherType: "broker" }));

    const error = await editListing(
      { listingId: LISTING, edit: { publisherType: "owner", priceUsd: 700 } },
      { sessionPort: sessionPortReturning(OWNER), zones, listings },
    ).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(EditListingRejectedError);
    expect((error as EditListingRejectedError).violations).toContain("publisherType.immutable");
    expect(listings.applyEdit).not.toHaveBeenCalled();
  });

  it("una violación de publicar refusa la edición entera, no sólo el campo malo", async () => {
    const listings = portReturning(listing());

    const error = await editListing(
      { listingId: LISTING, edit: { priceUsd: 0, title: "Un título nuevo" } },
      { sessionPort: sessionPortReturning(OWNER), zones, listings },
    ).catch((thrown: unknown) => thrown);

    expect((error as EditListingRejectedError).violations).toContain("priceUsd.invalid");
    expect(listings.applyEdit).not.toHaveBeenCalled();
  });
});

/**
 * Fase 44 (44.4, G3/D1) — **las fotos marcadas se quitan al guardar, o no se
 * quitan.** `calls` es un registro compartido y no un espía por puerto: lo que
 * se afirma es el ORDEN —la escritura antes que R2—, que dos espías sueltos no
 * pueden decir.
 */
describe("editListing — quitar fotos al guardar (44.4)", () => {
  function photoRemoval(
    photoIds: readonly string[],
    outcome: EditRemovingPhotosOutcome = { applied: true, derivativeKeys: ["k1", "k2"] },
  ) {
    const calls: string[] = [];
    const ports = {
      order: { listPhotoIdsInOrder: vi.fn(async () => photoIds) },
      listings: {
        applyEditRemovingPhotos: vi.fn(async () => {
          calls.push("write");
          return outcome;
        }),
      },
      storage: {
        remove: vi.fn(async (key: string) => {
          calls.push(`remove:${key}`);
        }),
      },
    };
    return { calls, ports };
  }

  async function run(
    request: { edit?: object; photoIdsToRemove?: readonly string[] },
    removal: ReturnType<typeof photoRemoval>,
    listings = portReturning(listing()),
  ) {
    return editListing(
      { listingId: LISTING, edit: request.edit ?? {}, photoIdsToRemove: request.photoIdsToRemove },
      { sessionPort: sessionPortReturning(OWNER), zones, listings, photoRemoval: removal.ports },
    );
  }

  it("una edición rechazada con fotos marcadas no escribe ni toca R2", async () => {
    const removal = photoRemoval(["a", "b"]);

    const error = await run({ edit: { priceUsd: 0 }, photoIdsToRemove: ["a"] }, removal).catch(
      (thrown: unknown) => thrown,
    );

    expect((error as EditListingRejectedError).violations).toEqual(["priceUsd.invalid"]);
    expect(removal.calls).toEqual([]);
  });

  it("guarda con las marcadas en una sola escritura, y R2 sólo después, clave por clave", async () => {
    const removal = photoRemoval(["a", "b", "c"]);
    const listings = portReturning(listing());

    const result = await run(
      { edit: { priceUsd: 700 }, photoIdsToRemove: ["b", "a", "b"] },
      removal,
      listings,
    );

    expect(removal.ports.listings.applyEditRemovingPhotos).toHaveBeenCalledTimes(1);
    expect(removal.ports.listings.applyEditRemovingPhotos).toHaveBeenCalledWith(
      LISTING,
      OWNER,
      expect.objectContaining({ priceUsd: 700 }),
      ["a", "b"],
    );
    expect(removal.calls).toEqual(["write", "remove:k1", "remove:k2"]);
    expect(listings.applyEdit).not.toHaveBeenCalled();
    expect(result).toEqual({ listingId: LISTING, coverChangedTo: "c" });
  });

  it("una marcada que no es de este aviso rechaza el guardado entero, sin escribir", async () => {
    const removal = photoRemoval(["a", "b"]);
    const listings = portReturning(listing());

    const error = await run(
      { edit: { priceUsd: 700 }, photoIdsToRemove: ["a", "ajena"] },
      removal,
      listings,
    ).catch((thrown: unknown) => thrown);

    expect((error as EditListingRejectedError).violations).toEqual(["photosToRemove.notFound"]);
    expect(removal.calls).toEqual([]);
    expect(listings.applyEdit).not.toHaveBeenCalled();
  });

  it("marcarlas todas se rechaza con su código propio, sin repetirlo como «faltan fotos»", async () => {
    const removal = photoRemoval(["a", "b"]);

    const error = await run({ photoIdsToRemove: ["a", "b"] }, removal).catch(
      (thrown: unknown) => thrown,
    );

    expect((error as EditListingRejectedError).violations).toEqual(["photosToRemove.lastPhoto"]);
    expect(removal.calls).toEqual([]);
  });

  it("el plan de la edición cuenta las fotos que quedan, no las de antes de quitar", async () => {
    const seven = ["a", "b", "c", "d", "e", "f", "g"];
    const removal = photoRemoval(seven);
    const listings = portReturning(listing({ photoCount: seven.length }));

    await run({ photoIdsToRemove: ["g"] }, removal, listings);

    expect(removal.calls[0]).toBe("write");
  });

  it("sin marcas el camino es el de siempre: un solo UPDATE, sin leer fotos ni tocar R2", async () => {
    const removal = photoRemoval(["a"]);
    const listings = portReturning(listing());

    const result = await run({ edit: { priceUsd: 700 }, photoIdsToRemove: [] }, removal, listings);

    expect(listings.applyEdit).toHaveBeenCalledTimes(1);
    expect(removal.ports.order.listPhotoIdsInOrder).not.toHaveBeenCalled();
    expect(removal.calls).toEqual([]);
    expect(result).toEqual({ listingId: LISTING, coverChangedTo: null });
  });

  it("si una marcada desapareció dentro de la transacción, se rechaza como «ya no está» y R2 no se toca", async () => {
    const removal = photoRemoval(["a", "b"], { applied: false, reason: "photos" });

    const error = await run({ photoIdsToRemove: ["b"] }, removal).catch(
      (thrown: unknown) => thrown,
    );

    expect((error as EditListingRejectedError).violations).toEqual(["photosToRemove.notFound"]);
    expect(removal.calls).toEqual(["write"]);
  });

  it("si el aviso dejó de ser editable antes de escribir, contesta «no existe» y R2 no se toca", async () => {
    const removal = photoRemoval(["a", "b"], { applied: false, reason: "listing" });

    await expect(run({ photoIdsToRemove: ["b"] }, removal)).rejects.toBeInstanceOf(
      EditListingNotFoundError,
    );
    expect(removal.calls).toEqual(["write"]);
  });

  it("una falla de R2 sube en vez de tragarse (D12)", async () => {
    const removal = photoRemoval(["a", "b"]);
    removal.ports.storage.remove.mockRejectedValueOnce(new Error("r2 caído"));

    await expect(run({ photoIdsToRemove: ["b"] }, removal)).rejects.toThrow("r2 caído");
  });

  it("con marcas y sin puertos de fotos se niega antes de escribir (falla cerrado)", async () => {
    const listings = portReturning(listing());

    await expect(
      editListing(
        { listingId: LISTING, edit: {}, photoIdsToRemove: ["a"] },
        { sessionPort: sessionPortReturning(OWNER), zones, listings },
      ),
    ).rejects.toThrow(/photoRemoval/);
    expect(listings.applyEdit).not.toHaveBeenCalled();
  });
});

/**
 * tasks.md 18.20 — **la lectura que la pantalla precarga**, con las mismas
 * puertas que la escritura y contestando lo mismo cuando refusa.
 *
 * Vive al lado de `editListing` y no en un archivo propio a propósito: son la
 * lectura y la escritura de UNA capacidad, comparten `EditListingNotFoundError`
 * y comparten el puerto. Separarlas invitaría a que la pantalla refusara con
 * un error distinto del que refusa el guardado, y entonces un aviso ajeno
 * sería distinguible de uno inexistente en exactamente una de las dos.
 */
describe("loadListingForEdit — lo que la pantalla precarga (18.20)", () => {
  it("sin sesión no toca el puerto", async () => {
    const listings = portReturning(listing());

    await expect(
      loadListingForEdit(
        { listingId: LISTING },
        { sessionPort: sessionPortReturning(null), listings },
      ),
    ).rejects.toBeInstanceOf(UnauthenticatedError);

    expect(listings.findEditableById).not.toHaveBeenCalled();
  });

  it("devuelve el aviso vigente acotado a quien está en la sesión, y no escribe nada", async () => {
    const listings = portReturning(listing());

    const found = await loadListingForEdit(
      { listingId: LISTING },
      { sessionPort: sessionPortReturning(OWNER), listings },
    );

    expect(found.title).toBe("Apartamento amoblado en La Castellana");
    expect(found.priceUsd).toBe(610);
    expect(found.publisherType).toBe("owner");
    expect(listings.findEditableById).toHaveBeenCalledWith(LISTING, OWNER);
    expect(listings.applyEdit).not.toHaveBeenCalled();
  });

  /**
   * Las dos afirmaciones son distintas y las dos hacen falta: que los dos
   * casos tiren `EditListingNotFoundError` no dice nada si el mensaje de uno
   * nombra al dueño. Se compara el texto exacto de los dos errores, que es lo
   * único que prueba que un desconocido no puede distinguirlos.
   */
  it("un aviso ajeno y uno inexistente dan el MISMO error, con el mismo texto", async () => {
    const ajeno = await loadListingForEdit(
      { listingId: LISTING },
      {
        sessionPort: sessionPortReturning(OWNER),
        listings: portReturning(listing({ publisherId: STRANGER })),
      },
    ).then(
      () => null,
      (thrown: unknown) => thrown as Error,
    );

    const inexistente = await loadListingForEdit(
      { listingId: LISTING },
      { sessionPort: sessionPortReturning(OWNER), listings: portReturning(null) },
    ).then(
      () => null,
      (thrown: unknown) => thrown as Error,
    );

    expect(ajeno).toBeInstanceOf(EditListingNotFoundError);
    expect(inexistente).toBeInstanceOf(EditListingNotFoundError);
    expect(ajeno?.message).toBe(inexistente?.message);
  });
});
