// Framework-agnostic conversion + formatting math for the "Cambio Rápido" card.
//
// These are PURE functions (no Vue/Nuxt runtime, no global state) so they can be
// unit-tested in plain Node via vitest. The Vue component (`pages/index.vue`)
// imports and reuses them — it must NOT duplicate this math.
//
// Types come from the shared API contract; imported relatively so this module
// stays runtime-agnostic.
import type { ExchangeRate } from '../types/api'

/** Base currency of the market: every quote is expressed against UYU. */
export const BASE_CURRENCY = 'UYU' as const

/**
 * A single quote row reduced to the fields the converter needs. `ExchangeRate`
 * already carries optional `buy`/`sell`; we keep the structural shape minimal so
 * callers (incl. the enriched `ExchangeItem` in the page) satisfy it.
 */
export type RateRow = Pick<ExchangeRate, 'origin' | 'code' | 'buy' | 'sell'>

/**
 * Resolve the conversion rate from `fromCurrency` to `toCurrency`.
 *
 * Semantics (kept identical to the original component logic):
 *  - `X -> UYU`: the user SELLS X, so we use the highest `buy` quote (best for the
 *    seller). Result = units of UYU per 1 X.
 *  - `UYU -> X`: the user BUYS X, so we use the lowest `sell` quote (best for the
 *    buyer). Result = units of X per 1 UYU = `1 / sell`.
 *  - cross-currency `X -> Y` (neither is UYU): routed through UYU, i.e.
 *    `(X -> UYU) * (UYU -> Y)`.
 *  - identical currencies return `1`.
 *
 * When `houseOrigin` is provided (anything other than `'best'`), only quotes from
 * that exchange house are considered. Missing data yields `0`.
 *
 * @returns the rate as a non-negative number (`0` when it cannot be computed).
 */
export function getExchangeRate(
  rows: readonly RateRow[],
  fromCurrency: string,
  toCurrency: string,
  houseOrigin: string = 'best'
): number {
  if (!rows.length) return 0
  if (fromCurrency === toCurrency) return 1

  const inHouse = (row: RateRow): boolean => houseOrigin === 'best' || row.origin === houseOrigin

  // X -> UYU : sell X to a house (use its buy price), pick the highest.
  if (toCurrency === BASE_CURRENCY) {
    let best = 0
    for (const row of rows) {
      if (!inHouse(row)) continue
      if (row.code !== fromCurrency) continue
      const buy = row.buy ?? 0
      if (buy > best) best = buy
    }
    return best
  }

  // UYU -> X : buy X from a house (use its sell price), pick the lowest.
  if (fromCurrency === BASE_CURRENCY) {
    let bestSell = 0
    for (const row of rows) {
      if (!inHouse(row)) continue
      if (row.code !== toCurrency) continue
      const sell = row.sell ?? 0
      if (sell <= 0) continue
      if (bestSell === 0 || sell < bestSell) bestSell = sell
    }
    return bestSell > 0 ? 1 / bestSell : 0
  }

  // Cross-currency: route through UYU.
  const fromToBase = getExchangeRate(rows, fromCurrency, BASE_CURRENCY, houseOrigin)
  const baseToTarget = getExchangeRate(rows, BASE_CURRENCY, toCurrency, houseOrigin)
  return fromToBase * baseToTarget
}

