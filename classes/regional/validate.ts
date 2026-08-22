// What is allowed onto the board, and what is thrown out with a reason.
//
// Thirteen publishers in six countries, two of them scraped out of HTML: the
// question is never "did the fetch succeed" but "is this number a price". Four
// filters, in order of how much they know:
//
//   1. SHAPE — a sell below a buy, or a spread so wide it is signage rather than
//      an offer. This is the failure the Uruguayan board taught us: casas leave
//      a sign up for a currency they stopped trading, and a 50%+ spread is what
//      "we do not really do this" looks like on a price list.
//   2. BANDS — a dollar price outside a range the currency could not plausibly
//      be in. Wide by design (an order of magnitude of headroom): the band is
//      there to catch a parser reading the wrong column, not to have an opinion
//      on where a currency should trade.
//   3. CONSENSUS — where three or more publishers describe the same market, one
//      that disagrees with the median by more than a fifth is out. Only applies
//      to Argentina today, which is the only market covered that densely.
//   4. COHERENCE — a non-dollar quote (say reales priced in pesos argentinos)
//      has to agree with what the two dollar legs of the same country imply. A
//      column-shift in a scraped table survives every filter above and dies here.
//
// Rejections are kept and published. A board that silently drops rows teaches
// nobody anything, and the rejected list is how a parser regression is noticed
// the day it starts rather than the week somebody complains.
import { sourceRank } from "./catalog";
import type { RegionalQuote } from "./types";

export interface RegionalRejection {
  id: string;
  source: string;
  reason: string;
  value: number | null;
}

export interface ValidationResult {
  kept: RegionalQuote[];
  rejected: RegionalRejection[];
}

/**
 * Plausible range for one dollar, per currency. Deliberately an order of
 * magnitude wide on each side of 2026 levels: currencies drift, and a band that
 * needs maintaining is a band that will one day silently empty the board.
 */
export const USD_BANDS: Record<string, [number, number]> = {
  ARS: [100, 100_000],
  BRL: [1.5, 40],
  CLP: [200, 5_000],
  PYG: [1_500, 40_000],
  BOB: [3, 60],
  UYU: [10, 200],
  EUR: [0.5, 2],
};

/** Above this, a two-sided quote is not an offer anybody transacts at. */
export const MAX_SPREAD_PCT = 50;

/**
 * How far a quote may cross (sell below buy) before it is treated as malformed.
 *
 * Not zero, because one row here is legitimately a composite: the Uruguayan
 * "best of market" line takes the highest bid and the lowest ask across ~46
 * casas, and on a fragmented board those come from different casas and can
 * cross — measured live, best bid 40,00 against cheapest ask 39,55. A parser
 * reading columns backwards, by contrast, inverts by orders of magnitude (the
 * Brazilian commercial quote came out 5 138 bid / 5,14 ask), so a small
 * tolerance separates the two cleanly.
 */
export const MIN_SPREAD_PCT = -3;

/** How far from the median of three-or-more publishers a quote may sit. */
export const MAX_CONSENSUS_DEVIATION_PCT = 20;

/**
 * The same rule, tighter, when every publisher of a market is quoting a
 * mid-market REFERENCE rather than surveying a market.
 *
 * Four independent worldwide feeds priced the same six currencies within 1% of
 * each other and of the national sources (measured 2026-08-22). Twenty percent
 * of slack is meant for street-price surveys that legitimately disagree; applied
 * to feeds that should agree to the cent, it would let a broken one through —
 * which is exactly what happened, at 11% and 12% off, before this existed.
 */
export const MAX_REFERENCE_CONSENSUS_PCT = 3;

/** How far a cross quote may sit from what the same country's dollar legs imply. */
export const MAX_COHERENCE_DEVIATION_PCT = 35;

/**
 * How far the international fallback may sit from the country's own price.
 *
 * A mid-market reference and a central bank quoting the same currency on the
 * same day should differ by rounding, not by a fifth. Five percent leaves room
 * for a feed that closed a few hours earlier and is still tight enough to catch
 * the case this exists for: a free feed publishing a rate that stopped tracking
 * reality months ago.
 */
export const MAX_REFERENCE_DEVIATION_PCT = 5;

