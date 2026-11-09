import { describe, expect, it } from "vitest";
import {
  applyPhotoAction,
  isPhotoReorderAction,
  movePhotoBy,
  offersDragReorder,
  pendingPhotoChange,
  photoActionsFor,
  photosInShownOrder,
  planPhotoRemoval,
  planPhotosRemoval,
  promoteToCover,
  reorderPhotoTo,
} from "./draft-photo-actions";
import { MIN_PHOTOS_FOR_ACTIVATION } from "./publishable-listing";

const CUATRO = ["a", "b", "c", "d"] as const;

describe("qué acciones ofrece una foto", () => {
  it("la portada no ofrece «mover arriba» ni «hacer portada»: ya es la portada", () => {
    const acciones = photoActionsFor(CUATRO, "a");

    expect(acciones).not.toContain("moveUp");
    expect(acciones).not.toContain("makeCover");
    expect(acciones).toContain("moveDown");
  });

  it("la última no ofrece «mover abajo», y la del medio ofrece las cuatro", () => {
    expect(photoActionsFor(CUATRO, "d")).not.toContain("moveDown");
    expect(photoActionsFor(CUATRO, "b")).toEqual(["moveUp", "moveDown", "makeCover", "remove"]);
  });

  it("una foto que no está en la lista no ofrece ninguna acción", () => {
    expect(photoActionsFor(CUATRO, "z")).toEqual([]);
  });

  it("«quitar» se ofrece incluso en la única foto — la negativa se dice al tocar, no escondiendo el renglón", () => {
    // El renglón es donde vive la frase «no borra la foto de tu teléfono».
    // Esconderlo cuando queda una sola foto esconde también la aclaración,
    // que es exactamente lo que la especificación pide que no pase.
    expect(photoActionsFor(["a"], "a")).toEqual(["remove"]);
  });
});

describe("quitar una foto del aviso", () => {
  it("quitar la portada asciende a la siguiente, y la nombra en vez de dejarlo al orden", () => {
    const plan = planPhotoRemoval(CUATRO, "a");

    expect(plan).toEqual({ ok: true, ids: ["b", "c", "d"], coverChangedTo: "b" });
  });

  it("quitar una foto que no es la portada no toca la portada", () => {
    const plan = planPhotoRemoval(CUATRO, "c");

    expect(plan).toEqual({ ok: true, ids: ["a", "b", "d"], coverChangedTo: null });
  });

  it("quitar la única foto se rechaza, y la respuesta no trae lista para que nadie la aplique igual", () => {
    const plan = planPhotoRemoval(["a"], "a");

    expect(plan).toEqual({ ok: false, refusal: "lastPhoto" });
  });

  it("el piso que rechaza es MIN_PHOTOS_FOR_ACTIVATION, no un 1 suelto escrito acá", () => {
    const justo = Array.from({ length: MIN_PHOTOS_FOR_ACTIVATION }, (_, i) => `p${i}`);
    const unaMas = [...justo, "extra"];

    expect(planPhotoRemoval(justo, "p0").ok).toBe(false);
    expect(planPhotoRemoval(unaMas, "p0").ok).toBe(true);
  });

  it("quitar una foto que no está en la lista se rechaza en vez de devolver la lista entera", () => {
    expect(planPhotoRemoval(CUATRO, "z")).toEqual({ ok: false, refusal: "notFound" });
  });
});

/**
 * Fase 44 (44.4) — **las marcadas al guardar, todas juntas.** Una sola
 * respuesta para el lote: o se quitan todas o no se quita ninguna (G3).
 */
