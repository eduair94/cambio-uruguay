import { quotesForCurrency, rankUsableQuotes, type CurrencyCode } from '../../utils/currencyPages'

/**
 * Best buy (max) or best sell (min) for a currency, optionally one origin.
 *
 * Across the market it is the price the site crowns (utils/marketOutlier.ts): an alert for "venta
 * ≤ 40,50 en cualquier casa" fired on the board frozen since July at 39,55, and then never again
 * while that board stayed frozen. A house asked for by name keeps its own price, as in the converter.
 */
export function bestRateFor(
  rows: any[],
  currency: CurrencyCode,
  kind: 'bestBuy' | 'bestSell',
  origin: string
): number | null {
  const quotes =
    origin && origin !== 'any'
      ? quotesForCurrency(rows.filter(r => r.origin === origin) as any, currency)
      : rankUsableQuotes(quotesForCurrency(rows as any, currency), currency)
  if (kind === 'bestBuy') {
    const q = quotes.find(x => x.bestBuy)
    return q?.buy ?? null
  }
  const q = quotes.find(x => x.bestSell)
  return q?.sell ?? null
}

/** Fetch today's raw quotes array from the backend API (server-side base URL). */
export async function fetchCurrentRates(): Promise<any[]> {
  const base = useRuntimeConfig().apiBaseServer
  const data = await $fetch<any>('/', { baseURL: base })
  return Array.isArray(data) ? data : []
}
