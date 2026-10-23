import { describe, expect, it, vi } from "vitest";
import { buildEmailProvider } from "./email-provider";
import {
  AuthMailerNotConfiguredError,
  AuthMailerSendError,
  ResendMailer,
  readAuthMailerConfig,
  renderAuthMailHtml,
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

const MESSAGE = {
  to: "tenant@ejemplo.com",
  subject: "Tu enlace para entrar a Rentoru",
  body: "Entra con este enlace:\nhttps://rentoru.com/api/auth/callback/email?token=x",
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
  it("manda el asunto y el cuerpo que compuso el dominio, sin reescribirlos", async () => {
    const { send, client } = fakeResend({ error: null });

    await new ResendMailer("re_loquesea", "ingresa@rentoru.com", client).send(MESSAGE);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "ingresa@rentoru.com",
        to: MESSAGE.to,
        subject: MESSAGE.subject,
        text: MESSAGE.body,
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

describe("el correo final que recibe Resend (35.10)", () => {
  const OPEN = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.5;color:#101010">`;

  // Proveedor → composeMagicLinkEmail → ResendMailer: las tres salidas
  // compuestas, con un enlace sintético que el HTML tiene que escapar.
  it("sale en español neutro, con el enlace intacto en texto y escapado en HTML", async () => {
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
      `Entra con este enlace:\n${url}\n\n` +
        "Vale por 15 minutos y se puede usar una sola vez. Si no lo pediste, ignora este correo.",
    );
    expect(payload.html).toBe(
      `${OPEN}<p>Entra con este enlace:<br />` +
        "https://rentoru.test/api/auth/callback/email?token=a&quot;b&amp;email=&lt;c&gt;</p>" +
        "<p>Vale por 15 minutos y se puede usar una sola vez. Si no lo pediste, ignora este correo.</p></div>",
    );
  });
});

describe("el HTML, que es presentación y no redacción", () => {
  it("parte el cuerpo en párrafos sin agregar ni una palabra", () => {
    const html = renderAuthMailHtml(MESSAGE.body);

    expect(html).toContain("Entra con este enlace:");
  });

  it("escapa lo que viene del cuerpo", () => {
    const html = renderAuthMailHtml('<script>alert("x")</script>');

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
