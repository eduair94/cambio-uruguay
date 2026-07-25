import { describe, expect, it } from "vitest";
import {
  combineChairRating,
  globalSignal,
  mercadoLibreSignal,
  redditSignal,
  shrink,
} from "../../classes/chairs/ratings";
import type { ChairListing, ChairTierItem } from "../../classes/chairs/types";

const listing = (overrides: Partial<ChairListing>): ChairListing => ({
  listingId: "x",
  source: "mercadolibre",
  sellerKey: "ml:1",
  sellerName: "Vendedor",
  channel: "marketplace",
  title: "Silla",
  url: "https://example.com",
  price: 1000,
  currency: "UYU",
  condition: "new",
  available: true,
  image: null,
  brand: "",
  model: "",
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

const tierItem = (overrides: Partial<ChairTierItem>): ChairTierItem =>
  ({
    slug: "vigo-atlas",
    name: "Vigo Atlas",
    brand: "Vigo",
    model: "Atlas",
    tier: "A",
    score: 80,
    confidence: "medium",
    sources: 6,
    posts: 1,
    comments: 5,
    replies: 2,
    uniqueAuthors: 5,
    positive: 5,
    neutral: 1,
    negative: 0,
    themes: [],
    summary: "",
    generalReview: { verdict: "", pros: [], cons: [] },
    evidence: [],
    offers: [],
    image: null,
    gallery: [],
    ...overrides,
  }) as ChairTierItem;

describe("shrink", () => {
  it("pulls a tiny sample toward the prior and leaves a big one alone", () => {
    expect(shrink(5, 1)).toBeLessThan(4);
    expect(shrink(5, 2000)).toBeGreaterThan(4.9);
  });
});

describe("mercadoLibreSignal", () => {
  it("counts one review pool once, however many sellers list the chair", () => {
    const rows = Array.from({ length: 8 }, (_, index) =>
      listing({ listingId: `ml:${index}`, catalogId: "MLU1", rating: 4.5, ratingCount: 400 })
    );
    const signal = mercadoLibreSignal(rows)!;
    expect(signal.sampleSize).toBe(400);
    expect(signal.stars).toBeGreaterThan(4.4);
  });

  it("adds up genuinely independent sellers", () => {
    const signal = mercadoLibreSignal([
      listing({ listingId: "ml:1", rating: 5, ratingCount: 10 }),
      listing({ listingId: "ml:2", rating: 3, ratingCount: 10 }),
    ])!;
    expect(signal.sampleSize).toBe(20);
    expect(signal.stars).toBeGreaterThan(3.4);
    expect(signal.stars).toBeLessThan(4.2);
  });

  it("is null without any rated listing", () => {
    expect(mercadoLibreSignal([listing({})])).toBeNull();
  });
});

describe("redditSignal", () => {
  it("maps the 0-100 tier score onto stars", () => {
    expect(redditSignal(tierItem({ score: 100, sources: 40 }))!.stars).toBeGreaterThan(4.5);
    expect(redditSignal(tierItem({ score: 0, sources: 40 }))!.stars).toBeLessThan(2);
  });

  it("is null when nobody discussed the chair", () => {
    expect(redditSignal(null)).toBeNull();
    expect(redditSignal(tierItem({ sources: 0 }))).toBeNull();
  });
});

describe("globalSignal", () => {
  it("needs at least one judged opinion", () => {
    expect(globalSignal({ mentions: 3, positive: 0, negative: 0, subs: ["OfficeChairs"] })).toBeNull();
    expect(globalSignal({ mentions: 3, positive: 3, negative: 0, subs: ["OfficeChairs"] })).not.toBeNull();
  });
});

describe("combineChairRating", () => {
  it("returns no rating at all when there is no evidence", () => {
    const rating = combineChairRating([null, null]);
    expect(rating.stars).toBeNull();
    expect(rating.confidence).toBe("low");
  });

  it("lets the larger sample dominate and publishes the weights", () => {
    const rating = combineChairRating([
      mercadoLibreSignal([listing({ rating: 4.8, ratingCount: 900 })]),
      globalSignal({ mentions: 1, positive: 0, negative: 1, subs: ["OfficeChairs"] }),
    ]);
    expect(rating.stars).toBeGreaterThan(4.3);
    const marketplace = rating.signals.find((signal) => signal.source === "mercadolibre")!;
    expect(marketplace.weight).toBeGreaterThan(0.8);
    expect(rating.signals.reduce((sum, signal) => sum + signal.weight, 0)).toBeCloseTo(1, 1);
  });

  it("only calls a rating solid with several sources and a real sample", () => {
    const small = combineChairRating([mercadoLibreSignal([listing({ rating: 5, ratingCount: 3 })])]);
    expect(small.confidence).toBe("low");
    const solid = combineChairRating([
      mercadoLibreSignal([listing({ rating: 4.6, ratingCount: 300 })]),
      redditSignal(tierItem({ sources: 8 })),
    ]);
    expect(solid.confidence).toBe("high");
  });
});
