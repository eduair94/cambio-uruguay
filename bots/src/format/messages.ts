// Channel-specific message formatters. Pure: structured data in, strings out.
// Telegram/Discord use light Markdown; Twitter is compact and hard-capped at 280.
import type {
  BestHouseResult,
  ConvertResult,
  NewsItem,
  RatesResult,
} from "cambio-uruguay-mcp/tools";
import { fmtNum, fmtPct, fmtUYU, L, type Lang } from "./i18n.js";
import type { AlertData, DailyReportData } from "../report/types.js";

const TWEET_MAX = 280;

/** Hard-cap a string at n chars, adding an ellipsis when truncated. */
export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, Math.max(0, n - 1)).trimEnd() + "…";
}

function arrow(pct: number): string {
  return pct > 0 ? "🔺" : pct < 0 ? "🔻" : "▪️";
}

/** Current snapshot for one currency (no historical change). */
export function formatRates(r: RatesResult, lang: Lang): string {
  const t = L(lang);
  return [
    `💵 *${r.currency}* — ${r.houseCount} ${t.house.toLowerCase()}s`,
    `${t.bestSell}: ${r.bestSell.name} ${fmtUYU(r.bestSell.rate, lang)}`,
    `${t.bestBuy}: ${r.bestBuy.name} ${fmtUYU(r.bestBuy.rate, lang)}`,
    `${t.market}: ${t.buy} ${fmtUYU(r.marketAvgBuy, lang)} · ${t.sell} ${fmtUYU(r.marketAvgSell, lang)}`,
    `${t.lowestSpread}: ${r.lowestSpread.name} (${fmtNum(r.lowestSpread.spread, lang)})`,
  ].join("\n");
}

export function formatBest(r: BestHouseResult, lang: Lang): string {
  const t = L(lang);
  const label = r.side === "buy" ? t.bestBuy : t.bestSell;
  return `🏆 ${label} ${r.currency}: *${r.name}* — ${fmtUYU(r.rate, lang)}`;
}

export function formatConvert(r: ConvertResult, lang: Lang): string {
  const t = L(lang);
  return `🔄 ${fmtNum(r.amount, lang)} ${r.from} = *${fmtNum(r.result, lang)} ${r.to}*\n${t.result}: 1 ${r.from} = ${fmtNum(r.rate, lang)} ${r.to}`;
}

export function formatNews(items: NewsItem[], lang: Lang, limit = 5): string {
  const t = L(lang);
  if (items.length === 0) return t.noData;
  const lines = items.slice(0, limit).map((n) => `• [${n.title}](${n.link}) — _${n.source}_`);
  return `📰 *${t.news}*\n${lines.join("\n")}`;
}

/** One compact line per currency, used by Telegram/Discord daily bodies. */
function dailyLines(data: DailyReportData, lang: Lang): string[] {
  const t = L(lang);
  return data.currencies.map((c) => {
    return `${arrow(c.changePct)} *${c.code}* ${fmtUYU(c.bestSell.rate, lang)} (${fmtPct(c.changePct)}) · ${t.bestBuy}: ${c.bestBuy.name}`;
  });
}

export function formatDailyTelegram(data: DailyReportData, ai: string, lang: Lang): string {
  const t = L(lang);
  const parts = [`📊 *${t.dailyTitle}* — ${data.date}`, "", ...dailyLines(data, lang)];
  if (ai) parts.push("", ai.trim());
  if (data.news.length) parts.push("", formatNews(data.news, lang, 3));
  parts.push("", "https://cambio-uruguay.com");
  return parts.join("\n");
}

export function formatDailyDiscord(data: DailyReportData, ai: string, lang: Lang): string {
  // Discord renders the same Markdown subset well enough; reuse the body.
  return formatDailyTelegram(data, ai, lang);
}

/** Compact daily tweet, hard-capped at 280 chars. */
export function formatDailyTwitter(data: DailyReportData, lang: Lang): string {
  const t = L(lang);
  const head = `📊 ${t.dailyTitle} ${data.date}`;
  const lines = data.currencies.map(
    (c) => `${arrow(c.changePct)} ${c.code} ${fmtUYU(c.bestSell.rate, lang)} ${fmtPct(c.changePct)}`
  );
  const url = "cambio-uruguay.com";
  // Add currency lines while staying under the cap, always keeping head + url.
  let body = head;
  for (const line of lines) {
    const candidate = `${body}\n${line}`;
    if (`${candidate}\n${url}`.length > TWEET_MAX) break;
    body = candidate;
  }
  return truncate(`${body}\n${url}`, TWEET_MAX);
}

export function formatAlert(alert: AlertData, lang: Lang, _style: "telegram" | "discord"): string {
  const t = L(lang);
  const verb = alert.direction === "up" ? t.up : t.down;
  const mark = alert.direction === "up" ? "🔺" : "🔻";
  return [
    `${mark} *${t.alertTitle}*`,
    `${alert.code} ${verb} ${fmtPct(alert.changePct)} → ${fmtUYU(alert.current, lang)}`,
    `https://cambio-uruguay.com`,
  ].join("\n");
}
