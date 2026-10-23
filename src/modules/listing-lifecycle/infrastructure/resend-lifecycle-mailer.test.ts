import { describe, expect, it, vi } from "vitest";
import { composeNotice, type NoticeKind } from "../domain/lifecycle-notice";
import {
  LifecycleMailerNotConfiguredError,
  LifecycleMailerSendError,
  ResendLifecycleMailer,
  renderLifecycleHtml,
} from "./resend-lifecycle-mailer";

/**
 * El adaptador de Resend (tasks.md 7.11).
 *
 * **Nunca sale un correo de acá.** El cliente de Resend se inyecta doblado: lo
 * que se prueba es qué le pasa el adaptador y qué hace con lo que le
 * devuelve, no la red de un tercero.
 */
function fakeResend(result: { error: { message: string } | null }) {
  const send = vi.fn().mockResolvedValue(result);
  return { send, client: { emails: { send } } as never };
}

const MESSAGE = {
  to: "duenio@ejemplo.com",
  subject: "Tu aviso vence en 3 días",
  body: "Hola.\n\nTu aviso «Apartamento en Chacao» vence pronto.\nRenuévalo aquí.",
};

describe("configuración", () => {
  /**
   * **Falla cerrado, igual que la puerta del cron.** Un adaptador que aceptara
   * la tanda sin proveedor perdería doscientos correos en silencio, y el caso
   * de uso los contaría como enviados: sabe contar fallas de envío, no sabe
   * enterarse de que nunca hubo proveedor.
   */
  it("no se deja construir sin clave", () => {
    expect(() => new ResendLifecycleMailer(undefined, "avisos@rentoru.com")).toThrow(
      LifecycleMailerNotConfiguredError,
    );
  });

  /**
   * Sin remitente, Resend rebota todo. Es una falla de configuración y tiene
   * que verse al arrancar, no en el primer correo del día siguiente.
   */
  it("no se deja construir sin remitente", () => {
    expect(() => new ResendLifecycleMailer("re_loquesea", undefined)).toThrow(
      LifecycleMailerNotConfiguredError,
    );
  });
});

describe("el envío", () => {
  it("manda el asunto y el cuerpo que compuso el dominio, sin reescribirlos", async () => {
    const { send, client } = fakeResend({ error: null });

    await new ResendLifecycleMailer("re_loquesea", "avisos@rentoru.com", client).send(MESSAGE);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "avisos@rentoru.com",
        to: MESSAGE.to,
        subject: MESSAGE.subject,
        // El texto plano es el del dominio tal cual: es lo que ve quien lee
        // el correo en una terminal o con las imágenes apagadas.
        text: MESSAGE.body,
      }),
    );
  });

  /**
   * **Resend DEVUELVE el error, no lo tira.** Un `await` sin mirar `error`
   * deja la tanda contando como enviados correos que rebotaron — y el caso de
   * uso sólo devuelve la reserva del libro si esto tira, así que ese envío
   * nunca se reintentaría.
   */
  it("convierte en excepción el error que Resend devuelve", async () => {
    const { client } = fakeResend({ error: { message: "domain is not verified" } });
    const mailer = new ResendLifecycleMailer("re_loquesea", "avisos@rentoru.com", client);

    await expect(mailer.send(MESSAGE)).rejects.toThrow(LifecycleMailerSendError);
    // El motivo del proveedor viaja: "el correo falló" sin la causa obliga a
    // adivinar entre una clave vencida y un dominio sin verificar.
    await expect(mailer.send(MESSAGE)).rejects.toThrow("domain is not verified");
  });
});

