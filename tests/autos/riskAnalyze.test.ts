import { describe, expect, it } from "vitest";
import { analyzeCarRisk, risksOf } from "../../classes/autos/riskAnalyze";
import type { CarDetail, CarListing } from "../../classes/autos/types";

const NOW = new Date("2026-09-18T12:00:00.000Z");
let serial = 0;

function car(overrides: Partial<CarListing> = {}): CarListing {
  serial++;
  const id = overrides.id ?? `MLU${800000000 + serial}`;
  const price = overrides.price ?? 12_000;
  return {
    id, source: "mercadolibre", brandId: "58955", brand: "Chevrolet", modelId: "123123", model: "Onix",
    title: "Chevrolet Onix 1.4 Lt Mt 98cv", year: 2019, km: 90_000, price, currency: "USD", transmission: "manual",
    fuel: "nafta", neighborhood: null, department: "Montevideo", sellerType: "private", sellerId: `seller-${serial}`,
    picture: null, pictureCount: 10, permalink: `https://auto.mercadolibre.com.uy/MLU-${id.slice(3)}-x-_JM`,
    observedAt: NOW.toISOString(), key: `ml-${id}`, brandSlug: "chevrolet", modelSlug: "onix", marketSlug: "chevrolet-onix",
    engine: "1.4", trim: "lt", trimLabel: "Lt", kmQuality: "ok", flags: [], priceUsd: overrides.priceUsd ?? price,
    priceConverted: false, firstSeen: NOW.toISOString(), lastSeen: NOW.toISOString(), priceDrop: null, detail: null,
    sourceName: "Mercado Libre", reference: null,
    ...overrides,
  };
}

const detail = (description: string): CarDetail => ({
  readAt: NOW.toISOString(), price: 0, currency: "USD", active: true, brand: "Chevrolet", model: "Onix",
  year: 2019, km: 90_000, version: "1.4 Lt 98cv", engineText: "1.4", sellerName: null, bodyType: null,
  color: null, doors: null, flags: [], description,
});

const clean = (count = 8) => Array.from({ length: count }, (_, index) => car({ price: 12_000 + index * 100, km: 88_000 + index * 500 }));

describe("analyzeCarRisk", () => {
  it("measures the discount of a declared risk against the cars that declare nothing", () => {
    const subject = car({ price: 9_000, detail: detail("Tiene una deuda de 52000 pesos de patente.") });
    const analysis = analyzeCarRisk([...clean(), subject], { now: NOW });
    expect(analysis.stats.declared).toBe(1);
    const [item] = analysis.items;
    expect(item!.categories).toEqual(["deuda"]);
    expect(item!.gap).toBeGreaterThan(0.2);
    expect(item!.sample!.n).toBeGreaterThanOrEqual(5);
    expect(analysis.stats.measured).toBe(1);
  });
  it("never lets a risky advert into the reference: the cohort is the clean one", () => {
    const wrecked = Array.from({ length: 6 }, (_, index) =>
      car({ price: 7_000 + index * 50, detail: detail("Chocado de adelante, anda") }));
    const subject = car({ price: 9_000, detail: detail("Tiene deuda de 40000") });
    const analysis = analyzeCarRisk([...clean(), ...wrecked, subject], { now: NOW });
    const item = analysis.items.find(entry => entry.subject.key === subject.key)!;
    // La mediana limpia ronda 12.350; si los chocados contaran, el descuento se desplomaría.
    expect(item.sample!.median).toBeGreaterThan(11_500);
  });
  it("publishes an advert it cannot compare, without inventing a number", () => {
    const subject = car({ price: 9_000, trim: null, detail: detail("Solo libreta, falta el título") });
    const analysis = analyzeCarRisk([...clean(), subject], { now: NOW });
    const item = analysis.items.find(entry => entry.subject.key === subject.key)!;
    expect(item.gap).toBeNull();
    expect(item.sample).toBeNull();
    expect(item.categories).toEqual(["papeles"]);
  });
  it("only reports a category median once there are enough measured adverts", () => {
    const risky = Array.from({ length: 5 }, (_, index) =>
      car({ price: 9_000 + index * 100, detail: detail("Tiene una deuda de 30000 pesos") }));
    const thin = car({ price: 8_000, detail: detail("Ex taxi") });
    const analysis = analyzeCarRisk([...clean(), ...risky, thin], { now: NOW });
    const deuda = analysis.categories.find(category => category.category === "deuda")!;
    const uso = analysis.categories.find(category => category.category === "uso_intensivo")!;
    expect(deuda.measured).toBe(5);
    expect(deuda.medianGap).toBeGreaterThan(0.2);
    expect(uso.adverts).toBe(1);
    expect(uso.medianGap).toBeNull();
  });
  it("ignores an advert nobody has seen for days", () => {
    const old = car({ price: 9_000, lastSeen: "2026-09-01T00:00:00.000Z", detail: detail("Chocado") });
    expect(analyzeCarRisk([...clean(), old], { now: NOW }).stats.declared).toBe(0);
  });
  it("reads the title too, not only the page", () => {
    expect(risksOf(car({ title: "Chevrolet Onix CHOCADO para repuestos" }))).not.toEqual([]);
  });
});
