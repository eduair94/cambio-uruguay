import { describe, expect, it } from "vitest";
import { CAR_OPPORTUNITY_POLICY, type CarAnalysis } from "../../classes/autos/analyze";
import { buildCarCatalog, buildOpportunitySnapshot, publicCarListing } from "../../classes/autos/project";
import type { CarListing } from "../../classes/autos/types";

const NOW = new Date("2026-09-16T12:00:00.000Z");
function car(overrides: Partial<CarListing> = {}): CarListing {
  return {
    id: "MLU1", source: "mercadolibre", brandId: "1", brand: "Peugeot", modelId: "2", model: "208",
    title: "Peugeot 208 1.5 Allure llamar 099 123 456", year: 2017, km: 112_000, price: 7_900, currency: "USD",
    transmission: "manual", fuel: "nafta", neighborhood: "Pocitos", department: "Montevideo", sellerType: "dealer",
    sellerId: "SELLERID", picture: "https://http2.mlstatic.com/D_1.webp", pictureCount: 9,
    permalink: "https://auto.mercadolibre.com.uy/MLU-1-peugeot-_JM", observedAt: NOW.toISOString(), key: "ml-MLU1",
    brandSlug: "peugeot", modelSlug: "208", marketSlug: "peugeot-208", engine: "1.5", trim: "allure", trimLabel: "Allure",
    kmQuality: "ok", flags: [], priceUsd: 7_900, priceConverted: false, firstSeen: NOW.toISOString(), lastSeen: NOW.toISOString(),
    priceDrop: null,
    detail: { readAt: NOW.toISOString(), price: 7_900, currency: "USD", active: true, brand: "Peugeot", model: "208", year: 2017,
      km: 112_000, version: "1.5 Allure", engineText: null, sellerName: "Automotora X", bodyType: null, color: null, doors: null,
      flags: [], description: "PRIVATE DESCRIPTION TEXT" },
    ...overrides,
  };
}

describe("publicCarListing", () => {
  it("projects only public fields and cleans contact data", () => {
    const row = publicCarListing(car(), null)!;
    expect(Object.keys(row).sort()).toEqual([
      "brand", "brandSlug", "currency", "dealerName", "department", "engine", "firstSeen", "flags", "fuel", "key", "km",
      "lastSeen", "marketSlug", "model", "modelSlug", "neighborhood", "opportunity", "permalink", "picture", "pictureCount",
      "price", "priceConverted", "priceDrop", "priceUsd", "sellerType", "title", "transmission", "trim", "year",
    ]);
    expect(row.title).toBe("Peugeot 208 1.5 Allure llamar");
    expect(row.dealerName).toBe("Automotora X");
    expect(JSON.stringify(row)).not.toMatch(/PRIVATE|SELLERID/);
  });
  it("hides placeholder km, foreign pictures and private sellers' names", () => {
    expect(publicCarListing(car({ kmQuality: "placeholder", km: 111_111 }), null)!.km).toBeNull();
    expect(publicCarListing(car({ picture: "https://tracker.example/x.jpg" }), null)!.picture).toBeNull();
    expect(publicCarListing(car({ sellerType: "private" }), null)!.dealerName).toBeNull();
    expect(publicCarListing(car({ permalink: "https://evil.example/MLU-1" }), null)).toBeNull();
  });
  it("nulls a dealer name that cleans to nothing instead of publishing an empty string", () => {
    const row = publicCarListing(car({ detail: { ...car().detail!, sellerName: "099 123 456" } }), null)!;
    expect(row.dealerName).toBeNull();
  });
  it("rejects a picture URL carrying a username or password", () => {
    expect(publicCarListing(car({ picture: "https://user:pass@http2.mlstatic.com/D_1.webp" }), null)!.picture).toBeNull();
    expect(publicCarListing(car({ picture: "https://user@http2.mlstatic.com/D_1.webp" }), null)!.picture).toBeNull();
  });
});

const analysis = (subject: CarListing, peers: CarListing[]): CarAnalysis => ({
  accepted: [{ subject, tier: "strict", comparables: peers, sample: {
    n: peers.length, sellers: peers.length, dealers: 3, privates: 7, p25: 10_000, median: 10_600, p75: 11_200, spread: 0.113,
    kmMedian: 110_000, kmP75: 118_000, gap: 0.2547, conservativeGap: 0.21, sellerSensitivityGap: 0.22 } }],
  needsDetail: [],
  stats: { input: 11, eligible: 11, analyzed: 11, candidates: 1, verified: 1, strict: 1, exploratory: 0, review: 0, excluded: {}, rejectedByDetail: {} },
});

describe("snapshots", () => {
  const peers = Array.from({ length: 10 }, (_, i) => car({ id: `MLU${10 + i}`, key: `ml-MLU${10 + i}`, sellerId: `S${i}`,
    permalink: `https://auto.mercadolibre.com.uy/MLU-${10 + i}-x-_JM`, price: 10_000 + i * 100, priceUsd: 10_000 + i * 100 }));
  it("badges opportunities in the catalog and keeps only fresh rows", () => {
    const stale = car({ id: "MLU2", key: "ml-MLU2", lastSeen: "2026-09-01T00:00:00.000Z", permalink: "https://auto.mercadolibre.com.uy/MLU-2-x-_JM" });
    const { listings, meta } = buildCarCatalog([car(), stale, ...peers], analysis(car(), peers), {
      now: NOW, generatedAt: NOW.toISOString(), usdUyu: 40.2, lastFullReadAt: NOW.toISOString(), lastReadAt: NOW.toISOString(), reportedTotal: 17_041,
    });
    expect(listings).toHaveLength(11);
    expect(listings.find(row => row.key === "ml-MLU1")!.opportunity).toEqual({ tier: "strict", gap: 0.255, median: 10600, n: 10 });
    expect(meta).toMatchObject({ key: "uy-cars", freshDays: 4, sourceCoverage: "partial", listings: 11, opportunities: 1,
      models: [{ slug: "peugeot-208", brand: "Peugeot", model: "208", listings: 11 }] });
  });
  it("publishes the policy, the sample and the comparables without private data", () => {
    const snapshot = buildOpportunitySnapshot(analysis(car(), peers), { generatedAt: NOW.toISOString(), usdUyu: 40.2 });
    expect(snapshot).toMatchObject({ version: 1, algorithm: "car-cohort-v1", policy: { maximumGap: CAR_OPPORTUNITY_POLICY.maximumGap } });
    expect(snapshot.items[0]).toMatchObject({ tier: "strict", gap: 0.255, sample: { n: 10, median: 10600 }, detailReadAt: NOW.toISOString() });
    expect(snapshot.items[0]!.comparables).toHaveLength(10);
    expect(JSON.stringify(snapshot)).not.toMatch(/PRIVATE|sellerId|SELLERID|description/);
  });
});
