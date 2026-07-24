import { describe, expect, it } from "vitest";
import type { CambioApi, RateRow, HouseInfo, NewsItem, InsightResult } from "cambio-uruguay-mcp/api";
import { buildAlertData, buildDailyData } from "../src/report/data.js";

function rows(): RateRow[] {
  return [
    { code: "USD", date: "2026-06-17", type: "", origin: "brou", buy: 39, sell: 41, name: "Dólar" },
    { code: "USD", date: "2026-06-17", type: "", origin: "itau", buy: 40, sell: 40.5, name: "Dólar" },
    { code: "USD", date: "2026-06-17", type: "", origin: "prex", buy: 39.5, sell: 40.9, name: "Dólar" },
  ];
}

const local: Record<string, HouseInfo> = {
  brou: { name: "BROU" },
  itau: { name: "Itau" },
  prex: { name: "Prex" },
};

// itau is best sell (lowest sell 40.5). Its evolution: yesterday 40.0 → today 40.5 → +1.25%.
const evolution = {
  evolution: [
    { date: "2026-06-15T03:00:00Z", buy: 39.5, sell: 40.2 },
    { date: "2026-06-16T03:00:00Z", buy: 39.6, sell: 40.0 },
    { date: "2026-06-17T03:00:00Z", buy: 40.0, sell: 40.5 },
  ],
};

function fakeApi(overrides: Partial<CambioApi> = {}): CambioApi {
  return {
    getRates: async () => rows(),
    getLocalData: async () => local,
    getEvolution: async () => evolution,
    getNews: async (): Promise<NewsItem[]> => [
      { title: "Dólar hoy", link: "https://x", source: "El País", pubDate: "", snippet: "" },
    ],
    getInsight: async (): Promise<InsightResult> => ({ insight: "", type: "market_summary", cached: false, truncated: false }),
    ...overrides,
  };
}

const cfg = { reportCurrencies: ["USD"], alert: { thresholdPct: 1, cooldownMin: 120, currencies: ["USD"] } };

describe("buildDailyData", () => {
  it("produces one delta per currency with best houses, change, and news", async () => {
    const data = await buildDailyData(fakeApi(), cfg as never);
    expect(data.currencies).toHaveLength(1);
    const usd = data.currencies[0]!;
    expect(usd.code).toBe("USD");
    expect(usd.bestSell.name).toBe("Itau");
    expect(usd.bestBuy.name).toBe("Itau"); // highest buy = 40 (itau)
    expect(usd.changePct).toBeCloseTo(1.25, 2);
    expect(data.news).toHaveLength(1);
  });

  it("uses the exact 24-hour market comparison when the endpoint is available", async () => {
    const data = await buildDailyData(
      fakeApi({
        getMarketChange: async () => ({
          asOf: "2026-06-17T12:00:00.000Z",
          baselineAt: "2026-06-16T12:00:00.000Z",
          hours: 24,
          currencies: [
            {
              code: "USD",
              matchedQuotes: 3,
              currentAvgBuy: 39.5,
              currentAvgSell: 40.8,
              baselineAvgBuy: 39.25,
              baselineAvgSell: 40,
              buyChangePct: 0.636943,
              sellChangePct: 2,
            },
          ],
        }),
        getEvolution: async () => {
          throw new Error("the exact comparison should avoid evolution");
        },
      }),
      cfg as never
    );

    expect(data.currencies[0]!.changePct).toBe(2);
  });
});

describe("buildAlertData", () => {
  it("returns an up move when today's best sell beats yesterday by the threshold", async () => {
    const alert = await buildAlertData(fakeApi(), "USD");
    expect(alert).not.toBeNull();
    expect(alert!.direction).toBe("up");
    expect(alert!.changePct).toBeCloseTo(1.25, 2);
  });

  it("returns null when there is no prior-day baseline", async () => {
    const flat = { evolution: [{ date: "2026-06-17T03:00:00Z", buy: 40, sell: 40.5 }] };
    const alert = await buildAlertData(fakeApi({ getEvolution: async () => flat }), "USD");
    expect(alert).toBeNull();
  });

  it("builds alerts from the exact 24-hour market baseline", async () => {
    const alert = await buildAlertData(
      fakeApi({
        getMarketChange: async () => ({
          asOf: "2026-06-17T12:00:00.000Z",
          baselineAt: "2026-06-16T12:00:00.000Z",
          hours: 24,
          currencies: [
            {
              code: "USD",
              matchedQuotes: 3,
              currentAvgBuy: 39.5,
              currentAvgSell: 40.8,
              baselineAvgBuy: 39.25,
              baselineAvgSell: 40,
              buyChangePct: 0.636943,
              sellChangePct: 2,
            },
          ],
        }),
      }),
      "USD"
    );

    expect(alert).toMatchObject({
      current: 40.8,
      baseline: 40,
      changePct: 2,
      direction: "up",
    });
  });
});
