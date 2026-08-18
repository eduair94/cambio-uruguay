// Which USD pair the OG image and the embeddable widget are allowed to publish.
//
// PURE (no Vue/Nuxt imports) so it is unit-testable in plain Node, and so the
// Nitro handler in server/api/og-rate.get.ts can import it directly.
import { offMarketDetector } from './marketOutlier'

export interface OgRatePair {
  /** Best price a house pays for your USD — the highest trustworthy buy. */
  buy: number | null
  /** Best price you pay for USD — the lowest trustworthy sell. */
  sell: number | null
}

interface UsdQuote {
  origin?: string
  code?: string
  type?: string
  buy?: number | null
  sell?: number | null
}

const isPrice = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

/**
 * Pick the market's best buy and best sell from a full rate feed.
 *
 * Two quotes are dropped before the extremes are taken:
 *  - the BCU reference and every typed (interbank / preferential) row, because
 *    the public cannot transact at them;
 *  - boards the shared {@link offMarketDetector} calls off-market.
 *
 * The outlier pass is the part that matters. Taking a raw `max(buy)` and
 * `min(sell)` across ~42 houses reads one extreme off each tail, so a single
 * stale board poisons the pair: a house quoting 37,15/39,55 against medians of
 * 39,05/41,45 handed the OG image a "compra 40,20 / venta 39,55" — a pair no
 * market can produce, since it would mean buying a dollar cheaper than the
 * price someone else pays for it. Sharing the site's one definition of
 * off-market (rather than inventing a second threshold here) is what keeps this
 * pair agreeing with /pizarra and /casas-de-cambio.
 */
export function bestUsdPair(rates: readonly UsdQuote[]): OgRatePair {
  const usd = rates.filter(r => r.code === 'USD' && !r.type && r.origin !== 'bcu')
  const isOffMarket = offMarketDetector(usd)
  const trusted = usd.filter(r => !isOffMarket(r))

  const buys = trusted.map(r => r.buy).filter(isPrice)
  const sells = trusted.map(r => r.sell).filter(isPrice)

  return {
    buy: buys.length ? Math.max(...buys) : null,
    sell: sells.length ? Math.min(...sells) : null,
  }
}
