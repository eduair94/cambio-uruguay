// Channel-specific message formatters. Pure: structured data in, strings out.
// Telegram/Discord use light Markdown; Twitter is compact and hard-capped at 280.
import type { BestHouseResult, ConvertResult, RatesResult } from "cambio-uruguay-mcp/tools";
import type { NewsItem } from "cambio-uruguay-mcp/news";
import { fmtNum, fmtPct, fmtUYU, L, type Lang } from "./i18n.js";
import type { AlertData, DailyReportData } from "../report/types.js";

const TWEET_MAX = 280;
/** Telegram caps photo captions at 1024 chars (text messages at 4096). The daily
 * post always carries the OG image, so the channel body must fit the caption. */
export const TG_PHOTO_CAPTION_MAX = 1024;

/** Hard-cap a string at n chars, adding an ellipsis when truncated. */
export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, Math.max(0, n - 1)).trimEnd() + "…";
}

/**
 * Flatten the long multi-section AI report into a plain-text blurb safe for a
 * Telegram caption: drops markdown that breaks legacy `parse_mode: Markdown`
 * (headings, bold/code/table syntax) and the model's own truncation notice,
 * then hard-caps the result.
 */
export function compactAiSummary(ai: string, maxLen: number): string {
  if (!ai) return "";
  const cleaned = ai
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/^\s*#{1,6}\s*/gm, "") // headings
    .replace(/^\s*\|.*\|\s*$/gm, "") // table rows
    .replace(/^\s*[-*=_]{3,}\s*$/gm, "") // horizontal rules / separators
    .replace(/^\s*⚠️.*$/gm, "") // truncation / model warnings
    .replace(/[*_`~#>[\]()|]/g, "") // residual markdown specials
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return truncate(cleaned, maxLen);
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

export function formatNews(items: NewsItem[], lang: Lang, limit = 5, opts: { links?: boolean } = {}): string {
  const t = L(lang);
  if (items.length === 0) return t.noData;
  const links = opts.links ?? true;
  // Google News RSS links are ~650-char tracking redirects; the daily channel
  // body drops them (links:false) to keep the caption within Telegram's limit.
  const lines = items
    .slice(0, limit)
    .map((n) => (links ? `• [${n.title}](${n.link}) — _${n.source}_` : `• ${n.title} — _${n.source}_`));
  return `📰 *${t.news}*\n${lines.join("\n")}`;
}

/** News header + as many compact (link-less) headlines as fit in `budget`;
 * returns "" when not even the header plus one headline fits. */
function fitNewsBlock(items: NewsItem[], lang: Lang, budget: number): string {
  const t = L(lang);
  if (items.length === 0) return "";
  const header = `\n\n📰 *${t.news}*`;
  let block = header;
  let added = 0;
  for (const n of items.slice(0, 3)) {
    const line = `\n• ${n.title} — _${n.source}_`;
    if (block.length + line.length > budget) break;
    block += line;
    added++;
  }
  return added > 0 ? block : "";
}

/** One compact line per currency, used by Telegram/Discord daily bodies. */
function dailyLines(data: DailyReportData, lang: Lang): string[] {
  const t = L(lang);
  return data.currencies.map((c) => {
    return `${arrow(c.changePct)} *${c.code}* ${fmtUYU(c.bestSell.rate, lang)} (${fmtPct(c.changePct)}) · ${t.bestBuy}: ${c.bestBuy.name}`;
  });
}

export function formatDailyTelegram(
  data: DailyReportData,
  ai: string,
  lang: Lang,
  maxLen: number = TG_PHOTO_CAPTION_MAX
): string {
  const t = L(lang);
  const head = [`📊 *${t.dailyTitle}* — ${data.date}`, "", ...dailyLines(data, lang)].join("\n");
  const footer = "\n\nhttps://cambio-uruguay.com";
  // Priority: head + footer are fixed; the AI summary comes next (the point of
  // the post) but yields a small reserve so a few headlines still fit; news
  // then fills its reserve plus whatever the summary left unused.
  let remaining = maxLen - head.length - footer.length;
  const newsReserve = data.news.length ? 220 : 0; // ~3 compact headlines
  const aiBudget = Math.max(0, remaining - 2 - newsReserve);
  const blurb = aiBudget > 40 ? compactAiSummary(ai, aiBudget) : "";
  const aiBlock = blurb ? `\n\n${blurb}` : "";
  remaining -= aiBlock.length;
  const news = fitNewsBlock(data.news, lang, remaining);
  return truncate(`${head}${aiBlock}${news}${footer}`, maxLen);
}

export function formatDailyDiscord(data: DailyReportData, ai: string, lang: Lang): string {
  // Discord renders the same Markdown subset well enough; reuse the body
  // (the 1024 default sits comfortably under Discord's 2000-char limit).
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
