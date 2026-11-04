import { describe, expect, it, vi } from "vitest";
import { paragraph } from "../../../shared/email/mail-content";
import { expectedMailHtml, FIXTURE_FONTS, P } from "../../../shared/email/mail-html.fixture";
import { composeHeartbeatFailureNotice } from "../domain/heartbeat";
import {
  HeartbeatMailerNotConfiguredError,
  HeartbeatMailerSendError,
  ResendHeartbeatMailer,
} from "./resend-heartbeat-mailer";

/**
 * El adaptador de Resend del latido (tasks.md 27.5).
 *
 * Mismo mecanismo y misma forma que `resend-lifecycle-mailer.ts`: el cliente
 * de Resend se inyecta doblado, y nunca sale un correo de acá.
 */
function fakeResend(result: { error: { message: string } | null }) {
  const send = vi.fn().mockResolvedValue(result);
  return { send, client: { emails: { send } } as never };
}

const MESSAGE = {
  to: "fundador@rentoru.com",
  content: {
    subject: "El latido no encontró la base viva",
    blocks: [paragraph("Hola."), paragraph("Chau.")],
  },
};

describe("configuración", () => {
  it("no se deja construir sin clave", () => {
    expect(() => new ResendHeartbeatMailer(undefined, "latido@rentoru.com")).toThrow(
      HeartbeatMailerNotConfiguredError,
    );
  });

  it("no se deja construir sin remitente", () => {
    expect(() => new ResendHeartbeatMailer("re_loquesea", undefined)).toThrow(
      HeartbeatMailerNotConfiguredError,
    );
  });
});

describe("el envío", () => {
  it("manda el asunto y el texto plano de los bloques que compuso el dominio", async () => {
    const { send, client } = fakeResend({ error: null });

    await new ResendHeartbeatMailer("re_loquesea", "latido@rentoru.com", client).send(MESSAGE);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "latido@rentoru.com",
        to: MESSAGE.to,
        subject: MESSAGE.content.subject,
        // El texto plano sale de los mismos bloques que el HTML (38.5).
        text: "Hola.\n\nChau.",
      }),
    );
  });

  it("convierte en excepción el error que Resend devuelve", async () => {
    const { client } = fakeResend({ error: { message: "domain is not verified" } });
    const mailer = new ResendHeartbeatMailer("re_loquesea", "latido@rentoru.com", client);

    await expect(mailer.send(MESSAGE)).rejects.toThrow(HeartbeatMailerSendError);
    await expect(mailer.send(MESSAGE)).rejects.toThrow("domain is not verified");
  });
});

describe("el correo final que recibe Resend (38.5)", () => {
  // composeHeartbeatFailureNotice → ResendHeartbeatMailer: los bloques de los
  // correos al usuario (G2); la URL, el status, la fecha UTC y las referencias
  // técnicas viajan intactos al texto y escapados al HTML.
  it("sale con la falla en ámbar y conserva los valores técnicos", async () => {
    const { send, client } = fakeResend({ error: null });
    const { SANS, MONO, TABLE } = FIXTURE_FONTS;
    const url = 'https://rentoru.test/api/health?a=1&b="2"';
    const checkedAt = new Date("2026-08-24T14:05:00.000Z");
    // The date contract (es-VE, long date, short time, UTC), not this ICU's
    // spacing: some builds write «p. m.» with non-breaking spaces.
    const when = new Intl.DateTimeFormat("es-VE", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(checkedAt);
    const content = composeHeartbeatFailureNotice({ url, status: 503, checkedAt });

    await new ResendHeartbeatMailer("re_loquesea", "latido@rentoru.com", client).send({
      to: "fundador@rentoru.com",
      content,
    });

    const subject = "El latido no encontró la base viva";
    const tail =
      "Esto no mide cuánta cuota queda — el plan Free de Neon no lo permite por ningún " +
      "medio automático (tasks.md 27.5) — sólo que la consecuencia ya se ve. " +
      "Revisa el panel de Neon para confirmar la causa.";
    const WHY = "Te escribimos porque el latido de Rentoru falló.";
    const BRAND = "Rentoru · alquileres en Distrito Capital y Maracaibo";
    const line = (text: string) => `<p style="margin:0 0 4px">${text}</p>`;
    const payload = send.mock.calls[0]?.[0];
    expect(payload.subject).toBe(subject);
    expect(payload.text).toBe(
      `${subject}\n\nQué pasó: ${url} respondió con 503\nel ${when} (UTC).\n\n` +
        `${tail}\n\n${WHY}\n${BRAND}`,
    );
    expect(payload.html).toBe(
      expectedMailHtml(
        subject,
        '<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;line-height:1.25;color:#1e2022">' +
          `${subject}</h1>` +
          `<table ${TABLE} width="100%" style="margin:0 0 16px"><tr><td bgcolor="#faf2e1" ` +
          `style="padding:16px;border-radius:12px;background-color:#faf2e1;font-family:${SANS}">` +
          `<p style="margin:0 0 4px;font-family:${MONO};font-size:12px;font-weight:600;color:#8a5a00">` +
          "Qué pasó</p>" +
          '<p style="margin:0;font-size:17px;font-weight:600;color:#8a5a00">' +
          "https://rentoru.test/api/health?a=1&amp;b=&quot;2&quot; respondió con 503</p>" +
          `<p style="margin:4px 0 0;color:#52616b">el ${when} (UTC).</p></td></tr></table>` +
          `${P}${tail}</p>`,
        '<tr><td style="padding:16px 16px 12px;border-top:1px solid #e1e4e6;' +
          `font-family:${SANS};font-size:12px;line-height:1.6;color:#52616b">` +
          `${line(WHY)}${line(BRAND)}</td></tr>`,
      ),
    );
  });
});

describe("el HTML, que es presentación y no redacción", () => {
  it("escapa lo que traería un status inesperado", async () => {
    const { send, client } = fakeResend({ error: null });
    await new ResendHeartbeatMailer("re_loquesea", "latido@rentoru.com", client).send({
      ...MESSAGE,
      content: { subject: "s", blocks: [paragraph('respondió <script>alert("x")</script>')] },
    });
    const html: string = send.mock.calls[0]?.[0].html;

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
