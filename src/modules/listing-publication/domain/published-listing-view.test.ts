import { describe, expect, it } from "vitest";
import { buildListingPath } from "../../listing-discovery/domain/listing-url";
import type { PublishedListing } from "../application/ports/published-listing.port";
import { publishedListingView } from "./published-listing-view";

const LISTING: PublishedListing = {
  id: "0b6f2c9e-4d1a-4f7b-9c3e-2a5d8e1f7b40",
  title: "Apartamento con vista en Los Palos Grandes",
  propertyType: "apartamento",
  cityName: "Distrito Capital",
  zoneName: "Los Palos Grandes",
  priceUsd: 450,
  rooms: 2,
  bathrooms: 2,
  areaM2: 78,
  publisherType: "owner",
  expiresAt: new Date("2026-11-22T12:00:00Z"),
};
const COVER = {
  position: 0,
  keys: { thumb: "l/a/thumb.webp", card: "l/a/card.webp" },
  photoCount: 3,
};
const BASE = "https://fotos.example/";

describe("publishedListingView (37.4)", () => {
  it("decides everything the Listo screen shows, already decided", () => {
    expect(publishedListingView({ listing: LISTING, cover: COVER }, BASE)).toEqual({
      sizeLine: "2 hab · 2 baños · 78 m²",
      cover: {
        thumbUrl: "https://fotos.example/l/a/thumb.webp",
        cardUrl: "https://fotos.example/l/a/card.webp",
        alt: "Foto 1 de 3 — Apartamento con vista en Los Palos Grandes, Los Palos Grandes",
      },
      expiresOn: "22 de noviembre de 2026",
      expiresOnIso: "2026-11-22",
      listingHref: buildListingPath(LISTING),
      myListingsHref: "/mis-avisos",
      publishAgainHref: "/publicar",
    });
  });

  it("writes the singular for one bathroom", () => {
    const view = publishedListingView(
      { listing: { ...LISTING, rooms: 1, bathrooms: 1 }, cover: COVER },
      BASE,
    );
    expect(view.sizeLine).toBe("1 hab · 1 baño · 78 m²");
  });

  it("draws no cover rather than an invented one when a derivative is missing", () => {
    expect(publishedListingView({ listing: LISTING, cover: null }, BASE).cover).toBeNull();
    const onlyThumb = { ...COVER, keys: { thumb: "l/a/thumb.webp" } };
    expect(publishedListingView({ listing: LISTING, cover: onlyThumb }, BASE).cover).toBeNull();
  });

  it("dates the expiry in UTC, not in the server's zone", () => {
    const late = { ...LISTING, expiresAt: new Date("2026-11-22T23:30:00Z") };
    const view = publishedListingView({ listing: late, cover: COVER }, BASE);
    expect(view.expiresOn).toBe("22 de noviembre de 2026");
    expect(view.expiresOnIso).toBe("2026-11-22");
  });
});
