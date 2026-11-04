import { describe, expect, it } from "vitest";
import { fact, footer, heading, paragraph } from "../../../shared/email/mail-content";
import { renderMailText } from "../../../shared/email/render-mail";
import { composeHeartbeatFailureNotice, heartbeatOutcome } from "./heartbeat";

describe("heartbeatOutcome", () => {
  it("is alive only on exactly 200", () => {
    expect(heartbeatOutcome(200)).toBe("alive");
  });

  it("is dead on any non-200 status, not only 5xx", () => {
    // 404 is deliberately included: a health route that moved or was
    // misconfigured is just as silent a failure as a 500 would be.
    for (const status of [500, 503, 404, 401, 301]) {
      expect(heartbeatOutcome(status)).toBe("dead");
    }
  });
});

describe("composeHeartbeatFailureNotice", () => {
  const CHECKED_AT = new Date("2026-09-08T12:34:00Z");
  // El contrato de la fecha (es-VE, larga, hora corta, UTC), no los espacios
  // de este ICU: algunas versiones escriben «p. m.» con espacios duros.
  const WHEN = new Intl.DateTimeFormat("es-VE", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(CHECKED_AT);

  // 38.5 (G2): los bloques de los correos al usuario; la falla va en ámbar
  // y el segundo párrafo de antes queda igual.
  it.each<[number | "unreachable", string]>([
    [503, "respondió con 503"],
    ["unreachable", "no respondió"],
  ])("arma los bloques del aviso (%s)", (status, statusText) => {
    expect(
      composeHeartbeatFailureNotice({
        url: "https://rentoru.com/api/health",
        status,
        checkedAt: CHECKED_AT,
      }),
    ).toEqual({
      subject: "El latido no encontró la base viva",
      blocks: [
        heading("El latido no encontró la base viva"),
        fact({
          label: "Qué pasó",
          value: `https://rentoru.com/api/health ${statusText}`,
          note: `el ${WHEN} (UTC).`,
          tone: "warn",
        }),
        paragraph(
          "Esto no mide cuánta cuota queda — el plan Free de Neon no lo permite por " +
            "ningún medio automático (tasks.md 27.5) — sólo que la consecuencia ya se " +
            "ve. Revisa el panel de Neon para confirmar la causa.",
        ),
        footer(
          "Te escribimos porque el latido de Rentoru falló.",
          "Rentoru · alquileres en Distrito Capital y Maracaibo",
        ),
      ],
    });
  });

  it("names the url and the status that failed", () => {
    const notice = composeHeartbeatFailureNotice({
      url: "https://rentoru.com/api/health",
      status: 503,
      checkedAt: CHECKED_AT,
    });

    expect(notice.subject).not.toBe("");
    expect(renderMailText(notice)).toContain("https://rentoru.com/api/health");
    expect(renderMailText(notice)).toContain("503");
  });

  it("says 'unreachable' rather than a status number when the request never got one", () => {
    const notice = composeHeartbeatFailureNotice({
      url: "https://rentoru.com/api/health",
      status: "unreachable",
      checkedAt: CHECKED_AT,
    });

    expect(renderMailText(notice)).not.toMatch(/\bunreachable\b.*\d{3}/);
    expect(renderMailText(notice).toLowerCase()).toContain("no respondió");
  });

  // The failure this task exists to end never had a spending number to show
  // — the whole point is that the notice reports the CONSEQUENCE, not a
  // quota percentage nobody's plan can compute.
  it("never claims to know a quota percentage", () => {
    const notice = composeHeartbeatFailureNotice({
      url: "https://rentoru.com/api/health",
      status: 503,
      checkedAt: CHECKED_AT,
    });

    expect(renderMailText(notice)).not.toMatch(/%/);
  });
});
