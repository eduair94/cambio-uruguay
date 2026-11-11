// One definition of "this quote is too far from the market to be trusted",
// shared by every page that names the best price of a currency (the home,
// /pizarra, /casas-de-cambio, /cotizacion, /mejor-casa-de-cambio, the FAQ, the
// OG card, the newsletter, the recommender) so they can never disagree about
// which prices are safe to crown.
//
// PURE (no Vue/Nuxt imports) so it is unit-testable in plain Node.

/**
 * How far from the market median a quote may sit before we stop treating it as
 * a price and start treating it as a suspect scrape — the band for the dollar
 * and for any currency without one of its own (see {@link OFF_MARKET_BANDS}).
 *
 * Calibrated against a live 45-house USD snapshot: at 2% eight houses trip
 * (normal competition), at 3% exactly one does — a board whose buy AND sell are
 * both ~4.7% below the median, the signature of a stale or misparsed pizarra
 * rather than an aggressive price.
 */
export const OFF_MARKET_PCT = 3

/**
 * Below this many quotes a median means nothing, so nothing is flagged. A
 * currency only a handful of houses quote must never have one of its few prices
 * dismissed as an outlier.
 */
export const MIN_SAMPLE = 10

/** Which price of a board is being judged: what the house pays, or what it charges. */
export type QuoteSide = 'buy' | 'sell'

/**
 * How far a quote may sit from its side's median: a percentage either way, or a
 * factor (at most `factor` times the median and at least the median over `factor`).
 */
export type MarketBand = { pct: number } | { factor: number }

/**
 * The band of each currency and side. Measured on 55 public snapshots, one every
 * three days from 2026-06-01 to 2026-11-10: the band has to keep the best LIVE
 * board of every day (one whose price moved within the previous ~15 days) and
 * leave out what is not a price. One band did not fit all of them:
 *
 * - USD sell, 3 %: the board frozen since July at 39,55 sits 4,2–5,2 % under the
 *   median sell; the cheapest live board never went past −2,8 %.
 * - USD buy, 4 %: the casas with a narrow spread buy 3,1–3,3 % above a median
 *   the wide-spread majority keeps low, and they are live (cambial, fénix,
 *   principal on 5 of the 55 days). At 3 % they lost the best buy.
 * - EUR, 3 %: leaves out the buys that sat 3,7–7,7 % up for months unchanged
 *   (cambio_principal's 45–48); no wider band separates those from the live ones.
 * - BRL, 12 %: four live casas sell 4,7–6,3 % under the median and buy up to
 *   8 % above it, every day. At 3 % the best live board was lost on 55 of 55
 *   days; at 12 %, on none.
 * - ARS, ×2: quoted to the cent (0,02 / 0,03 / 0,05), where a percentage means
 *   nothing — 0,03 is 40 % under a 0,05 median and real. The factor only drops
 *   tradelix's 0,15 buy against a 0,02 median, which is not a price.
 */
export const OFF_MARKET_BANDS: Readonly<Record<string, Readonly<Record<QuoteSide, MarketBand>>>> =
  Object.freeze({
    USD: { sell: { pct: OFF_MARKET_PCT }, buy: { pct: 4 } },
    EUR: { sell: { pct: OFF_MARKET_PCT }, buy: { pct: OFF_MARKET_PCT } },
    BRL: { sell: { pct: 12 }, buy: { pct: 12 } },
    ARS: { sell: { factor: 2 }, buy: { factor: 2 } },
  })

const DEFAULT_BAND: MarketBand = { pct: OFF_MARKET_PCT }

/** The band a currency's side is judged with. */
export function bandFor(code: string | null | undefined, side: QuoteSide): MarketBand {
  return (code && OFF_MARKET_BANDS[code.toUpperCase()]?.[side]) || DEFAULT_BAND
}

/** Median of a numeric list; null when empty. */
export function median(values: readonly number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/** True when `value` sits outside `band` around `reference` (by default, {@link OFF_MARKET_PCT}). */
export function deviatesFrom(
  value: number,
  reference: number | null,
  band: MarketBand = DEFAULT_BAND
): boolean {
  if (reference === null || reference === 0) return false
  if ('factor' in band) return value > reference * band.factor || value < reference / band.factor
  return (Math.abs(value - reference) / reference) * 100 > band.pct
}

type Quote = { buy?: number | null; sell?: number | null }

const price = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null

/**
 * Build an "is this price off-market?" predicate for ONE side of one currency.
 *
 * The side being crowned is the only one judged. The cheapest seller is chosen
 * by its sell and the best payer by its buy: a narrow-spread casa whose buy sits
 * high is still a real place to buy at its sell, and the other way round. Judging
 * both sides at once lost those answers.
 *
 * Median, not mean: one badly-parsed board must not drag the reference it is
 * being judged against. Always false when the sample is too thin to judge.
 *
 * @param quotes the whole market for `code`, one quote per board — pass the
 *   national market even when the ranking is over a department or a channel,
 *   or a small subset would never flag anything.
 */
export function offMarketSide(
  quotes: ReadonlyArray<Quote>,
  code: string,
  side: QuoteSide
): (q: Quote) => boolean {
  if (quotes.length < MIN_SAMPLE) return () => false
  const reference = median(quotes.map(q => price(q[side])).filter((n): n is number => n !== null))
  const band = bandFor(code, side)
  return q => {
    const value = price(q[side])
    return value !== null && deviatesFrom(value, reference, band)
  }
}

/**
 * Build an "is this board off-market?" predicate: true when EITHER side is. For
 * labelling a board as suspect; to pick a best price use {@link offMarketSide}.
 */
export function offMarketDetector(
  quotes: ReadonlyArray<Quote>,
  code: string
): (q: Quote) => boolean {
  const buyOff = offMarketSide(quotes, code, 'buy')
  const sellOff = offMarketSide(quotes, code, 'sell')
  return q => buyOff(q) || sellOff(q)
}
