import { describe, expect, it, vi } from "vitest";
import { paragraph } from "../../../shared/email/mail-content";
import { expectedMailHtml, FIXTURE_FONTS, P } from "../../../shared/email/mail-html.fixture";
import { composeNotice, type NoticeKind } from "../domain/lifecycle-notice";
import {
  LifecycleMailerNotConfiguredError,
  LifecycleMailerSendError,
  ResendLifecycleMailer,
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
  content: {
    subject: "Tu aviso vence en 3 días",
    blocks: [paragraph("Hola."), paragraph("Chau.")],
  },
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
  it("manda el asunto y el texto plano de los bloques que compuso el dominio", async () => {
    const { send, client } = fakeResend({ error: null });

    await new ResendLifecycleMailer("re_loquesea", "avisos@rentoru.com", client).send(MESSAGE);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "avisos@rentoru.com",
        to: MESSAGE.to,
        subject: MESSAGE.content.subject,
        // El texto plano sale de los mismos bloques que el HTML (S2 corregida):
        // es lo que ve quien lee el correo con las imágenes apagadas.
        text: "Hola.\n\nChau.",
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

describe("el correo final que recibe Resend (lámina v1, 38.4)", () => {
  const LISTING = {
    id: "l-1",
    title: 'Casa <b>"A&B"</b>',
    expiresAt: new Date("2026-08-31T10:00:00.000Z"),
  };
  const URL = "https://rentoru.test/renovar/t?a=1&b=2";
  const TITLE_TEXT = '«Casa <b>"A&B"</b>»';
  const TITLE_HTML = "«Casa &lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;»";
  const URL_HTML = "https://rentoru.test/renovar/t?a=1&amp;b=2";
  const WHY = "Te escribimos porque publicaste este aviso en Rentoru.";
  const BRAND = "Rentoru · alquileres en Distrito Capital y Maracaibo";
  const { SANS, MONO, TABLE } = FIXTURE_FONTS;
  const box = `<table ${TABLE} width="100%" style="margin:0 0 16px"><tr>`;
  const line = (text: string) => `<p style="margin:0 0 4px">${text}</p>`;

  // composeNotice → ResendLifecycleMailer: asunto, texto y HTML exactos, con
  // título y enlace sintéticos que llegan intactos al texto y escapados al HTML.
  it.each<[string, NoticeKind, string, string, string, string, string, string, string]>([
    [
      "vencimiento en 3 días",
      "expiry",
      "2026-08-28T10:00:00.000Z",
      "Tu aviso vence en 3 días",
      "Vence el",
      "31 de agosto de 2026",
      "",
      "¿Sigue disponible? Renuévalo y queda 30 días más.",
      "Si no lo renuevas, deja de verse en las búsquedas. Puedes activarlo después.",
    ],
    [
      "vencimiento en 1 día, en singular",
      "expiry",
      "2026-08-30T10:00:00.000Z",
      "Tu aviso vence en 1 día",
      "Vence el",
      "31 de agosto de 2026",
      "",
      "¿Sigue disponible? Renuévalo y queda 30 días más.",
      "Si no lo renuevas, deja de verse en las búsquedas. Puedes activarlo después.",
    ],
    [
      "purga de fotos",
      "purge",
      "2026-09-10T10:00:00.000Z",
      "Las fotos de tu aviso se borran pronto",
      "Las fotos se borran el",
      "15 de septiembre de 2026",
      " venció el 31 de agosto de 2026.",
      "Renuévalo antes de esa fecha y conservas las fotos.",
      "Pasada esa fecha, las fotos no se pueden recuperar.",
    ],
  ])("%s", async (_name, kind, now, subject, label, value, noteTail, intro, outro) => {
    const { send, client } = fakeResend({ error: null });
    const content = composeNotice(kind, LISTING, new Date(now), URL);

    await new ResendLifecycleMailer("re_loquesea", "avisos@rentoru.com", client).send({
      to: "duenio@ejemplo.com",
      content,
    });

    const payload = send.mock.calls[0]?.[0];
    expect(payload.subject).toBe(subject);
    expect(payload.text).toBe(
      `${subject}\n\n${label}: ${value}\n${TITLE_TEXT}${noteTail}\n\n${intro}\n\n` +
        `Renovar mi aviso:\n${URL}\n\n${outro}\n\n${WHY}\n${BRAND}`,
    );
    expect(payload.html).toBe(
      expectedMailHtml(
        subject,
        '<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;line-height:1.25;color:#1e2022">' +
          `${subject}</h1>` +
          `${box}<td bgcolor="#faf2e1" style="padding:16px;border-radius:12px;` +
          `background-color:#faf2e1;font-family:${SANS}">` +
          `<p style="margin:0 0 4px;font-family:${MONO};font-size:12px;font-weight:600;color:#8a5a00">` +
          `${label}</p><p style="margin:0;font-size:17px;font-weight:600;color:#8a5a00">${value}</p>` +
          `<p style="margin:4px 0 0;color:#52616b">${TITLE_HTML}${noteTail}</p></td></tr></table>` +
          `${P}${intro}</p>` +
          `${box}<td align="center" bgcolor="#272343" style="border-radius:12px;background-color:#272343">` +
          `<a href="${URL_HTML}" style="display:block;padding:0 24px;line-height:46px;font-family:${SANS};` +
          'font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">Renovar mi aviso</a>' +
          "</td></tr></table>" +
          '<p style="margin:0 0 16px;font-size:12px;line-height:1.6;color:#52616b">' +
          `O copia este enlace en tu navegador:<br /><a href="${URL_HTML}" ` +
          `style="font-family:${MONO};color:#272343;word-break:break-all">${URL_HTML}</a></p>` +
          `${P}${outro}</p>`,
        '<tr><td style="padding:16px 16px 12px;border-top:1px solid #e1e4e6;' +
          `font-family:${SANS};font-size:12px;line-height:1.6;color:#52616b">` +
          `${line(WHY)}${line(BRAND)}</td></tr>`,
      ),
    );
  });
});

describe("el HTML, que es presentación y no redacción", () => {
  /**
   * **El título del aviso lo escribió una persona y viaja adentro de este
   * HTML.** Sin escapar, quien publica decide qué se dibuja en el correo de
   * otro — y el correo sale con nuestro remitente.
   */
  it("escapa el título que escribió quien publica", async () => {
    const { send, client } = fakeResend({ error: null });
    const listing = {
      id: "l-1",
      title: '<script>alert("x")</script>',
      expiresAt: new Date("2026-08-31T10:00:00.000Z"),
    };
    await new ResendLifecycleMailer("re_loquesea", "avisos@rentoru.com", client).send({
      to: "duenio@ejemplo.com",
      content: composeNotice(
        "expiry",
        listing,
        new Date("2026-08-28T10:00:00.000Z"),
        "https://r.t",
      ),
    });
    const html: string = send.mock.calls[0]?.[0].html;

    expect(html).not.toContain("<script>");
    expect(html).toContain("«&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;»");
  });
});
