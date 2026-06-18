import { quotesForCurrency, type CurrencyCode } from '../../utils/currencyPages'

/** Best buy (max) or best sell (min) for a currency, optionally one origin. */
export function bestRateFor(
  rows: any[],
  currency: CurrencyCode,
  kind: 'bestBuy' | 'bestSell',
  origin: string
): number | null {
  const scoped = origin && origin !== 'any' ? rows.filter(r => r.origin === origin) : rows
  const quotes = quotesForCurrency(scoped as any, currency)
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
