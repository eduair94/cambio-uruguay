// Live debt-relief figures (usury caps) for /saldar-deudas-uruguay, proxied from the backend
// (pm2 `currency-debt-relief` generates them monthly) and merged over this app's verified
// baseline (refiRates + period stay here — static page content, never Gemini). Zero business
// logic beyond the merge, zero Gemini key: this route forwards and falls back to the baseline
// caps when the backend is unreachable.
import {
  applyDebtReliefOverrides,
  baselineDebtRelief,
  type LiveDebtReliefResponse,
} from '../utils/debtReliefMerge'

export default defineCachedEventHandler(
  async () => {
    const base = useRuntimeConfig().apiBaseServer
    try {
      const res = await $fetch<LiveDebtReliefResponse>(`${base}/debt-relief`, { timeout: 8000 })
      return res ? applyDebtReliefOverrides(res) : baselineDebtRelief()
    } catch {
      return baselineDebtRelief()
    }
  },
  {
    maxAge: 60 * 60 * 6, // 6h
    staleMaxAge: 60 * 60 * 24 * 40,
    // Bumped from debt-relief-v1: the old cached payloads (fs useStorage-backed) are still live
    // and this proxy's shape/source changed enough to not trust stale entries under the old key.
    name: 'debt-relief-v2',
    getKey: () => 'live',
  }
)
