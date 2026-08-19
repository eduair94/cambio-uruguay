// Live BCU rate grid (Ley 18.212 averages + caps) for /adelanto-de-efectivo-tarjeta-de-credito,
// proxied from the backend (pm2 `currency-bcu-rates` refreshes it daily) and merged over this
// app's verified baseline. Zero business logic beyond re-running the arithmetic proof; falls back
// to the baseline whenever the backend is unreachable or the payload does not close.
//
// Cached for 6h with a long stale window: the underlying table only changes once a month, so a
// stale hit is almost always still correct — and when it is not, the page says so itself.
import { applyBcuRates, baselineBcuRates, type LiveBcuRatesResponse } from '../utils/bcuRatesMerge'

export default defineCachedEventHandler(
  async () => {
    const base = useRuntimeConfig().apiBaseServer
    try {
      const res = await $fetch<LiveBcuRatesResponse>(`${base}/bcu-rates`, { timeout: 8000 })
      return applyBcuRates(res ?? null)
    } catch {
      return baselineBcuRates()
    }
  },
  {
    maxAge: 60 * 60 * 6, // 6h
    staleMaxAge: 60 * 60 * 24 * 40,
    name: 'bcu-rates-v1',
    getKey: () => 'live',
  }
)
