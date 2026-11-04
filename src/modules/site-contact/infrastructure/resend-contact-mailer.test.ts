import { describe, expect, it, vi } from "vitest";
import { paragraph } from "../../../shared/email/mail-content";
import { expectedMailHtml, FIXTURE_FONTS, P } from "../../../shared/email/mail-html.fixture";
import { composeContactNotice } from "../domain/contact-message";
import {
  ContactMailerNotConfiguredError,
  ContactMailerSendError,
  ResendContactMailer,
} from "./resend-contact-mailer";

/**
 * El adaptador de Resend de "Escribinos" (tasks.md 23.7).
 *
 * **Nunca sale un correo de acá.** Mismo doblez que `resend-lifecycle-mailer.test.ts`
 * y `resend-mailer.test.ts`: el cliente de Resend se inyecta, así que lo que
 * se prueba es qué le pasa este adaptador y qué hace con lo que le devuelve.
 */
function fakeResend(result: { error: { message: string } | null }) {
  const send = vi.fn().mockResolvedValue(result);
  return { send, client: { emails: { send } } as never };
}

const MESSAGE = {
  content: {
    subject: "Escríbenos: mensaje de María Pérez",
    blocks: [paragraph("Hola."), paragraph("Chau.")],
  },
  replyTo: "maria@example.com",
};

describe("configuración", () => {
  /**
   * Falla cerrado, la misma forma que `AuthMailerNotConfiguredError` y
   * `LifecycleMailerNotConfiguredError` ya usan (tasks.md 23.7 lo pide
   * explícitamente): sin alguno de los tres, el mensaje no sale y NO se
   * finge enviado.
   */
  it("no se deja construir sin clave", () => {
    expect(
      () => new ResendContactMailer(undefined, "ingresa@rentoru.com", "hola@rentoru.com"),
    ).toThrow(ContactMailerNotConfiguredError);
  });

  it("no se deja construir sin remitente (AUTH_MAIL_FROM, reusado)", () => {
    expect(() => new ResendContactMailer("re_loquesea", undefined, "hola@rentoru.com")).toThrow(
      ContactMailerNotConfiguredError,
    );
  });

  it("no se deja construir sin destino (CONTACT_MAIL_TO, la variable nueva de 23.7)", () => {
    expect(() => new ResendContactMailer("re_loquesea", "ingresa@rentoru.com", undefined)).toThrow(
      ContactMailerNotConfiguredError,
    );
  });
});

describe("el envío", () => {
  it("manda al destino configurado, con el remitente reusado y el replyTo del visitante", async () => {
    const { send, client } = fakeResend({ error: null });

    await new ResendContactMailer(
      "re_loquesea",
      "ingresa@rentoru.com",
      "hola@rentoru.com",
      client,
    ).send(MESSAGE);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "ingresa@rentoru.com",
        // El destino lo fija la infraestructura, nunca el mensaje: el
        // puerto (`ContactMailerPort`) ni siquiera tiene un campo `to`.
        to: "hola@rentoru.com",
        replyTo: MESSAGE.replyTo,
        subject: MESSAGE.content.subject,
        // El texto plano sale de los mismos bloques que el HTML (38.5).
        text: "Hola.\n\nChau.",
      }),
    );
  });

  // composeContactNotice → ResendContactMailer (38.5, G2): texto y HTML
  // exactos. El mensaje llega byte a byte al texto y escapado al HTML, con
  // sus líneas en blanco y sus saltos simples.
  it("el correo final que recibe Resend: bloques de la lámina, mensaje sin reescribir", async () => {
    const { send, client } = fakeResend({ error: null });
    const { SANS, MONO, TABLE } = FIXTURE_FONTS;
    const notice = composeContactNotice({
      name: 'Ana & "Bea"',
      email: "ana@example.com",
      honeypot: "",
      message: "Hola <b>¿hay cupo?</b>\n\nSegunda línea\nseguida.",
    });

    await new ResendContactMailer(
      "re_loquesea",
      "ingresa@rentoru.com",
      "hola@rentoru.com",
      client,
    ).send(notice);

    const WHY = "Te escribimos porque alguien usó Escríbenos en Rentoru.";
    const BRAND = "Rentoru · alquileres en Distrito Capital y Maracaibo";
    const line = (text: string) => `<p style="margin:0 0 4px">${text}</p>`;
    const payload = send.mock.calls[0]?.[0];
    expect(payload.subject).toBe('Escríbenos: mensaje de Ana & "Bea"');
    expect(payload.replyTo).toBe("ana@example.com");
    expect(payload.text).toBe(
      'Mensaje desde Escríbenos\n\nDe: Ana & "Bea"\nana@example.com\n\n' +
        "Hola <b>¿hay cupo?</b>\n\nSegunda línea\nseguida.\n\n" +
        `Responde a este correo para escribirle.\n\n${WHY}\n${BRAND}`,
    );
    expect(payload.html).toBe(
      expectedMailHtml(
        "Escríbenos: mensaje de Ana &amp; &quot;Bea&quot;",
        '<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;line-height:1.25;color:#1e2022">' +
          "Mensaje desde Escríbenos</h1>" +
          `<table ${TABLE} width="100%" style="margin:0 0 16px"><tr><td bgcolor="#f0f5f9" ` +
          `style="padding:16px;border-radius:12px;background-color:#f0f5f9;font-family:${SANS}">` +
          `<p style="margin:0 0 4px;font-family:${MONO};font-size:12px;font-weight:600;color:#52616b">De</p>` +
          '<p style="margin:0;font-size:17px;font-weight:600;color:#1e2022">Ana &amp; &quot;Bea&quot;</p>' +
          '<p style="margin:4px 0 0;color:#52616b">ana@example.com</p></td></tr></table>' +
          `${P}Hola &lt;b&gt;¿hay cupo?&lt;/b&gt;<br /><br />Segunda línea<br />seguida.</p>` +
          `${P}Responde a este correo para escribirle.</p>`,
        '<tr><td style="padding:16px 16px 12px;border-top:1px solid #e1e4e6;' +
          `font-family:${SANS};font-size:12px;line-height:1.6;color:#52616b">` +
          `${line(WHY)}${line(BRAND)}</td></tr>`,
      ),
    );
  });

  it("convierte en excepción el error que Resend devuelve, sin fingir que se mandó", async () => {
    const { client } = fakeResend({ error: { message: "domain is not verified" } });
    const mailer = new ResendContactMailer(
      "re_loquesea",
      "ingresa@rentoru.com",
      "hola@rentoru.com",
      client,
    );

    await expect(mailer.send(MESSAGE)).rejects.toThrow(ContactMailerSendError);
    await expect(mailer.send(MESSAGE)).rejects.toThrow("domain is not verified");
  });
});

describe("el HTML, que es presentación y no redacción", () => {
  /** El nombre y el mensaje los escribió quien completó el formulario. */
  it("escapa lo que escribió el visitante", async () => {
    const { send, client } = fakeResend({ error: null });
    await new ResendContactMailer(
      "re_loquesea",
      "ingresa@rentoru.com",
      "hola@rentoru.com",
      client,
    ).send({
      ...MESSAGE,
      content: { subject: "s", blocks: [paragraph('Mensaje: <script>alert("x")</script>')] },
    });
    const html: string = send.mock.calls[0]?.[0].html;

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
