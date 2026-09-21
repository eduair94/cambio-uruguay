import { describe, expect, it } from "vitest";
import { buildEquiparListings } from "../../classes/equipar/listings";
import type { RetailListing } from "../../classes/retail/types";

let counter = 0;

function listing(overrides: Partial<RetailListing> & { title: string }): RetailListing {
  counter += 1;
  return {
    listingId: `x:${counter}`,
    source: "store",
    sellerKey: "divino",
    sellerName: "Divino",
    channel: "local-store",
    url: `https://divino.com.uy/p/${counter}`,
    price: 30_000,
    currency: "UYU",
    condition: "new",
    available: true,
    image: "https://divino.com.uy/img.jpg",
    brand: "Samsung",
    model: "",
    catalogId: null,
    attributes: { CATEGORY_SPEC: "heladera" },
    rating: null,
    ratingCount: 0,
    location: null,
    freeShipping: null,
    officialStore: true,
    observedAt: "2026-09-21T14:05:00.000Z",
    ...overrides,
  };
}

const newFridges = (): RetailListing[] =>
  Array.from({ length: 10 }, (_, index) =>
    listing({ title: `Heladera Samsung RT38K ${290 + index} Lts`, price: 29_000 + index * 400 })
  );

const usedFridges = (): RetailListing[] =>
  Array.from({ length: 6 }, (_, index) =>
    listing({
      title: "Heladera funcionando impecable",
      source: "facebook",
      sellerKey: "facebook",
      sellerName: "Facebook Marketplace",
      channel: "classifieds",
      condition: "unknown",
      brand: "",
      price: 11_000 + index * 500,
    })
  );

describe("buildEquiparListings", () => {
  it("writes one row per listing the band kept, classified like the catalogue", () => {
    const { rows, rejected, suspect } = buildEquiparListings({
      listings: [...newFridges(), ...usedFridges()],
      usdUyu: 40,
    });
    expect(rows).toHaveLength(16);
    expect(rejected).toBe(0);
    expect(suspect).toBe(0);
    const first = rows[0]!;
    expect(first.category).toBe("heladera");
    expect(first.categoryLabel).toBe("Heladera");
    expect(first.tier).toBe("S");
    expect(first.variant).toBeTruthy();
    expect(first.variantLabel).toBeTruthy();
    expect(typeof first.rank).toBe("number");
    expect(first.regime).toBe("modelo");
    expect(first.priceUyu).toBe(29_000);
    expect(first.lastSeen).toBe("2026-09-21");
    expect(first.suspect).toBe(false);
  });

  it("Marketplace is used unless it says new; a storefront is new", () => {
    const { rows } = buildEquiparListings({
      listings: [
        ...newFridges(),
        ...usedFridges(),
        listing({
          title: "Heladera nueva en caja",
          source: "facebook",
          sellerKey: "facebook",
          sellerName: "Facebook Marketplace",
          channel: "classifieds",
          condition: "new",
          brand: "",
          price: 30_500,
        }),
      ],
      usdUyu: 40,
    });
    const fb = rows.filter((row) => row.source === "facebook");
    expect(fb.filter((row) => row.condition === "used")).toHaveLength(6);
    expect(fb.filter((row) => row.condition === "new")).toHaveLength(1);
    expect(rows.filter((row) => row.source === "store").every((row) => row.condition === "new")).toBe(true);
  });

  it("drops what the band rejects and flags what it doubts, per condition", () => {
    const yogurt = listing({ title: "Yogur colchón de frutillas", price: 70, brand: "Conaprole" });
    // With the ten fridges at $29.000–32.600 plus these two, p10 lands near $4.700 (linear
    // interpolation over 12 values): $70 is under p10/3 (reject) and $2.000 sits between p10/3 and
    // p10/2 (suspect) — the same verdicts `buildEquiparCatalog` reaches for the same rows.
    const cheap = listing({ title: "Heladera Samsung RT38K oferta", price: 2_000 });
    const { rows, rejected, suspect } = buildEquiparListings({
      listings: [...newFridges(), yogurt, cheap],
      usdUyu: 40,
    });
    expect(rows.find((row) => row.listingId === yogurt.listingId)).toBeUndefined();
    expect(rejected).toBe(1);
    const doubtful = rows.find((row) => row.listingId === cheap.listingId);
    expect(doubtful?.suspect).toBe(true);
    expect(suspect).toBe(1);
  });

  it("converts USD to UYU at the run's rate and keeps the seller's own price", () => {
    const usd = listing({ title: "Heladera Samsung RT38K 300 Lts", price: 750, currency: "USD" });
    const { rows } = buildEquiparListings({ listings: [...newFridges(), usd], usdUyu: 40 });
    const row = rows.find((candidate) => candidate.listingId === usd.listingId)!;
    expect(row.price).toBe(750);
    expect(row.currency).toBe("USD");
    expect(row.priceUyu).toBe(30_000);
  });

  it("a placeholder brand is no brand; brandKey is normalised", () => {
    const { rows } = buildEquiparListings({
      listings: [
        ...newFridges(),
        listing({ title: "Heladera 300 litros", brand: "Sin marca", price: 30_000 }),
        listing({ title: "Heladera Enxuta 300 litros", brand: "ENXUTA ", price: 30_000 }),
      ],
      usdUyu: 40,
    });
    const nobrand = rows.find((row) => row.title === "Heladera 300 litros")!;
    expect(nobrand.brand).toBe("");
    expect(nobrand.brandKey).toBe("");
    const enxuta = rows.find((row) => row.title === "Heladera Enxuta 300 litros")!;
    expect(enxuta.brand).toBe("ENXUTA");
    expect(enxuta.brandKey).toBe("enxuta");
  });

  it("keeps a repeated listingId once, the last one", () => {
    const twice = newFridges();
    const dup = listing({ title: "Heladera Samsung RT38K 300 Lts", price: 30_000 });
    const again = { ...dup, price: 31_000 };
    const { rows } = buildEquiparListings({ listings: [...twice, dup, again], usdUyu: 40 });
    const same = rows.filter((row) => row.listingId === dup.listingId);
    expect(same).toHaveLength(1);
    expect(same[0]!.priceUyu).toBe(31_000);
  });

  it("ignores a listing that no category claims", () => {
    const { rows } = buildEquiparListings({
      listings: [...newFridges(), listing({ title: "Bicicleta rodado 29", attributes: {} })],
      usdUyu: 40,
    });
    expect(rows.every((row) => row.category === "heladera")).toBe(true);
  });
});
