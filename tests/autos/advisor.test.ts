import { describe, expect, it } from "vitest";
import { buildCarAdvisor, CAR_ADVISOR_POLICY } from "../../classes/autos/advisor";
import type { CarPartsRecord } from "../../classes/autos/repuestos";
import type { CarDetail, CarListing } from "../../classes/autos/types";

const NOW = "2026-09-24T12:00:00.000Z";
let serial = 0;

function car(overrides: Partial<CarListing> = {}): CarListing {
  serial++;
  const price = overrides.price ?? 12_000;
  return {
    id: `MLU${serial}`, source: "mercadolibre", brandId: "58955", brand: "Chevrolet", modelId: "123123", model: "Onix",
    title: "Chevrolet Onix 1.4 Lt", year: 2019, km: 90_000, price, currency: "USD", transmission: "manual",
    fuel: "nafta", neighborhood: null, department: "Montevideo", sellerType: "private", sellerId: `s${serial}`,
    picture: null, pictureCount: null, permalink: "https://auto.mercadolibre.com.uy/MLU-1-x-_JM",
    observedAt: NOW, key: `ml-MLU${serial}`, brandSlug: "chevrolet", modelSlug: "onix",
    marketSlug: "chevrolet-onix", engine: "1.4", trim: "lt", trimLabel: "Lt", kmQuality: "ok", flags: [],
    priceUsd: overrides.priceUsd ?? price, priceConverted: false, firstSeen: "2026-09-01T00:00:00.000Z",
    lastSeen: NOW, priceDrop: null, detail: null, sourceName: "Mercado Libre", reference: null,
    ...overrides,
  };
}

const detail = (specs: Record<string, string>): CarDetail => ({
  readAt: NOW, price: 12_000, currency: "USD", active: true, brand: null, model: null, year: null, km: null,
  version: null, engineText: null, sellerName: null, bodyType: null, color: null, doors: null, specs, flags: [], description: "",
});

const many = (count: number, overrides: Partial<CarListing> = {}) => Array.from({ length: count }, () => car(overrides));

describe("buildCarAdvisor", () => {
  it("deja afuera el modelo con pocos avisos, la variante chica y el año con dos avisos", () => {
    const listings = [
      ...many(10, { year: 2020, price: 14_000 }),
      ...many(4, { year: 2019, price: 12_000 }),
      ...many(2, { year: 2018, price: 10_000 }),
      ...many(3, { year: 2020, transmission: "automatica", price: 16_000 }),
      ...many(CAR_ADVISOR_POLICY.minimumAdverts - 1, { marketSlug: "fiat-uno", model: "Uno", modelSlug: "uno", brand: "Fiat", brandSlug: "fiat" }),
    ];
    const data = buildCarAdvisor(listings, { maxYear: 2027, parts: [], typicalDrop: 0.05 });
    expect(data.models.map(model => model.marketSlug)).toEqual(["chevrolet-onix"]);
    const onix = data.models[0]!;
    expect(onix.adverts).toBe(19);
    expect(onix.variants).toHaveLength(1);
    expect(onix.variants[0]).toMatchObject({ fuel: "nafta", transmission: "manual", adverts: 16 });
    expect(onix.variants[0]!.years.map(year => year.year)).toEqual([2020, 2019]);
    expect(onix.variants[0]!.years[0]).toMatchObject({ n: 10, median: 14_000, kmMedian: 90_000 });
    expect(data.typicalDrop).toBe(0.05);
  });

  it("no cuenta lo que no se puede comparar en dólares ni el GNC", () => {
    const listings = [...many(12), ...many(6, { priceConverted: true }), ...many(6, { fuel: "gnc" })];
    const onix = buildCarAdvisor(listings, { maxYear: 2027, parts: [], typicalDrop: null }).models[0]!;
    expect(onix.variants.map(variant => variant.fuel)).toEqual(["nafta"]);
    expect(onix.variants[0]!.adverts).toBe(12);
  });

  it("consumo mediano de la variante y cuánto es declarado", () => {
    const listings = [
      ...many(6, { fuelEconomy: { litersPer100Km: 6, city: null, highway: null, combined: 6, basis: "advert", sellers: null } }),
      ...many(6, { fuelEconomy: { litersPer100Km: 7, city: null, highway: null, combined: null, basis: "model", sellers: 4 } }),
    ];
    const variant = buildCarAdvisor(listings, { maxYear: 2027, parts: [], typicalDrop: null }).models[0]!.variants[0]!;
    expect(variant.litersPer100Km).toBe(6.5);
    expect(variant.consumptionDeclaredShare).toBe(0.5);
  });

  it("equipamiento: sí sobre sí+no, y lo no mencionado no cuenta", () => {
    const listings = [
      ...many(2, { detail: detail({ "Airbag para conductor y pasajero": "Sí", "Capacidad de personas": "5", "Baúl": "300 L" }) }),
      car({ detail: detail({ "Airbag para conductor y pasajero": "No", "Capacidad de personas": "5" }) }),
      ...many(9, { detail: detail({ "Capacidad de personas": "4", "Control de tracción": "4x4" }) }),
    ];
    const onix = buildCarAdvisor(listings, { maxYear: 2027, parts: [], typicalDrop: null }).models[0]!;
    expect(onix.airbags).toEqual({ share: 0.667, n: 3 });
    expect(onix.esc).toBeNull();
    expect(onix.specsN).toBe(12);
    expect(onix.seats).toBe(4);
    expect(onix.trunkL).toBe(300);
    expect(onix.fourByFour).toEqual({ share: 1, n: 9 });
  });

  it("carrocería dominante y su proporción", () => {
    const listings = [
      ...many(9, { body: { type: "hatchback", basis: "advert" } }),
      ...many(3, { body: { type: "sedan", basis: "advert" } }),
    ];
    const onix = buildCarAdvisor(listings, { maxYear: 2027, parts: [], typicalDrop: null }).models[0]!;
    expect(onix.body).toBe("hatchback");
    expect(onix.bodyShare).toBe(0.75);
  });

  it("pega el índice de repuestos del modelo", () => {
    const parts: CarPartsRecord[] = ["chevrolet-onix", "b", "c", "d", "e"].map(marketSlug => ({
      marketSlug, brand: "X", model: "Y", readAt: NOW,
      parts: (["pastillas", "filtro_aceite", "embrague"] as const).map(key => ({
        key, median: marketSlug === "chevrolet-onix" ? 1500 : 1000, p25: 900, p75: 1100, offers: 5, sellers: 3,
      })),
    }));
    const data = buildCarAdvisor(many(12), { maxYear: 2027, parts, typicalDrop: null });
    expect(data.models[0]!.parts?.index).toBe(1.5);
    expect(data.partsBaseline.map(part => part.key)).toEqual(["pastillas", "filtro_aceite", "embrague"]);
  });
});
