import { describe, expect, it } from "vitest";
import { mergeOffers, recomputeFromOffers } from "../../classes/rentals/store";
import type { RentalOffer, RentalProperty, RentalSource } from "../../classes/rentals/types";

const offer = (overrides: Partial<RentalOffer> & { source: RentalSource; listingId: string }): RentalOffer => ({
  url: "https://example.com",
  title: "Apartamento",
  price: 30_000,
  currency: "UYU",
  priceUyu: 30_000,
  commonExpenses: null,
  commonExpensesCurrency: null,
  sellerName: "x",
  sellerType: "desconocido",
  image: null,
  publishedAt: null,
  firstSeen: "2026-08-01",
  lastSeen: "2026-08-20",
  ...overrides,
});

const context = { today: "2026-08-20", okSources: new Set<RentalSource>(["infocasas"]), staleOfferDays: 4 };

describe("mergeOffers", () => {
  // The rule the hourly run depends on: a fast pass reads only today's adverts, so everything it
  // does NOT see must survive — otherwise every property it touches loses its other portals.
  it("keeps a stored advert a healthy portal simply has not re-shown yet", () => {
    const merged = mergeOffers(
      [offer({ source: "infocasas", listingId: "infocasas:1", lastSeen: "2026-08-18" })],
      [],
      context
    );
    expect(merged.map((item) => item.listingId)).toEqual(["infocasas:1"]);
  });

  it("drops an advert a healthy portal has not shown for longer than the window", () => {
    const merged = mergeOffers(
      [offer({ source: "infocasas", listingId: "infocasas:1", lastSeen: "2026-08-01" })],
      [],
      context
    );
    expect(merged).toHaveLength(0);
  });

  it("never drops an advert whose portal was down this run", () => {
    const merged = mergeOffers(
      [offer({ source: "facebook", listingId: "facebook:1", lastSeen: "2026-01-01" })],
      [],
      context
    );
    expect(merged).toHaveLength(1);
  });

  it("lets a fresh advert win over the stored copy of itself", () => {
    const merged = mergeOffers(
      [offer({ source: "infocasas", listingId: "infocasas:1", price: 30_000, priceUyu: 30_000 })],
      [offer({ source: "infocasas", listingId: "infocasas:1", price: 28_000, priceUyu: 28_000 })],
      context
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]!.priceUyu).toBe(28_000);
  });
});

describe("recomputeFromOffers", () => {
  it("re-prices the property from the cheapest surviving advert", () => {
    const property = {
      key: "k",
      title: "t",
      propertyType: "apartamento",
      department: "Montevideo",
      neighborhood: "Pocitos",
      address: "",
      addressKey: "",
      latitude: null,
      longitude: null,
      bedrooms: 2,
      bathrooms: 1,
      area: 60,
      priceUyu: 99_999,
      price: 99_999,
      currency: "UYU",
      offers: [],
      sources: [],
      firstSeen: "2026-08-10",
      lastSeen: "2026-08-10",
    } as unknown as RentalProperty;

    const result = recomputeFromOffers(property, [
      offer({ source: "facebook", listingId: "facebook:1", price: 26_000, priceUyu: 26_000, firstSeen: "2026-07-02" }),
      offer({ source: "infocasas", listingId: "infocasas:1", price: 31_000, priceUyu: 31_000 }),
    ]);

    expect(result.priceUyu).toBe(26_000);
    expect(result.sources.sort()).toEqual(["facebook", "infocasas"]);
    expect(result.firstSeen).toBe("2026-07-02");
    expect(result.lastSeen).toBe("2026-08-20");
  });
});
