import { describe, expect, it } from "vitest";
import type { BestHouseResult, ConvertResult, RatesResult } from "cambio-uruguay-mcp/tools";
import type { NewsItem } from "cambio-uruguay-mcp/news";
import {
  formatAlert,
  formatBest,
  formatConvert,
  formatDailyTwitter,
  formatNews,
  formatRates,
} from "../src/format/messages.js";
import type { AlertData, DailyReportData } from "../src/report/types.js";

const rates: RatesResult = {
  currency: "USD",
  date: "2026-06-17",
  houseCount: 3,
  marketAvgBuy: 39,
  marketAvgSell: 41,
  bestBuy: { origin: "brou", name: "BROU", rate: 40 },
  bestSell: { origin: "itau", name: "Itau", rate: 40.5 },
  lowestSpread: { origin: "prex", name: "Prex", spread: 0.4 },
  houses: [],
};

const daily: DailyReportData = {
  date: "2026-06-17",
  currencies: [
    {
      code: "USD",
      marketAvgBuy: 39,
      marketAvgSell: 41,
      changePct: 1.23,
      bestBuy: { name: "BROU", rate: 40 },
      bestSell: { name: "Itau", rate: 40.5 },
      lowestSpread: { name: "Prex", spread: 0.4 },
    },
    {
      code: "EUR",
      marketAvgBuy: 44,
      marketAvgSell: 49,
      changePct: -0.5,
      bestBuy: { name: "Gales", rate: 45 },
      bestSell: { name: "Suizo", rate: 48 },
      lowestSpread: { name: "Cambial", spread: 0.9 },
    },
  ],
  news: [{ title: "Dólar sube", link: "https://x", source: "El País", pubDate: "", snippet: "" }],
};

describe("formatRates", () => {
  it("includes currency, best-buy house and market average", () => {
    const out = formatRates(rates, "es");
    expect(out).toContain("USD");
    expect(out).toContain("BROU");
    expect(out).toContain("Itau");
  });
});

describe("formatBest", () => {
  it("names the house and side", () => {
    const r: BestHouseResult = { currency: "USD", side: "buy", origin: "x", name: "Cambial", rate: 40.1, spread: 0.5 };
    expect(formatBest(r, "es")).toContain("Cambial");
  });
});

describe("formatConvert", () => {
  it("shows the converted result", () => {
    const r: ConvertResult = { amount: 100, from: "USD", to: "UYU", result: 4055, rate: 40.55, path: "USD->UYU" };
    const out = formatConvert(r, "es");
    expect(out).toContain("100");
    expect(out).toMatch(/4\.055|4055/);
  });
});

describe("formatNews", () => {
  it("lists headlines", () => {
    const items: NewsItem[] = [{ title: "Titular uno", link: "https://a", source: "S", pubDate: "", snippet: "" }];
    expect(formatNews(items, "es")).toContain("Titular uno");
  });
});

describe("formatDailyTwitter", () => {
  it("fits in 280 characters and shows a percentage", () => {
    const out = formatDailyTwitter(daily, "es");
    expect(out.length).toBeLessThanOrEqual(280);
    expect(out).toMatch(/%/);
    expect(out).toContain("USD");
  });
});

describe("formatAlert", () => {
  it("shows direction arrow and percentage", () => {
    const alert: AlertData = { code: "USD", current: 41, baseline: 40, changePct: 2.5, direction: "up" };
    const out = formatAlert(alert, "es", "telegram");
    expect(out).toContain("USD");
    expect(out).toMatch(/2,50%/);
    expect(out).toMatch(/[▲↑🔺]/u);
  });
});
