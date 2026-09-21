import { describe, expect, it } from "vitest";
import type { EquiparListingRow } from "../../classes/equipar/listings";
import { EQUIPAR_LISTING_KEEP_DAYS, equiparListingPruneCutoff, equiparListingUpsert } from "../../classes/equipar/store";

const row: EquiparListingRow = {
  listingId: "ml:MLU1",
  category: "heladera",
  categoryLabel: "Heladera",
  variant: "media",
  variantLabel: "Media",
  tier: "S",
  room: "cocina",
  rank: 0,
  variantRank: 2,
  regime: "modelo",
  condition: "new",
  source: "mercadolibre",
  sellerKey: "mercadolibre",
  sellerName: "Tienda X",
  channel: "marketplace",
  officialStore: false,
  brand: "Samsung",
  brandKey: "samsung",
  title: "Heladera Samsung 300 L",
  url: "https://articulo.mercadolibre.com.uy/MLU-1",
  image: null,
  price: 30_000,
  currency: "UYU",
  priceUyu: 30_000,
  listPrice: null,
  location: "Montevideo",
  freeShipping: true,
  suspect: false,
  observedAt: "2026-09-21T14:05:00.000Z",
  lastSeen: "2026-09-21",
};

describe("equiparListingUpsert", () => {
  it("upserts by listingId, sets everything, and only ever inserts firstSeen", () => {
    const op = equiparListingUpsert(row);
    expect(op.updateOne.filter).toEqual({ listingId: "ml:MLU1" });
    expect(op.updateOne.upsert).toBe(true);
    // A row re-seen tomorrow must keep the day it was first seen: `$set` never carries it.
    expect(op.updateOne.update.$setOnInsert).toEqual({ firstSeen: "2026-09-21" });
    expect("firstSeen" in op.updateOne.update.$set).toBe(false);
    expect(op.updateOne.update.$set.lastSeen).toBe("2026-09-21");
    expect(op.updateOne.update.$set.priceUyu).toBe(30_000);
    expect(op.updateOne.update.$set.suspect).toBe(false);
  });
});

describe("equiparListingPruneCutoff", () => {
  it("keeps EQUIPAR_LISTING_KEEP_DAYS days and prunes what is older", () => {
    expect(EQUIPAR_LISTING_KEEP_DAYS).toBe(30);
    expect(equiparListingPruneCutoff("2026-09-21")).toBe("2026-08-22");
  });
});
