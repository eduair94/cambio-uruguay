import { describe, expect, it } from "vitest";
import type { BestHouseResult, ConvertResult, RatesResult } from "cambio-uruguay-mcp/tools";
import type { NewsItem } from "cambio-uruguay-mcp/news";
import { DAILY_GUIDES, type DailyGuide } from "../src/format/guides.js";
import {
  formatAlert,
  formatBest,
  formatConvert,
  formatDailyDiscord,
  formatDailyTelegram,
  formatDailyTwitter,
  formatNews,
  formatRates,
  TG_PHOTO_CAPTION_MAX,
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
    expect(out).toContain("vs. 24 h");
    expect(out).toContain("Dólar sube");
    expect(out).toContain("https://cambio-uruguay.com");
  });

  describe("with a guide of the day", () => {
    const guide: DailyGuide = DAILY_GUIDES[0]!;
    const url = `https://cambio-uruguay.com${guide.slug}`;
    // Balanced-delimiter check for Telegram's legacy parse_mode: an odd count of
    // `*` or `_` (outside URLs) is what turns into a 400 on the box.
    const unbalanced = (s: string) => {
      const text = s.replace(/https?:\/\/\S+/g, "");
      return (text.match(/\*/g)?.length ?? 0) % 2 !== 0 || (text.match(/(?<!\w)_|_(?!\w)/g)?.length ?? 0) % 2 !== 0;
    };

    it("keeps the label, the hook and the whole URL next to a very long AI summary", () => {
      const out = formatDailyTelegram(daily, longAi, "es", TG_PHOTO_CAPTION_MAX, { guide });
      expect(out.length).toBeLessThanOrEqual(1024);
      expect(out).toContain("📘 *Guía del día*: " + guide.hook);
      expect(out).toContain(url);
      // The guide sits between the AI blurb and the news, before the footer.
      expect(out.indexOf(url)).toBeLessThan(out.indexOf("📰"));
      expect(out.indexOf("📰")).toBeLessThan(out.lastIndexOf("https://cambio-uruguay.com"));
      expect(unbalanced(out)).toBe(false);
    });

    it("localizes the label and builds the URL from the configured site base", () => {
      const en = formatDailyTelegram(daily, "", "en", TG_PHOTO_CAPTION_MAX, { guide, siteBaseUrl: "https://example.test/" });
      expect(en).toContain("📘 *Guide of the day*: ");
      expect(en).toContain(`https://example.test${guide.slug}`);
      expect(formatDailyTelegram(daily, "", "pt", TG_PHOTO_CAPTION_MAX, { guide })).toContain("*Guia do dia*");
    });

    it("is byte-identical to today's output when no guide is passed", () => {
      const before = formatDailyTelegram(daily, longAi, "es");
      expect(formatDailyTelegram(daily, longAi, "es", TG_PHOTO_CAPTION_MAX, {})).toBe(before);
      expect(formatDailyTelegram(daily, longAi, "es", TG_PHOTO_CAPTION_MAX, { guide: undefined })).toBe(before);
      expect(before).not.toContain("📘");
    });

    it("drops the guide wholesale, never mid-URL, when the reserve does not fit", () => {
      // Head + footer alone are ~130 chars for this fixture; 260 leaves no room
      // for a ~190-char block, so the guide must vanish rather than be cut.
      const tight = formatDailyTelegram(daily, "Resumen.", "es", 260, { guide });
      expect(tight.length).toBeLessThanOrEqual(260);
      expect(tight).not.toContain("📘");
      expect(tight).not.toContain("/guias/");
      expect(tight.endsWith("https://cambio-uruguay.com")).toBe(true);
    });

    it("never leaves a half URL for any catalogue entry at the real caption limit", () => {
      for (const g of DAILY_GUIDES) {
        for (const lang of ["es", "en", "pt"] as const) {
          const out = formatDailyTelegram(daily, longAi, lang, TG_PHOTO_CAPTION_MAX, { guide: g });
          expect(out.length, g.slug).toBeLessThanOrEqual(1024);
          expect(out, g.slug).toContain(`https://cambio-uruguay.com${g.slug}\n`);
          expect(unbalanced(out), g.slug).toBe(false);
        }
      }
    });

    it("costs the summary the reserve but still ships the AI blurb and a headline", () => {
      const out = formatDailyTelegram(daily, longAi, "es", TG_PHOTO_CAPTION_MAX, { guide });
      expect(out).toContain("Resumen del mercado");
      expect(out).toContain("Comprar USD");
      expect(out).toContain("Dólar sube");
    });

    it("reaches Discord through the same body", () => {
      expect(formatDailyDiscord(daily, "", "es", { guide })).toContain(url);
      expect(formatDailyDiscord(daily, "", "es")).not.toContain("📘");
    });
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