function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const deviationPct = (value: number, reference: number): number => Math.abs(value / reference - 1) * 100;

/**
 * Which kind of price to trust as "the" rate of a country when several exist.
 * An official fixing first, then the wholesale market, then a third-party
 * reference, then what a counter charges; the market-priced and street dollars
 * are last precisely because they are the ones a country can have several of.
 */
export const ANCHOR_KIND_ORDER = [
  "official",
  "wholesale",
  "reference",
  "retail",
  "financial",
  "parallel",
  "card",
] as const;

/** Sort a copy so the most authoritative reading of each market comes first. */
export function anchorOrder(quotes: RegionalQuote[]): RegionalQuote[] {
  return [...quotes].sort((a, b) => {
    const kind = ANCHOR_KIND_ORDER.indexOf(a.kind) - ANCHOR_KIND_ORDER.indexOf(b.kind);
    if (kind !== 0) return kind;
    return sourceRank(a.source) - sourceRank(b.source);
  });
}

/** Group by the market a quote describes, ignoring which publisher said it. */
function byMarket(quotes: RegionalQuote[]): Map<string, RegionalQuote[]> {
  const groups = new Map<string, RegionalQuote[]>();
  for (const quote of quotes) {
    const list = groups.get(quote.id);
    if (list) list.push(quote);
    else groups.set(quote.id, [quote]);
  }
  return groups;
}

