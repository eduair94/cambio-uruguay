// Live rates behind /conviene-comprar-en-cuotas, proxied from the backend (pm2 `currency-financing`
// refreshes the five figures weekly) and applied to this app's verified INSTRUMENTOS baseline.
// Zero Gemini here: this route forwards, merges (applyFinancingOverrides — arithmetic, not AI) and
// falls back to the pure baseline when the backend is unreachable.
//
// A stale-but-real number is far better than a blank page here, because the whole point of the page
// is a numeric comparison — so the baseline is always a valid answer.
import {
  applyFinancingOverrides,
  baselineFinancing,
  type FinancingResponse,
  type LiveFinancing,
} from '../utils/financingMerge'

export default defineCachedEventHandler(
  async (): Promise<LiveFinancing> => {
    const base = useRuntimeConfig().apiBaseServer
    try {
      const res = await $fetch<FinancingResponse>(`${base}/financing-rates`, { timeout: 8000 })
      return res ? applyFinancingOverrides(res) : baselineFinancing()
    } catch {
      return baselineFinancing()
    }
  },
  {
    maxAge: 60 * 60 * 6, // 6h
    staleMaxAge: 60 * 60 * 24 * 14, // 2 weeks — these move on a scale of weeks
    name: 'financing-rates-v2',
    getKey: () => 'live',
  }
)
