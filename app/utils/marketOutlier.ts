// One definition of "this price is too good to be a market price", shared by every page that
// names the best price of a currency (the home, /pizarra, /casas-de-cambio, /cotizacion,
// /mejor-casa-de-cambio, the FAQ, the OG card, the newsletter, the recommender, the map, the
// rate alerts) so they can never disagree about which prices are safe to crown.
//
// PURE (no Vue/Nuxt imports) so it is unit-testable in plain Node.

/**
 * How far past the market median a price may sit before we stop treating it as a price and start
 * treating it as a suspect scrape — the band of the dollar's sell and of any currency without one
 * of its own (see {@link OFF_MARKET_BANDS}).
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
 * How far past its side's median a price may go: a percentage, or a factor (a sell down to the
 * median over `factor`, a buy up to the median times `factor`).
 */
export type MarketBand = { pct: number } | { factor: number }

/**
 * The band of each currency and side. Measured on 55 public snapshots (`GET /?date=`), one every
 * three days from 2026-06-01 to 2026-11-10: the band has to keep the best live board of the day
 * and leave out what is not a price. One band did not fit all of them:
 *
 * - USD sell, 3 %: the board frozen since July at 39,55 sits 4,2–5,2 % under the median sell; the
 *   cheapest live board went no further than −2,4 %.
 * - USD buy, 4 %: the casas with a narrow spread buy 3,1–3,3 % above a median the wide-spread
 *   majority keeps low, and they are live (cambial, fénix and principal, on 4 of the 55 days). At
 *   3 % they lost the best buy.
 * - EUR sell, 3 %: sells left unchanged for weeks sit within 0,5–1 % of the best live one and win
 *   on 6 of the 55 days. No band separates them: that takes the board's own history, which is why
 *   the rule also reads the backend's `frozen` mark (see {@link offMarketSide}).
 * - EUR buy, 3,5 %: leaves out cambio_principal's 45–48, 3,7–7,7 % over the median for months. At
 *   3 % it also lost the best live buy on about half the days (fortex and nonica buy 3,1–3,9 %
 *   up); at 3,5 % it misses it on 4 days by at most 1,1 %, and a board unchanged for weeks, within
 *   1 % of the live one, wins on 7. Same limit as the sell, and the same answer: the `frozen` mark.
 * - BRL, 12 % sell and 15 % buy: four live casas sell 4,1–7,5 % under the median and buy up to
 *   11,8 % over it. At 3 % the best live board was lost on 55 of 55 days.
 * - ARS, ×4 sell and ×2 buy: quoted to the cent (0,02 / 0,03 / 0,05), where a percentage means
 *   nothing — 0,03 is 40 % under a 0,05 median and real. The buy factor drops tradelix's 0,15
 *   against a 0,02 median. The sells come in two clusters, casas at 0,03–0,08 and banks at
 *   0,20–0,55, and the median sits in the casas' only because they are more: it reached 1,67 times
 *   the cheapest sell, so ×2 would have been one step from dropping the real ones. ×4 still catches
 *   a misplaced comma. If the banks ever outnumber the casas, the median moves to their cluster and
 *   this band starts dropping the casas' 0,03 and the site would name a bank's 0,20 the cheapest.
 */
