import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * tasks.md 28.11 — **el cable, no la regla.**
 *
 * A dónde vuelve lo decide `sign-out-destination.ts` (probado ahí); esto
 * sólo prueba que la acción llama a Auth.js con ese destino. `auth.ts` arma
 * el adaptador de Drizzle al importarse, así que sin este doble el archivo
 * ni siquiera carga — la misma razón que `(auth)/signin/actions.test.ts` ya
 * documenta para `signIn`.
 */
const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("./auth", () => ({ signOut }));

const { signOutAction } = await import("./sign-out-action");
const { SIGN_OUT_DESTINATION } = await import("../domain/sign-out-destination");

describe("signOutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cierra la sesión y vuelve a SIGN_OUT_DESTINATION, nunca a la página en curso", async () => {
    await signOutAction();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ redirectTo: SIGN_OUT_DESTINATION });
  });
});
