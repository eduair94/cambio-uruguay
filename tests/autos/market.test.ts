import { describe, expect, it } from "vitest";
import { buildMarketSnapshots } from "../../classes/autos/market";
import type { CarListing } from "../../classes/autos/types";

const NOW = new Date("2026-09-16T12:00:00.000Z");
let serial = 0;
function car(overrides: Partial<CarListing> = {}): CarListing {
  serial++;
  const id = `MLU${800000000 + serial}`;
  return {
    id, source: "mercadolibre", brandId: "1", brand: "Peugeot", modelId: "9301", model: "208", title: "Peugeot 208 1.2 Active",
    year: 2016, km: 100_000, price: 9_000, currency: "USD", transmission: "manual", fuel: "nafta", neighborhood: null,
    department: "Montevideo", sellerType: "private", sellerId: `s${serial}`, picture: null, pictureCount: 1,
    permalink: `https://auto.mercadolibre.com.uy/MLU-${id.slice(3)}-x-_JM`, observedAt: NOW.toISOString(), key: `ml-${id}`,
    brandSlug: "peugeot", modelSlug: "208", marketSlug: "peugeot-208", engine: "1.2", trim: "active", trimLabel: "Active",
    kmQuality: "ok", flags: [], priceUsd: 9_000, priceConverted: false, firstSeen: NOW.toISOString(),
    lastSeen: NOW.toISOString(), priceDrop: null, detail: null, ...overrides,
  };
}

describe("buildMarketSnapshots", () => {
  it("publishes year and version rows only with five or more clean adverts", () => {
    const listings = [
      ...[8_500, 8_900, 9_000, 9_200, 9_600].map(priceUsd => car({ priceUsd, price: priceUsd })),
      ...[7_000, 7_200, 7_400, 7_600].map(priceUsd => car({ year: 2014, priceUsd, price: priceUsd })),
      car({ flags: ["damaged"], priceUsd: 3_000, price: 3_000 }),
      car({ kmQuality: "placeholder" }),
    ];
    const [snapshot] = buildMarketSnapshots(listings, { now: NOW, generatedAt: NOW.toISOString(), freshDays: 4 });
    expect(snapshot).toMatchObject({ version: 1, slug: "peugeot-208", brand: "Peugeot", model: "208", listings: 11 });
    expect(snapshot!.years).toEqual([
      { year: 2016, trim: null, engine: null, transmission: null, n: 5, sellers: 5, p25: 8900, median: 9000, p75: 9200, kmMedian: 100000 },
    ]);
    expect(snapshot!.rows).toEqual([
      { year: 2016, trim: "Active", engine: "1.2", transmission: "manual", n: 5, sellers: 5, p25: 8900, median: 9000, p75: 9200, kmMedian: 100000 },
    ]);
  });
  it("skips models with fewer than five fresh adverts", () => {
    const listings = [car(), car(), car(), car(), car({ lastSeen: "2026-09-01T00:00:00.000Z" })];
    expect(buildMarketSnapshots(listings, { now: NOW, generatedAt: NOW.toISOString(), freshDays: 4 })).toEqual([]);
  });
});
