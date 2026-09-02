// A quote that cannot exist must never reach the database.
//
// WHY THIS FILE EXISTS. On 2026-09-01 the site's headline number on /dolar-hoy read
// "Compra $ 3.905,00". The scraper was not wrong: lafavorita.com.uy published `3905` in its own
// Compra cell, having lost the decimal comma from 39,05. Our parser copied it faithfully, `bestBuy`
// takes the MAXIMUM across casas, and so one upstream typo became the biggest number on the page —
// and rendered the same way on /casas-de-cambio, /casa/la_favorita, /historico/la_favorita and
// /cotizacion. `classes/regional/validate.ts` already refuses this class of thing for the regional
// board; the Uruguayan board, which is the actual product, had no guard at all.
//
// THE RULE, AND WHY IT IS ONLY THIS ONE. A casa buys low and sells high: `buy > sell` is not a bad
// price, it is not a price. Checked against all 201 rows the live API served that day, exactly one
// violated it — the broken one. Equality is left alone on purpose: BCU's reference rows and the
// interbancario quote legitimately carry buy === sell (11 rows that day).
//
// WHAT WAS TRIED AND REJECTED, so nobody re-litigates it:
//   * A spread ratio cap (reject when sell/buy exceeds N). Dead on arrival: casas quote the
//     Argentine peso at buy 0,02 / sell 0,20 — a legitimate 10× spread, because they barely want
//     the currency. 21 of 197 rows exceeded 3×, and all but one were real.
//   * A band around the cross-casa median. Better, but it needs every casa's rows in one place and
//     the scrape loop runs one casa at a time under a five-minute guillotine. It also still flagged
//     tradelix's genuinely odd Argentine-peso quotes. Left undone deliberately: it is the check that
//     would catch the mirror failure (a decimal lost from the SELL side, which passes the rule
//     below), and it belongs in a pass that sees the whole day at once.
import fs from "fs";
import path from "path";

export interface RateLike {
  origin?: string;
  code?: string;
  type?: string;
  name?: string;
  buy: number;
  sell: number;
}

/** Human-readable reason the row cannot be a real quote, or null when it can. */
export function implausibleReason(row: RateLike): string | null {
  const buy = Number(row.buy);
  const sell = Number(row.sell);
  if (!Number.isFinite(buy) || !Number.isFinite(sell)) return "compra o venta no es un número";
  // A one-sided quote is normal (plenty of casas publish only what they sell), and zero-zero is
  // already handled by the caller.
  if (buy <= 0 || sell <= 0) return null;
  if (buy > sell) {
    return `compra ${buy} mayor que venta ${sell}: una casa compra barato y vende caro, así que esto es un error de la fuente`;
  }
  return null;
}

/** Stable identity of a quote, for the once-a-day alert memo. */
export function rateKey(row: RateLike): string {
  return [row.origin || "?", row.code || "?", row.type || ""].join("|");
}

const MEMO_FILE = path.resolve(process.cwd(), "rate_rejections.json");

/**
 * True the first time a given quote is rejected on a given day.
 *
 * The scrape runs every five minutes. Without this, one upstream typo would send 288 identical
 * Telegram messages a day, and a channel that cries every five minutes is a channel nobody reads.
 * The memo is a file next to `last_sync.txt` rather than a collection because it is bookkeeping,
 * not data: losing it costs one duplicate message.
 */
export function shouldAlert(key: string, day: string, memoFile: string = MEMO_FILE): boolean {
  let memo: Record<string, string> = {};
  try {
    memo = JSON.parse(fs.readFileSync(memoFile, "utf8"));
  } catch {
    // No memo yet, or it is corrupt. Either way the safe answer is "alert, and rewrite the file".
  }
  if (memo[key] === day) return false;
  memo[key] = day;
  // Drop entries from other days so the file cannot grow without bound.
  for (const k of Object.keys(memo)) if (memo[k] !== day) delete memo[k];
  try {
    fs.writeFileSync(memoFile, JSON.stringify(memo));
  } catch {
    // A read-only filesystem means duplicate alerts, never a failed scrape.
  }
  return true;
}
