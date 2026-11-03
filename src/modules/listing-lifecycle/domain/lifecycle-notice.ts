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
import {
  EXPIRY_NOTICE_WINDOW_DAYS,
  LISTING_LIFETIME_DAYS,
  PURGE_NOTICE_LEAD_DAYS,
  purgeDueAt,
  wholeDaysBetween,
} from "./expiry";

/**
 * **DOS correos, no uno** (19.5, decisión del fundador).
 *
 * Uno ANTES de vencer, para renovar. Otro ANTES de la purga, avisando que las
 * fotos se van. El segundo existe porque el primero puede no llegar —spam,
 * casilla llena, dirección vieja— y quien lo perdió perdería sus fotografías
 * sin ninguna otra advertencia. La borrada es irreversible; el correo es lo
 * único que la vuelve anunciada en vez de sorpresiva (19.8).
 *
 * **Quién recibe qué y qué dice se decide acá**, no en la ruta ni en la
 * plantilla. La plantilla dibuja los bloques que llegan hechos (38.4): el HTML
 * y el texto plano salen de `src/shared/email/render-mail.ts`.
 */

export type NoticeKind = "expiry" | "purge";

export interface NoticeListing {
  readonly id: string;
  readonly title: string;
  readonly expiresAt: Date;
}

/**
 * Qué aviso corresponde HOY para este ciclo, o `null` si ninguno.
 *
 * Las dos ventanas no se solapan por construcción: la primera termina en el
 * vencimiento y la segunda empieza después. Sin esa frontera un aviso caería
 * en las dos y el mismo día saldrían los dos correos, que es lo contrario de
 * lo que 19.5 pide.
 */
export function noticeDueFor(expiresAt: Date, now: Date): NoticeKind | null {
  const untilExpiry = expiresAt.getTime() - now.getTime();
  if (untilExpiry > 0) {
    return wholeDaysBetween(now, expiresAt) <= EXPIRY_NOTICE_WINDOW_DAYS ? "expiry" : null;
  }

  const purgeAt = purgeDueAt(expiresAt);
  if (now.getTime() >= purgeAt.getTime()) return null;
  return wholeDaysBetween(now, purgeAt) <= PURGE_NOTICE_LEAD_DAYS ? "purge" : null;
}

/**
 * Fecha en español de Venezuela, escrita entera.
 *
 * Sin abreviar y sin formato numérico: `15/9` y `9/15` son la misma cadena
 * leída por dos personas distintas, y acá el número es el día en que alguien
 * pierde sus fotos.
 */
function spellDate(date: Date): string {
  return new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function plural(days: number): string {
  return days === 1 ? "1 día" : `${days} días`;
}

/** El botón, el enlace entero para copiar (S2) y el pie: iguales en los dos. */
function renewal(renewalUrl: string) {
  return {
    action: action("Renovar mi aviso", renewalUrl),
    fallback: fallback("O copia este enlace en tu navegador:", renewalUrl),
    footer: footer("Te escribimos porque publicaste este aviso en Rentoru.", MAIL_BRAND_LINE),
  };
}

/**
 * Los bloques de la lámina v1 (38.4), con los textos cortos de L5. La fecha
 * límite va en un dato `warn`; el título, que lo escribió quien publica, lo
 * escapa el renderizador.
 */
export function composeNotice(
  kind: NoticeKind,
  listing: NoticeListing,
  now: Date,
  renewalUrl: string,
): MailContent {
  const title = `«${listing.title}»`;
  const renew = renewal(renewalUrl);

  if (kind === "expiry") {
    const subject = `Tu aviso vence en ${plural(wholeDaysBetween(now, listing.expiresAt))}`;
    return {
      subject,
      blocks: [
        heading(subject),
        fact({
          label: "Vence el",
          value: spellDate(listing.expiresAt),
          note: title,
          tone: "warn",
        }),
        paragraph(`¿Sigue disponible? Renuévalo y queda ${LISTING_LIFETIME_DAYS} días más.`),
        renew.action,
        renew.fallback,
        paragraph("Si no lo renuevas, deja de verse en las búsquedas. Puedes activarlo después."),
        renew.footer,
      ],
    };
  }

  const subject = "Las fotos de tu aviso se borran pronto";
  return {
    subject,
    blocks: [
      heading(subject),
      fact({
        label: "Las fotos se borran el",
        value: spellDate(purgeDueAt(listing.expiresAt)),
        note: `${title} venció el ${spellDate(listing.expiresAt)}.`,
        tone: "warn",
      }),
      paragraph("Renuévalo antes de esa fecha y conservas las fotos."),
      renew.action,
      renew.fallback,
      paragraph("Pasada esa fecha, las fotos no se pueden recuperar."),
      renew.footer,
    ],
  };
}