describe("el correo final que recibe Resend (35.10)", () => {
  const OPEN = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.5;color:#101010">`;
  const LISTING = {
    id: "l-1",
    title: 'Casa <b>"A&B"</b>',
    expiresAt: new Date("2026-08-31T10:00:00.000Z"),
  };
  const URL = "https://rentoru.test/renovar/t?a=1&b=2";
  const TITLE_TEXT = '«Casa <b>"A&B"</b>»';
  const TITLE_HTML = "«Casa &lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;»";
  const URL_HTML = "https://rentoru.test/renovar/t?a=1&amp;b=2";
  const KEEP =
    "Si no lo renuevas, el aviso sale de la búsqueda pero no se borra: " +
    "puedes volver a activarlo después.";
  const PURGE_TAIL =
    "Después de esa fecha el aviso sigue existiendo, pero para volver a publicarlo " +
    "vas a tener que subir las fotos de nuevo. Esto no se deshace.";

  // composeNotice → ResendLifecycleMailer: asunto, texto y HTML exactos, con
  // título y enlace sintéticos que llegan intactos al texto y escapados al HTML.
  it.each<[string, NoticeKind, string, string, string, string]>([
    [
      "vencimiento en 3 días",
      "expiry",
      "2026-08-28T10:00:00.000Z",
      "Tu aviso vence en 3 días",
      `${TITLE_TEXT} vence el 31 de agosto de 2026.\n\n` +
        `Renuévalo por 30 días más desde aquí:\n${URL}\n\n${KEEP}`,
      `<p>${TITLE_HTML} vence el 31 de agosto de 2026.</p>` +
        `<p>Renuévalo por 30 días más desde aquí:<br />${URL_HTML}</p><p>${KEEP}</p>`,
    ],
    [
      "vencimiento en 1 día, en singular",
      "expiry",
      "2026-08-30T10:00:00.000Z",
      "Tu aviso vence en 1 día",
      `${TITLE_TEXT} vence el 31 de agosto de 2026.\n\n` +
        `Renuévalo por 30 días más desde aquí:\n${URL}\n\n${KEEP}`,
      `<p>${TITLE_HTML} vence el 31 de agosto de 2026.</p>` +
        `<p>Renuévalo por 30 días más desde aquí:<br />${URL_HTML}</p><p>${KEEP}</p>`,
    ],
    [
      "purga de fotos",
      "purge",
      "2026-09-10T10:00:00.000Z",
      "Las fotos de tu aviso se borran pronto",
      `${TITLE_TEXT} venció el 31 de agosto de 2026 y sus fotos se borran el ` +
        "15 de septiembre de 2026.\n\n" +
        `Renuévalo antes de esa fecha y el aviso vuelve con sus fotos:\n${URL}\n\n${PURGE_TAIL}`,
      `<p>${TITLE_HTML} venció el 31 de agosto de 2026 y sus fotos se borran el ` +
        "15 de septiembre de 2026.</p>" +
        `<p>Renuévalo antes de esa fecha y el aviso vuelve con sus fotos:<br />${URL_HTML}</p>` +
        `<p>${PURGE_TAIL}</p>`,
    ],
  ])("%s", async (_name, kind, now, subject, text, html) => {
    const { send, client } = fakeResend({ error: null });
    const notice = composeNotice(kind, LISTING, new Date(now), URL);

    await new ResendLifecycleMailer("re_loquesea", "avisos@rentoru.com", client).send({
      to: "duenio@ejemplo.com",
      ...notice,
    });

    const payload = send.mock.calls[0]?.[0];
    expect(payload.subject).toBe(subject);
    expect(payload.text).toBe(text);
    expect(payload.html).toBe(`${OPEN}${html}</div>`);
  });
});

describe("el HTML, que es presentación y no redacción", () => {
  it("parte el cuerpo en párrafos sin agregar ni una palabra", () => {
    const html = renderLifecycleHtml(MESSAGE.body);

    expect(html).toContain("<p>Hola.</p>");
    expect(html).toContain("Renuévalo aquí.");
    // Los saltos simples quedan dentro del mismo párrafo.
    expect(html).toContain("<br />");
  });

  /**
   * **El título del aviso lo escribió una persona y viaja adentro de este
   * HTML.** Sin escapar, quien publica decide qué se dibuja en el correo de
   * otro — y el correo sale con nuestro remitente.
   */
  it("escapa lo que viene del aviso", () => {
    const html = renderLifecycleHtml('Tu aviso <script>alert("x")</script> vence');

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("no deja párrafos vacíos cuando el dominio separa con varios saltos", () => {
    expect(renderLifecycleHtml("Uno.\n\n\n\nDos.")).toBe(renderLifecycleHtml("Uno.\n\nDos."));
  });
});
