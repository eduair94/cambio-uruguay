// Uruguay — this site's own board.
//
// The regional comparison is only worth anything if Uruguay is on it with the
// same rigour as its neighbours, and Uruguay is the one country where we are not
// reading somebody else's summary: we scrape ~46 casas every five minutes. So
// the UY row is built from our own rows, not from a third-party aggregate.
//
// Two rules, both learned from `/dolar-blue-hoy`:
//
//   * The public price is the BEST price, not an average — a comparator that
//     reports the mean of a market it has already ranked is throwing away the
//     only thing it knows better than anyone else. `buy` is the highest a casa
//     pays, `sell` the lowest a casa charges; they usually come from DIFFERENT
//     casas, which is exactly what somebody comparing routes should see. It also
//     means the row can cross — measured on the live board, the best dollar bid
//     (40,00) sat ABOVE the cheapest ask (39,55, a small casa with a wide
//     spread). That is a real, observable state of a fragmented market, so the
//     validator tolerates a slightly negative spread on principle rather than
//     discarding the row as malformed.
//   * The non-USD boards are mostly stale signage. Of the ~39 casas that print a
//     peso-argentino price, roughly half are off by multiples: they do not trade
//     the currency and leave the sign up for months. So every currency is
//     filtered against the MEDIAN of the casas quoting it before a best price is
//     taken. The median is the market; a board 40% away from it is not a
//     competitive offer, it is an unmaintained sign.
//
// The BCU's official rate rides along as a separate, clearly-official row —
// never mixed into the casa numbers, because nobody can transact at it.
import { isPublicRate, BCU_ORIGIN } from "../../rate_source";
import { makeQuote } from "../quote";
import type { RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "uy_local",
  name: "cambio-uruguay.com",
  country: "UY",
  url: "https://cambio-uruguay.com/",
  access: "api",
  publisher: "market-data",
  covers: "El mejor precio de mostrador entre ~46 casas de cambio uruguayas, más la cotización oficial del BCU. Datos propios, actualizados cada 5 minutos.",
};

/** Minimal row shape: whatever `cambio_info.get_data()` returns. */
export interface LocalRateRow {
  origin?: string;
  code: string;
  type?: string;
  buy: number;
  sell: number;
}

/** Currencies the regional board carries a Uruguayan price for. */
const CURRENCIES: Record<string, string> = {
  USD: "Dólar en casas uruguayas (mejor precio)",
  EUR: "Euro en casas uruguayas (mejor precio)",
  BRL: "Real en casas uruguayas (mejor precio)",
  ARS: "Peso argentino en casas uruguayas (mejor precio)",
  PYG: "Guaraní en casas uruguayas (mejor precio)",
  CLP: "Peso chileno en casas uruguayas (mejor precio)",
};

/**
 * A quote further than this FACTOR from the market median is not a price for
 * this currency — it is a sign nobody updated.
 *
 * Deliberately a factor and not a percentage. The failure it exists to catch is
 * an order-of-magnitude one: casas that stopped trading Argentine pesos leave
 * boards up quoting eleven times the market. Anything tighter starts deciding
 * which honest casa is "too competitive", and measured against the live board
 * every tighter rule tried did exactly that: the median bid for the peso is a
 * round 0,02 shared by most of the market, so a deviation-based threshold
 * collapses onto it and throws away the casas actually bidding 0,0247.
 */
const MEDIAN_FACTOR = 2;

export function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const withinTolerance = (value: number, reference: number): boolean =>
  value >= reference / MEDIAN_FACTOR && value <= reference * MEDIAN_FACTOR;

/** Pure builder, so tests never need Mongo. `rows` is one Montevideo day's board. */
export function buildUyQuotes(rows: LocalRateRow[], now = new Date()): RegionalQuote[] {
  const quotes: RegionalQuote[] = [];
  const at = now.toISOString();

  for (const [code, label] of Object.entries(CURRENCIES)) {
    const board = rows.filter(
      (row) => String(row.code || "").toUpperCase() === code && isPublicRate(row) && row.buy > 0 && row.sell > 0
    );
    if (!board.length) continue;

    // Each side is judged against ITS OWN median, never against the other's.
    // The minor-currency spreads here are enormous — the market median for the
    // Argentine peso is 0,02 bid against 0,05 ask, a 150% spread — so measuring
    // a bid against the ask median throws out every honest casa on the board.
    // (Measured live: doing it wrong left the peso row with no bids at all.)
    const sellReference = median(board.map((row) => row.sell));
    const buyReference = median(board.map((row) => row.buy));
    if (sellReference === null || buyReference === null) continue;
    const plausible = board.filter(
      (row) => withinTolerance(row.sell, sellReference) && withinTolerance(row.buy, buyReference)
    );
    if (!plausible.length) continue;

    const quote = makeQuote({
      country: "UY",
      market: "casas",
      label,
      kind: "retail",
      base: code,
      quote: "UYU",
      buy: Math.max(...plausible.map((row) => row.buy)),
      sell: Math.min(...plausible.map((row) => row.sell)),
      sample: plausible.length,
      updatedAt: at,
      source: meta.id,
      sourceUrl: `https://cambio-uruguay.com/cotizacion/${code.toLowerCase()}`,
    });
    if (quote) quotes.push(quote);
  }

  // The BCU reference, kept apart from the casa prices on purpose. It publishes
  // the dollar under three type names (BILLETE, CABLE, PROMED.FONDO) carrying the
  // SAME value with no spread — `BILLETE` is the cash one, so that is the one
  // named, and the others are the same number under another label.
  const bcuRows = rows.filter(
    (row) => row.origin === BCU_ORIGIN && String(row.code || "").toUpperCase() === "USD" && row.sell > 0
  );
  const bcuUsd = bcuRows.find((row) => row.type === "BILLETE") ?? bcuRows[0];
  if (bcuUsd) {
    const quote = makeQuote({
      country: "UY",
      market: "bcu",
      label: "Dólar interbancario BCU (referencia oficial)",
      kind: "official",
      base: "USD",
      quote: "UYU",
      buy: bcuUsd.buy,
      sell: bcuUsd.sell,
      updatedAt: at,
      source: meta.id,
      sourceUrl: "https://cambio-uruguay.com/estado",
    });
    if (quote) quotes.push(quote);
  }

  return quotes;
}
