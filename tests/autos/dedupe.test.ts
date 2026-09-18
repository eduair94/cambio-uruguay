import { describe, expect, it } from "vitest";
import { guideKey } from "../../classes/autos/catalog/guide";
import { attachReferences, dedupeAcrossSources, referenceMedians, sourceCoverage } from "../../classes/autos/dedupe";
import type { PublicCarListing } from "../../classes/autos/publicTypes";
import type { CarListing } from "../../classes/autos/types";

const NOW = "2026-09-17T12:00:00.000Z";
const car = (key: string, source: CarListing["source"], overrides: Partial<CarListing> = {}): CarListing => ({
  id: key.split("-")[1]!, source, brandId: "1", brand: "Chevrolet", modelId: "2", model: "Onix", title: "Chevrolet Onix 1.0 LT",
  year: 2023, km: 82_900, price: 11_990, currency: "USD", transmission: "manual", fuel: "nafta", neighborhood: null,
  department: null, sellerType: "dealer", sellerId: source, picture: null, pictureCount: null, permalink: "https://x", observedAt: NOW,
  key, brandSlug: "chevrolet", modelSlug: "onix", marketSlug: "chevrolet-onix", engine: "1.0", trim: "lt", trimLabel: "LT",
  kmQuality: "ok", flags: [], priceUsd: 11_990, priceConverted: false, firstSeen: NOW, lastSeen: NOW, priceDrop: null, detail: null,
  sourceName: source, reference: null, ...overrides,
});

describe("dedupeAcrossSources", () => {
  it("keeps the Mercado Libre copy of a dealer's car and counts the drops", () => {
    const { kept, duplicates } = dedupeAcrossSources([
      car("carone-717444", "carone", { km: 82_900, priceUsd: 11_990 }),
      car("ml-MLU1", "mercadolibre", { km: 82_950, priceUsd: 12_190 }),
      car("fb-9", "facebook", { km: 83_000, priceUsd: 11_900 }),
    ]);
    expect(kept.map(item => item.key)).toEqual(["ml-MLU1"]);
    expect(duplicates).toEqual({ carone: 1, facebook: 1 });
  });
  it("keeps same-source copies (analysis handles those) and different cars", () => {
    const { kept, duplicates } = dedupeAcrossSources([
      car("ml-MLU1", "mercadolibre"), car("ml-MLU2", "mercadolibre"),
      car("carone-1", "carone", { km: 120_000 }), car("carone-2", "carone", { priceUsd: 14_000 }),
      car("carone-3", "carone", { year: 2022 }), car("fb-4", "facebook", { km: null }),
    ]);
    expect(kept.map(item => item.key).sort()).toEqual(["carone-1", "carone-2", "carone-3", "fb-4", "ml-MLU1", "ml-MLU2"]);
    expect(duplicates).toEqual({});
  });
  it("prefers a dealer website over Facebook when ML does not have the car", () => {
    const { kept } = dedupeAcrossSources([car("fb-1", "facebook"), car("carper-2", "carper")]);
    expect(kept.map(item => item.key)).toEqual(["carper-2"]);
  });
});

describe("references", () => {
  it("attaches the guide reference to each listing", () => {
    const key = guideKey("chevrolet", "onix", 2023);
    const guide = new Map([[key, {
      key, brandSlug: "chevrolet", modelSlug: "onix", year: 2023, status: "ok" as const, averageUsd: 13_000, updatedLabel: null,
      fetchedAt: NOW, versions: [{ name: "Chevrolet Onix 2023 Lt", slug: "lt", priceUsd: 12_500 }],
    }]]);
    const [withReference] = attachReferences([car("ml-MLU1", "mercadolibre")], guide);
    expect(withReference!.reference).toEqual({ priceUsd: 12_500, basis: "version", updatedAt: NOW });
    expect(attachReferences([car("ml-MLU1", "mercadolibre", { year: 2020 })], guide)[0]!.reference).toBeNull();
  });
  it("medians ignore inferred currencies, converted prices and thin groups", () => {
    const rows = [
      car("ml-1", "mercadolibre", { priceUsd: 10_000 }), car("ml-2", "mercadolibre", { priceUsd: 12_000 }),
      car("sda-3", "shoppingdeautos", { priceUsd: 11_000 }), car("fb-4", "facebook", { priceUsd: 1, currencyInferred: true }),
      car("ml-5", "mercadolibre", { priceUsd: 2, priceConverted: true }),
    ];
    expect(referenceMedians(rows).get("1|2|2023")).toBe(11_000);
    expect(referenceMedians(rows.slice(0, 2)).get("1|2|2023")).toBeUndefined();
  });
});

describe("sourceCoverage", () => {
  it("lists every source with its public count, duplicates and last good read", () => {
    const rows = [{ source: "clasiautos" }, { source: "clasiautos" }] as PublicCarListing[];
    const coverage = sourceCoverage(rows, { facebook: 3 }, new Map([["clasiautos", { lastOkAt: NOW, ok: true }]]));
    expect(coverage.find(item => item.source === "clasiautos")).toEqual({ source: "clasiautos", name: "Clasiautos", listings: 2, duplicates: 0, lastReadAt: NOW, ok: true });
    expect(coverage.find(item => item.source === "facebook")).toMatchObject({ listings: 0, duplicates: 3, lastReadAt: null, ok: false });
    expect(coverage).toHaveLength(10);
  });
});
