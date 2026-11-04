import { describe, expect, it } from "vitest";
import {
  action,
  fact,
  fallback,
  footer,
  heading,
  paragraph,
} from "../../../shared/email/mail-content";
import {
  composeMagicLinkEmail,
  isVerificationLinkExpired,
  MAGIC_LINK_MAX_AGE_SECONDS,
} from "./magic-link";

describe("MAGIC_LINK_MAX_AGE_SECONDS", () => {
  // F17 lo fija en 15 minutos. Auth.js hereda un día entero si esta constante
  // desaparece de la configuración del proveedor (tasks.md 15.3) — este test
  // es lo que rompe si alguien la borra y deja pasar el default.
  it("son 15 minutos, no el día entero que trae la librería por defecto", () => {
    expect(MAGIC_LINK_MAX_AGE_SECONDS).toBe(15 * 60);
  });
});

describe("composeMagicLinkEmail", () => {
  const URL = "https://rentoru.com/api/auth/callback/email?token=abc&email=a%40b.com";

  // 38.3: los bloques de la lámina v1, con los textos cortos de L5 y el enlace
  // tal cual en el botón y en el respaldo, sin envolverlo ni acortarlo (S2).
  it("arma los bloques de la lámina v1 en su orden, con el enlace entero", () => {
    expect(composeMagicLinkEmail(URL, MAGIC_LINK_MAX_AGE_SECONDS)).toEqual({
      subject: "Tu enlace para entrar a Rentoru",
      blocks: [
        heading("Entra a Rentoru"),
        paragraph("Toca el botón para entrar. No necesitas contraseña."),
        action("Entrar a Rentoru", URL),
        fallback("O copia este enlace en tu navegador:", URL),
        fact({ label: "Vale por", value: "15 minutos", note: "Se usa una sola vez." }),
        paragraph("¿No pediste entrar? Ignora este correo."),
        footer(
          "Te escribimos porque pediste entrar a Rentoru con este correo.",
          "Rentoru · alquileres en Distrito Capital y Maracaibo",
        ),
      ],
    });
  });

  // La vigencia que lee la persona sale de la misma regla que aplica Auth.js:
  // si la regla cambia, el correo no puede seguir diciendo «15».
  it("dice la vigencia que recibe, no un número escrito aparte", () => {
    const { blocks } = composeMagicLinkEmail(URL, 30 * 60);

    expect(blocks).toContainEqual(
      fact({ label: "Vale por", value: "30 minutos", note: "Se usa una sola vez." }),
    );
  });

  /**
   * **El asunto no lo miraba ninguna prueba** (tasks.md 26.7). Es la primera
   * línea que ve alguien en su bandeja antes de decidir si el correo es
   * legítimo, y un asunto que nombra una marca distinta a la del remitente
   * —que ya dice `rentoru.com` desde la 26.17— se lee como suplantación. Sin
   * esta aserción el renombre no tenía guardián y quedaba verde con el nombre
   * viejo puesto.
   */
  it("el asunto nombra el producto, que es lo que vuelve legítimo al correo", () => {
    const email = composeMagicLinkEmail("https://rentoru.com/x", MAGIC_LINK_MAX_AGE_SECONDS);

    expect(email.subject).toBe("Tu enlace para entrar a Rentoru");
  });
});

describe("isVerificationLinkExpired", () => {
  const EXPIRES = new Date("2026-08-24T10:00:00.000Z");

  // Espejo de @auth/core: `invite.expires.valueOf() < Date.now()`. En el
  // instante exacto el enlace todavía vale — misma frontera que `isExpired`
  // en listing-lifecycle/domain/expiry.ts.
  it("no está vencido en el instante exacto del vencimiento", () => {
    expect(isVerificationLinkExpired(EXPIRES, EXPIRES)).toBe(false);
  });

  it("está vencido un milisegundo después", () => {
    expect(isVerificationLinkExpired(EXPIRES, new Date(EXPIRES.getTime() + 1))).toBe(true);
  });

  it("todavía vale un milisegundo antes", () => {
    expect(isVerificationLinkExpired(EXPIRES, new Date(EXPIRES.getTime() - 1))).toBe(false);
  });
});
