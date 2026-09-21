import { describe, expect, it } from "vitest";
import { compactCar } from "../src/cars/compact";
import { carDeclaredRisks, carMarketReport, carModelPrices, findCarOpportunities, getCar } from "../src/cars/market";
import { carSearchParams, resolveCarModel, searchUsedCars } from "../src/cars/search";
import { fakeSite } from "./fakeSite";

function car(over: Record<string, unknown> = {}) {
  return {
    key: "ml-MLU1",
    source: "mercadolibre",
    sourceName: "Mercado Libre",
    brand: "Peugeot",
    model: "208",
    marketSlug: "peugeot-208",
    title: "Peugeot 208 1.5 Allure",
    year: 2017,
    km: 112000,
    price: 7900,
    currency: "USD",
    priceUsd: 7900,
    transmission: "manual",
    fuel: "nafta",
    fuelEconomy: { litersPer100Km: 7.2 },
    department: "Salto",
    sellerType: "private",
    permalink: "https://auto.mercadolibre.com.uy/MLU-1",
    risks: [],
    opportunity: { tier: "strict", gap: 0.27, median: 10825, n: 10 },
    ...over,
  };
}

describe("compactCar", () => {
  it("keeps the useful fields and links the site ficha", () => {
    const c = compactCar(car() as never);
    expect(c).toMatchObject({ priceUsd: 7900, seller: "particular", litersPer100Km: 7.2, siteUrl: "https://cambio-uruguay.com/autos-usados-uruguay/ml-MLU1" });
    expect(c.opportunity).toEqual({ gapPct: 27, cohortMedianUsd: 10825, comparables: 10, tier: "strict" });
  });
});

describe("resolveCarModel", () => {
  const site = fakeSite({ "/api/cars": { facets: { models: [{ slug: "chevrolet-onix-plus", name: "Onix Plus", count: 10 }, { slug: "chevrolet-onix", name: "Onix", count: 40 }] } } }).site;

  it("resolves names through the brand facet", async () => {
    expect(await resolveCarModel(site, "Chevrolet", "onix")).toEqual({ brand: "chevrolet", model: "chevrolet-onix" });
    expect(await resolveCarModel(site, "Chevrolet", "Onix Plus")).toEqual({ brand: "chevrolet", model: "chevrolet-onix-plus" });
  });

  it("keeps an already prefixed slug and falls back to brand-model", async () => {
    expect(await resolveCarModel(site, "Chevrolet", "chevrolet-prisma")).toEqual({ brand: "chevrolet", model: "chevrolet-prisma" });
    expect(await resolveCarModel(site, "Chevrolet", "Cruze")).toEqual({ brand: "chevrolet", model: "chevrolet-cruze" });
  });
});

describe("searchUsedCars", () => {
  it("maps filters and renders a line per car", async () => {
    expect(carSearchParams({ maxLitersPer100Km: 7, priceMaxUsd: 12000, onlyOpportunities: true, noDeclaredRisk: true, sort: "recent" }, {})).toMatchObject({
      l100Max: 7,
      priceMax: 12000,
      opportunity: true,
      noRisk: true,
      sort: undefined,
    });
    const { site, calls } = fakeSite({ "/api/cars": { total: 1, items: [car()], facets: { brands: [{ slug: "peugeot", name: "Peugeot", count: 5 }] } } });
    const out = await searchUsedCars(site, { priceMaxUsd: 10000, transmission: "manual" });
    expect(calls[0]!.query).toMatchObject({ priceMax: 10000, transmission: "manual" });
    expect(out.text).toContain("US$ 7.900");
    expect(out.text).toContain("27 % bajo su cohorte");
    expect(out.data.siteUrl).toBe("https://cambio-uruguay.com/autos-usados-uruguay?priceMax=10000&transmission=manual");
  });
});

describe("findCarOpportunities", () => {
  it("explains the cohort behind each gap", async () => {
    const { site } = fakeSite({
      "/api/car-opportunities": { total: 1, items: [{ subject: car(), tier: "strict", gap: 0.27, conservativeGap: 0.237, sample: { n: 10, sellers: 10, p25: 10350, median: 10825, p75: 11373 } }] },
    });
    const out = await findCarOpportunities(site, { brand: "Peugeot" });
    expect(out.text).toContain("27 % bajo la mediana US$ 10.825 de 10 autos de 10 vendedores");
    expect(out.text).toContain("conservador 24 %");
  });
});

