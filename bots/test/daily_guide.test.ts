// One day = one guide, for everyone. `publishDaily` formats the channel post and
// each per-language DM body separately, so the guard here is that the SAME slug
// reaches every recipient (the pick happens once, in the entry, and is passed
// in), and that the caption Telegram receives is the guide-bearing one.
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BotConfig } from "../src/config.js";
import { DAILY_GUIDES } from "../src/format/guides.js";
import { publishDaily } from "../src/publish/index.js";
import type { DailyReportData } from "../src/report/types.js";

const data: DailyReportData = {
  date: "2026-09-22",
  currencies: [
    {
      code: "USD",
      marketAvgBuy: 39,
      marketAvgSell: 41,
      changePct: 0.4,
      bestBuy: { name: "BROU", rate: 40 },
      bestSell: { name: "Itau", rate: 40.5 },
      lowestSpread: { name: "Prex", spread: 0.4 },
    },
  ],
  news: [{ title: "Dólar hoy", link: "https://x", source: "El País", pubDate: "", snippet: "" }],
};

const cfg: BotConfig = {
  apiBaseUrl: "https://api.example.test",
  siteBaseUrl: "https://cambio-uruguay.com/",
  appBaseUrl: "https://cambio-uruguay.com",
  defaultLang: "es",
  reportCurrencies: ["USD"],
  alert: { thresholdPct: 1, cooldownMin: 120, reAlertDeltaPct: 1, currencies: ["USD"] },
  telegram: { token: "T", channelId: "@c" },
  dryRun: false,
  force: false,
};

interface Sent {
  chat: string;
  caption: string;
}

/** Stubs the Bot API and records every sendPhoto/sendMessage body. */
function stubTelegram(): Sent[] {
  const sent: Sent[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? "{}");
      sent.push({ chat: String(body.chat_id), caption: body.caption ?? body.text ?? "" });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    })
  );
  return sent;
}

afterEach(() => vi.unstubAllGlobals());

describe("publishDaily with a guide of the day", () => {
  const guide = DAILY_GUIDES[3]!;
  const url = `https://cambio-uruguay.com${guide.slug}`;

  it("puts the same guide in the channel post and in every per-language DM", async () => {
    const sent = stubTelegram();
    const res = await publishDaily({
      cfg,
      data,
      aiByLang: { es: "Resumen es.", en: "Summary en.", pt: "Resumo pt." },
      telegramSubscribers: [
        { chatId: "a", language: "es" },
        { chatId: "b", language: "en" },
        { chatId: "c", language: "pt-BR" },
      ],
      image: { url: "https://cambio-uruguay.com/og.png" },
      guide,
    });
    expect(res.channels).toEqual(["telegram"]);
    expect(res.dmSent).toBe(3);
    expect(sent.map((s) => s.chat).sort()).toEqual(["@c", "a", "b", "c"]);
    for (const s of sent) {
      // Exactly one guide URL per body, and it is this one — never a second pick.
      expect(s.caption.split(url).length - 1, s.chat).toBe(1);
      expect(s.caption.split("/guias/").length - 1, s.chat).toBe(1);
      expect(s.caption.length, s.chat).toBeLessThanOrEqual(1024);
    }
    // Localized labels per DM language, same slug throughout.
    expect(sent.find((s) => s.chat === "b")!.caption).toContain("*Guide of the day*");
    expect(sent.find((s) => s.chat === "c")!.caption).toContain("*Guia do dia*");
    expect(sent.find((s) => s.chat === "@c")!.caption).toContain("*Guía del día*");
  });

  it("sends today's body untouched when no guide is given", async () => {
    const sent = stubTelegram();
    await publishDaily({ cfg, data, aiByLang: { es: "Resumen es." }, image: { url: "https://x/og.png" } });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.caption).not.toContain("📘");
    expect(sent[0]!.caption).not.toContain("/guias/");
  });

  it("does not touch the network in dry-run, guide or not", async () => {
    const sent = stubTelegram();
    const res = await publishDaily({ cfg: { ...cfg, dryRun: true }, data, aiByLang: { es: "x" }, guide });
    // The dry-run publisher reports success without calling the API — which is
    // exactly why daily_report.ts checks `!cfg.dryRun` before advancing the
    // rotation, and not just `channels.includes("telegram")`.
    expect(res.channels).toEqual(["telegram"]);
    expect(sent).toHaveLength(0);
  });
});
