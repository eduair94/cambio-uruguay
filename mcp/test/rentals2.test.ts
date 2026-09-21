import { describe, expect, it } from "vitest";
import { householdBody, rankRentalsForHousehold } from "../src/rentals/household";
import { compareNeighborhoods, estimateFairRent, rentalMarketStats } from "../src/rentals/market";
import { findPropertyOpportunities } from "../src/rentals/opportunities";
import { fakeSite } from "./fakeSite";
import { rental } from "./fixtures";

describe("householdBody", () => {
  it("fills defaults and ids the site validates", () => {
    const body = householdBody({
      people: [{ label: "Ana", incomeUyu: 90000, destinations: [{ label: "Trabajo", lat: -34.9, lng: -56.19, mode: "bicycling" }] }],
      housingBudgetUyu: 35000,
      preferredNeighborhoods: ["Pocitos", "Centro, Montevideo"],
      onlyPreferred: true,
    });
    expect(body.people[0]).toMatchObject({ id: "p1", incomeUyu: 90000, remoteDays: 0 });
    expect(body.people[0]!.destinations[0]).toMatchObject({ id: "d1-1", kind: "work", days: 5, mode: "bicycling", targetKm: 6 });
    expect(body).toMatchObject({ department: "Montevideo", types: ["apartamento", "casa"], hideReported: true, priority: "balanced" });
    expect(body.zones).toEqual({
      mode: "only",
      include: [
        { department: "Montevideo", neighborhood: "Pocitos" },
        { department: "Montevideo", neighborhood: "Centro" },
      ],
      exclude: [],
    });
  });

  it("rejects a household without budget or with an unplaced destination", () => {
    expect(() => householdBody({ people: [{ label: "A" }], housingBudgetUyu: 0 })).toThrow(/presupuesto/);
    expect(() => householdBody({ people: [{ label: "A", destinations: [{ label: "Facu" }] }], housingBudgetUyu: 1 })).toThrow(/Facu/);
  });
});

describe("rankRentalsForHousehold", () => {
  it("geocodes address destinations, posts the household and names the trips", async () => {
    const { site, calls } = fakeSite({
      "https://google-maps-proxy.checkleaked.cc/geocode": { status: "OK", results: [{ formatted_address: "Av. Julio Herrera y Reissig 565, Montevideo", geometry: { location: { lat: -34.918, lng: -56.166 }, location_type: "ROOFTOP" } }] },
      "/api/rentals/fit": {
        generatedAt: "2026-09-21T10:00:00Z",
        scanned: 28000,
        matched: 900,
        complete: 300,
        results: [
          {
            property: rental(),
            offer: rental().matchingOffer,
            score: 81.4,
            rentUyu: 30000,
            expensesUyu: 5000,
            monthlyUyu: 35000,
            remainingUyu: 40000,
            incomeShare: 0.39,
            overBudget: false,
            trips: [{ personId: "p1", destinationId: "d1-1", distanceKm: 1.26, withinTarget: true }],
            reasons: ["within_budget", "near_destinations"],
            warnings: ["unknown_zone"],
          },
        ],
      },
    });
    const out = await rankRentalsForHousehold(site, {
      people: [{ label: "Ana", incomeUyu: 90000, destinations: [{ label: "Facultad de Ingeniería", address: "Julio Herrera y Reissig 565", kind: "study" }] }],
      housingBudgetUyu: 36000,
    });
    expect(calls[0]!.path).toBe("https://google-maps-proxy.checkleaked.cc/geocode");
    const body = calls[1]!.body as { people: Array<{ destinations: Array<{ lat: number }> }> };
    expect(body.people[0]!.destinations[0]!.lat).toBe(-34.918);
    expect(out.text).toContain("[81/100]");
    expect(out.text).toContain("Ana → Facultad de Ingeniería: 1,3 km");
    expect(out.text).toContain("dentro del presupuesto");
    expect(out.text).toContain("barrio sin identificar");
    expect(out.text).toContain("39 % del ingreso");
  });
});

describe("rentalMarketStats", () => {
  it("summarises and ranks neighbourhoods with enough adverts", async () => {
    const { site } = fakeSite({
      "/api/rentals/analysis": {
        generatedAt: "2026-09-19T04:00:00Z",
        summary: { count: 500, rent: { count: 500, median: 30000, p25: 25000, p75: 36000 }, expensesCoveragePct: 40 },
        neighborhoods: [
          { name: "CORDON", rent: { count: 300, median: 27000 } },
          { name: "POCITOS", rent: { count: 400, median: 36000 } },
          { name: "TINY", rent: { count: 3, median: 1000 } },
        ],
      },
    });
    const out = await rentalMarketStats(site, { department: "Montevideo" });
    expect(out.text).toContain("$ 30.000 (típico $ 25.000–$ 36.000, n=500)");
    expect(out.text).toContain("Barrios más accesibles (mediana): CORDON $ 27.000 · POCITOS $ 36.000");
    expect(out.text).not.toContain("TINY");
  });
});

