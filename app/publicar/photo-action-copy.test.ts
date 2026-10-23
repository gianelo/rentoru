import { describe, expect, it } from "vitest";
import {
  photoActionsFor,
  planPhotoRemoval,
} from "../../src/modules/listing-publication/domain/draft-photo-actions";
import {
  coverChangedNotice,
  discardPhotoLabel,
  PHOTO_ACTION_COPY,
  PHOTO_COVER_EXPLANATION,
  PHOTO_REMOVAL_REFUSAL_COPY,
  photoActionLabel,
  photoRemovalRefusalMessage,
} from "./photo-action-copy";

describe("los cuatro renglones del menú de una foto", () => {
  it("«Quitar del aviso» sale entero, no partido por el nombre de la foto", () => {
    // Antes se emitía como `Quitar ${nombre} del aviso`, así que la etiqueta
    // que la especificación nombra nunca existió como frase.
    expect(PHOTO_ACTION_COPY.remove.label).toBe("Quitar del aviso");
  });

  it("quitar conserva la acción sin ayuda del teléfono", () => {
    expect(PHOTO_ACTION_COPY.remove).toEqual({ label: "Quitar del aviso" });
  });

  it("portada conserva la acción y su explicación compartida aprobada", () => {
    expect(PHOTO_ACTION_COPY.makeCover).toEqual({ label: "Hacer portada" });
    expect(PHOTO_COVER_EXPLANATION).toBe("Es la foto principal de tu aviso");
  });

  it("mover conserva sus etiquetas sin ayudas adicionales", () => {
    expect(PHOTO_ACTION_COPY.moveUp).toEqual({ label: "Mover arriba" });
    expect(PHOTO_ACTION_COPY.moveDown).toEqual({ label: "Mover abajo" });
  });

  it("toda acción que el dominio ofrece tiene renglón: ninguna sale sin nombre", () => {
    for (const action of photoActionsFor(["a", "b", "c"], "b")) {
      expect(PHOTO_ACTION_COPY[action].label.length).toBeGreaterThan(0);
    }
  });
});

describe("el nombre accesible de cada botón", () => {
  it("quitar conserva la acción y el nombre de la foto", () => {
    expect(photoActionLabel("remove", "Sala")).toBe("Quitar del aviso: Sala");
  });

  it("hace lo mismo con portada", () => {
    expect(photoActionLabel("makeCover", "Cocina")).toBe("Hacer portada: Cocina");
  });

  it("sin frase no inventa una ni deja un punto colgando", () => {
    expect(photoActionLabel("moveUp", "Sala")).toBe("Mover arriba: Sala");
  });
});

describe("lo que se dice al quitar", () => {
  it("la negativa de la única foto dice la salida, no sólo el no", () => {
    const plan = planPhotoRemoval(["a"], "a");
    if (plan.ok) throw new Error("quitar la única foto tenía que rechazarse");

    expect(PHOTO_REMOVAL_REFUSAL_COPY[plan.refusal]).toBe(
      "Es la única foto y sin fotos no se puede publicar. Agrega otra y después quita esta.",
    );
  });

  it("cuando la portada se va, se nombra la que quedó — no se deja al orden", () => {
    expect(coverChangedNotice("Cocina")).toBe("Ahora la portada es «Cocina».");
  });

  it("una foto que nunca subió se descarta, no se «quita del aviso»: nunca estuvo en él", () => {
    expect(discardPhotoLabel("Sala")).toBe("Descartar Sala, que no llegó a subir");
  });
});

/**
 * tasks.md 18.21 — el código vuelve por la URL cuando quitar se niega, así que
 * una dirección escrita a mano es dato de afuera. Misma forma que
 * `listingEditViolationMessage`.
 */
describe("photoRemovalRefusalMessage", () => {
  it("traduce una negativa real del dominio", () => {
    expect(photoRemovalRefusalMessage("lastPhoto")).toBe(PHOTO_REMOVAL_REFUSAL_COPY.lastPhoto);
  });

  it("un código inventado vuelve como vino, en vez de dibujar «undefined»", () => {
    expect(photoRemovalRefusalMessage("inventado")).toBe("inventado");
  });
});
