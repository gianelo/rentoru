import type {
  ListingPhotosPort,
  ListingPhotoView,
} from "../../listing-discovery/application/ports/listing-photos.port";
import { isListingId } from "../domain/listing-id";
import type { PublishedListing, PublishedListingPort } from "./ports/published-listing.port";

export interface PublishedListingDependencies {
  readonly listing: PublishedListingPort;
  readonly covers: Pick<ListingPhotosPort, "coversFor">;
}

export interface PublishedListingReading {
  readonly listing: PublishedListing;
  readonly cover: ListingPhotoView | null;
}

/**
 * 37.3 — the listing that was just published, with its cover, or `null`.
 *
 * The cover is read through the same port the listing page uses, so the Listo
 * screen shows the derivative a visitor will see. Its derivatives are written
 * inside `publishListing`, before the redirect that lands here, so they exist
 * already; a missing row still keeps the listing rather than failing the page.
 */
export async function readPublishedListing(
  publisherId: string,
  rawListingId: unknown,
  now: Date,
  dependencies: PublishedListingDependencies,
): Promise<PublishedListingReading | null> {
  if (!isListingId(rawListingId)) return null;

  const listing = await dependencies.listing.findOwnActive(publisherId, rawListingId, now);
  if (!listing) return null;

  const covers = await dependencies.covers.coversFor([listing.id]);
  return { listing, cover: covers.get(listing.id) ?? null };
}
