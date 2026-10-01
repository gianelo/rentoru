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
 * **El inicio sigue siendo el respaldo seguro**: es público y no exige sesión.
 * La excepción es una ficha pública con forma canónica; al salir se vuelve a
 * esa ficha anónimamente, nunca a un paso privado ni a un origen ajeno.
 */
import { safePublicListingPath } from "../../listing-discovery/domain/listing-url";

export const SIGN_OUT_DESTINATION = "/";

/** Only a canonical-shaped public detail may survive a sign-out redirect. */
export function safeSignOutDestination(candidate: unknown): string {
  return safePublicListingPath(candidate) ?? SIGN_OUT_DESTINATION;
}
