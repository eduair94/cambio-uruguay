import type { ExchangeRate } from '~/types/api'
import { quotesForCurrency, type CurrencyCode } from '~/utils/currencyPages'
import { publicRates } from '~/utils/rateSource'

/**
 * Shared, SSR-friendly access to today's processed exchange rates for the
 * calculator / conversion tools. Fetches once (deduped by a fixed useAsyncData
 * key) and exposes best buy/sell helpers per currency code so several tools can
 * reuse the same data without each re-querying the API.
 */
export function useExchangeRates() {
  const { getProcessedExchangeData } = useApiService()

  // One fetch shared across every consumer on the page (calculator, trend
  // modules, tools) via the fixed key — useAsyncData dedupes by key. Uses
  // today's Montevideo date (the request that returns data) and keeps SSR on so
  // pages that render rates in their initial HTML stay server-rendered.
  const { data, pending, error, refresh } = useAsyncData<ExchangeRate[]>(
    'tool-exchange-rates',
    async () => {
      const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Montevideo' })
      const res = await getProcessedExchangeData(date)
      return (res?.exchangeData ?? []) as ExchangeRate[]
    },
    { default: () => [] as ExchangeRate[] }
  )

  // Public-obtainable quotes only: the headline price, the converter and the
  // tool conversions must never quote the BCU reference or an interbank/wholesale
  // rate (nobody can transact at those). SEO/casa pages keep using `rows`.
  const realRows = computed<ExchangeRate[]>(() => publicRates(data.value ?? []))

  /** Lowest positive sell price for a currency (best price to BUY it), or null. */
  const bestSell = (code: CurrencyCode): number | null => {
    const quotes = quotesForCurrency(realRows.value, code)
    return quotes.find(q => q.bestSell)?.sell ?? null
  }

  /** Highest positive buy price for a currency (best price to SELL it), or null. */
  const bestBuy = (code: CurrencyCode): number | null => {
    const quotes = quotesForCurrency(realRows.value, code)
    return quotes.find(q => q.bestBuy)?.buy ?? null
  }

  return { rows: data, realRows, pending, error, refresh, bestSell, bestBuy }
}
