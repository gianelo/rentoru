import { describe, expect, it, vi } from "vitest";
import { expectedMailHtml, P } from "../../../shared/email/mail-html.fixture";
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
  subject: "Escríbenos: mensaje de María Pérez",
  body: 'María Pérez <maria@example.com> escribió desde "Escríbenos":\n\nHola, una pregunta.',
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
        subject: MESSAGE.subject,
        text: MESSAGE.body,
      }),
    );
  });

  it("F35.10: nombra la pantalla «Escríbenos» y deja intacto lo que escribió el visitante", async () => {
    const { send, client } = fakeResend({ error: null });
    const notice = composeContactNotice({
      name: 'Ana & "Bea"',
      email: "ana@example.com",
      honeypot: "",
      message: "Hola <b>¿hay cupo?</b>",
    });

    await new ResendContactMailer(
      "re_loquesea",
      "ingresa@rentoru.com",
      "hola@rentoru.com",
      client,
    ).send(notice);

    const payload = send.mock.calls[0]?.[0];
    expect(payload.subject).toBe('Escríbenos: mensaje de Ana & "Bea"');
    expect(payload.text).toBe(
      'Ana & "Bea" <ana@example.com> escribió desde "Escríbenos":\n\nHola <b>¿hay cupo?</b>',
    );
    // Diseño de la 38.2 (G2: el mismo que los correos al usuario).
    expect(payload.html).toBe(
      expectedMailHtml(
        "Escríbenos: mensaje de Ana &amp; &quot;Bea&quot;",
        `${P}Ana &amp; &quot;Bea&quot; &lt;ana@example.com&gt; escribió desde &quot;Escríbenos&quot;:</p>` +
          `${P}Hola &lt;b&gt;¿hay cupo?&lt;/b&gt;</p>`,
      ),
    );
    expect(payload.replyTo).toBe("ana@example.com");
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
    ).send({ ...MESSAGE, body: 'Mensaje: <script>alert("x")</script>' });
    const html: string = send.mock.calls[0]?.[0].html;

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
