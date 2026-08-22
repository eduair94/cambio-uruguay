// The only question a Uruguayan actually asks about a neighbouring currency:
// do I buy it here, or do I take dollars and change it there?
//
// `/dolar-blue-hoy` answers it for Argentine pesos and found a 16% difference.
// This is the same arithmetic generalised to every neighbour, which is possible
// now because the board holds both halves for all of them: what a Uruguayan casa
// charges (our own scrape) and what a counter across the border pays for a
// dollar (the regional sources).
//
// Two rules the Argentine version taught us, kept here:
//
//   * compare ROUTES, not rates. "El real está a 7,80" is not an answer; "un
//     real te sale 7,80 comprándolo acá y 7,41 llevando dólares" is.
//   * when a leg is missing, return null and say which one. Every figure here is
//     two prices multiplied together, so a guessed leg is a wrong answer stated
//     with confidence.
import { anchorOrder } from "./validate";
import {
  REGIONAL_COUNTRY_CURRENCY,
  REGIONAL_COUNTRY_NAMES,
  type RegionalCountry,
  type RegionalQuote,
  type RegionalRoute,
  type RegionalRouteComparison,
} from "./types";

export type { RegionalRoute, RegionalRouteComparison };

/** Countries the route comparison covers: the ones Uruguayan casas quote. */
const TARGETS: RegionalCountry[] = ["AR", "BR", "PY", "CL", "BO"];

const round = (value: number, decimals = 6): number => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const find = (quotes: RegionalQuote[], id: string): RegionalQuote | undefined =>
  quotes.find((quote) => quote.id === id);

/**
 * What one dollar buys across the border.
 *
 * The relevant side is what the counter PAYS for a dollar (`buy`), because that
 * is the side of the transaction the traveller is on. Street price first where
 * one exists, then a counter price, then the official rate as a last resort —
 * clearly worse than what a person can get, and marked as such by its market
 * name in the leg list.
 */
export function foreignPerDollar(quotes: RegionalQuote[], country: RegionalCountry): RegionalQuote | null {
  const currency = REGIONAL_COUNTRY_CURRENCY[country];
  const candidates = quotes.filter(
    (quote) => quote.country === country && quote.base === "USD" && quote.quote === currency
  );
  const preference = ["parallel", "retail", "official", "wholesale", "reference"] as const;
  for (const kind of preference) {
    const match = anchorOrder(candidates.filter((quote) => quote.kind === kind))[0];
    if (match) return match;
  }
  return null;
}

/** The price side a traveller receives when selling dollars there. */
export function receivedPerDollar(quote: RegionalQuote): number {
  return quote.buy ?? quote.avg;
}

