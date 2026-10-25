import type { PropertyType } from "../../../../shared/db/schema";

/**
 * 37.3 — what the Listo screen shows about the listing that was just
 * published. A read port beside the write side (AGENTS.md §3): publishing
 * writes through `ListingRepositoryPort`, this only reads one row back.
 */
export interface PublishedListing {
  readonly id: string;
  readonly title: string;
  readonly propertyType: PropertyType;
  readonly cityName: string;
  readonly zoneName: string;
  readonly priceUsd: number;
  readonly rooms: number;
  readonly bathrooms: number;
  readonly areaM2: number;
  readonly publisherType: "owner" | "broker";
  readonly expiresAt: Date;
}

export interface PublishedListingPort {
  /**
   * The listing only when it belongs to `publisherId`, is active and has not
   * expired at `now`. Anything else — someone else's, missing, draft, hidden,
   * expired — is `null`: the id travels in the URL and anyone can type another.
   */
  findOwnActive(
    publisherId: string,
    listingId: string,
    now: Date,
  ): Promise<PublishedListing | null>;
}
