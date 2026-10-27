import { describe, expect, it, vi } from "vitest";
import type { ListingPhotoView } from "../../listing-discovery/application/ports/listing-photos.port";
import type { PublishedListing } from "./ports/published-listing.port";
import { readPublishedListing } from "./read-published-listing";

const ID = "0b6f2c9e-4d1a-4f7b-9c3e-2a5d8e1f7b40";
const PUBLISHER = "7d1e3a52-9b4c-4e8f-a1d6-3c2b5f9e0a17";
const NOW = new Date("2026-10-24T12:00:00Z");
const LISTING = { id: ID, title: "Apartamento" } as PublishedListing;
const COVER: ListingPhotoView = {
  position: 0,
  keys: { thumb: "listing/a/thumb.webp" },
  photoCount: 3,
};

function deps(found: PublishedListing | null) {
  return {
    listing: { findOwnActive: vi.fn(async () => found) },
    covers: { coversFor: vi.fn(async () => new Map([[ID, COVER]])), allFor: vi.fn() },
  };
}

describe("readPublishedListing (37.3)", () => {
  it("refuses an id that is not a UUID without asking the database", async () => {
    for (const raw of ["", "abc", undefined, [ID, ID]]) {
      const d = deps(LISTING);
      expect(await readPublishedListing(PUBLISHER, raw, NOW, d)).toBeNull();
      expect(d.listing.findOwnActive).not.toHaveBeenCalled();
      expect(d.covers.coversFor).not.toHaveBeenCalled();
    }
  });

  it("returns nothing, and reads no photo, when the listing is not the publisher's own active one", async () => {
    const d = deps(null);
    expect(await readPublishedListing(PUBLISHER, ID, NOW, d)).toBeNull();
    expect(d.listing.findOwnActive).toHaveBeenCalledWith(PUBLISHER, ID, NOW);
    expect(d.covers.coversFor).not.toHaveBeenCalled();
  });

  it("returns the listing with its cover when it is the publisher's own active one", async () => {
    const d = deps(LISTING);
    expect(await readPublishedListing(PUBLISHER, ID, NOW, d)).toEqual({
      listing: LISTING,
      cover: COVER,
    });
    expect(d.covers.coversFor).toHaveBeenCalledWith([ID]);
  });

  it("keeps the listing when no cover row exists, instead of failing the screen", async () => {
    const d = deps(LISTING);
    d.covers.coversFor.mockResolvedValueOnce(new Map());
    expect(await readPublishedListing(PUBLISHER, ID, NOW, d)).toEqual({
      listing: LISTING,
      cover: null,
    });
  });
});