describe("estimateFairRent", () => {
  it("positions the asking price", async () => {
    const { site, calls } = fakeSite({
      "/api/rentals/estimate": { status: "supported", sampleCount: 30, advertiserCount: 26, range: { median: 37250, p25: 33500, p75: 43250 }, comparisonToAskingPct: 2, askingPosition: { percentile: 53.3 }, comparables: [] },
    });
    const out = await estimateFairRent(site, { department: "Montevideo", neighborhood: "Pocitos", type: "apartamento", bedrooms: 2, bathrooms: 1, areaM2: 60, askingPrice: 38000 });
    expect(calls[0]!.body).toMatchObject({ area: 60, areaBasis: "built", currency: "UYU", askingPrice: 38000 });
    expect(out.text).toContain("$ 37.250");
    expect(out.text).toContain("2 % por encima");
  });
});

describe("compareNeighborhoods", () => {
  const zones = {
    generatedAt: "2026-09-21T06:00:00Z",
    zones: [
      { id: "a", ref: { department: "Montevideo", neighborhood: "Pocitos" }, prices: { rent: { count: 900, median: 30000, p25: 24500, p75: 40000 } }, crime: { status: "ready", total: 2146, periodFrom: "2025-07-01", periodTo: "2026-06-30" }, utilities: { official: { id: "mvd:8" }, levels: { agua: "high" } } },
      { id: "b", ref: { department: "Montevideo", neighborhood: "Cordón" }, prices: { rent: { count: 700, median: 24000 } }, utilities: { official: { id: "mvd:4" } } },
      { id: "c", ref: { department: "Canelones", neighborhood: "Pando" }, prices: { rent: { count: 20, median: 18000 } } },
    ],
  };
  const scores = { zones: { "mvd:8": { rows: [{ attribute: "denuncias", value: 45, betterThan: 0.9, zones: 62 }] }, "mvd:4": { rows: [{ attribute: "denuncias", value: 80, betterThan: 0.4, zones: 62 }] } } };

  it("compares the named neighbourhoods, accent-insensitively", async () => {
    const { site } = fakeSite({ "/api/rentals/zones": zones, "/api/rentals/zone-scores": scores });
    const out = await compareNeighborhoods(site, { neighborhoods: ["pocitos", "Cordon", "Atlántida"] });
    expect(out.text).toContain("• Pocitos, Montevideo");
    expect(out.text).toContain("2.146 delitos");
    expect(out.text).toContain("mejor que el 90 % en delitos denunciados");
    expect(out.data.missing).toEqual(["Atlántida"]);
  });

  it("ranks by safety using the zone scores", async () => {
    const { site } = fakeSite({ "/api/rentals/zones": zones, "/api/rentals/zone-scores": scores });
    const out = await compareNeighborhoods(site, { department: "Montevideo", rankBy: "safety" });
    expect((out.data.neighborhoods as Array<{ name: string }>).map((n) => n.name)).toEqual(["Pocitos", "Cordón"]);
  });
});

describe("findPropertyOpportunities", () => {
  it("maps filters and translates cautions", async () => {
    const { site, calls } = fakeSite({
      "/api/property-opportunities": {
        total: 1,
        page: 1,
        pages: 1,
        stats: { analyzed: 1000 },
        items: [
          {
            subject: { propertyKey: "k1", title: "Apto Centro", neighborhood: "Centro", department: "Montevideo", bedrooms: 1, area: { value: 45 }, price: { amount: 18000, currency: "UYU" }, comparisonPrice: 22400, url: "https://x/1" },
            analysis: { currency: "UYU", pricingBasis: "monthly_total", median: 29200, q25: 28113, q75: 31225, gapPct: 23.3, conservativeGapPct: 20.3, distinctN: 16, sellersN: 13, confidence: "supported", evidenceTier: "standard" },
            cautions: ["asking_prices_only", "single_source"],
          },
        ],
      },
    });
    const out = await findPropertyOpportunities(site, { department: "Montevideo", bedrooms: 1 });
    expect(calls[0]!.query).toMatchObject({ operation: "rent", department: "Montevideo", bedrooms: 1, availability: "hide_any" });
    expect(out.text).toContain("23 % por debajo");
    expect(out.text).toContain("comparables de un solo portal");
    expect(out.text).toContain("https://cambio-uruguay.com/alquileres/k1");
  });
});
