import { describe, expect, it } from "vitest";
import {
  missingZoneContactHref,
  resolveContactContext,
  resolveContactScreen,
} from "./contact-screen";

/**
 * Mirrors `listing-trust/domain/report-screen.ts`'s reasoning exactly: no
 * JavaScript means the acknowledgement can only arrive by URL, so the shape
 * is POST → redirect → GET that draws whatever the query string says.
 */
describe("missing-zone contact context", () => {
  it("builds only fixed internal entry links", () => {
    expect(missingZoneContactHref(false)).toBe("/ayuda/escribinos?motivo=zona-faltante");
    expect(missingZoneContactHref(true)).toBe(
      "/ayuda/escribinos?motivo=zona-faltante&volver=revisar",
    );
  });

  it("projects guidance and the saved Zone return without accepting arbitrary URLs", () => {
    const context = resolveContactContext("zona-faltante", undefined);
    expect(context).toMatchObject({
      value: "zona-faltante",
      returnMode: null,
      returnHref: "/publicar/paso/zona",
      returnLabel: "Volver al borrador guardado",
    });
    expect(context?.guidance).toBe(
      "Contanos la ciudad, el nombre de la zona que falta y por qué debería estar en el catálogo.",
    );
    expect(resolveContactContext("zona-faltante", "revisar")).toMatchObject({
      returnMode: "revisar",
      returnHref: "/publicar/paso/zona?volver=revisar",
    });
    for (const mode of ["//outside.invalid", "/publicar/paso/precio", ["revisar"], ""]) {
      expect(resolveContactContext("zona-faltante", mode)?.returnHref).toBe("/publicar/paso/zona");
    }
  });

  it("fails closed to the general screen for absent, unknown or repeated context", () => {
    for (const context of [undefined, "", "other", ["zona-faltante"], ["zona-faltante", "other"]]) {
      expect(resolveContactContext(context, "revisar")).toBeNull();
    }
  });
});

describe("resolveContactScreen", () => {
  it("draws the form with no error when neither flag is present", () => {
    const screen = resolveContactScreen(undefined, undefined);

    expect(screen).toEqual({ state: "form", errorNotice: null });
  });

  it("draws the form with an error notice when the error flag is present", () => {
    const screen = resolveContactScreen(undefined, "");

    expect(screen.state).toBe("form");
    expect(screen.state === "form" ? screen.errorNotice : null).not.toBeNull();
  });

  it("draws the sent acknowledgement when the sent flag is present, ignoring the error flag", () => {
    const screen = resolveContactScreen("", "");

    expect(screen.state).toBe("sent");
  });

  it("treats a bare repeated `?enviado` (array form) the same as one present", () => {
    const screen = resolveContactScreen([""], undefined);

    expect(screen.state).toBe("sent");
  });
});
