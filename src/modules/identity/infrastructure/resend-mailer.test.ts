import { describe, expect, it, vi } from "vitest";
import { action, paragraph } from "../../../shared/email/mail-content";
import { expectedMailHtml, FIXTURE_FONTS, P } from "../../../shared/email/mail-html.fixture";
import { buildEmailProvider } from "./email-provider";
import {
  AuthMailerNotConfiguredError,
  AuthMailerSendError,
  ResendMailer,
  readAuthMailerConfig,
} from "./resend-mailer";

/**
 * El adaptador de Resend de `identity` (tasks.md 15.2).
 *
 * **Nunca sale un correo de acá.** El cliente de Resend se inyecta doblado,
 * igual que en `listing-lifecycle/infrastructure/resend-lifecycle-mailer.test.ts`
 * — lo que se prueba es qué le pasa el adaptador y qué hace con lo que le
 * devuelve, no la red de un tercero.
 */
function fakeResend(result: { error: { message: string } | null }) {
  const send = vi.fn().mockResolvedValue(result);
  return { send, client: { emails: { send } } as never };
}

const LINK = "https://rentoru.com/api/auth/callback/email?token=x";
const MESSAGE = {
  to: "tenant@ejemplo.com",
  content: { subject: "Tu enlace para entrar a Rentoru", blocks: [action("Entrar", LINK)] },
};

describe("configuración", () => {
  it("no se deja construir sin clave", () => {
    expect(() => new ResendMailer(undefined, "ingresa@rentoru.com")).toThrow(
      AuthMailerNotConfiguredError,
    );
  });

  it("no se deja construir sin remitente", () => {
    expect(() => new ResendMailer("re_loquesea", undefined)).toThrow(AuthMailerNotConfiguredError);
  });
});

describe("readAuthMailerConfig", () => {
  // Igual que readMailerConfig (listing-lifecycle/infrastructure/lifecycle-config.ts):
  // las dos o ninguna. Media configuración deja a quien llama construyendo un
  // adaptador que falla en el primer envío.
  it("devuelve undefined si falta la clave", () => {
    expect(
      readAuthMailerConfig({ RESEND_API_KEY: undefined, AUTH_MAIL_FROM: "ingresa@rentoru.com" }),
    ).toBeUndefined();
  });

  it("devuelve undefined si falta el remitente", () => {
    expect(
      readAuthMailerConfig({ RESEND_API_KEY: "re_loquesea", AUTH_MAIL_FROM: undefined }),
    ).toBeUndefined();
  });

  it("devuelve las dos cuando ambas están", () => {
    expect(
      readAuthMailerConfig({
        RESEND_API_KEY: "re_loquesea",
        AUTH_MAIL_FROM: "ingresa@rentoru.com",
      }),
    ).toEqual({ apiKey: "re_loquesea", from: "ingresa@rentoru.com" });
  });
});

describe("el envío", () => {
  it("manda el asunto y el texto plano de los bloques que compuso el dominio", async () => {
    const { send, client } = fakeResend({ error: null });

    await new ResendMailer("re_loquesea", "ingresa@rentoru.com", client).send(MESSAGE);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "ingresa@rentoru.com",
        to: MESSAGE.to,
        subject: MESSAGE.content.subject,
        text: `Entrar:\n${LINK}`,
      }),
    );
  });

  it("convierte en excepción el error que Resend devuelve", async () => {
    const { client } = fakeResend({ error: { message: "domain is not verified" } });
    const mailer = new ResendMailer("re_loquesea", "ingresa@rentoru.com", client);

    await expect(mailer.send(MESSAGE)).rejects.toThrow(AuthMailerSendError);
    await expect(mailer.send(MESSAGE)).rejects.toThrow("domain is not verified");
  });
});