export function compareRoutes(quotes: RegionalQuote[]): RegionalRouteComparison[] {
  const usdUy = find(quotes, "UY:casas:USDUYU");

  return TARGETS.map((country) => {
    const currency = REGIONAL_COUNTRY_CURRENCY[country];
    const missing: string[] = [];
    const routes: RegionalRoute[] = [];

    // Route A — buy the currency at a Uruguayan casa.
    const localQuote = find(quotes, `UY:casas:${currency}UYU`);
    const localSell = localQuote?.sell ?? null;
    if (localQuote && localSell !== null) {
      routes.push({
        kind: "local",
        label: `Comprar ${currency} en una casa de cambio uruguaya`,
        costPerUnit: round(localSell),
        legs: [localQuote.id],
        note: "Mejor precio de venta entre las casas uruguayas que realmente operan la moneda.",
      });
    } else {
      missing.push(`precio de venta de ${currency} en casas uruguayas`);
    }

    // Route B — buy dollars here, change them there.
    const foreign = foreignPerDollar(quotes, country);
    const usdSell = usdUy?.sell ?? null;
    if (foreign && usdSell !== null) {
      const perDollar = receivedPerDollar(foreign);
      if (perDollar > 0) {
        routes.push({
          kind: "dollars",
          label: `Comprar dólares en Uruguay y cambiarlos en ${REGIONAL_COUNTRY_NAMES[country]}`,
          costPerUnit: round(usdSell / perDollar),
          legs: [usdUy!.id, foreign.id],
          note: `Dos operaciones: ${usdSell} UYU por dólar acá y ${perDollar} ${currency} por dólar allá (${foreign.label}).`,
        });
      }
    } else {
      if (!foreign) missing.push(`precio del dólar en ${REGIONAL_COUNTRY_NAMES[country]}`);
      if (usdSell === null) missing.push("precio de venta del dólar en casas uruguayas");
    }

    const local = routes.find((route) => route.kind === "local");
    const dollars = routes.find((route) => route.kind === "dollars");
    let best: "local" | "dollars" | null = null;
    let differencePct: number | null = null;
    if (local && dollars) {
      best = local.costPerUnit <= dollars.costPerUnit ? "local" : "dollars";
      const cheaper = Math.min(local.costPerUnit, dollars.costPerUnit);
      const dearer = Math.max(local.costPerUnit, dollars.costPerUnit);
      differencePct = cheaper > 0 ? round((dearer / cheaper - 1) * 100, 4) : null;
    }

    return {
      country,
      countryName: REGIONAL_COUNTRY_NAMES[country],
      currency,
      routes,
      best,
      differencePct,
      missing,
    };
  });
}

export interface RegionalConversion {
  from: string;
  to: string;
  amount: number;
  result: number;
  /** Units of `to` per one unit of `from`. */
  rate: number;
  /** Quote ids used, in order. `via` is `USD` unless one leg is already a dollar. */
  legs: string[];
  via: string;
}

/**
 * Convert between any two currencies on the board, through the dollar.
 *
 * The dollar is the pivot for a boring reason: it is the only currency every
 * country in the region quotes directly, so every other path would need a cross
 * somebody already implied. `market` pins a specific market on the FROM side
 * (`blue`, `oficial`, ...) — the difference between converting pesos argentinos
 * at the official rate and at the blue is the whole point of the parameter.
 */
export function convert(
  quotes: RegionalQuote[],
  from: string,
  to: string,
  amount: number,
  market?: string
): RegionalConversion | null {
  const source = from.toUpperCase();
  const target = to.toUpperCase();
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (source === target) {
    return { from: source, to: target, amount, result: amount, rate: 1, legs: [], via: source };
  }

  /** Units of `currency` per dollar, from the requested market when given. */
  const perDollar = (currency: string): RegionalQuote | null => {
    if (currency === "USD") return null;
    const candidates = quotes.filter((quote) => quote.base === "USD" && quote.quote === currency);
    if (market) {
      const pinned = anchorOrder(candidates.filter((quote) => quote.market === market))[0];
      if (pinned) return pinned;
    }
    return anchorOrder(candidates.filter((quote) => quote.kind !== "card"))[0] ?? null;
  };

  if (source === "USD") {
    const leg = perDollar(target);
    if (!leg) return null;
    return {
      from: source,
      to: target,
      amount,
      result: round(amount * leg.avg, 4),
      rate: leg.avg,
      legs: [leg.id],
      via: "USD",
    };
  }

  const fromLeg = perDollar(source);
  if (!fromLeg || fromLeg.avg <= 0) return null;

  if (target === "USD") {
    const rate = round(1 / fromLeg.avg, 10);
    return { from: source, to: target, amount, result: round(amount * rate, 4), rate, legs: [fromLeg.id], via: "USD" };
  }

  const toLeg = perDollar(target);
  if (!toLeg) return null;
  const rate = round(toLeg.avg / fromLeg.avg, 10);
  return {
    from: source,
    to: target,
    amount,
    result: round(amount * rate, 4),
    rate,
    legs: [fromLeg.id, toLeg.id],
    via: "USD",
  };
}
