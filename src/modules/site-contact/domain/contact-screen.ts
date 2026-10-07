/**
 * Qué dibuja y qué dice la pantalla de "Escribinos" (tasks.md 23.7).
 *
 * Mismo mecanismo que `listing-trust/domain/report-screen.ts`, y por la misma
 * razón: sin JavaScript, una Server Action no puede devolver estado a la
 * pantalla que la posteó — sólo puede redirigir. El acuse llega en la URL de
 * la redirección, y esta función es la única que decide qué significa.
 *
 * Vive en el dominio y no en la página, por la regla permanente del fundador
 * (AGENTS.md — "no business rules in the front") y porque el piso de
 * cobertura del 90 % no llega a `app/`.
 */

export const CONTACT_SENT_PARAM = "enviado";
export const CONTACT_ERROR_PARAM = "error";
export const CONTACT_DELIVERY_ERROR_PARAM = "fallo-envio";
export const CONTACT_CONTEXT_PARAM = "motivo";
export const CONTACT_RETURN_MODE_PARAM = "volver";

const MISSING_ZONE_CONTEXT = "zona-faltante";
const ZONE_DRAFT_PATH = "/publicar/paso/zona";

export interface ContactContext {
  readonly value: "zona-faltante";
  readonly guidance: string;
  readonly scopeNotice: string;
  readonly draftNotice: string;
  readonly returnMode: "revisar" | null;
  readonly returnHref: string;
  readonly returnLabel: string;
}

/** Only known context and mode travel; never a visitor-selected destination. */
export function resolveContactContext(
  context: string | readonly string[] | undefined,
  returnMode: string | readonly string[] | undefined,
): ContactContext | null {
  if (context !== MISSING_ZONE_CONTEXT) return null;
  const review = returnMode === "revisar";
  return {
    value: MISSING_ZONE_CONTEXT,
    guidance:
      "Contanos la ciudad, el nombre de la zona que falta y por qué debería estar en el catálogo.",
    scopeNotice: "Avisarnos no crea ni habilita una zona.",
    draftNotice:
      "Los cambios que no hayas enviado en publicación no se guardan al abrir este formulario.",
    returnMode: review ? "revisar" : null,
    returnHref: review ? `${ZONE_DRAFT_PATH}?volver=revisar` : ZONE_DRAFT_PATH,
    returnLabel: "Volver al borrador guardado",
  };
}

/** The publication caller already knows whether it came from review. */
export function missingZoneContactHref(returningToReview: boolean): string {
  const entry = `/ayuda/escribinos?${CONTACT_CONTEXT_PARAM}=${MISSING_ZONE_CONTEXT}`;
  return returningToReview ? `${entry}&${CONTACT_RETURN_MODE_PARAM}=revisar` : entry;
}

export type ContactOutcome = "valid" | "spam" | "invalid" | "delivery-failed";

/** POST values stay plural until validated, including non-string form entries. */
function singleString(values: readonly unknown[]): string | undefined {
  return values.length === 1 && typeof values[0] === "string" ? values[0] : undefined;
}

export function buildContactOutcomeHref(
  outcome: ContactOutcome,
  contextValues: readonly unknown[],
  returnModeValues: readonly unknown[],
): string {
  const flags: Record<ContactOutcome, string> = {
    valid: CONTACT_SENT_PARAM,
    spam: CONTACT_SENT_PARAM,
    invalid: CONTACT_ERROR_PARAM,
    "delivery-failed": CONTACT_DELIVERY_ERROR_PARAM,
  };
  const context = resolveContactContext(
    singleString(contextValues),
    singleString(returnModeValues),
  );
  const target = `/ayuda/escribinos?${flags[outcome]}`;
  if (!context) return target;
  const contextual = `${target}&${CONTACT_CONTEXT_PARAM}=${context.value}`;
  return context.returnMode
    ? `${contextual}&${CONTACT_RETURN_MODE_PARAM}=${context.returnMode}`
    : contextual;
}

export interface ContactFormScreen {
  readonly state: "form";
  /**
   * `null` en el caso normal. Presente sólo cuando el servidor rechazó un
   * envío que la validación del navegador (`required`, `type="email"`,
   * `minLength`/`maxLength` en `page.tsx`) debería haber atajado antes —
   * alguien posteando directo, sin pasar por el formulario.
   */
  readonly errorNotice: string | null;
}

export interface ContactSentScreen {
  readonly state: "sent";
}

export type ContactScreen = ContactFormScreen | ContactSentScreen;

const ERROR_NOTICE = "Revisá los datos e intentá de nuevo.";

/**
 * **Presencia y no valor**, igual que `resolveReportScreen`: `?enviado` pelado
 * llega como cadena vacía y repetido llega como arreglo; un `if (flag)`
 * trataría el primero como ausente.
 *
 * La negativa de entrega gana sobre cualquier acuse; sin ella, el acuse
 * de envío gana sobre el de validación cuando los dos llegan juntos —no
 * puede pasar desde esta acción, que redirige a uno o al otro nunca a los
 * dos, pero la función no depende de esa garantía externa para decidir.
 */
export function resolveContactScreen(
  sentFlag: string | readonly string[] | undefined,
  errorFlag: string | readonly string[] | undefined,
  deliveryErrorFlag?: string | readonly string[],
): ContactScreen {
  if (deliveryErrorFlag !== undefined) {
    return { state: "form", errorNotice: "No pudimos enviar tu mensaje. Intentá de nuevo." };
  }
  if (sentFlag !== undefined) return { state: "sent" };

  return { state: "form", errorNotice: errorFlag !== undefined ? ERROR_NOTICE : null };
}
