export interface WhatsAppShareParts {
  readonly typeLabel: string;
  readonly zoneName: string;
  readonly priceUsd: number;
  readonly listingPath: string;
}

/**
 * 37.5 — «Compartir por WhatsApp» on the Listo screen. Listings circulate by
 * WhatsApp, so the message carries the listing's absolute address; a relative
 * one would open nothing on the recipient's phone. Without a valid http(s)
 * base there is no link at all (AGENTS.md §7): the screen draws no button
 * rather than one that shares a dead address.
 *
 * The wording was approved by the founder (G2).
 */
export function whatsAppShareHref(parts: WhatsAppShareParts, siteBaseUrl: string): string | null {
  let base: URL;
  try {
    base = new URL(siteBaseUrl);
  } catch {
    return null;
  }
  if (base.protocol !== "https:" && base.protocol !== "http:") return null;

  const address = new URL(parts.listingPath, base).href;
  const text = `Mira este aviso en Rentoru: ${parts.typeLabel} en ${parts.zoneName}, $${parts.priceUsd} al mes. ${address}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
