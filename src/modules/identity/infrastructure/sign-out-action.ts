"use server";

import { SIGN_OUT_DESTINATION } from "../domain/sign-out-destination";

/**
 * Cerrar sesión (tasks.md 28.11) — la MISMA acción para el menú de cuenta
 * (14b, sólo con JavaScript) y para `/mis-avisos` (el camino servido, sin
 * él): un solo lugar decide qué hace "cerrar sesión" y a dónde vuelve.
 *
 * **Es una acción de servidor y no un enlace.** Cerrar sesión cambia
 * estado —invalida la fila de `session` en la base; Auth.js corre con
 * estrategia `database` (`auth.ts`)—, y un `GET` que hace eso es un
 * defecto: un prefetch, un rastreador o un "atrás" mal dado podría
 * dispararlo. Es la misma razón que `activarBorrador`
 * (`app/mis-avisos/actions.ts`) ya documenta para activar un aviso.
 *
 * A dónde vuelve lo decide `SIGN_OUT_DESTINATION`, nunca esta pieza.
 *
 * **`auth.ts` entra por importación diferida y no arriba**, la misma razón
 * que `(auth)/signin/actions.ts` ya documenta para la base: `auth.ts`
 * construye el adaptador de Drizzle al cargarse, que exige `DATABASE_URL`.
 * `AccountMenu` (componente de cliente, montado en TODA pantalla vía `Nav`)
 * importa esta acción arriba para pasarla a un `<form action={...}>`; una
 * importación estática de `auth.ts` la arrastraría a cada página del sitio
 * sin que nada la necesite todavía.
 */
export async function signOutAction(): Promise<void> {
  const { signOut } = await import("./auth");
  await signOut({ redirectTo: SIGN_OUT_DESTINATION });
}
