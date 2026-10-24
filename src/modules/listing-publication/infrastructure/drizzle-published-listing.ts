import { and, eq, gt } from "drizzle-orm";
import { cities, listings, zones } from "../../../shared/db/schema";
import type {
  PublishedListing,
  PublishedListingPort,
} from "../application/ports/published-listing.port";
import type { PublicationDatabase } from "./drizzle-listing-repository";

export class DrizzlePublishedListing implements PublishedListingPort {
  constructor(private readonly db: PublicationDatabase) {}

  /**
   * Ownership, status and expiry go in the WHERE, not after the read: a row
   * that is someone else's, hidden or past `expires_at` never leaves Postgres.
   * `status` alone is not enough — the expiry sweep runs on a schedule, so an
   * `active` row can already be past its date.
   */
  async findOwnActive(
    publisherId: string,
    listingId: string,
    now: Date,
  ): Promise<PublishedListing | null> {
    const [row] = await this.db
      .select({
        id: listings.id,
        title: listings.title,
        propertyType: listings.propertyType,
        cityName: cities.name,
        zoneName: zones.name,
        priceUsd: listings.priceUsd,
        rooms: listings.rooms,
        bathrooms: listings.bathrooms,
        areaM2: listings.areaM2,
        publisherType: listings.publisherType,
        expiresAt: listings.expiresAt,
      })
      .from(listings)
      .innerJoin(cities, eq(cities.id, listings.cityId))
      .innerJoin(zones, eq(zones.id, listings.zoneId))
      .where(
        and(
          eq(listings.id, listingId),
          eq(listings.publisherId, publisherId),
          eq(listings.status, "active"),
          gt(listings.expiresAt, now),
        ),
      )
      .limit(1);

    return row ?? null;
  }
}
