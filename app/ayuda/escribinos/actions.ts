"use server";

import { redirect } from "next/navigation";
import { sendContactMessage } from "@/modules/site-contact/application/send-contact-message";
import {
  buildContactOutcomeHref,
  CONTACT_CONTEXT_PARAM,
  CONTACT_RETURN_MODE_PARAM,
  type ContactOutcome,
} from "@/modules/site-contact/domain/contact-screen";
import {
  ContactMailerSendError,
  ResendContactMailer,
} from "@/modules/site-contact/infrastructure/resend-contact-mailer";

/**
 * "Escribinos" (tasks.md 23.7) — la puerta que traduce el POST del
 * formulario en una decisión de `sendContactMessage`, la misma forma que
 * `reportar/actions.ts` traduce el suyo hacia `reportListing`.
 *
 * **`ResendContactMailer` se construye acá, en el envío, no al cargar el
 * módulo** — el mismo argumento que `email-provider.ts` ya documenta para
 * el enlace mágico: construirlo a nivel de módulo tumbaría cualquier página
 * que importe esta acción sin que nadie hubiera escrito una palabra.
 *
 * **Y se construye ANTES de evaluar la entrada, a propósito.** Si el
 * entorno no tiene `RESEND_API_KEY`/`AUTH_MAIL_FROM`/`CONTACT_MAIL_TO`, esa
 * es una falla del canal completo, no de un envío en particular — falla
 * igual para un mensaje válido, uno inválido o uno que sólo un bot mandó, y
 * la excepción se deja propagar en vez de fingir cualquiera de las tres
 * pantallas (AGENTS.md §7, la misma forma que el trabajo de vencimientos
 * "contesta 500 en vez de empezar una tanda que no puede entregar").
 */
export async function sendContactMessageAction(formData: FormData): Promise<void> {
  const mailer = new ResendContactMailer();
  let outcome: ContactOutcome;
  try {
    const result = await sendContactMessage(
      {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        message: String(formData.get("message") ?? ""),
        honeypot: String(formData.get("sitioWeb") ?? ""),
      },
      { mailer },
    );
    outcome = result.kind;
  } catch (error) {
    // Sólo la falla de entrega tipada tiene una respuesta pública segura.
    if (!(error instanceof ContactMailerSendError)) throw error;
    outcome = "delivery-failed";
  }

  // redirect lanza su propia señal: nunca capturarla como un fallo de envío.
  redirect(
    buildContactOutcomeHref(
      outcome,
      formData.getAll(CONTACT_CONTEXT_PARAM),
      formData.getAll(CONTACT_RETURN_MODE_PARAM),
    ),
  );
}
