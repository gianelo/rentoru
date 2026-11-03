/**
 * El segundo tímido para entrar (tasks.md 15.3–15.5, F17), puro y sin I/O.
 *
 * **`MAGIC_LINK_MAX_AGE_SECONDS` está acá y no repetido en `auth.ts`.** El
 * default de la librería es un día entero; quien lo lee en la configuración
 * del proveedor no puede saber si `900` es la regla o un valor que alguien
 * puso de paso. Una sola constante, con la regla escrita al lado — la misma
 * idea que `LISTING_LIFETIME_DAYS` en `listing-lifecycle/domain/expiry.ts`.
 */

import {
  action,
  fact,
  fallback,
  footer,
  heading,
  MAIL_BRAND_LINE,
  type MailContent,
  paragraph,
} from "../../../shared/email/mail-content";

/** F17: el enlace vale 15 minutos. El default de Auth.js es 24 horas. */
export const MAGIC_LINK_MAX_AGE_SECONDS = 15 * 60;

/**
 * Lo que dice el correo, en los bloques de la lámina v1 (38.3), con los
 * textos cortos que pidió el fundador (L5). Nada de HTML acá: el HTML y el
 * texto plano los dibuja `src/shared/email/render-mail.ts`.
 *
 * **La vigencia llega como argumento**: quien llama pasa la misma
 * `MAGIC_LINK_MAX_AGE_SECONDS` que le da a Auth.js, así el correo no puede
 * prometer otro plazo que el que de verdad se aplica.
 */
export function composeMagicLinkEmail(url: string, maxAgeSeconds: number): MailContent {
  return {
    subject: "Tu enlace para entrar a Rentoru",
    blocks: [
      heading("Entra a Rentoru"),
      paragraph("Toca el botón para entrar. No necesitas contraseña."),
      action("Entrar a Rentoru", url),
      fallback("O copia este enlace en tu navegador:", url),
      fact({
        label: "Vale por",
        value: `${maxAgeSeconds / 60} minutos`,
        note: "Se usa una sola vez.",
      }),
      paragraph("¿No pediste entrar? Ignora este correo."),
      footer("Te escribimos porque pediste entrar a Rentoru con este correo.", MAIL_BRAND_LINE),
    ],
  };
}

/**
 * **Espejo deliberado de la comparación que hace `@auth/core`** en
 * `lib/actions/callback/index.js`: `invite.expires.valueOf() < Date.now()`.
 * Mismo sentido que `isExpired` en `listing-lifecycle/domain/expiry.ts`:
 * estrictamente después es lo único que vence — en el instante exacto el
 * enlace todavía vale.
 *
 * No sustituye la comprobación de Auth.js — Auth.js hace la suya sobre la
 * fila que la propia librería borra al usarla (15.4). Esto existe para poder
 * afirmar la frontera en un test puro y rápido, y para probarla de nuevo
 * contra un valor `expires` que sí vino de Postgres (ver
 * `tests/integration/verification-token.test.ts`).
 */
export function isVerificationLinkExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() > expiresAt.getTime();
}
