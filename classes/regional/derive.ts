// Everything the board says that no single source said.
//
// Three derivations, each answering a question the raw quotes cannot:
//
//   * the BOARD — one line per country: its official rate, the freely-traded
//     price when one exists, and what a counter charges. Six countries, four
//     different naming conventions for the same three things.
//   * the GAP — how far the price a person actually gets sits from the rate the
//     state publishes. It is the single most informative number about a
//     currency's condition: ~2% in Argentina today, wide in Bolivia, and in
//     Brazil it is not a gap at all but the tourism markup.
//   * the CROSS matrix — every regional pair, implied through the dollar and
//     labelled with the two legs it came from, so a reader can check it. Anchored
//     ONLY on official rates: a cross built on a street price silently smuggles
//     one country's politics into another country's exchange rate.
import { anchorOrder } from "./validate";
import {
  REGIONAL_COUNTRY_CURRENCY,
  REGIONAL_COUNTRY_NAMES,
  type RegionalBoardRow,
  type RegionalCountry,
  type RegionalCross,
  type RegionalGap,
  type RegionalQuote,
} from "./types";

const COUNTRY_ORDER: RegionalCountry[] = ["UY", "AR", "BR", "PY", "CL", "BO"];

const round = (value: number, decimals = 6): number => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

/** The dollar quotes of one country, in the local currency, most authoritative first. */
function localDollarQuotes(quotes: RegionalQuote[], country: RegionalCountry): RegionalQuote[] {
  const currency = REGIONAL_COUNTRY_CURRENCY[country];
  return anchorOrder(quotes.filter((quote) => quote.country === country && quote.base === "USD" && quote.quote === currency));
}

/**
 * The rate a country calls "the official one".
 *
 * A market literally named `oficial` wins over any other official-kind quote:
 * Argentina publishes both a retail official rate (what a bank charges, ~1 515)
 * and the BCRA's own reference (~1 499, effectively the wholesale rate). Both
 * are official and they are within a percent of each other, but only one is the
 * number Argentines mean by "el oficial", and a board that shows the other one
 * next to the blue is answering a question nobody asked.
 */
function pickOfficial(dollars: RegionalQuote[]): RegionalQuote | null {
  return (
    dollars.find((quote) => quote.market === "oficial") ??
    dollars.find((quote) => quote.kind === "official") ??
    dollars.find((quote) => quote.kind === "wholesale") ??
    null
  );
}

export function buildBoard(quotes: RegionalQuote[]): RegionalBoardRow[] {
  return COUNTRY_ORDER.map((country) => {
    const currency = REGIONAL_COUNTRY_CURRENCY[country];
    const dollars = localDollarQuotes(quotes, country);
    const official = pickOfficial(dollars);
    const parallel = dollars.find((quote) => quote.kind === "parallel") ?? null;
    const retail = dollars.find((quote) => quote.kind === "retail") ?? null;

    const row: RegionalBoardRow = {
      country,
      name: REGIONAL_COUNTRY_NAMES[country],
      currency,
      official,
      parallel,
      retail,
      quotes: quotes.filter((quote) => quote.country === country),
      gap: null,
      usdPerUnit: official ? round(1 / official.avg, 10) : null,
    };
    row.gap = gapFor(row);
    return row;
  });
}

/**
 * The gap between what the state publishes and what a person actually pays.
 *
 * "What a person pays" is the street price where one exists (Argentina, Bolivia)
 * and the counter price where it does not (Brazil's tourism rate, a Paraguayan
 * or Uruguayan casa). Both are the same question — how much worse than the
 * official number is the number you can transact at — so both are computed, and
 * the row says which market it used.
 */
export function gapFor(row: RegionalBoardRow): RegionalGap | null {
  const reference = row.official;
  const traded = row.parallel ?? row.retail;
  if (!reference || !traded) return null;
  if (traded.id === reference.id) return null;

  // Compare like with like. When both sides publish an ask, the gap is measured
  // ask-to-ask, because the question is what a dollar COSTS in each market —
  // Brazil's tourism markup is 6.5% measured that way and 2.6% measured between
  // mid prices, and the 6.5% is the one a traveller pays. When either side is a
  // single mid price (a central-bank fixing), both fall back to mids so the
  // number never straddles two conventions.
  const useAsk = reference.sell !== null && traded.sell !== null;
  const official = useAsk ? reference.sell! : reference.avg;
  const parallel = useAsk ? traded.sell! : traded.avg;
  if (official <= 0) return null;

  return {
    country: row.country,
    market: traded.market,
    label: traded.label,
    official,
    parallel,
    gapPct: round((parallel / official - 1) * 100, 4),
  };
}

export function buildGaps(board: RegionalBoardRow[]): RegionalGap[] {
  return board.map((row) => row.gap).filter((gap): gap is RegionalGap => gap !== null);
}

/**
 * Units of each regional currency per dollar, from the most authoritative
 * quote that country publishes. The anchor of every cross rate.
 */
export function usdAnchors(quotes: RegionalQuote[]): Map<string, RegionalQuote> {
  const anchors = new Map<string, RegionalQuote>();
  for (const country of COUNTRY_ORDER) {
    const currency = REGIONAL_COUNTRY_CURRENCY[country];
    const dollars = localDollarQuotes(quotes, country);
    // Never anchor on a card or street price: a cross is a reference number, and
    // a cross built on a street price smuggles one country's politics into
    // another country's exchange rate.
    const anchor =
      pickOfficial(dollars) ?? dollars.find((quote) => quote.kind !== "card" && quote.kind !== "parallel") ?? null;
    if (anchor) anchors.set(currency, anchor);
  }
  return anchors;
}

/** The full ordered matrix of regional pairs, implied through the dollar. */
export function buildCross(quotes: RegionalQuote[]): RegionalCross[] {
  const anchors = usdAnchors(quotes);
  const currencies = [...anchors.keys()].sort();
  const cross: RegionalCross[] = [];
  for (const base of currencies) {
    for (const quote of currencies) {
      if (base === quote) continue;
      const baseAnchor = anchors.get(base)!;
      const quoteAnchor = anchors.get(quote)!;
      if (baseAnchor.avg <= 0) continue;
      cross.push({
        base,
        quote,
        // units of `quote` per dollar, divided by units of `base` per dollar.
        rate: round(quoteAnchor.avg / baseAnchor.avg, 8),
        via: [baseAnchor.id, quoteAnchor.id],
      });
    }
  }
  return cross;
}

/** The oldest stamp on the board — the honest answer to "how fresh is this?". */
export function oldestQuoteAt(quotes: RegionalQuote[]): string | null {
  const stamps = quotes.map((quote) => Date.parse(quote.updatedAt)).filter((value) => Number.isFinite(value));
  if (!stamps.length) return null;
  return new Date(Math.min(...stamps)).toISOString();
}
