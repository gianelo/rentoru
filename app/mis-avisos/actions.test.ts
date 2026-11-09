import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * tasks.md 9.28 — **el cable, no la regla.**
 *
 * `activateListing`, `attachPhotoToDraft` y `requestDraftPhotoUpload` ya
 * tienen sus propias pruebas de lo que deciden. Este archivo prueba lo único
 * que no estaba probado en ninguna parte, porque no existía: que una ruta los
 * llame. Los dos primeros llevaban una porción entera construidos y con CERO
 * llamadores fuera de sus pruebas — el mismo defecto que este trabajo ya
 * encontró en el anti-fraude de fotos, en la pastilla de búsqueda y en
 * `canImportListings`.
 */

const {
  activateListing,
  attachPhotoToDraft,
  editListing,
  requestDraftPhotoUpload,
  attachPhotoToListing,
  requestListingPhotoUpload,
  redirect,
  revalidatePath,
  TX,
} = vi.hoisted(() => ({
  /** El cliente transaccional, reconocible: guardar con fotos no puede ir por HTTP. */
  TX: { cliente: "transaccional" },
  activateListing: vi.fn(),
  attachPhotoToDraft: vi.fn(),
  editListing: vi.fn(),
  requestDraftPhotoUpload: vi.fn(),
  attachPhotoToListing: vi.fn(),
  requestListingPhotoUpload: vi.fn(),
  redirect: vi.fn((destination: string) => {
    // `redirect` de Next funciona tirando; imitarlo es lo que prueba que
    // nada después de él corre.
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("../../src/modules/identity/infrastructure/session-port", () => ({
  nextAuthSessionPort: { getSession: async () => null },
}));
vi.mock("../../src/shared/db/client", () => ({ db: {} }));
vi.mock("../../src/shared/db/transactional-client", () => ({
  getTransactionalDatabase: () => TX,
}));
vi.mock("../../src/modules/listing-publication/infrastructure/r2-photo-storage", () => ({
  createR2PhotoStorage: () => ({}),
}));
vi.mock("../../src/modules/listing-publication/infrastructure/photo-derivatives", () => ({
  deriveListingPhoto: vi.fn(),
}));
vi.mock("../../src/modules/listing-trust/infrastructure/drizzle-photo-hash", () => ({
  DrizzlePhotoHash: class {},
}));

/**
 * **`importActual` y no una fábrica que reemplace el módulo entero.**
 * `ActivateListingRejectedError` tiene que ser la clase REAL: con una copia
 * local, un renombre en producción dejaría este archivo verde comparando
 * contra un error que ya no existe, y el `instanceof` de la acción daría
 * falso justo donde importa.
 */
vi.mock("../../src/modules/listing-publication/application/activate-listing", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  activateListing,
}));
vi.mock(
  "../../src/modules/listing-publication/application/attach-photo-to-draft",
  async (original) => ({
    ...(await original<Record<string, unknown>>()),
    attachPhotoToDraft,
  }),
);
vi.mock("../../src/modules/listing-publication/application/request-draft-photo-upload", () => ({
  requestDraftPhotoUpload,
}));
// Misma razón que arriba: `EditListingRejectedError` tiene que ser la clase
// REAL, o el `instanceof` de la acción daría falso justo donde importa.
vi.mock("../../src/modules/listing-publication/application/edit-listing", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  editListing,
}));
vi.mock(
  "../../src/modules/listing-publication/application/edit-listing-photos",
  async (original) => ({
    ...(await original<Record<string, unknown>>()),
    attachPhotoToListing,
    requestListingPhotoUpload,
  }),
);

import { ActivateListingRejectedError } from "../../src/modules/listing-publication/application/activate-listing";
import {
  EditListingNotFoundError,
  EditListingRejectedError,
} from "../../src/modules/listing-publication/application/edit-listing";
import type { ListingEdit } from "../../src/modules/listing-publication/domain/listing-edit";
import {
  DrizzleListingEdit,
  DrizzleListingPhotoSet,
} from "../../src/modules/listing-publication/infrastructure/drizzle-listing-repository";
import {
  activarBorrador,
  adjuntarFotoAlAviso,
  adjuntarFotoAlBorrador,
  guardarEdicion,
  pedirDestinoDeFoto,
  pedirDestinoDeFotoDelAviso,
} from "./actions";
import { SIN_NEGATIVAS } from "./editar-estado";

beforeEach(() => {
  activateListing.mockReset();
  attachPhotoToDraft.mockReset();
  attachPhotoToListing.mockReset();
  requestListingPhotoUpload.mockReset();
  editListing.mockReset();
  requestDraftPhotoUpload.mockReset();
  redirect.mockClear();
  revalidatePath.mockClear();
});

function formDataWith(listingId: string): FormData {
  const form = new FormData();
  form.set("listingId", listingId);
  return form;
}

describe("activarBorrador — el disparador que ninguna ruta tenía", () => {
  it("llama a activateListing con el id del formulario y vuelve a la lista", async () => {
    activateListing.mockResolvedValueOnce({
      listingId: "borrador-1",
      publishedAt: new Date(),
      expiresAt: new Date(),
    });

    await expect(activarBorrador(formDataWith("borrador-1"))).rejects.toThrow(
      "NEXT_REDIRECT:/mis-avisos",
    );

    expect(activateListing).toHaveBeenCalledTimes(1);
    expect(activateListing.mock.calls[0]?.[0]).toEqual({ listingId: "borrador-1" });
    expect(revalidatePath).toHaveBeenCalledWith("/mis-avisos");
  });

  /**
   * La negativa de `activateListing` es lo que la pantalla dibuja. Viaja como
   * CÓDIGO y no como frase: la copia se decide en una tabla, y una URL con
   * castellano adentro sería una segunda tabla que nadie mantiene.
   */
  it("cuando el validador se niega, vuelve con el aviso y sus códigos, no con una frase", async () => {
    activateListing.mockRejectedValueOnce(
      new ActivateListingRejectedError(["photos.required", "zoneId.notInCity"]),
    );

    await expect(activarBorrador(formDataWith("borrador-1"))).rejects.toThrow(
      "NEXT_REDIRECT:/mis-avisos?fallo=borrador-1&motivos=photos.required%2CzoneId.notInCity",
    );
  });

  /**
   * Un borrador que no existe o que es de otra cuenta NO produce una
   * explicación: sube. Decirle a un desconocido «ese borrador no es tuyo» ya
   * sería contarle que existe (AGENTS.md §7, la misma forma que
   * `attachPhotoToDraft` documenta para su propio orden de comprobaciones).
   */
  it("cualquier otro error sube, y no se convierte en una negativa dibujable", async () => {
    activateListing.mockRejectedValueOnce(new Error("ese borrador no es tuyo"));

    await expect(activarBorrador(formDataWith("ajeno"))).rejects.toThrow("ese borrador no es tuyo");
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("las dos mitades de subir una foto", () => {
  it("pide el destino por el caso de uso y devuelve la fecha serializada", async () => {
    requestDraftPhotoUpload.mockResolvedValueOnce({
      key: "incoming/broker-1/token",
      url: "https://r2.example/put",
      expiresAt: new Date("2026-08-27T12:05:00.000Z"),
    });

    const destino = await pedirDestinoDeFoto({
      listingId: "borrador-1",
      contentType: "image/webp",
      byteLength: 38_000,
    });

    expect(requestDraftPhotoUpload.mock.calls[0]?.[0]).toEqual({
      listingId: "borrador-1",
      contentType: "image/webp",
      byteLength: 38_000,
    });
    // Una `Date` no sobrevive el cruce hacia el componente cliente.
    expect(destino.expiresAt).toBe("2026-08-27T12:05:00.000Z");
  });

  /**
   * **Adjuntar pasa por `attachPhotoToDraft` y por ningún otro lado**, que es
   * lo que mantiene la foto dentro de `processUploadedPhoto` — el único punto
   * donde vive el rechazo por foto duplicada entre cuentas (tarea 4.7). Un
   * camino que escribiera la fila de foto por su cuenta reabriría ese
   * agujero.
   */
  it("adjunta por attachPhotoToDraft y refresca la lista, que cuenta fotos", async () => {
    attachPhotoToDraft.mockResolvedValueOnce({ listingId: "borrador-1", position: 0 });

    const resultado = await adjuntarFotoAlBorrador({
      listingId: "borrador-1",
      key: "incoming/broker-1/token",
      contentType: "image/webp",
    });

    expect(attachPhotoToDraft.mock.calls[0]?.[0]).toEqual({
      listingId: "borrador-1",
      incomingKey: "incoming/broker-1/token",
      declaredContentType: "image/webp",
    });
    expect(resultado.position).toBe(0);
    expect(revalidatePath).toHaveBeenCalledWith("/mis-avisos");
  });
});

/**
 * tasks.md 18.20 — **el llamador que no existía.**
 *
 * `editListing`, `planListingEdit`, `ListingEditPort` y `DrizzleListingEdit`
 * shipearon enteros, probados y sin una sola ruta que los invocara: un dueño
 * no podía corregir su precio aunque el dominio supiera cómo. Es la sexta vez
 * que este trabajo encuentra la misma forma de defecto. **Lo que este bloque
 * prueba es exactamente eso y nada más**: que un POST del formulario llega al
 * caso de uso. Qué campos se pueden tocar lo prueba `listing-edit.test.ts`,
 * en el dominio y bajo el piso del 90%.
 */
function edicionDe(campos: Record<string, string>): FormData {
  const form = new FormData();
  form.set("listingId", "aviso-1");
  for (const [key, value] of Object.entries(campos)) form.set(key, value);
  return form;
}

const CAMPOS = {
  title: "Apartamento amoblado en La Castellana",
  description: "Una descripción larga que el dominio ya valida en su propia prueba.",
  priceUsd: "700",
  rooms: "3",
  bathrooms: "2",
  areaM2: "128",
  parkingSpots: "1",
  propertyType: "apartamento",
  reference: "Frente a la panadería",
  contactMethod: "whatsapp",
  contactValue: "04121234567",
};

describe("guardarEdicion — la ruta que le faltaba a editListing (18.20)", () => {
  it("llama a editListing con el id del formulario y los once campos editables, y vuelve a la lista", async () => {
    editListing.mockResolvedValueOnce({ listingId: "aviso-1" });

    await expect(guardarEdicion(SIN_NEGATIVAS, edicionDe(CAMPOS))).rejects.toThrow(
      "NEXT_REDIRECT:/mis-avisos",
    );

    expect(editListing).toHaveBeenCalledTimes(1);
    expect(editListing.mock.calls[0]?.[0]).toEqual({
      listingId: "aviso-1",
      edit: {
        title: CAMPOS.title,
        description: CAMPOS.description,
        priceUsd: 700,
        rooms: 3,
        bathrooms: 2,
        areaM2: 128,
        parkingSpots: 1,
        propertyType: "apartamento",
        reference: "Frente a la panadería",
        contactMethod: "whatsapp",
        contactValue: "04121234567",
        publisherType: undefined,
      },
      photoIdsToRemove: [],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/mis-avisos");
  });

  /**
   * tasks.md 18.37 — **la marca que distingue «destildé las cinco» de «este
   * POST no traía atributos».** Esta capa sólo la traduce: con la marca, los
   * cinco booleanos; sin ella, los cinco ausentes. Lo que la ausencia significa
   * lo contesta `writeFor` con su `?? current`.
   */
  it("con la marca, las cinco casillas viajan como booleanos y las que no se marcaron viajan en false", async () => {
    editListing.mockResolvedValueOnce({ listingId: "aviso-1" });

    await expect(
      guardarEdicion(
        SIN_NEGATIVAS,
        edicionDe({
          ...CAMPOS,
          featuresDeclared: "1",
          hasPowerPlant: "on",
          hasSecurity: "on",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/mis-avisos");

    const [pedido] = editListing.mock.calls[0] as [{ edit: Record<string, unknown> }];

    expect(pedido.edit.hasPowerPlant).toBe(true);
    expect(pedido.edit.hasSecurity).toBe(true);
    // Las tres destildadas. `false` y no `undefined`: es la declaración que
    // borra la de ayer, sin la cual un atributo se pone pero no se saca.
    expect(pedido.edit.hasRegularWater).toBe(false);
    expect(pedido.edit.isFurnished).toBe(false);
    expect(pedido.edit.hasAppliances).toBe(false);
  });

  /** **La mitad sin la cual la anterior no prueba nada.** Una acción de servidor
   *  es un endpoint HTTP público: un pedido escrito a mano que sólo trae el
   *  precio no puede llevarse por delante cinco declaraciones. */
  it("sin la marca los cinco viajan ausentes, jamás en false", async () => {
    editListing.mockResolvedValueOnce({ listingId: "aviso-1" });

    await expect(guardarEdicion(SIN_NEGATIVAS, edicionDe(CAMPOS))).rejects.toThrow(
      "NEXT_REDIRECT:/mis-avisos",
    );

    const [pedido] = editListing.mock.calls[0] as [{ edit: Record<string, unknown> }];

    for (const campo of [
      "hasPowerPlant",
      "hasRegularWater",
      "isFurnished",
      "hasSecurity",
      "hasAppliances",
    ]) {
      expect(pedido.edit[campo], campo).toBeUndefined();
    }
  });

  /**
   * `Number("")` es 0, y ese cero silencioso es la diferencia entre no tocar
   * el precio y publicar un alquiler gratis. Fase 44 (S5): tampoco viaja como
   * ausente, porque ausente es «no lo toqué» y la edición se daba por buena con
   * el precio de ayer. En blanco es `null` y lo rechaza el dominio.
   */
  it("un numérico en blanco viaja como null, ausente del POST viaja como ausente, y nunca como cero", async () => {
    editListing.mockResolvedValueOnce({ listingId: "aviso-1" });
    const { areaM2: _sinMetros, ...sinMetros } = CAMPOS;

    await expect(
      guardarEdicion(SIN_NEGATIVAS, edicionDe({ ...sinMetros, priceUsd: "", rooms: "" })),
    ).rejects.toThrow("NEXT_REDIRECT:/mis-avisos");

    const [pedido] = editListing.mock.calls[0] as [{ edit: Record<string, unknown> }];
    const edit = pedido.edit;
    expect(edit.priceUsd).toBeNull();
    expect(edit.rooms).toBeNull();
    expect(edit.areaM2).toBeUndefined();
    expect(edit.bathrooms).toBe(2);
  });

  /**
   * **El POST lo lleva al dominio y esta capa no lo juzga** — ni siquiera desde
   * la 18.38, que abre una de las dos direcciones. Una acción de servidor es un
   * endpoint HTTP público: decidir acá cuál sentido pasa pondría la mitad de la
   * regla fuera del piso del 90 % (AGENTS.md §1), y un aviso de inmobiliaria
   * podría volver a dueño por un POST que esta pantalla no dibuja.
   */
  it("un tipo de publicador que llegue en el POST viaja al dominio, que es quien decide", async () => {
    editListing.mockResolvedValueOnce({ listingId: "aviso-1" });

    await expect(
      guardarEdicion(SIN_NEGATIVAS, edicionDe({ ...CAMPOS, publisherType: "broker" })),
    ).rejects.toThrow("NEXT_REDIRECT:/mis-avisos");

    const [pedido] = editListing.mock.calls[0] as [{ edit: Record<string, unknown> }];
    const edit = pedido.edit;
    expect(edit.publisherType).toBe("broker");
  });

  /**
   * tasks.md 18.27 — **la referencia es el único campo con dos ausencias.** El
   * dominio decide qué hacer con cada una; lo que se prueba acá es que la acción
   * no las aplasta en una sola antes de llegar: `formText` devuelve `undefined`
   * para lo vacío, y mandarlo así haría que `?? current` diera la seña de ayer
   * por buena y que borrarla fuera imposible desde la pantalla.
   */
  it("la referencia en blanco viaja como cadena vacía, y ausente del POST viaja como ausente", async () => {
    editListing.mockResolvedValueOnce({ listingId: "aviso-1" });
    await expect(
      guardarEdicion(SIN_NEGATIVAS, edicionDe({ ...CAMPOS, reference: "  " })),
    ).rejects.toThrow("NEXT_REDIRECT:/mis-avisos");
    const [primero] = editListing.mock.calls[0] as [{ edit: ListingEdit }];
    expect(primero.edit.reference).toBe("");

    editListing.mockResolvedValueOnce({ listingId: "aviso-1" });
    const { reference: _sin, ...sinReferencia } = CAMPOS;
    await expect(guardarEdicion(SIN_NEGATIVAS, edicionDe(sinReferencia))).rejects.toThrow(
      "NEXT_REDIRECT:/mis-avisos",
    );
    const [segundo] = editListing.mock.calls[1] as [{ edit: ListingEdit }];
    expect(segundo.edit.reference).toBeUndefined();
  });

  /** Cero puestos es una respuesta, y llega como cero y no como ausente: es el
   *  único campo numérico del aviso donde el vacío significa algo. */
  it("dejar los puestos en blanco viaja como cero, no como «no contestó»", async () => {
    editListing.mockResolvedValueOnce({ listingId: "aviso-1" });

    await expect(
      guardarEdicion(SIN_NEGATIVAS, edicionDe({ ...CAMPOS, parkingSpots: "" })),
    ).rejects.toThrow("NEXT_REDIRECT:/mis-avisos");

    const [pedido] = editListing.mock.calls[0] as [{ edit: ListingEdit }];
    expect(pedido.edit.parkingSpots).toBe(0);
  });

  /**
   * Fase 44 (S4) — **la negativa vuelve a la misma pantalla con lo escrito.**
   * «le di a guardar aviso y ahí se reinició todo»: antes esto redirigía con
   * los códigos y la página volvía a pintar la base. Ahora la acción DEVUELVE
   * el estado y `useActionState` lo dibuja, con y sin JavaScript; los valores
   * vuelven crudos, tal cual se escribieron, y sin el `listingId`.
   */
  it("una negativa del dominio devuelve los códigos, las medidas y lo escrito, sin redirigir", async () => {
    editListing.mockRejectedValueOnce(
      new EditListingRejectedError(["publisherType.immutable", "priceUsd.invalid"]),
    );
    const enviado = { ...CAMPOS, priceUsd: "abc", featuresDeclared: "1", hasSecurity: "on" };

    await expect(guardarEdicion(SIN_NEGATIVAS, edicionDe(enviado))).resolves.toEqual({
      motivos: ["publisherType.immutable", "priceUsd.invalid"],
      medidas: { titleLength: 37, descriptionLength: 67 },
      valores: enviado,
      fotosAQuitar: [],
    });
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/mis-avisos");
  });

  it("guardar bien sigue volviendo a la lista, no a un estado", async () => {
    editListing.mockResolvedValueOnce({ listingId: "aviso-1" });

    await expect(guardarEdicion(SIN_NEGATIVAS, edicionDe(CAMPOS))).rejects.toThrow(
      "NEXT_REDIRECT:/mis-avisos",
    );
    expect(redirect).toHaveBeenCalledWith("/mis-avisos");
  });

  /**
   * tasks.md 18.25 — **el contador cuenta lo que se envió.** Leer la
   * descripción guardada habría dicho el largo de otra; la medida sale de lo
   * que el validador acaba de rechazar.
   */
  it("la negativa lleva la medida de lo que se envió", async () => {
    editListing.mockRejectedValueOnce(new EditListingRejectedError(["description.tooShort"]));

    const estado = await guardarEdicion(
      SIN_NEGATIVAS,
      edicionDe({ ...CAMPOS, description: "Corta, muy corta de más." }),
    );

    expect(estado.medidas).toEqual({ titleLength: 37, descriptionLength: 24 });
  });

  it("mide en puntos de código, igual que el validador que la rechazó", async () => {
    editListing.mockRejectedValueOnce(new EditListingRejectedError(["description.tooShort"]));

    const estado = await guardarEdicion(
      SIN_NEGATIVAS,
      edicionDe({ ...CAMPOS, description: "🏠".repeat(10) }),
    );

    expect(estado.medidas.descriptionLength).toBe(10);
  });

  it("un campo vacío no manda una medida, porque no se envió ninguno", async () => {
    editListing.mockRejectedValueOnce(new EditListingRejectedError(["description.required"]));

    const estado = await guardarEdicion(SIN_NEGATIVAS, edicionDe({ ...CAMPOS, description: "" }));

    expect(estado.motivos).toEqual(["description.required"]);
    expect(estado.medidas.descriptionLength).toBeUndefined();
    expect(estado.medidas.titleLength).toBe(37);
  });

  /**
   * Fase 44 (44.4b, S2) — **las fotos marcadas viajan con el guardado.** Las
   * casillas se leen con `getAll`; repetidas y vacías no son marcas. Qué se
   * puede quitar lo decide `editListing`.
   */
  it("las marcadas viajan sin repetir ni vacías, con los puertos sobre el cliente transaccional", async () => {
    editListing.mockResolvedValueOnce({ listingId: "aviso-1", coverChangedTo: null });
    const form = edicionDe(CAMPOS);
    for (const id of ["foto-b", "", "foto-a", "foto-b"]) form.append("quitarFoto", id);

    await expect(guardarEdicion(SIN_NEGATIVAS, form)).rejects.toThrow("NEXT_REDIRECT:/mis-avisos");

    const [pedido, deps] = editListing.mock.calls[0] ?? [];
    expect(pedido.photoIdsToRemove).toEqual(["foto-b", "foto-a"]);
    expect(deps.photoRemoval.listings).toBeInstanceOf(DrizzleListingEdit);
    expect(deps.photoRemoval.listings).toMatchObject({ db: TX });
    expect(deps.photoRemoval.order).toBeInstanceOf(DrizzleListingPhotoSet);
    expect(deps.photoRemoval.order).toMatchObject({ db: TX });
    expect(deps.listings).toMatchObject({ db: TX });
  });

  it("sin marcas no arma R2 ni puertos de fotos: el guardado de siempre", async () => {
    editListing.mockResolvedValueOnce({ listingId: "aviso-1", coverChangedTo: null });

    await expect(guardarEdicion(SIN_NEGATIVAS, edicionDe(CAMPOS))).rejects.toThrow(
      "NEXT_REDIRECT:/mis-avisos",
    );

    const [pedido, deps] = editListing.mock.calls[0] ?? [];
    expect(pedido.photoIdsToRemove).toEqual([]);
    expect(pedido.photoOrder).toBeUndefined();
    expect(deps.photoRemoval).toBeUndefined();
  });

  it("una negativa devuelve las marcas, y la casilla no vuelve como un valor más", async () => {
    editListing.mockRejectedValueOnce(new EditListingRejectedError(["photosToRemove.notFound"]));
    const form = edicionDe(CAMPOS);
    form.append("quitarFoto", "foto-a");
    form.append("quitarFoto", "foto-c");

    const estado = await guardarEdicion(SIN_NEGATIVAS, form);

    expect(estado.fotosAQuitar).toEqual(["foto-a", "foto-c"]);
    expect(estado.valores).not.toHaveProperty("quitarFoto");
    expect(estado.motivos).toEqual(["photosToRemove.notFound"]);
  });

  it("si cambió la portada, Mis avisos lo anuncia", async () => {
    editListing.mockResolvedValueOnce({ listingId: "aviso-1", coverChangedTo: "foto-b" });
    const form = edicionDe(CAMPOS);
    form.append("quitarFoto", "foto-a");

    await expect(guardarEdicion(SIN_NEGATIVAS, form)).rejects.toThrow(
      "NEXT_REDIRECT:/mis-avisos?portada=1",
    );
  });

  /**
   * Fase 44 (44.5b, L17) — **el orden que se ve viaja con Guardar.** La acción
   * no lo juzga: un id ajeno o repetido lo contesta `planPhotosRemoval`.
   */
  it("el orden que se ve viaja como photoOrder, y basta para armar los puertos de fotos", async () => {
    editListing.mockResolvedValueOnce({ listingId: "aviso-1", coverChangedTo: null });
    const form = edicionDe(CAMPOS);
    for (const id of ["foto-c", "foto-a", "foto-b"]) form.append("ordenFoto", id);

    await expect(guardarEdicion(SIN_NEGATIVAS, form)).rejects.toThrow("NEXT_REDIRECT:/mis-avisos");

    const [pedido, deps] = editListing.mock.calls[0] ?? [];
    expect(pedido.photoOrder).toEqual(["foto-c", "foto-a", "foto-b"]);
    expect(pedido.photoIdsToRemove).toEqual([]);
    expect(deps.photoRemoval.order).toBeInstanceOf(DrizzleListingPhotoSet);
    expect(deps.photoRemoval.listings).toMatchObject({ db: TX });
  });

  it("una negativa devuelve también el orden, que no vuelve como un valor más", async () => {
    editListing.mockRejectedValueOnce(new EditListingRejectedError(["title.required"]));
    const form = edicionDe(CAMPOS);
    for (const id of ["foto-c", "foto-a"]) form.append("ordenFoto", id);

    const estado = await guardarEdicion(SIN_NEGATIVAS, form);

    expect(estado.ordenFotos).toEqual(["foto-c", "foto-a"]);
    expect(estado.valores).not.toHaveProperty("ordenFoto");
  });

  /**
   * Sin JavaScript, «Hacer portada», «↑ Subir» y «↓ Bajar» son botones de
   * envío (L17): vuelven a la pantalla reordenada **sin guardar nada**, con lo
   * escrito y las marcas intactos. El orden nuevo lo calcula el dominio.
   */
  it("un botón de orden devuelve la pantalla reordenada sin guardar, con lo escrito y las marcas", async () => {
    const form = edicionDe(CAMPOS);
    for (const id of ["foto-a", "foto-b", "foto-c"]) form.append("ordenFoto", id);
    form.append("quitarFoto", "foto-b");
    form.set("moverFoto", "makeCover:foto-c");

    await expect(guardarEdicion(SIN_NEGATIVAS, form)).resolves.toEqual({
      motivos: [],
      medidas: {},
      valores: CAMPOS,
      fotosAQuitar: ["foto-b"],
      ordenFotos: ["foto-c", "foto-a", "foto-b"],
    });
    expect(editListing).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("un botón de orden inventado deja el orden como estaba y tampoco guarda", async () => {
    for (const moverFoto of ["remove:foto-a", "borrar:foto-a", "moveDown", ""]) {
      const form = edicionDe(CAMPOS);
      for (const id of ["foto-a", "foto-b"]) form.append("ordenFoto", id);
      form.set("moverFoto", moverFoto);

      const estado = await guardarEdicion(SIN_NEGATIVAS, form);

      expect(estado.ordenFotos, moverFoto).toEqual(["foto-a", "foto-b"]);
    }
    expect(editListing).not.toHaveBeenCalled();
  });

  /**
   * Un aviso ajeno y uno inexistente tiran el MISMO error, y ninguno se
   * convierte en una negativa dibujable: sube, y Next contesta como ante
   * cualquier otro fallo (AGENTS.md §7).
   */
  it("un aviso ajeno o inexistente sube, y no se convierte en una explicación", async () => {
    editListing.mockRejectedValueOnce(new EditListingNotFoundError("aviso-1"));

    await expect(guardarEdicion(SIN_NEGATIVAS, edicionDe(CAMPOS))).rejects.toBeInstanceOf(
      EditListingNotFoundError,
    );
    expect(redirect).not.toHaveBeenCalled();
  });
});

/**
 * tasks.md 18.21 — **el cable de las fotos de un aviso publicado.**
 *
 * Otra vez el cable y no la regla: el piso, el tope, el ascenso de la portada y
 * la puerta ya están probados en `edit-listing-photos.test.ts` y en la prueba
 * de integración. Acá sólo se prueba que una ruta los llame y qué dirección
 * devuelve.
 */
describe("las fotos de un aviso publicado (18.21)", () => {
  it("adjuntar pasa por el caso de uso del aviso, no por el del borrador", async () => {
    attachPhotoToListing.mockResolvedValue({ listingId: "aviso-1", position: 2 });

    const result = await adjuntarFotoAlAviso({
      listingId: "aviso-1",
      key: "incoming/dueno-1/9c1d4e6f8a2b0c3d5e7f9a1b3c5d7e9f",
      contentType: "image/webp",
    });

    expect(result).toEqual({ position: 2 });
    expect(attachPhotoToListing).toHaveBeenCalledWith(
      {
        listingId: "aviso-1",
        incomingKey: "incoming/dueno-1/9c1d4e6f8a2b0c3d5e7f9a1b3c5d7e9f",
        declaredContentType: "image/webp",
      },
      expect.anything(),
    );
    // El de un borrador NO se llama: son dos puertas distintas sobre la misma
    // tabla, y confundirlas sería ensanchar el `WHERE` de `findDraftById`.
    expect(attachPhotoToDraft).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/mis-avisos/aviso-1/editar");
  });

  it("firmar pasa por el caso de uso del aviso y devuelve la fecha serializada", async () => {
    requestListingPhotoUpload.mockResolvedValue({
      key: "incoming/dueno-1/token",
      url: "https://r2.example/put",
      expiresAt: new Date("2026-03-01T00:10:00.000Z"),
    });

    const destino = await pedirDestinoDeFotoDelAviso({
      listingId: "aviso-1",
      contentType: "image/webp",
      byteLength: 38_000,
    });

    expect(destino.expiresAt).toBe("2026-03-01T00:10:00.000Z");
    expect(requestDraftPhotoUpload).not.toHaveBeenCalled();
  });
});