describe("quitar varias fotos al guardar", () => {
  it("una marcada que no está en el aviso rechaza el lote entero, aunque las demás estén", () => {
    expect(planPhotosRemoval(CUATRO, ["b", "z"])).toEqual({ ok: false, refusal: "notFound" });
  });

  it("marcar las dos de un aviso de dos se rechaza: el piso es para el lote, no para cada una", () => {
    expect(planPhotosRemoval(["a", "b"], ["a", "b"])).toEqual({ ok: false, refusal: "lastPhoto" });
  });

  it("una marca repetida cuenta una vez, y no tumba el piso que la foto sola respeta", () => {
    expect(planPhotosRemoval(["a", "b"], ["b", "b"])).toEqual({
      ok: true,
      ids: ["a"],
      removed: ["b"],
      coverChangedTo: null,
      reordered: false,
    });
  });

  it("quitar la portada entre otras asciende a la primera que queda, en el orden del aviso", () => {
    expect(planPhotosRemoval(CUATRO, ["b", "a"])).toEqual({
      ok: true,
      ids: ["c", "d"],
      removed: ["a", "b"],
      coverChangedTo: "c",
      reordered: false,
    });
  });
});

describe("ordenar y elegir portada al guardar (44.5)", () => {
  it("el orden enviado es el orden que queda, y elegir portada no es quitarla", () => {
    expect(planPhotosRemoval(CUATRO, [], ["c", "a", "b", "d"])).toEqual({
      ok: true,
      ids: ["c", "a", "b", "d"],
      removed: [],
      coverChangedTo: null,
      reordered: true,
    });
  });

  it("el mismo orden que ya tenía el aviso no es un cambio", () => {
    const plan = planPhotosRemoval(CUATRO, [], [...CUATRO]);
    expect(plan).toMatchObject({ ok: true, ids: CUATRO, reordered: false });
  });

  it("un id del orden que el aviso no tiene rechaza el guardado entero", () => {
    expect(planPhotosRemoval(CUATRO, [], ["b", "z", "a", "c", "d"])).toEqual({
      ok: false,
      refusal: "notFound",
    });
  });

  it("uno repetido cuenta una vez, y las que no vinieron van al final en su orden", () => {
    // `d` se subió después de dibujar la pantalla: nadie la ordenó.
    expect(planPhotosRemoval(CUATRO, [], ["c", "c", "a"])).toMatchObject({
      ok: true,
      ids: ["c", "a", "b", "d"],
    });
  });

  it("quitar la que se veía primera anuncia la nueva portada, en el orden enviado", () => {
    expect(planPhotosRemoval(CUATRO, ["c"], ["c", "d", "a", "b"])).toEqual({
      ok: true,
      ids: ["d", "a", "b"],
      removed: ["c"],
      coverChangedTo: "d",
      reordered: true,
    });
  });

  it("quitar la vieja portada después de elegir otra no anuncia nada: la portada se eligió", () => {
    expect(planPhotosRemoval(CUATRO, ["a"], ["c", "a", "b", "d"])).toMatchObject({
      ok: true,
      ids: ["c", "b", "d"],
      coverChangedTo: null,
    });
  });

  it("el piso se cuenta igual con orden enviado", () => {
    expect(planPhotosRemoval(["a", "b"], ["a", "b"], ["b", "a"])).toEqual({
      ok: false,
      refusal: "lastPhoto",
    });
  });
});

/**
 * Fase 44 (44.5b) — lo que la pantalla de editar dibuja ANTES de guardar: el
 * orden que se ve y qué cambió respecto del aviso.
 */
