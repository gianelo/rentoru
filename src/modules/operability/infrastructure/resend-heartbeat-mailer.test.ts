import { describe, expect, it, vi } from "vitest";
import { composeHeartbeatFailureNotice } from "../domain/heartbeat";
import {
  HeartbeatMailerNotConfiguredError,
  HeartbeatMailerSendError,
  ResendHeartbeatMailer,
  renderHeartbeatHtml,
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
  subject: "El latido no encontró la base viva",
  body: "https://rentoru.com/api/health respondió con 503.\n\nRevisa el panel de Neon.",
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
  it("manda el asunto y el cuerpo que compuso el dominio, sin reescribirlos", async () => {
    const { send, client } = fakeResend({ error: null });

    await new ResendHeartbeatMailer("re_loquesea", "latido@rentoru.com", client).send(MESSAGE);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "latido@rentoru.com",
        to: MESSAGE.to,
        subject: MESSAGE.subject,
        text: MESSAGE.body,
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

describe("el correo final que recibe Resend (35.10)", () => {
  // composeHeartbeatFailureNotice → ResendHeartbeatMailer: el envoltorio
  // generado cambia; la URL, el status, la fecha UTC y las referencias
  // técnicas viajan intactos.
  it("sale en español neutro y conserva los valores técnicos", async () => {
    const { send, client } = fakeResend({ error: null });
    const url = 'https://rentoru.test/api/health?a=1&b="2"';
    const checkedAt = new Date("2026-08-24T14:05:00.000Z");
    // The date contract (es-VE, long date, short time, UTC), not this ICU's
    // spacing: some builds write «p. m.» with non-breaking spaces.
    const when = new Intl.DateTimeFormat("es-VE", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(checkedAt);
    const notice = composeHeartbeatFailureNotice({ url, status: 503, checkedAt });

    await new ResendHeartbeatMailer("re_loquesea", "latido@rentoru.com", client).send({
      to: "fundador@rentoru.com",
      ...notice,
    });

    const tail =
      "Esto no mide cuánta cuota queda — el plan Free de Neon no lo permite por ningún " +
      "medio automático (tasks.md 27.5) — sólo que la consecuencia ya se ve. " +
      "Revisa el panel de Neon para confirmar la causa.";
    const payload = send.mock.calls[0]?.[0];
    expect(payload.subject).toBe("El latido no encontró la base viva");
    expect(payload.text).toBe(`${url} respondió con 503 el ${when} (UTC).\n\n${tail}`);
    expect(payload.html).toBe(
      `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.5;color:#101010">` +
        "<p>https://rentoru.test/api/health?a=1&amp;b=&quot;2&quot; respondió con 503 el " +
        `${when} (UTC).</p><p>${tail}</p></div>`,
    );
  });
});

describe("el HTML, que es presentación y no redacción", () => {
  it("parte el cuerpo en párrafos sin agregar ni una palabra", () => {
    const html = renderHeartbeatHtml(MESSAGE.body);

    expect(html).toContain("<p>https://rentoru.com/api/health respondió con 503.</p>");
    expect(html).toContain("Revisa el panel de Neon.");
  });

  it("escapa lo que traería un status inesperado", () => {
    const html = renderHeartbeatHtml('respondió <script>alert("x")</script>');

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
