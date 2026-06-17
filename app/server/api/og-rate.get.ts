// Current best USD market rate for the OG image (cached 10 min so it never
// adds real cost to page SSR). Returns the best market sell (cheapest to buy)
// and best buy (pays most for your USD), plain/cash quotes only.
import type { ExchangeRate } from '../../types/api'

export default defineCachedEventHandler(
  async (): Promise<{ buy: number | null; sell: number | null }> => {
    const apiBase = useRuntimeConfig().public.apiBase as string
    const rates = await $fetch<ExchangeRate[]>('/', { baseURL: apiBase }).catch(
      () => [] as ExchangeRate[]
    )
    const usd = rates.filter(r => r.code === 'USD' && !r.type && r.origin !== 'bcu')
    const sells = usd.map(r => r.sell ?? 0).filter(v => v > 0)
    const buys = usd.map(r => r.buy ?? 0).filter(v => v > 0)
    return {
      sell: sells.length ? Math.min(...sells) : null,
      buy: buys.length ? Math.max(...buys) : null,
    }
  },
  { maxAge: 60 * 10, staleMaxAge: 60 * 60, name: 'og-rate', getKey: () => 'usd' }
)
