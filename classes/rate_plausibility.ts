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

// ---------------------------------------------------------------------------------------------
// La banda entre casas: el caso espejo
//
// La regla de arriba atrapa la coma perdida del lado de la COMPRA (queda por encima de la venta).
// Si se pierde del lado de la VENTA, pasa limpia: compra 39,05 / venta 4145 sigue cumpliendo
// compra < venta. Lo único que la delata es comparar contra lo que cobran las otras casas.
//
// Y ahí no sirve una banda fija. Medido sobre las 197 filas con los dos lados que servía la API el
// 2026-09-01: las casas cotizan el peso argentino a 0,02 / 0,20 —diez veces de spread, y es real,
// porque no lo quieren— mientras el dólar se mueve entre 39 y 41,50 en 41 casas. Un factor único
// aplicado a las dos monedas o borra el peso argentino o deja pasar cualquier cosa en el dólar.
//
// Por eso la banda se calcula sobre los PERCENTILES del propio grupo (moneda + tipo): una moneda
// con precios dispersos se gana una banda ancha sola, sin que nadie la configure. Dos franjas:
//
//   * SOSPECHOSA  fuera de [p10/3, p90×3]  → avisa, no toca nada. Acá cae, con razón, la cotización
//     genuinamente rara de tradelix para el peso argentino: es un precio malo, no un error.
//   * IMPOSIBLE   fuera de [p10/30, p90×30] → es un error de la fuente. La compra de 3905 del
//     2026-09-01 estaba 32 veces por encima del borde de la banda sospechosa.
// ---------------------------------------------------------------------------------------------

/** Mínimo de casas en un grupo para que su mediana signifique algo. */
export const BAND_MIN_SAMPLE = 5;
export const BAND_SOFT_FACTOR = 3;
export const BAND_HARD_FACTOR = 30;

export interface BandVerdict {
  level: "ok" | "sospechosa" | "imposible";
  side: "buy" | "sell" | null;
  reason: string | null;
}

function percentile(values: number[], p: number): number {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index];
}

export interface Band {
  softLow: number;
  softHigh: number;
  hardLow: number;
  hardHigh: number;
  sample: number;
}

/** La banda de un grupo (misma moneda y tipo), o null si no hay muestra suficiente. */
export function bandFor(values: number[]): Band | null {
  const usable = values.filter((v) => Number.isFinite(v) && v > 0);
  if (usable.length < BAND_MIN_SAMPLE) return null;
  const lo = percentile(usable, 0.1);
  const hi = percentile(usable, 0.9);
  if (!lo || !hi) return null;
  return {
    softLow: lo / BAND_SOFT_FACTOR,
    softHigh: hi * BAND_SOFT_FACTOR,
    hardLow: lo / BAND_HARD_FACTOR,
    hardHigh: hi * BAND_HARD_FACTOR,
    sample: usable.length,
  };
}

function judge(value: number, band: Band | null, side: "buy" | "sell"): BandVerdict {
  if (!band || !(value > 0)) return { level: "ok", side: null, reason: null };
  const label = side === "buy" ? "compra" : "venta";
  if (value > band.hardHigh || value < band.hardLow) {
    return {
      level: "imposible",
      side,
      reason: `${label} ${value} contra una banda de [${band.hardLow.toPrecision(3)}, ${band.hardHigh.toPrecision(
        3
      )}] entre ${band.sample} casas`,
    };
  }
  if (value > band.softHigh || value < band.softLow) {
    return {
      level: "sospechosa",
      side,
      reason: `${label} ${value} fuera de [${band.softLow.toPrecision(3)}, ${band.softHigh.toPrecision(
        3
      )}] entre ${band.sample} casas`,
    };
  }
  return { level: "ok", side: null, reason: null };
}

/** El peor de los dos lados. Una fila con la compra imposible no se salva porque la venta esté bien. */
export function judgeAgainstBand(row: RateLike, buyBand: Band | null, sellBand: Band | null): BandVerdict {
  const buy = judge(Number(row.buy), buyBand, "buy");
  if (buy.level === "imposible") return buy;
  const sell = judge(Number(row.sell), sellBand, "sell");
  if (sell.level === "imposible") return sell;
  if (buy.level === "sospechosa") return buy;
  return sell;
}

export interface BandedRow extends RateLike {
  verdict: BandVerdict;
}

/**
 * Agrupa por (moneda, tipo), arma la banda de cada grupo y juzga cada fila.
 *
 * Pura: el que la llama decide qué hacer con el veredicto. Es lo que permite probar los umbrales
 * contra un día real sin tocar Mongo.
 */
export function auditAgainstPeers(rows: RateLike[]): BandedRow[] {
  const groups = new Map<string, RateLike[]>();
  for (const row of rows) {
    const key = `${row.code || ""}|${row.type || ""}`;
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }
  const out: BandedRow[] = [];
  for (const list of groups.values()) {
    const buyBand = bandFor(list.map((r) => Number(r.buy)));
    const sellBand = bandFor(list.map((r) => Number(r.sell)));
    for (const row of list) {
      out.push({ ...row, verdict: judgeAgainstBand(row, buyBand, sellBand) });
    }
  }
  return out;
}
