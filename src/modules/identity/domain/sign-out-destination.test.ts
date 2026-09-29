import { describe, expect, it } from "vitest";
import { SIGN_OUT_DESTINATION, safeSignOutDestination } from "./sign-out-destination";

/**
 * tasks.md 28.11 — a dónde vuelve quien cierra sesión.
 *
 * El menú de cuenta se dibuja en toda pantalla (`Nav.tsx`), así que la
 * sesión puede terminar en cualquier lugar: una ficha, `/mis-avisos`, el
 * propio publicador. Volver a esa MISMA pantalla es peligroso justo en las
 * que exigen sesión (`requireSession`): el servidor las manda de inmediato
 * de vuelta a `/signin`, y quien recién salió vería la puerta de entrada
 * pensando que el clic no hizo nada.
 */
describe("SIGN_OUT_DESTINATION", () => {
  it("vuelve al inicio — la única pantalla pública garantizada, y donde la barra ya ofrece «Entrar»", () => {
    expect(SIGN_OUT_DESTINATION).toBe("/");
  });
});

describe("safeSignOutDestination", () => {
  const id = "99d25b3d-4d23-48d3-b134-f720781b1eb3";
  const detail = `/alquiler/maracaibo/coquivacoa/apartamento-${id}`;
  it("accepts a detail or bare id", () => {
    expect(safeSignOutDestination(detail)).toBe(detail);
    expect(safeSignOutDestination(`/alquiler/maracaibo/coquivacoa/${id}`)).toBe(
      `/alquiler/maracaibo/coquivacoa/${id}`,
    );
  });
  it.each([
    undefined,
    null,
    "",
    "/mis-avisos",
    `https://evil.test${detail}`,
    `//evil.test${detail}`,
    `${detail}?x=1`,
    `${detail}#x`,
    `${detail}/foto/1`,
    `${detail}/reportar`,
    `/alquiler/maracaibo/coquivacoa/a%2fb-${id}`,
    `/alquiler/maracaibo/coquivacoa/a\\b-${id}`,
    `/alquiler/maracaibo/coquivacoa/${"a".repeat(61)}-${id}`,
    `/alquiler/maracaibo/../apartamento-${id}`,
    `/alquiler/maracaibo/coquivacoa/no-id`,
  ])("rejects %s", (candidate) => {
    expect(safeSignOutDestination(candidate)).toBe("/");
  });
});
