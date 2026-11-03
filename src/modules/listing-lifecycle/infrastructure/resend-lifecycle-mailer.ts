import { Resend } from "resend";
import { renderMailHtml, renderMailText } from "../../../shared/email/render-mail";
import type {
  LifecycleMailerPort,
  LifecycleMessage,
} from "../application/ports/lifecycle-mailer.port";

/**
 * El adaptador de correo de verdad (tasks.md 7.11), que reemplaza a
 * `ConsoleLifecycleMailer` y nada más: el caso de uso no conoce a ninguno de
 * los dos.
 *
 * **No hay plantilla de React Email, y es una decisión y no un atajo.** El
 * puerto ya la había descartado por escrito: recibe los bloques que
 * `composeNotice` compuso en el dominio, porque «un puerto que recibiera el
 * aviso y el tipo de correo pondría la redacción del lado del proveedor, y
 * cambiar de Resend a otra cosa se llevaría el texto puesto». Una plantilla
 * acá obligaría a una de dos cosas, las dos malas: duplicar la redacción, o
 * sacarla del dominio — que es exactamente la regla permanente que este
 * repositorio no rompe.
 *
 * Lo que sí hace este archivo es **presentación sin redacción**: dibuja los
 * bloques del dominio con el diseño compartido (`src/shared/email/`, 38.2),
 * sin decidir ni una palabra de lo que dice.
 */

/** Sin esto, cualquier cosa que se mande sale rebotada por Resend. */
const FROM_ENV = "LIFECYCLE_MAIL_FROM";
const KEY_ENV = "RESEND_API_KEY";

export class LifecycleMailerNotConfiguredError extends Error {
  constructor(missing: string) {
    super(`resend-lifecycle-mailer: falta ${missing} en el entorno.`);
    this.name = "LifecycleMailerNotConfiguredError";
  }
}

export class LifecycleMailerSendError extends Error {
  constructor(to: string, cause: string) {
    super(`resend-lifecycle-mailer: no se pudo enviar a ${to} — ${cause}`);
    this.name = "LifecycleMailerSendError";
  }
}

/**
 * **Falla cerrado, igual que la puerta del cron.** Sin clave o sin remitente
 * esto tira al construirse, en vez de aceptar la tanda y perder doscientos
 * correos en silencio. El caso de uso ya sabe contar fallas de envío; lo que
 * no puede es enterarse de que nunca hubo proveedor.
 */
export class ResendLifecycleMailer implements LifecycleMailerPort {
  private readonly client: Resend;
  private readonly from: string;

  constructor(
    apiKey: string | undefined = process.env[KEY_ENV],
    from: string | undefined = process.env[FROM_ENV],
    client?: Resend,
  ) {
    if (!apiKey) throw new LifecycleMailerNotConfiguredError(KEY_ENV);
    if (!from) throw new LifecycleMailerNotConfiguredError(FROM_ENV);

    this.from = from;
    this.client = client ?? new Resend(apiKey);
  }

  async send(message: LifecycleMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to: message.to,
      subject: message.content.subject,
      // Los dos desde los mismos bloques (38.4): el texto plano es lo que ve
      // quien lee el correo en una terminal o con las imágenes apagadas.
      text: renderMailText(message.content),
      // El título del aviso lo escribió una persona: el renderizador lo escapa.
      html: renderMailHtml(message.content),
    });

    // **Resend devuelve el error, no lo tira.** Un `await` sin mirar `error`
    // deja la tanda entera contando envíos que rebotaron: el caso de uso
    // cuenta la falla y devuelve la reserva SÓLO si esto tira.
    if (error) {
      throw new LifecycleMailerSendError(message.to, error.message);
    }
  }
}
