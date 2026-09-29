import { describe, expect, it } from "vitest";
import { missingRevealMessageDestination, revealMessageFeedback } from "./reveal-message";

const DETAIL = "/alquiler/maracaibo/tierra-negra/apartamento-3f2a91cb-04d7-b8e0-1a55-9c7e2d4f6b03";

describe("missing reveal message feedback", () => {
  it("returns a fixed marker on the detail path without carrying door, search, or user text", () => {
    expect(
      missingRevealMessageDestination(`${DETAIL}?entrar=si&volver=%2Fbuscar&message=secreto`),
    ).toBe(`${DETAIL}?revelar=mensaje-requerido`);
  });

  it.each([
    "https://evil.test/alquiler/maracaibo/tierra-negra/aviso",
    "//evil.test/alquiler/maracaibo/tierra-negra/aviso",
    "/\\evil.test/alquiler/maracaibo/tierra-negra/aviso",
    "/alquiler/maracaibo/tierra-negra",
    "/alquiler/maracaibo/tierra-negra/aviso",
    "/alquiler/maracaibo/tierra-negra/aviso-3f2a91cb-04d7-b8e0-1a55-9c7e2d4f6b03/extra",
    "/signin",
    "",
  ])("fails closed for %s", (candidate) => {
    expect(missingRevealMessageDestination(candidate)).toBe("/");
  });

  it("maps only the exact scalar marker to helpful text", () => {
    expect(revealMessageFeedback("mensaje-requerido")).toMatch(/mensaje/i);
    expect(revealMessageFeedback(undefined)).toBeNull();
    expect(revealMessageFeedback("other")).toBeNull();
    expect(revealMessageFeedback(["mensaje-requerido"])).toBeNull();
  });
});
