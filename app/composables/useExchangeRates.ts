import type { ExchangeRate } from '~/types/api'
import { quotesForCurrency, type CurrencyCode } from '~/utils/currencyPages'
import { publicRates } from '~/utils/rateSource'

/**
 * Shared, SSR-friendly access to today's processed exchange rates for the
 * calculator / conversion tools. Fetches once (deduped by a fixed useAsyncData
 * key) and exposes best buy/sell helpers per currency code so several tools can
 * reuse the same data without each re-querying the API.
 */
export function useExchangeRates(codes?: readonly CurrencyCode[]) {
  const { getProcessedExchangeData } = useApiService()

  /**
   * Las monedas que esta página va a leer, o null para todas.
   *
   * Una página que sólo mira DOS números de UNA moneda no tiene por qué embarcar las 196 filas de
   * las dieciocho. Medido el 2026-09-03 en /convertir/100000-pesos-argentinos-a-pesos-uruguayos:
   * el bloque __NUXT_DATA__ pesa 41.029 b y `tool-exchange-rates` son 95.364 b de JSON; las 158
   * filas que no son ARS ocupan el 54 % del bloque. La fila del oro viaja y no se pinta.
   *
   * El filtro entra en la CLAVE del useAsyncData, si no dos consumidores con filtros distintos se
   * pisarían el caché. No compartir la clave es seguro acá: el único otro consumidor que monta el
   * layout es LazySearchPalette, y está dentro de <ClientOnly> y detrás de `v-if`, así que no corre
   * en SSR.
   */
  const wanted = codes?.length
    ? [...new Set(codes.map(code => String(code).toUpperCase()))].sort()
    : null

  // One fetch shared across every consumer on the page (calculator, trend
  // modules, tools) via the fixed key — useAsyncData dedupes by key. Uses
  // today's Montevideo date (the request that returns data) and keeps SSR on so
  // pages that render rates in their initial HTML stay server-rendered.
  const { data, pending, error, refresh } = useAsyncData<ExchangeRate[]>(
    wanted ? `tool-exchange-rates-${wanted.join('-')}` : 'tool-exchange-rates',
    async () => {
      const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Montevideo' })
      const res = await getProcessedExchangeData(date)
      return (res?.exchangeData ?? []) as ExchangeRate[]
    },
    {
      default: () => [] as ExchangeRate[],
      // El recorte va en `transform` y no en un computed: lo que se serializa en __NUXT_DATA__ es
      // lo que devuelve el transform, así que filtrar después no ahorraría un solo byte.
      transform: (rows: ExchangeRate[]) =>
        wanted ? rows.filter(row => wanted.includes(String(row.code).toUpperCase())) : rows,
    }
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