describe("el orden que se ve en editar (44.5b)", () => {
  it("cada botón con nombre es su mecánica: subir, bajar y hacer portada", () => {
    expect(applyPhotoAction(CUATRO, "c", "moveUp")).toEqual(["a", "c", "b", "d"]);
    expect(applyPhotoAction(CUATRO, "b", "moveDown")).toEqual(["a", "c", "b", "d"]);
    expect(applyPhotoAction(CUATRO, "d", "makeCover")).toEqual(["d", "a", "b", "c"]);
    expect(applyPhotoAction(CUATRO, "z", "makeCover")).toEqual(CUATRO);
  });

  it("sólo subir, bajar y hacer portada son acciones de orden; quitar y lo inventado no", () => {
    for (const accion of ["moveUp", "moveDown", "makeCover"]) {
      expect(isPhotoReorderAction(accion), accion).toBe(true);
    }
    for (const accion of ["remove", "borrar", ""]) {
      expect(isPhotoReorderAction(accion), accion).toBe(false);
    }
  });

  it("el orden enviado sin repetidas ni ajenas, y las que faltan al final en su orden", () => {
    // `d` se subió después de ordenar; `z` ya no está en el aviso.
    expect(photosInShownOrder(CUATRO, ["c", "z", "c", "a"])).toEqual(["c", "a", "b", "d"]);
    expect(photosInShownOrder(CUATRO, [])).toEqual(CUATRO);
  });

  it("otra foto primero es una portada nueva, con su id", () => {
    expect(pendingPhotoChange(CUATRO, ["c", "a", "b", "d"])).toEqual({
      kind: "cover",
      photoId: "c",
    });
  });

  it("la misma portada con otro orden es sólo orden, y el mismo orden no es nada", () => {
    expect(pendingPhotoChange(CUATRO, ["a", "c", "b", "d"])).toEqual({ kind: "order" });
    expect(pendingPhotoChange(CUATRO, ["a", "b"])).toBeNull();
    expect(pendingPhotoChange([], [])).toBeNull();
  });
});

describe("reordenar con acciones nombradas", () => {
  it("«mover abajo» intercambia con la siguiente y deja el resto quieto", () => {
    expect(movePhotoBy(CUATRO, "b", 1)).toEqual(["a", "c", "b", "d"]);
  });

  it("«mover arriba» desde la portada devuelve el mismo orden", () => {
    expect(movePhotoBy(CUATRO, "a", -1)).toEqual(["a", "b", "c", "d"]);
  });

  it("«mover abajo» desde la última devuelve el mismo orden", () => {
    expect(movePhotoBy(CUATRO, "d", 1)).toEqual(["a", "b", "c", "d"]);
  });

  it("«hacer portada» pone la foto primera y conserva el orden relativo del resto", () => {
    expect(promoteToCover(CUATRO, "c")).toEqual(["c", "a", "b", "d"]);
  });

  it("«hacer portada» sobre la portada no reordena nada", () => {
    expect(promoteToCover(CUATRO, "a")).toEqual(["a", "b", "c", "d"]);
  });
});

describe("reordenar arrastrando, que es lo mismo dicho con el mouse", () => {
  it("soltar sobre una posición anterior INSERTA ahí, no intercambia", () => {
    // Intercambiar daría ["a","d","c","b"]. Insertar es lo que hace un
    // arrastre: la foto entra en el hueco y las demás corren.
    expect(reorderPhotoTo(CUATRO, "d", 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("soltar sobre una posición posterior también inserta, contando ya sin la foto movida", () => {
    expect(reorderPhotoTo(CUATRO, "a", 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("soltar fuera de la lista devuelve el mismo orden en vez de recortarlo", () => {
    expect(reorderPhotoTo(CUATRO, "a", 9)).toEqual(["a", "b", "c", "d"]);
    expect(reorderPhotoTo(CUATRO, "a", -1)).toEqual(["a", "b", "c", "d"]);
  });

  it("arrastrar una foto que no está en la lista devuelve el mismo orden", () => {
    expect(reorderPhotoTo(CUATRO, "z", 0)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("a quién se le ofrece arrastrar", () => {
  it("con mouse y más de una foto, sí", () => {
    expect(offersDragReorder({ pointerIsFine: true, photoCount: 2 })).toBe(true);
  });

  it("con el pulgar no se ofrece, aunque haya seis fotos", () => {
    // La razón está en la especificación y no es preferencia: arrastrar con
    // el pulgar en un teléfono lento no es confiable.
    expect(offersDragReorder({ pointerIsFine: false, photoCount: 6 })).toBe(false);
  });

  it("con mouse y una sola foto tampoco: un arrastre que no puede cambiar nada promete que sí", () => {
    expect(offersDragReorder({ pointerIsFine: true, photoCount: 1 })).toBe(false);
  });
});