describe("el correo final que recibe Resend (lámina v1, 38.3)", () => {
  // Proveedor → composeMagicLinkEmail → ResendMailer: las tres salidas
  // compuestas, con un enlace sintético que el HTML tiene que escapar.
  it("sale con botón, respaldo entero y vigencia; el texto lleva el enlace una vez", async () => {
    const { send, client } = fakeResend({ error: null });
    const url = 'https://rentoru.test/api/auth/callback/email?token=a"b&email=<c>';
    const provider = buildEmailProvider({
      readConfig: () => ({ apiKey: "re_loquesea", from: "ingresa@rentoru.com" }),
      createMailer: (config) => new ResendMailer(config.apiKey, config.from, client),
    });

    await provider.sendVerificationRequest({ identifier: "tenant@ejemplo.com", url });

    const payload = send.mock.calls[0]?.[0];
    expect(payload.subject).toBe("Tu enlace para entrar a Rentoru");
    expect(payload.text).toBe(
      "Entra a Rentoru\n\n" +
        "Toca el botón para entrar. No necesitas contraseña.\n\n" +
        `Entrar a Rentoru:\n${url}\n\n` +
        "Vale por: 15 minutos\nSe usa una sola vez.\n\n" +
        "¿No pediste entrar? Ignora este correo.\n\n" +
        "Te escribimos porque pediste entrar a Rentoru con este correo.\n" +
        "Rentoru · alquileres en Distrito Capital y Maracaibo",
    );
    const { SANS, MONO, TABLE } = FIXTURE_FONTS;
    const u = "https://rentoru.test/api/auth/callback/email?token=a&quot;b&amp;email=&lt;c&gt;";
    const box = `<table ${TABLE} width="100%" style="margin:0 0 16px"><tr>`;
    const line = (text: string) => `<p style="margin:0 0 4px">${text}</p>`;
    expect(payload.html).toBe(
      expectedMailHtml(
        "Tu enlace para entrar a Rentoru",
        '<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;line-height:1.25;color:#1e2022">' +
          "Entra a Rentoru</h1>" +
          `${P}Toca el botón para entrar. No necesitas contraseña.</p>` +
          `${box}<td align="center" bgcolor="#272343" style="border-radius:12px;background-color:#272343">` +
          `<a href="${u}" style="display:block;padding:0 24px;line-height:46px;font-family:${SANS};` +
          'font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">Entrar a Rentoru</a>' +
          "</td></tr></table>" +
          '<p style="margin:0 0 16px;font-size:12px;line-height:1.6;color:#52616b">' +
          `O copia este enlace en tu navegador:<br /><a href="${u}" ` +
          `style="font-family:${MONO};color:#272343;word-break:break-all">${u}</a></p>` +
          `${box}<td bgcolor="#f0f5f9" style="padding:16px;border-radius:12px;` +
          `background-color:#f0f5f9;font-family:${SANS}">` +
          `<p style="margin:0 0 4px;font-family:${MONO};font-size:12px;font-weight:600;color:#52616b">` +
          'Vale por</p><p style="margin:0;font-size:17px;font-weight:600;color:#1e2022">15 minutos</p>' +
          '<p style="margin:4px 0 0;color:#52616b">Se usa una sola vez.</p></td></tr></table>' +
          `${P}¿No pediste entrar? Ignora este correo.</p>`,
        '<tr><td style="padding:16px 16px 12px;border-top:1px solid #e1e4e6;' +
          `font-family:${SANS};font-size:12px;line-height:1.6;color:#52616b">` +
          line("Te escribimos porque pediste entrar a Rentoru con este correo.") +
          line("Rentoru · alquileres en Distrito Capital y Maracaibo") +
          "</td></tr>",
      ),
    );
  });
});

describe("el HTML, que es presentación y no redacción", () => {
  it("escapa lo que viene del cuerpo", async () => {
    const { send, client } = fakeResend({ error: null });
    await new ResendMailer("re_loquesea", "ingresa@rentoru.com", client).send({
      ...MESSAGE,
      content: { subject: "s", blocks: [paragraph('<script>alert("x")</script>')] },
    });
    const html: string = send.mock.calls[0]?.[0].html;

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
