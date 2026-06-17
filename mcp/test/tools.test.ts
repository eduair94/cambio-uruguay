import { describe, expect, it, vi } from "vitest";
import type { CambioApi, HouseInfo, RateRow } from "../src/api";
import { bestHouse, convert, dailySummary, getEvolution, getNews, getRates, listHouses } from "../src/tools";

function row(code: string, origin: string, buy: number, sell: number, type = "", date = "2026-06-17"): RateRow {
  return { code, origin, buy, sell, type, date, name: "" };
}

const ROWS: RateRow[] = [
  row("USD", "casa_a", 39.0, 41.0),
  row("USD", "casa_b", 39.5, 40.8),
  row("USD", "casa_c", 38.5, 41.5, "", "2026-06-16"),
  row("USD", "bcu", 39.9, 39.9, "BILLETE"), // excluded: bcu
  row("USD", "casa_a", 39.7, 39.7, "INTERBANCARIO"), // excluded: interbank type
  row("EUR", "casa_a", 44.0, 47.0),
  row("EUR", "casa_b", 44.5, 46.5),
];

const LOCAL: Record<string, HouseInfo> = {
  casa_a: { name: "Casa A", departments: ["MONTEVIDEO"] },
  casa_b: { name: "Casa B" },
  casa_c: { name: "Casa C" },
  bcu: { name: "BCU" },
};

const NEWS = [
  { title: "Dólar baja", link: "https://x/1", source: "El País", pubDate: "2026-06-17", snippet: "..." },
  { title: "Economía UY", link: "https://x/2", source: "Búsqueda", pubDate: "2026-06-16", snippet: "..." },
];

function fakeApi(overrides: Partial<CambioApi> = {}): CambioApi {
  return {
    getRates: async () => ROWS,
    getLocalData: async () => LOCAL,
    getEvolution: async () => ({ marker: "evolution" }),
    getNews: async () => NEWS,
    getInsight: async ({ type }) => ({ insight: `summary for ${type}`, type, cached: false, truncated: false }),
    ...overrides,
  };
}

describe("getRates", () => {
  it("aggregates retail quotes, excluding BCU and interbank rows", async () => {
    const r = await getRates(fakeApi(), { currency: "usd" });
    expect(r.currency).toBe("USD");
    expect(r.houseCount).toBe(3);
    expect(r.date).toBe("2026-06-17");
    expect(r.marketAvgBuy).toBeCloseTo(39.0, 6);
    expect(r.marketAvgSell).toBeCloseTo(41.1, 6);
    expect(r.bestBuy).toMatchObject({ origin: "casa_b", name: "Casa B", rate: 39.5 });
    expect(r.bestSell).toMatchObject({ origin: "casa_b", name: "Casa B", rate: 40.8 });
    expect(r.lowestSpread.origin).toBe("casa_b");
    expect(r.lowestSpread.spread).toBeCloseTo(1.3, 6);
    expect(r.houses[0].origin).toBe("casa_b"); // sorted by sell asc
  });

  it("throws for a currency with no retail quotes", async () => {
    await expect(getRates(fakeApi(), { currency: "XYZ" })).rejects.toThrow(/no.*rates/i);
  });
});

describe("bestHouse", () => {
  it("buy side picks the lowest sell price", async () => {
    const r = await bestHouse(fakeApi(), { currency: "USD", side: "buy" });
    expect(r).toMatchObject({ origin: "casa_b", name: "Casa B", rate: 40.8 });
  });

  it("sell side picks the highest buy price", async () => {
    const r = await bestHouse(fakeApi(), { currency: "USD", side: "sell" });
    expect(r).toMatchObject({ origin: "casa_b", name: "Casa B", rate: 39.5 });
  });
});

describe("convert", () => {
  it("foreign to UYU uses the best buy rate", async () => {
    const r = await convert(fakeApi(), { amount: 100, from: "USD", to: "UYU" });
    expect(r.result).toBeCloseTo(3950, 6);
    expect(r.rate).toBeCloseTo(39.5, 6);
  });

  it("UYU to foreign uses the best sell rate", async () => {
    const r = await convert(fakeApi(), { amount: 3950, from: "UYU", to: "USD" });
    expect(r.result).toBeCloseTo(3950 / 40.8, 6);
  });

  it("foreign to foreign routes through UYU", async () => {
    const r = await convert(fakeApi(), { amount: 100, from: "USD", to: "EUR" });
    expect(r.result).toBeCloseTo((100 * 39.5) / 46.5, 6);
  });

  it("same currency is identity", async () => {
    const r = await convert(fakeApi(), { amount: 50, from: "UYU", to: "UYU" });
    expect(r.result).toBe(50);
  });

  it("throws for an unknown currency", async () => {
    await expect(convert(fakeApi(), { amount: 1, from: "USD", to: "ZZZ" })).rejects.toThrow();
  });
});

describe("listHouses", () => {
  it("returns houses with display names sorted by name", async () => {
    const r = await listHouses(fakeApi());
    expect(r.length).toBe(4);
    expect(r[0]).toMatchObject({ origin: "bcu", name: "BCU" });
    expect(r.find((h) => h.origin === "casa_a")?.departments).toEqual(["MONTEVIDEO"]);
  });
});

describe("getEvolution", () => {
  it("passes through the API series", async () => {
    const r = await getEvolution(fakeApi(), { origin: "brou", currency: "USD", period: 1 });
    expect(r).toEqual({ marker: "evolution" });
  });
});

describe("getNews", () => {
  it("forwards the limit and returns the headlines", async () => {
    const spy = vi.fn(async () => NEWS);
    const r = await getNews(fakeApi({ getNews: spy }), { limit: 5 });
    expect(spy).toHaveBeenCalledWith(5);
    expect(r).toEqual(NEWS);
  });
});

describe("dailySummary", () => {
  it("uses market_summary when no currency is given", async () => {
    const spy = vi.fn(async ({ type }: { type: string }) => ({ insight: "ok", type, cached: false, truncated: false }));
    const r = await dailySummary(fakeApi({ getInsight: spy }), { lang: "en" });
    expect(spy).toHaveBeenCalledWith({ type: "market_summary", lang: "en", currency: undefined });
    expect(r.summary).toBe("ok");
  });

  it("uses currency_analysis when a currency is given", async () => {
    const spy = vi.fn(async ({ type }: { type: string }) => ({ insight: "ok", type, cached: false, truncated: false }));
    await dailySummary(fakeApi({ getInsight: spy }), { lang: "es", currency: "usd" });
    expect(spy).toHaveBeenCalledWith({ type: "currency_analysis", lang: "es", currency: "USD" });
  });

  it("strips <think> reasoning and provider junk from the insight", async () => {
    const dirty = "<think>chain of thought\nmore</think>\n\nWormGPT: El dólar se mantiene estable hoy.";
    const r = await dailySummary(fakeApi({ getInsight: async ({ type }) => ({ insight: dirty, type, cached: false, truncated: false }) }), {
      lang: "es",
    });
    expect(r.summary).toBe("El dólar se mantiene estable hoy.");
  });
});
