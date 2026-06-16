// Framework-agnostic ranking math for the "¿Dónde cambiar?" (WhereToChange)
// feature. PURE functions (no Vue/Nuxt runtime, no global state) so they can be
// unit-tested in plain Node via vitest. The Vue component and the server route
// both import and reuse this — neither must duplicate the math.
//
// Types come from the shared API contract; imported relatively so this module
// stays runtime-agnostic.
import type { ExchangeRate } from '../types/api'

/** Which side of the trade the user wants to perform on the chosen currency. */
export type Operation = 'buy' | 'sell'

/**
 * Minimal quote row this module needs. `ExchangeRate` already carries optional
 * `buy`/`sell`; we keep the structural shape minimal so callers satisfy it.
 */
export type RankableRate = Pick<ExchangeRate, 'origin' | 'code' | 'buy' | 'sell' | 'name'>

/** A single ranked exchange house for a given operation and amount. */
export interface RankedHouse {
  /** Exchange house id (e.g. `'itau'`). */
  origin: string
  /** Display name of the house, falling back to `origin` when missing. */
  name: string
  /**
   * The relevant rate for the operation: `sell` price when buying the currency,
   * `buy` price when selling it.
   */
  rate: number
  /**
   * Total in UYU for the operation and amount:
   *  - `'buy'`: UYU you SPEND to buy `amount` units (= amount * sell). Lower is better.
   *  - `'sell'`: UYU you RECEIVE for selling `amount` units (= amount * buy). Higher is better.
   */
  total: number
  /**
   * Difference vs. transacting the same `amount` at the market-average rate, in UYU:
   *  - `'buy'`: UYU NOT spent vs. the average (>= 0, savings).
   *  - `'sell'`: extra UYU received vs. the average (>= 0 for the best, can be
   *    negative for below-average houses).
   */
  savingsVsAvg: number
}

/** Result of {@link rankExchanges}: the ranked list plus the market average. */
export interface RankingResult {
  /** Operation the ranking was computed for. */
  operation: Operation
  /** Currency code the ranking was computed for. */
  currency: string
  /** Amount of `currency` the user wants to buy/sell. */
  amount: number
  /** Houses sorted best-first (cheapest to buy / highest paid to sell). */
  ranked: RankedHouse[]
  /** Arithmetic mean of the relevant rate across all valid houses (0 if none). */
  marketAverage: number
}

/** Round to 2 decimals using a Number.EPSILON nudge to avoid float drift. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Rank exchange houses for buying/selling a given currency with a given amount.
 *
 * Semantics:
 *  - `'buy'`: the user BUYS `currency` from a house, paying its `sell` price.
 *    Best house = lowest `sell`. Total = `amount * sell` (UYU spent).
 *  - `'sell'`: the user SELLS `currency` to a house, receiving its `buy` price.
 *    Best house = highest `buy`. Total = `amount * buy` (UYU received).
 *
 * Only rows matching `currency` with a positive relevant rate are considered.
 * The market average is the arithmetic mean of the relevant rate across those
 * rows. `savingsVsAvg` is the per-house benefit vs. transacting at that average.
 *
 * Sorting is deterministic and stable on ties: primary key is the rate (best
 * first), secondary key is `origin` ascending so equal rates keep a fixed order.
 *
 * @returns a strictly-typed {@link RankingResult}; `ranked` is empty and
 * `marketAverage` is 0 when there is no usable data.
 */
export function rankExchanges(
  rows: readonly RankableRate[],
  currency: string,
  operation: Operation,
  amount: number
): RankingResult {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0

  const base: RankingResult = {
    operation,
    currency,
    amount: safeAmount,
    ranked: [],
    marketAverage: 0,
  }

  if (!rows.length || !currency) return base

  // Pick the rate relevant to the operation and keep only positive quotes.
  const candidates = rows
    .filter(r => r.code === currency)
    .map(r => ({
      origin: r.origin,
      name: r.name && r.name.trim() ? r.name : r.origin,
      rate: operation === 'buy' ? (r.sell ?? 0) : (r.buy ?? 0),
    }))
    .filter(c => c.rate > 0)

  if (!candidates.length) return base

  const marketAverage = candidates.reduce((sum, c) => sum + c.rate, 0) / candidates.length

  // Best first: lowest sell when buying, highest buy when selling. Tie-break on
  // origin for a stable, reproducible order.
  const sorted = [...candidates].sort((a, b) => {
    const byRate = operation === 'buy' ? a.rate - b.rate : b.rate - a.rate
    if (byRate !== 0) return byRate
    return a.origin.localeCompare(b.origin)
  })

  const ranked: RankedHouse[] = sorted.map(c => {
    const total = round2(safeAmount * c.rate)
    // Buying: saving = UYU not spent vs avg (avg - rate, positive when cheaper).
    // Selling: benefit = extra UYU received vs avg (rate - avg).
    const perUnit = operation === 'buy' ? marketAverage - c.rate : c.rate - marketAverage
    return {
      origin: c.origin,
      name: c.name,
      rate: c.rate,
      total,
      savingsVsAvg: round2(perUnit * safeAmount),
    }
  })

  return { operation, currency, amount: safeAmount, ranked, marketAverage }
}
