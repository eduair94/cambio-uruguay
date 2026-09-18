import { describe, expect, it } from "vitest";
import { annualDropOf, buildCarReport, depreciationOf, negotiationOf, reportable, rotationOf, sellerGapOf } from "../../classes/autos/report";
import type { CarListing, CarPricePoint, StoredCar } from "../../classes/autos/types";

const NOW = new Date("2026-09-18T12:00:00.000Z");
let serial = 0;

function car(overrides: Partial<CarListing> = {}): CarListing {
  serial++;
  const price = overrides.price ?? 12_000;
  return {
    id: `MLU${serial}`, source: "mercadolibre", brandId: "58955", brand: "Chevrolet", modelId: "123123", model: "Onix",
    title: "Chevrolet Onix 1.4 Lt", year: 2019, km: 90_000, price, currency: "USD", transmission: "manual",
    fuel: "nafta", neighborhood: null, department: "Montevideo", sellerType: "private", sellerId: `s${serial}`,
    picture: null, pictureCount: null, permalink: "https://auto.mercadolibre.com.uy/MLU-1-x-_JM",
    observedAt: NOW.toISOString(), key: `ml-MLU${serial}`, brandSlug: "chevrolet", modelSlug: "onix",
    marketSlug: "chevrolet-onix", engine: "1.4", trim: "lt", trimLabel: "Lt", kmQuality: "ok", flags: [],
    priceUsd: overrides.priceUsd ?? price, priceConverted: false, firstSeen: "2026-09-01T00:00:00.000Z",
    lastSeen: NOW.toISOString(), priceDrop: null, detail: null, sourceName: "Mercado Libre", reference: null,
    ...overrides,
  };
}

const stored = (overrides: Partial<StoredCar> = {}, history: CarPricePoint[] = []): StoredCar => {
  const listing = car();
  return {
    key: listing.key, firstSeen: listing.firstSeen, lastSeen: listing.lastSeen, priceHistory: history,
    retiredAt: null, missedFullSweeps: 0, detail: null, listing, ...overrides,
  };
};

describe("reportable", () => {
  it("leaves out what cannot be compared in dollars", () => {
    expect(reportable(car())).toBe(true);
    expect(reportable(car({ priceConverted: true }))).toBe(false);
    expect(reportable(car({ currencyInferred: true }))).toBe(false);
    expect(reportable(car({ price: 0, priceUsd: 0 }))).toBe(false);
  });
});

describe("annualDropOf", () => {
  it("reads a clean curve as the yearly loss", () => {
    const points = [2024, 2023, 2022, 2021, 2020, 2019].map((year, index) => ({
      year, adverts: 10, medianUsd: Math.round(15_000 * 0.9 ** index),
    }));
    expect(annualDropOf(points)).toBeCloseTo(0.1, 2);
  });
  it("survives one year that comes out dearer than the next", () => {
    const points = [
      { year: 2024, adverts: 8, medianUsd: 14_000 },
      { year: 2023, adverts: 9, medianUsd: 14_500 },
      { year: 2022, adverts: 9, medianUsd: 12_600 },
      { year: 2021, adverts: 9, medianUsd: 11_300 },
      { year: 2020, adverts: 9, medianUsd: 10_200 },
      { year: 2019, adverts: 9, medianUsd: 9_200 },
    ];
    const drop = annualDropOf(points)!;
    expect(drop).toBeGreaterThan(0.05);
    expect(drop).toBeLessThan(0.15);
  });
  it("abstains when the curve is too short, and when it says a car gains value", () => {
    expect(annualDropOf([{ year: 2024, adverts: 5, medianUsd: 10_000 }])).toBeNull();
    const rising = [2024, 2023, 2022, 2021, 2020].map((year, index) => ({ year, adverts: 5, medianUsd: 10_000 + index * 500 }));
    expect(annualDropOf(rising)).toBeNull();
  });
});

describe("depreciationOf", () => {
  it("keeps only the years with enough adverts to have a median", () => {
    const rows = [
      ...Array.from({ length: 5 }, () => car({ year: 2020, price: 13_000 })),
      ...Array.from({ length: 2 }, () => car({ year: 2019, price: 12_000 })),
      car({ year: 2008, price: 5_000 }),
    ];
    const points = depreciationOf(rows, 2026);
    expect(points.map(point => point.year)).toEqual([2020]);
  });
});