describe("getCar", () => {
  it("compares against the cohort and quotes declared risks", async () => {
    const { site } = fakeSite({
      "/api/cars/ficha/ml-MLU1": {
        car: car({ risks: [{ category: "deuda", severity: "alta", quote: "tiene deuda de patente" }] }),
        cohort: { year: 2017, trim: "Allure", n: 11, p25: 9900, median: 10700, p75: 11245, kmMedian: 110470 },
        market: { slug: "peugeot-208" },
        similar: [],
      },
    });
    const out = await getCar(site, { key: "https://cambio-uruguay.com/autos-usados-uruguay/ml-MLU1" });
    expect(out.text).toContain("26 % por debajo");
    expect(out.text).toContain('El vendedor declara deuda: "tiene deuda de patente"');
    expect(out.text).toContain("/autos-usados-uruguay/precios/peugeot-208");
  });
});

describe("carModelPrices", () => {
  it("filters the model market by year", async () => {
    const { site, calls } = fakeSite({
      "/api/cars/market/peugeot-208": {
        market: { brand: "Peugeot", model: "208", listings: 478, years: [{ year: 2017, n: 11, p25: 9900, median: 10700, p75: 11245 }, { year: 2018, n: 5, median: 11500 }], rows: [], guide: [] },
        listings: [car(), car({ key: "b", priceUsd: 6000, year: 2017 }), car({ key: "c", year: 2018 })],
      },
    });
    const out = await carModelPrices(site, { brand: "Peugeot", model: "peugeot-208", year: 2017 });
    expect(calls[0]!.path).toBe("/api/cars/market/peugeot-208");
    expect(out.text).toContain("2017 US$ 10.700");
    expect(out.text).not.toContain("2018 US$");
    expect((out.data.cheapest as Array<{ key: string }>)[0]!.key).toBe("b");
  });
});

describe("carDeclaredRisks", () => {
  it("lists categories and quotes", async () => {
    const { site } = fakeSite({
      "/api/car-risks": {
        stats: { declared: 513 },
        categories: [{ category: "deuda", adverts: 189, measured: 17, medianGap: 0.2 }],
        items: [{ subject: car(), risks: [{ category: "deuda", quote: "debe patente" }], severity: "alta", gap: 0.358, median: 10900 }],
      },
    });
    const out = await carDeclaredRisks(site, { category: "deuda" });
    expect(out.text).toContain("deuda 189");
    expect(out.text).toContain('deuda: "debe patente"');
    expect(out.text).toContain("pide 36 % menos");
  });
});

describe("carMarketReport", () => {
  const report = {
    data: {
      budgets: [
        { maxUsd: 6000, adverts: 630, models: [{ brand: "Chevrolet", model: "Corsa", medianUsd: 5800, medianYear: 2007, medianKm: 200000 }] },
        { maxUsd: 10000, adverts: 2747, models: [{ brand: "Renault", model: "Kwid", medianUsd: 9390, medianYear: 2020, medianKm: 86000 }] },
      ],
      depreciation: [{ brand: "Chevrolet", model: "Prisma", annualDrop: 0.026, points: [{ year: 2019, adverts: 21, medianUsd: 11800 }] }],
    },
  };

  it("picks the smallest budget band that covers the budget", async () => {
    const { site } = fakeSite({ "/api/car-report": report });
    const out = await carMarketReport(site, { budgetUsd: 8000 });
    expect(out.text).toContain("Hasta US$ 10.000");
    expect(out.text).toContain("Renault Kwid");
    expect(out.text).not.toContain("Corsa");
  });

  it("finds a model depreciation row", async () => {
    const { site } = fakeSite({ "/api/car-report": report });
    const out = await carMarketReport(site, { section: "depreciation", model: "prisma" });
    expect(out.text).toContain("Chevrolet Prisma: pierde ~3 % por año");
  });
});