export function validateQuotes(quotes: RegionalQuote[]): ValidationResult {
  const rejected: RegionalRejection[] = [];
  const reject = (quote: RegionalQuote, reason: string, value: number | null = quote.avg) => {
    rejected.push({ id: quote.id, source: quote.source, reason, value });
  };

  // 1 + 2 — shape and bands.
  const shaped = quotes.filter((quote) => {
    if (!Number.isFinite(quote.avg) || quote.avg <= 0) {
      reject(quote, "precio no numérico o menor o igual a cero");
      return false;
    }
    if (quote.spreadPct !== null && quote.spreadPct < MIN_SPREAD_PCT) {
      reject(
        quote,
        `la venta (${quote.sell}) está ${Math.abs(quote.spreadPct).toFixed(1)} % por debajo de la compra (${quote.buy})`,
        quote.sell
      );
      return false;
    }
    if (quote.spreadPct !== null && quote.spreadPct > MAX_SPREAD_PCT) {
      reject(quote, `spread de ${quote.spreadPct.toFixed(1)} % — cartel, no precio`, quote.spreadPct);
      return false;
    }
    if (quote.base === "USD") {
      const band = USD_BANDS[quote.quote];
      if (band && (quote.avg < band[0] || quote.avg > band[1])) {
        reject(quote, `fuera de banda para USD/${quote.quote} (${band[0]}–${band[1]})`);
        return false;
      }
    }
    return true;
  });

  // 3 — consensus, only where enough independent publishers cover the market.
  const groups = byMarket(shaped);
  const consensual: RegionalQuote[] = [];
  for (const [, group] of groups) {
    if (group.length < 3) {
      consensual.push(...group);
      continue;
    }
    const reference = median(group.map((quote) => quote.avg));
    if (reference === null) {
      consensual.push(...group);
      continue;
    }
    // Feeds that all publish a mid-market reference are held to a tighter
    // standard than publishers surveying a street market: they are describing
    // the same number, not the same crowd.
    const allReference = group.every((quote) => quote.kind === "reference");
    const ceiling = allReference ? MAX_REFERENCE_CONSENSUS_PCT : MAX_CONSENSUS_DEVIATION_PCT;

    for (const quote of group) {
      const deviation = deviationPct(quote.avg, reference);
      if (deviation > ceiling) {
        reject(
          quote,
          `${deviation.toFixed(1)} % lejos de la mediana de ${group.length} fuentes (${reference.toFixed(2)})`
        );
      } else {
        consensual.push(quote);
      }
    }
  }

  // 4 — coherence of non-dollar quotes against the country's own dollar legs.
  //
  // The anchor has to be the OFFICIAL dollar, not just any dollar. Argentina
  // publishes seven of them spanning 30% (oficial 1515, tarjeta 1976): anchoring
  // a real-in-pesos check on the card dollar would reject a correct cross and
  // accept a wrong one.
  const usdByCountry = new Map<string, number>();
  for (const quote of anchorOrder(consensual)) {
    if (quote.base !== "USD") continue;
    const key = `${quote.country}:${quote.quote}`;
    if (!usdByCountry.has(key)) usdByCountry.set(key, quote.avg);
  }
  // A currency's dollar price anywhere in the region is enough to imply a cross;
  // the median across markets absorbs the spread between them.
  const usdByCurrency = new Map<string, number[]>();
  for (const quote of consensual) {
    if (quote.base !== "USD") continue;
    const list = usdByCurrency.get(quote.quote) ?? [];
    list.push(quote.avg);
    usdByCurrency.set(quote.quote, list);
  }

  // The country's own price for a dollar, from a market a person can reach.
  // Used to police the international fallback — see below.
  const nationalUsd = new Map<string, number>();
  for (const quote of anchorOrder(consensual)) {
    if (quote.base !== "USD" || quote.kind === "reference") continue;
    const key = `${quote.country}:${quote.quote}`;
    if (!nationalUsd.has(key)) nationalUsd.set(key, quote.avg);
  }

  const kept: RegionalQuote[] = [];
  for (const quote of consensual) {
    if (quote.base === "USD") {
      // 5 — the international fallback has to agree with the country itself.
      //
      // Measured against the live board on 2026-08-22, the free mid-market feed
      // was 11% off for the Chilean peso, 12% for the Uruguayan and 39% for the
      // boliviano, while being right for the Argentine peso and the real. It is
      // kept as a fallback for a country whose own sources are all down — that
      // is what it is for — but it must never sit on the board CONTRADICTING the
      // central bank of the country it claims to describe.
      const national = quote.kind === "reference" ? nationalUsd.get(`${quote.country}:${quote.quote}`) : undefined;
      if (national !== undefined) {
        const deviation = deviationPct(quote.avg, national);
        if (deviation > MAX_REFERENCE_DEVIATION_PCT) {
          reject(
            quote,
            `referencia internacional ${deviation.toFixed(1)} % lejos del precio del propio país (${national})`
          );
          continue;
        }
      }
      kept.push(quote);
      continue;
    }
    const localUsd = usdByCountry.get(`${quote.country}:${quote.quote}`);
    const baseUsd = median(usdByCurrency.get(quote.base) ?? []);
    if (localUsd === undefined || baseUsd === null || baseUsd <= 0) {
      // Nothing to check it against; a quote is not guilty for being alone.
      kept.push(quote);
      continue;
    }
    const implied = localUsd / baseUsd;
    const deviation = deviationPct(quote.avg, implied);
    if (deviation > MAX_COHERENCE_DEVIATION_PCT) {
      reject(
        quote,
        `${deviation.toFixed(1)} % lejos del cruce implícito por el dólar (${implied.toFixed(4)} ${quote.quote}/${quote.base})`
      );
      continue;
    }
    kept.push(quote);
  }

  return { kept, rejected };
}

/**
 * One row per market. The winner is the highest-ranked publisher, preferring a
 * two-sided quote and then the newest stamp; everyone else who published the
 * same market becomes corroboration on the surviving row, with the widest
 * disagreement recorded.
 */
export function dedupeQuotes(quotes: RegionalQuote[]): RegionalQuote[] {
  const out: RegionalQuote[] = [];
  for (const [, group] of byMarket(quotes)) {
    const ordered = [...group].sort((a, b) => {
      const rank = sourceRank(a.source) - sourceRank(b.source);
      if (rank !== 0) return rank;
      const sides = Number(b.buy !== null && b.sell !== null) - Number(a.buy !== null && a.sell !== null);
      if (sides !== 0) return sides;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
    const winner = ordered[0];
    const others = ordered.slice(1);
    const disagreement = others.length
      ? Math.max(...others.map((quote) => deviationPct(quote.avg, winner.avg)))
      : null;
    out.push({
      ...winner,
      corroboratedBy: others.map((quote) => quote.source),
      disagreementPct: disagreement === null ? null : Math.round(disagreement * 1e4) / 1e4,
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
