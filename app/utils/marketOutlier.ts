// One definition of "this quote is too far from the market to be trusted",
// shared by the /casas-de-cambio comparison and the /pizarra board so the two
// can never disagree about which prices are safe to crown.
//
// PURE (no Vue/Nuxt imports) so it is unit-testable in plain Node.

/**
 * How far from the market median a quote may sit before we stop treating it as
 * a price and start treating it as a suspect scrape.
 *
 * Calibrated against a live 45-house USD snapshot: at 2% eight houses trip
 * (normal competition), at 3% exactly one does — a board whose buy AND sell are
 * both ~4.7% below the median, the signature of a stale or misparsed pizarra
 * rather than an aggressive price.
 */
export const OFF_MARKET_PCT = 3

/**
 * Below this many quotes a median means nothing, so nothing is flagged. A thin
 * market (ARS, or a currency only two houses quote) must never have one of its
 * two prices dismissed as an outlier.
 */
export const MIN_SAMPLE = 10

/** Median of a numeric list; null when empty. */
export function median(values: readonly number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/** True when `value` sits further than {@link OFF_MARKET_PCT} from `reference`. */
export function deviatesFrom(value: number, reference: number | null): boolean {
  if (reference === null || reference === 0) return false
  return (Math.abs(value - reference) / reference) * 100 > OFF_MARKET_PCT
}

/**
 * Build an "is this quote off-market?" predicate for one currency's quotes.
 *
 * Median, not mean: one badly-parsed board must not drag the reference it is
 * being judged against. Returns a predicate that is always false when the
 * sample is too thin to judge.
 */
export function offMarketDetector(
  quotes: ReadonlyArray<{ buy?: number | null; sell?: number | null }>
): (q: { buy?: number | null; sell?: number | null }) => boolean {
  const buys = quotes.map(q => q.buy).filter((n): n is number => typeof n === 'number' && n > 0)
  const sells = quotes.map(q => q.sell).filter((n): n is number => typeof n === 'number' && n > 0)
  if (quotes.length < MIN_SAMPLE) return () => false
  const medianBuy = median(buys)
  const medianSell = median(sells)
  return q => {
    const buyOff = typeof q.buy === 'number' && q.buy > 0 && deviatesFrom(q.buy, medianBuy)
    const sellOff = typeof q.sell === 'number' && q.sell > 0 && deviatesFrom(q.sell, medianSell)
    return buyOff || sellOff
  }
}
