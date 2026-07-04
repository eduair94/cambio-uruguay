// Data + helpers for the /casas-de-cambio directory/comparison page.
// PURE (no Vue/Nuxt imports) so unit tests and server code can import freely.

export interface UsdRateRow {
  origin: string
  code: string
  type?: string | null
  buy: number
  sell: number
  isInterBank?: boolean
}

export interface UsdComparisonEntry {
  origin: string
  buy: number
  sell: number
  type: string
  /** Buy/sell spread as % of the midpoint — lower = cheaper round trip. */
  spreadPct: number
  /** How much more expensive this house's sell is vs the best sell (%; 0 = best). */
  gapSellPct: number
  /** How much less this house pays on buy vs the best buy (%; 0 = best). */
  gapBuyPct: number
}

/**
 * Type preference when a house quotes USD several ways: the plain cash quote
 * (`''`) is the walk-in rate, `BILLETE` is the bank equivalent, anything else
 * (EBROU, ewallet promos, ...) only applies under conditions, so it ranks last.
 */
const typeRank = (t: string): number => (t === '' ? 0 : t === 'BILLETE' ? 1 : 2)

/**
 * Reduce processed exchange rows to one USD cash quote per origin, with
 * spread and gap-to-best metrics for the comparison table.
 */
export function buildUsdComparison(rows: UsdRateRow[]): UsdComparisonEntry[] {
  const byOrigin = new Map<string, UsdRateRow & { type: string }>()
  for (const r of rows) {
    if (r.code !== 'USD' || r.isInterBank || !(r.buy > 0) || !(r.sell > 0)) continue
    const t = r.type ?? ''
    const prev = byOrigin.get(r.origin)
    if (
      !prev ||
      typeRank(t) < typeRank(prev.type) ||
      (typeRank(t) === typeRank(prev.type) && r.sell < prev.sell)
    ) {
      byOrigin.set(r.origin, { ...r, type: t })
    }
  }
  const picked = [...byOrigin.values()]
  if (picked.length === 0) return []
  const bestSell = Math.min(...picked.map(r => r.sell))
  const bestBuy = Math.max(...picked.map(r => r.buy))
  return picked.map(r => ({
    origin: r.origin,
    buy: r.buy,
    sell: r.sell,
    type: r.type,
    spreadPct: ((r.sell - r.buy) / ((r.sell + r.buy) / 2)) * 100,
    gapSellPct: ((r.sell - bestSell) / bestSell) * 100,
    gapBuyPct: ((bestBuy - r.buy) / bestBuy) * 100,
  }))
}
