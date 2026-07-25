import { describe, expect, it } from "vitest";
import { buildChairCatalog, dedupeOffers, matchTierItem } from "../../classes/chairs/catalog";
import { looksLikeChairAccessory } from "../../classes/chairs/normalize";
import type { ChairListing, ChairOffer, ChairTierItem, ChairTierSnapshot } from "../../classes/chairs/types";

const listing = (overrides: Partial<ChairListing>): ChairListing => ({
  listingId: "x",
  source: "mercadolibre",
  sellerKey: "ml:1",
  sellerName: "Vendedor",
  channel: "marketplace",
  title: "Silla Herman Miller Aeron",
  url: "https://example.com/1",
  price: 1000,
  currency: "UYU",
  condition: "new",
  available: true,
  image: null,
  brand: "Herman Miller",
  model: "Aeron",
  catalogId: null,
  attributes: {},
  rating: null,
  ratingCount: 0,
  location: null,
  freeShipping: null,
  officialStore: false,
  observedAt: "2026-07-25T00:00:00.000Z",
  ...overrides,
});

const offer = (overrides: Partial<ChairOffer>): ChairOffer => ({
  id: "a",
  source: "mercadolibre",
  sellerKey: "ml:1",
  seller: "Vendedor",
  channel: "marketplace",
  title: "Silla",
  url: "https://example.com",
  price: 1000,
  currency: "UYU",
  priceUyu: 1000,
  condition: "new",
  available: true,
  freeShipping: null,
  location: null,
  image: null,
  observedAt: "2026-07-25T00:00:00.000Z",
  ...overrides,
});

describe("dedupeOffers", () => {
  it("keeps the cheapest row per seller", () => {
    const rows = dedupeOffers([
      offer({ id: "a", priceUyu: 5000 }),
      offer({ id: "b", priceUyu: 4200 }),
      offer({ id: "c", priceUyu: 6100 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("b");
  });

  it("keeps a used offer beside the new one from the same seller", () => {
    const rows = dedupeOffers([
      offer({ id: "new", priceUyu: 90000, condition: "new" }),
      offer({ id: "used", priceUyu: 32000, condition: "used" }),
    ]);
    expect(rows.map((row) => row.id).sort()).toEqual(["new", "used"]);
  });

  it("sorts available offers before sold-out ones", () => {
    const rows = dedupeOffers([
      offer({ id: "gone", sellerKey: "ml:2", priceUyu: 1000, available: false }),
      offer({ id: "live", sellerKey: "ml:3", priceUyu: 2000 }),
    ]);
    expect(rows[0]!.id).toBe("live");
  });
});

describe("matchTierItem", () => {
  const tiers = [
    { slug: "vigo-atlas", name: "Vigo Atlas", brand: "Vigo", model: "Atlas", tier: "A" },
    { slug: "herman-miller-aeron", name: "Herman Miller Aeron", brand: "Herman Miller", model: "Aeron", tier: "S" },
  ] as unknown as ChairTierItem[];

  it("links a catalogue chair to its Reddit entry", () => {
    expect(matchTierItem("Herman Miller Aeron", "Herman Miller", "Aeron", tiers)?.slug).toBe(
      "herman-miller-aeron"
    );
  });

  it("does not link an unrelated chair", () => {
    expect(matchTierItem("Cougar Armor Elite", "Cougar", "Armor Elite", tiers)).toBeNull();
  });
});

describe("buildChairCatalog", () => {
  const snapshot = {
    key: "charruadevs-desktop-chairs",
    tiers: [
      {
        slug: "herman-miller-aeron",
        name: "Herman Miller Aeron",
        brand: "Herman Miller",
        model: "Aeron",
        tier: "S",
        score: 88,
        sources: 9,
        positive: 8,
        negative: 1,
        evidence: [],
        generalReview: { verdict: "Consenso muy favorable.", pros: [], cons: [] },
      },
    ],
    watchlist: [],
  } as unknown as ChairTierSnapshot;

  it("produces one product with every platform's price", () => {
    const products = buildChairCatalog({
      listings: [
        listing({ listingId: "ml:1", price: 120000, rating: 4.8, ratingCount: 40 }),
        listing({
          listingId: "store:bertoni:1",
          source: "store",
          sellerKey: "bertoni",
          sellerName: "Bertoni",
          channel: "local-store",
          currency: "USD",
          price: 2795,
        }),
        listing({
          listingId: "fb:1",
          source: "facebook",
          sellerKey: "facebook",
          sellerName: "Facebook Marketplace",
          channel: "classifieds",
          condition: "used",
          price: 35000,
        }),
      ],
      snapshot,
      global: new Map(),
      usdUyu: 40,
      previous: new Map(),
      now: new Date("2026-07-25T12:00:00.000Z"),
    });

    expect(products).toHaveLength(1);
    const product = products[0]!;
    expect(product.name).toBe("Herman Miller Aeron");
    expect(product.offers).toHaveLength(3);
    expect(product.price!.bestNew).toBe(111800); // 2795 USD × 40, cheaper than the 120000 listing
    expect(product.price!.bestUsed).toBe(35000);
    expect(product.tier).toBe("S");
    expect(product.stars).not.toBeNull();
    expect(product.history).toEqual([
      { date: "2026-07-25", median: product.price!.median, min: 35000, offers: 3 },
    ]);
  });

  it("keeps the first-seen date and appends to the price history", () => {
    const products = buildChairCatalog({
      listings: [listing({ listingId: "ml:1", price: 100000 })],
      snapshot: null,
      global: new Map(),
      usdUyu: 40,
      previous: new Map([
        [
          "herman-miller-aeron",
          {
            firstSeen: "2026-01-02",
            history: [{ date: "2026-07-24", median: 98000, min: 98000, offers: 1 }],
          },
        ],
      ]),
      now: new Date("2026-07-25T12:00:00.000Z"),
    });
    const product = products[0]!;
    expect(product.firstSeen).toBe("2026-01-02");
    expect(product.history.map((point) => point.date)).toEqual(["2026-07-24", "2026-07-25"]);
  });

  it("rejects prices outside the sane band instead of publishing them", () => {
    const products = buildChairCatalog({
      listings: [
        listing({ listingId: "ml:1", price: 5 }),
        listing({ listingId: "ml:2", sellerKey: "ml:2", price: 4_000_000 }),
      ],
      snapshot: null,
      global: new Map(),
      usdUyu: 40,
      previous: new Map(),
      now: new Date("2026-07-25T12:00:00.000Z"),
    });
    expect(products[0]!.price).toBeNull();
  });
});

describe("looksLikeChairAccessory", () => {
  it("recognises a stored row that is not a chair, from its name alone", () => {
    // The prune rule runs over "Brand Model" strings, which never contain the word "silla".
    expect(looksLikeChairAccessory("Tcweb Rueda silla")).toBe(true);
    expect(looksLikeChairAccessory("Punto Union Apilable Auditorio")).toBe(true);
    expect(looksLikeChairAccessory("Herman Miller Aeron")).toBe(false);
    expect(looksLikeChairAccessory("Lumax ROM-SA")).toBe(false);
  });
});