export const OFF_MARKET_BANDS: Readonly<Record<string, Readonly<Record<QuoteSide, MarketBand>>>> =
  Object.freeze({
    USD: { sell: { pct: OFF_MARKET_PCT }, buy: { pct: 4 } },
    EUR: { sell: { pct: OFF_MARKET_PCT }, buy: { pct: 3.5 } },
    BRL: { sell: { pct: 12 }, buy: { pct: 15 } },
    ARS: { sell: { factor: 4 }, buy: { factor: 2 } },
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

/**
 * True when `value` is better for the customer than `band` allows around `reference`: a sell
 * that cheap, or a buy that generous.
 *
 * Only that direction. The rule exists so a price is never crowned, and a price worse than the
 * market cannot be: BROU selling the Argentine peso at 0,30 is a real (bad) price, not an error,
 * and calling it "off-market" also took it out of every count of the casas that quote it.
 */
export function pastBand(
  value: number,
  reference: number | null,
  side: QuoteSide,
  band: MarketBand = DEFAULT_BAND
): boolean {
  if (reference === null || reference === 0) return false
  if ('factor' in band) {
    return side === 'sell' ? value < reference / band.factor : value > reference * band.factor
  }
  const pct = ((value - reference) / reference) * 100
  return side === 'sell' ? pct < -band.pct : pct > band.pct
}

/**
 * A quote as the rule reads it. `frozen` is the backend's mark (classes/frozen_marks.ts): this
 * exact board, on this currency and type, has published the same buy and sell for days beyond what
 * its own group considers normal (`rate_staleness.ts`). Only today's rows carry it.
 */
type Quote = { buy?: number | null; sell?: number | null; frozen?: boolean | null }

const price = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null

/** The band half of the rule: a price past its side's band around the market median. */
function bandSide(
  quotes: ReadonlyArray<Quote>,
  code: string,
  side: QuoteSide
): (q: Quote) => boolean {
  if (quotes.length < MIN_SAMPLE) return () => false
  const reference = median(quotes.map(q => price(q[side])).filter((n): n is number => n !== null))
  const band = bandFor(code, side)
  return q => {
    const value = price(q[side])
    return value !== null && pastBand(value, reference, side, band)
  }
}

/** The best price on `side` among the boards that are neither frozen nor rejected, or null. */
function bestLive(
  quotes: ReadonlyArray<Quote>,
  side: QuoteSide,
  rejected: (q: Quote) => boolean
): number | null {
  let best: number | null = null
  for (const q of quotes) {
    if (q.frozen === true || rejected(q)) continue
    const value = price(q[side])
    if (value === null) continue
    if (best === null || (side === 'sell' ? value < best : value > best)) best = value
  }
  return best
}

/** A frozen board whose price on `side` matches or beats `best`: the one place it does harm. */
function aheadOf(q: Quote, side: QuoteSide, best: number | null): boolean {
  if (q.frozen !== true || best === null) return false
  const value = price(q[side])
  return value !== null && (side === 'sell' ? value <= best : value >= best)
}

/**
 * Build an "is this price off-market?" predicate for ONE side of one currency.
 *
 * The side being crowned is the only one judged. The cheapest seller is chosen
 * by its sell and the best payer by its buy: a narrow-spread casa whose buy sits
 * high is still a real place to buy at its sell, and the other way round. Judging
 * both sides at once lost those answers.
 *
 * Median, not mean: one badly-parsed board must not drag the reference it is
 * being judged against. The band stands down when the sample is too thin to judge.
 *
 * Two ways to be rejected:
 * - past the band of the currency's side ({@link OFF_MARKET_BANDS});
 * - frozen (the backend's mark, see {@link Quote}) AND matching or beating the best live price on
 *   that side. A frozen board does not stay put in the ranking, it climbs it: the market moves and
 *   it does not, so it drifts to an end of the distribution, and the site sorts by "cheapest". On
 *   2026-11-11 cambio_principal's euro buy, the same 45 for 100 days, was the best buy on the site
 *   inside the 3,5 % band. Only that case: a frozen board behind the best live one stays counted
 *   and ranked, because a quiet board can be a real price (a small casa in a calm week), and a
 *   quarter of every market is quiet — taking them out of "Nº de N casas" would be another error.
 *
 * @param quotes the whole market for `code`, one quote per board — pass the
 *   national market even when the ranking is over a department or a channel,
 *   or a small subset would never flag anything.
 * @param code the currency, which picks the band ({@link bandFor}).
 * @param side the side being crowned.
 * @param within what is being ranked, when it is a subset of `quotes` (a department, a channel, a
 *   filtered list). The band is the market's, but "the best live price" a frozen board must not
 *   match is the subset's: against the national best only, a frozen board that is merely the best
 *   of its department would still head that department's page. A subset with no live board at all
 *   (a department whose only casa is frozen) falls back to the market's best.
 */
export function offMarketSide(
  quotes: ReadonlyArray<Quote>,
  code: string,
  side: QuoteSide,
  within: ReadonlyArray<Quote> = quotes
): (q: Quote) => boolean {
  const band = bandSide(quotes, code, side)
  const best = bestLive(within, side, band) ?? bestLive(quotes, side, band)
  return q => band(q) || aheadOf(q, side, best)
}

/**
 * The frozen boards that match or beat the best live price of `within` on `side`, for a list that
 * has already been through {@link offMarketSide} against the national market (a radius on the map,
 * the filtered slice of a table) and is crowned again inside itself.
 */
export function frozenAheadIn(
  within: ReadonlyArray<Quote>,
  side: QuoteSide
): (q: Quote) => boolean {
  const best = bestLive(within, side, () => false)
  return q => aheadOf(q, side, best)
}

/**
 * The items that may be crowned on `side`, best first: a positive price the market does not
 * reject. `market` is the whole market for `code`, one quote per board, even when `items` is a
 * department, a channel or a list with several rows per house.
 */
export function crownable<T extends Quote>(
  items: readonly T[],
  market: ReadonlyArray<Quote>,
  code: string,
  side: QuoteSide
): T[] {
  const isOff = offMarketSide(market, code, side, items)
  return items
    .filter(item => price(item[side]) !== null && !isOff(item))
    .sort((a, b) => (side === 'sell' ? a.sell! - b.sell! : b.buy! - a.buy!))
}
