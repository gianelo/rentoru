import { fullSpanishDate } from "../../../shared/format/spanish-date";
import { photoAltText, photoUrl } from "../../listing-discovery/domain/listing-photo-view";
import { buildListingPath } from "../../listing-discovery/domain/listing-url";
import type { PublishedListingReading } from "../application/read-published-listing";

export interface PublishedListingCover {
  readonly thumbUrl: string;
  readonly cardUrl: string;
  readonly alt: string;
}

export interface PublishedListingView {
  readonly sizeLine: string;
  readonly cover: PublishedListingCover | null;
  readonly expiresOn: string;
  readonly expiresOnIso: string;
  readonly listingHref: string;
  readonly myListingsHref: string;
  readonly publishAgainHref: string;
}

/**
 * 37.4 — everything the Listo screen shows about the listing it was just
 * published, already decided (AGENTS.md §1). The cover is the same pair of
 * derivatives the results card draws (`thumb` below 768 px, `card` above);
 * with either one missing there is no cover, never an invented image.
 */
export function publishedListingView(
  { listing, cover }: PublishedListingReading,
  photoBaseUrl: string,
): PublishedListingView {
  const thumb = cover?.keys.thumb;
  const card = cover?.keys.card;
  const bathrooms = `${listing.bathrooms} ${listing.bathrooms === 1 ? "baño" : "baños"}`;

  return {
    sizeLine: `${listing.rooms} hab · ${bathrooms} · ${listing.areaM2} m²`,
    cover:
      cover && thumb && card
        ? {
            thumbUrl: photoUrl(photoBaseUrl, thumb),
            cardUrl: photoUrl(photoBaseUrl, card),
            alt: photoAltText({
              position: cover.position,
              total: cover.photoCount,
              title: listing.title,
              zone: listing.zoneName,
            }),
          }
        : null,
    expiresOn: fullSpanishDate(listing.expiresAt),
    expiresOnIso: listing.expiresAt.toISOString().slice(0, 10),
    listingHref: buildListingPath(listing),
    myListingsHref: "/mis-avisos",
    publishAgainHref: "/publicar",
  };
}
