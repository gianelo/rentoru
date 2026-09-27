/**
 * A dónde vuelve quien cierra sesión (tasks.md 28.11).
 *
 * **Es una regla de negocio, no un detalle de la acción de servidor**, y por
 * eso vive acá y no en `sign-out-action.ts` — la misma razón que
 * `safe-return-destination.ts` ya documenta para el destino de entrar: la
 * regla permanente del fundador es que una regla de negocio nunca vive en el
 * frente.
 *
 * **El menú de cuenta se dibuja en toda pantalla** (`Nav.tsx`), así que la
 * sesión puede terminar en cualquier lugar: la ficha de un aviso,
 * `/mis-avisos`, el propio publicador. Volver a la MISMA pantalla después de
 * cerrar sesión sería peligroso justo en las que exigen sesión
 * (`requireSession`, `/mis-avisos`, `/publicar/**`): el servidor las volvería
 * a redirigir de inmediato hacia `/signin`, y quien acaba de salir vería la
 * puerta de entrada pensando que el clic no hizo nada.
 *
 * **El inicio es el único destino que nunca falla esa prueba**: es público,
 * no exige sesión, y es exactamente la pantalla donde la barra ya vuelve a
 * ofrecer «Entrar» — la prueba visible de que la sesión terminó de verdad.
 */
export const SIGN_OUT_DESTINATION = "/";
