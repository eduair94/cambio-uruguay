import { describe, expect, it } from "vitest";
import { carCohorts, housingCohorts } from "../../classes/marketseries/cohorts";
import { buildMarketIndex } from "../../classes/marketseries/indexDoc";
import type { MarketPairStats, MarketSeriesEntry, MarketSeriesPoint } from "../../classes/marketseries/types";
import { car, observation } from "./fixtures";

const pairs = (chg: number, n = 25): MarketPairStats => ({ n, chg, down: chg < 0 ? n : 0, up: chg > 0 ? n : 0, same: 0, outliers: 0 });
const point = (n: number, w30: MarketPairStats | null = null, w7: MarketPairStats | null = null): MarketSeriesPoint =>
  ({ d: "2026-09-18", n, p25: 1, med: 2, p75: 3, m2: null, w7, w30, w90: null });
const base = {
  vertical: "alquiler" as const,
  today: "2026-09-18",
  generatedAt: "2026-09-18T13:03:00.000Z",
  dataAsOf: "2026-09-18T05:00:00.000Z",
  previous: null,
  observations: 100,
  excluded: {},
};

/** The todas|any cohorts (country, department, neighborhood) of one flat, as the build would label them. */
function housing(neighborhood: string, n: number, w30: MarketPairStats | null = null, w7: MarketPairStats | null = null): MarketSeriesEntry[] {
  return housingCohorts(observation({ neighborhood }))
    .filter(cohort => cohort.dims.propertyType === "todas" && cohort.dims.bedrooms === "any")
    .map(cohort => ({
      cohort,
      labels: { department: "Montevideo", neighborhood, brand: null, model: null },
      label: cohort.dims.scope === "neighborhood" ? `${neighborhood}, Montevideo` : cohort.dims.scope === "department" ? "Montevideo" : "Uruguay",
      point: point(n, w30, w7),
      hist: null,
    }));
}

describe("buildMarketIndex", () => {
  it("lists the scopes the selectors can offer, country first, with n per currency", () => {
    const index = buildMarketIndex({ ...base, entries: housing("Pocitos", 40) });
    expect(index.scopes.map(scope => scope.token)).toEqual(["uy", "d:montevideo", "b:montevideo:pocitos"]);
    expect(index.scopes[0]).toMatchObject({ label: "Uruguay", department: null, neighborhood: null, n: { UYU: 40 } });
    expect(index.scopes[2]).toMatchObject({ department: "Montevideo", neighborhood: "Pocitos" });
    expect(index.key).toBe("index:alquiler");
    expect(index.trackingSince).toBe("2026-09-18");
    expect(index.cohorts).toBe(3);
  });

  it("orders a department before its neighborhoods, and neighborhoods A-Z", () => {
    const entries = [...housing("Pocitos", 40), ...housing("Centro", 40).filter(entry => entry.cohort.dims.scope === "neighborhood")];
    expect(buildMarketIndex({ ...base, entries }).scopes.map(scope => scope.token)).toEqual([
      "uy", "d:montevideo", "b:montevideo:centro", "b:montevideo:pocitos",
    ]);
  });

  it("keeps the first tracking day across runs", () => {
    const previous = buildMarketIndex({ ...base, today: "2026-09-01", entries: [] });
    expect(buildMarketIndex({ ...base, previous, entries: [] }).trackingSince).toBe("2026-09-01");
  });

  it("movers use 30 days when there are enough pairs, never the country row", () => {
    const entries = [
      ...housing("Pocitos", 40, pairs(-0.05)),
      ...housing("Centro", 40, pairs(0.03)).filter(entry => entry.cohort.dims.scope === "neighborhood"),
    ];
    const index = buildMarketIndex({ ...base, entries });
    expect(index.movers.window).toBe(30);
    expect(index.movers.down.map(mover => mover.label).sort()).toEqual(["Montevideo", "Pocitos, Montevideo"]);
    expect(index.movers.up.map(mover => mover.label)).toEqual(["Centro, Montevideo"]);
    expect(index.movers.up[0]).toMatchObject({ window: 30, chg: 0.03, pairs: 25, currency: "UYU" });
    expect([...index.movers.down, ...index.movers.up].some(mover => mover.key.endsWith("|uy"))).toBe(false);
  });

  it("falls back to 7 days, then to nothing, and ignores thin pairs", () => {
    expect(buildMarketIndex({ ...base, entries: housing("Pocitos", 40, null, pairs(-0.02)) }).movers.window).toBe(7);
    expect(buildMarketIndex({ ...base, entries: housing("Pocitos", 40, pairs(-0.02, 10)) }).movers).toEqual({ window: null, down: [], up: [] });
  });

  it("cars: one row per model for the model picker", () => {
    const entries = carCohorts(car()).map(cohort => ({
      cohort,
      labels: { department: null, neighborhood: null, brand: "Toyota", model: "Hilux" },
      label: "Toyota Hilux",
      point: point(30),
      hist: null,
    }));
    const index = buildMarketIndex({ ...base, vertical: "autos", entries });
    expect(index.models).toEqual([{ slug: "toyota-hilux", brand: "Toyota", model: "Hilux", n: 30, med: 2, w30: null }]);
    expect(index.scopes).toEqual([]);
  });
});