describe("sellerGapOf", () => {
  it("compares the two sides of the counter within the SAME year", () => {
    const rows = [
      ...Array.from({ length: 6 }, () => car({ year: 2019, price: 13_000, sellerType: "dealer" })),
      ...Array.from({ length: 6 }, () => car({ year: 2019, price: 11_700, sellerType: "private" })),
      // Un año con datos de un solo lado no aporta nada y no puede inventar una diferencia.
      ...Array.from({ length: 6 }, () => car({ year: 2024, price: 18_000, sellerType: "dealer" })),
    ];
    const gap = sellerGapOf(rows)!;
    expect(gap.cohorts).toBe(1);
    expect(gap.gap).toBeCloseTo(0.111, 2);
  });
  it("says nothing when no year has both sides", () => {
    expect(sellerGapOf(Array.from({ length: 9 }, () => car({ sellerType: "dealer" })))).toBeNull();
  });
});

describe("negotiationOf", () => {
  it("counts only the changes we saw ourselves, inside the window", () => {
    const point = (price: number, day: string): CarPricePoint => ({ price, currency: "USD", observedAt: `2026-09-${day}T10:00:00.000Z` });
    const docs = [
      stored({ key: "a" }, [point(12_000, "16"), point(11_000, "17")]),
      stored({ key: "b" }, [point(9_000, "16"), point(9_500, "17")]),
      stored({ key: "c" }, [point(9_000, "16"), point(9_000, "17")]),
      stored({ key: "d" }, [point(20_000, "01"), point(18_000, "02")]),
    ];
    const result = negotiationOf(docs, NOW, 7);
    expect(result).toMatchObject({ changed: 2, cut: 1, raised: 1 });
    expect(result.medianCut).toBeCloseTo(0.083, 2);
  });
});

describe("rotationOf", () => {
  it("refuses to publish a number the series is too young to support", () => {
    const docs = Array.from({ length: 200 }, () =>
      stored({ firstSeen: "2026-09-17T00:00:00.000Z", retiredAt: "2026-09-18T00:00:00.000Z" }));
    const rotation = rotationOf(docs, NOW);
    expect(rotation.measurable).toBe(false);
    expect(rotation.medianDays).toBeNull();
    expect(rotation.note).toContain("14");
  });
  it("publishes once there is a window and enough adverts that left", () => {
    const docs = Array.from({ length: 200 }, () =>
      stored({ firstSeen: "2026-08-01T00:00:00.000Z", retiredAt: "2026-08-21T00:00:00.000Z" }));
    const rotation = rotationOf(docs, NOW);
    expect(rotation.measurable).toBe(true);
    expect(rotation.medianDays).toBeCloseTo(20, 0);
  });
});

describe("buildCarReport", () => {
  const market = (): CarListing[] => [
    ...Array.from({ length: 34 }, (_, index) =>
      car({ year: 2024 - (index % 6), price: 15_000 - (index % 6) * 1_200, sellerType: index % 2 ? "dealer" : "private" })),
    ...Array.from({ length: 12 }, () =>
      car({ brand: "Fiat", model: "Uno", brandSlug: "fiat", modelSlug: "uno", marketSlug: "fiat-uno", price: 7_000, year: 2015 })),
  ];

  it("describes the market and only names models with enough adverts", () => {
    const report = buildCarReport(market(), [], { now: NOW, maxYear: 2026 });
    expect(report.market.adverts).toBe(46);
    expect(report.models.map(model => model.marketSlug)).toEqual(["chevrolet-onix"]);
    expect(report.market.price.median).toBeGreaterThan(0);
    expect(report.market.sellers.dealer + report.market.sellers.private).toBe(46);
    expect(report.market.priceBands.reduce((total, band) => total + band.adverts, 0)).toBe(46);
  });
  it("answers what a budget buys, model by model", () => {
    const report = buildCarReport(market(), [], { now: NOW, maxYear: 2026 });
    const budget = report.budgets.find(entry => entry.maxUsd === 10_000)!;
    expect(budget.models.map(model => model.marketSlug)).toContain("fiat-uno");
    expect(budget.models.every(model => model.medianUsd <= 10_000)).toBe(true);
  });
  it("carries the rotation caveat instead of a made-up number", () => {
    const report = buildCarReport(market(), [], { now: NOW, maxYear: 2026 });
    expect(report.rotation.measurable).toBe(false);
    expect(report.rotation.medianDays).toBeNull();
  });
});
