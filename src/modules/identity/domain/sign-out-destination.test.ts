import { describe, expect, it } from "vitest";
import { SIGN_OUT_DESTINATION } from "./sign-out-destination";

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
