import { describe, expect, it } from "vitest";
import type { BestHouseResult, ConvertResult, RatesResult } from "cambio-uruguay-mcp/tools";
import type { NewsItem } from "cambio-uruguay-mcp/news";
import {
  formatAlert,
  formatBest,
  formatConvert,
  formatDailyTelegram,
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

describe("formatDailyTelegram", () => {
  // The live /ai/insights summary is a long multi-section markdown report.
  const longAi =
    "#### 1. Resumen del mercado\n" +
    "**Comprar USD**: BROU. ".repeat(200) +
    "\n| Moneda | Spread |\n| --- | --- |\n| USD | 2.04 |\n" +
    "⚠️ *Esta respuesta fue truncada por límites del modelo.*";

  it("caps the body at the 1024 Telegram photo-caption limit by default", () => {
    const out = formatDailyTelegram(daily, longAi, "es");
    expect(out.length).toBeLessThanOrEqual(1024);
  });

  it("strips markdown that breaks Telegram legacy parse_mode from the AI block", () => {
    const out = formatDailyTelegram(daily, "#### Head\n**bold** text\n⚠️ truncada", "es");
    expect(out).not.toContain("####");
    expect(out).not.toContain("**");
    expect(out).not.toContain("⚠️");
    // The report's own template markdown stays.
    expect(out).toContain("📊");
    expect(out).toContain("https://cambio-uruguay.com");
  });

  it("respects a custom max length, fitting more of the summary", () => {
    const wide = formatDailyTelegram(daily, longAi, "es", 4096);
    expect(wide.length).toBeLessThanOrEqual(4096);
    expect(wide.length).toBeGreaterThan(1024);
  });

  it("keeps the AI summary even when news links are long (summary > news)", () => {
    const longLink = "https://news.google.com/rss/articles/" + "A".repeat(600);
    const heavyNews: DailyReportData = {
      ...daily,
      news: [
        { title: "Dólar hoy", link: longLink, source: "Infobae", pubDate: "", snippet: "" },
        { title: "Euro hoy", link: longLink, source: "El Observador", pubDate: "", snippet: "" },
        { title: "Real hoy", link: longLink, source: "El País", pubDate: "", snippet: "" },
      ],
    };
    const out = formatDailyTelegram(heavyNews, "Resumen breve del mercado de hoy.", "es");
    expect(out.length).toBeLessThanOrEqual(1024);
    expect(out).toContain("Resumen breve del mercado de hoy.");
    // Long RSS tracking URLs must not eat the caption budget.
    expect(out).not.toContain("news.google.com");
  });

  it("still ships head + news + footer when the AI summary is empty", () => {
    const out = formatDailyTelegram(daily, "", "es");
    expect(out).toContain("USD");
    expect(out).toContain("Dólar sube");
    expect(out).toContain("https://cambio-uruguay.com");
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