/** Round to 2 decimals using a Number.EPSILON nudge to avoid float drift. */
export function round2(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

/** Full forward/reverse conversion result for an amount and currency pair. */
export interface ConversionResult {
  /** Rate from -> to (units of `to` per 1 `from`). */
  rate: number
  /** 1 / rate (units of `from` per 1 `to`), or 0 when rate is 0. */
  invertedRate: number
  /** `amount` converted into the target currency, rounded to 2 decimals. */
  convertedAmount: number
  /** Rate to -> from (units of `from` per 1 `to`). */
  reverseRate: number
}

/**
 * Compute the forward conversion of `amount` from `fromCurrency` to
 * `toCurrency`, plus the inverse/reverse rates used by the UI.
 */
export function convert(
  rows: readonly RateRow[],
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  houseOrigin: string = 'best'
): ConversionResult {
  const rate = getExchangeRate(rows, fromCurrency, toCurrency, houseOrigin)
  const reverseRate = getExchangeRate(rows, toCurrency, fromCurrency, houseOrigin)
  return {
    rate,
    invertedRate: rate > 0 ? 1 / rate : 0,
    convertedAmount: round2(Number(amount) * rate),
    reverseRate,
  }
}

/**
 * Market-average savings of the best rate vs. the average across all houses for
 * a given currency, for a specific amount.
 *
 * Direction:
 *  - `'sell'`: user sells `currency` for UYU; "best" = highest buy, savings is
 *    the extra UYU received vs. selling at the average buy.
 *  - `'buy'`: user buys `currency` with UYU; "best" = lowest sell, savings is the
 *    UYU NOT spent vs. buying at the average sell (for the same quantity of
 *    `currency` that `amount` UYU buys at the best rate).
 *
 * @returns savings in UYU (>= 0), the best rate, and the market-average rate.
 * Returns zeros when there is insufficient data.
 */
export interface SavingsResult {
  /** Money saved (in UYU) vs. transacting at the market average. */
  savings: number
  /** Best rate available for the direction. */
  bestRate: number
  /** Arithmetic mean rate across all houses quoting this currency. */
  averageRate: number
}

export function marketAverageSavings(
  rows: readonly RateRow[],
  currency: string,
  amount: number,
  direction: 'buy' | 'sell'
): SavingsResult {
  const empty: SavingsResult = { savings: 0, bestRate: 0, averageRate: 0 }
  if (!rows.length || currency === BASE_CURRENCY) return empty

  if (direction === 'sell') {
    // Houses' buy prices for this currency.
    const buys = rows.filter(r => r.code === currency && (r.buy ?? 0) > 0).map(r => r.buy as number)
    if (buys.length < 2) return { ...empty, bestRate: buys[0] ?? 0, averageRate: buys[0] ?? 0 }

    const bestRate = Math.max(...buys)
    const averageRate = buys.reduce((sum, v) => sum + v, 0) / buys.length
    const savings = round2((bestRate - averageRate) * Number(amount))
    return { savings: Math.max(0, savings), bestRate, averageRate }
  }

  // direction === 'buy': houses' sell prices for this currency.
  const sells = rows
    .filter(r => r.code === currency && (r.sell ?? 0) > 0)
    .map(r => r.sell as number)
  if (sells.length < 2) return { ...empty, bestRate: sells[0] ?? 0, averageRate: sells[0] ?? 0 }

  const bestRate = Math.min(...sells)
  const averageRate = sells.reduce((sum, v) => sum + v, 0) / sells.length
  // Quantity of `currency` that `amount` UYU buys at the best (lowest sell) rate.
  const quantity = Number(amount) / bestRate
  // Saving = (avg - best) cost per unit * quantity.
  const savings = round2((averageRate - bestRate) * quantity)
  return { savings: Math.max(0, savings), bestRate, averageRate }
}

/**
 * Format a numeric amount with es-UY thousands/decimal separators
 * (e.g. `1000.5` -> `"1.000,50"`). No currency symbol — purely the number.
 *
 * `maximumFractionDigits` defaults to 2; pass `0` for whole-number presets.
 */
export function formatAmount(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return ''
  return new Intl.NumberFormat('es-UY', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value)
}

/**
 * Parse a user-typed amount string (es-UY style, with `.` thousands and `,`
 * decimals, or a plain JS number string) back into a number.
 * Returns `0` for empty/invalid input.
 *
 * Examples: `"1.000,50" -> 1000.5`, `"1234.5" -> 1234.5`, `"" -> 0`.
 */
export function parseAmount(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0

  const trimmed = raw.trim()
  if (!trimmed) return 0

  const hasComma = trimmed.includes(',')
  // If a comma is present we treat it as the es-UY decimal separator: drop dot
  // thousands separators, convert comma to a dot. Otherwise keep dots as-is
  // (plain JS number string).
  const normalized = hasComma ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}
