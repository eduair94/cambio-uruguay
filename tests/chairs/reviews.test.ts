import { describe, expect, it } from "vitest";
import { factualVerdict } from "../../classes/chairs/reviews";
import type { ChairCatalogProduct } from "../../classes/chairs/types";

const product = (overrides: Partial<ChairCatalogProduct>): ChairCatalogProduct =>
  ({
    slug: "lumax-rom",
    key: "lumax|rom",
    name: "Lumax ROM",
    brand: "Lumax",
    model: "ROM",
    category: "gaming",
    stars: null,
    ratingCount: 0,
    ratingSignals: [],
    confidence: "low",
    redditSlug: null,
    tier: null,
    price: { min: 2696, max: 4968, median: 3600, currency: "UYU", samples: 9, bestNew: 2696, bestUsed: null },
    offers: [],
    sellers: 9,
    specs: [],
    verdict: "",
    pros: [],
    cons: [],
    evidence: [],
    reviews: [],
    images: [],
    history: [],
    reviewFingerprint: "",
    firstSeen: "2026-07-25",
    lastSeen: "2026-07-25",
    ...overrides,
  }) as ChairCatalogProduct;

describe("factualVerdict", () => {
  it("states the price range and the number of sellers", () => {
    const verdict = factualVerdict(product({}));
    expect(verdict).toContain("2.696");
    expect(verdict).toContain("9 vendedores");
  });

  it("says there is no rating only when there really is none", () => {
    expect(factualVerdict(product({}))).toContain("no hay reseñas suficientes");
  });

  it("does not contradict a rating shown beside it", () => {
    const verdict = factualVerdict(product({ stars: 4.6, ratingCount: 26457 }));
    expect(verdict).not.toContain("no hay reseñas suficientes");
    expect(verdict).toContain("4.6");
    expect(verdict).toContain("26.457");
  });
});
