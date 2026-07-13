// Live cost-of-living model for the /herramientas/costo-de-vida tool, proxied from the backend
// (pm2 `currency-costs` generates the five volatile figures daily) and applied to this app's
// COST_MODEL. Zero Gemini here: this route forwards, merges (applyCostOverrides — arithmetic, not
// AI) and falls back to the pure baseline when the backend is unreachable.
//
// The `inFlight` background-refresh dance is gone: the backend cron is the only refresher now,
// and a GET handler must not spend Gemini calls — it no longer even can, it has no key.
import { applyCostOverrides, baselineCosts, type LiveCosts, type LiveCostsResponse } from '../utils/costsMerge'

export default defineCachedEventHandler(
  async (): Promise<LiveCosts> => {
    const base = useRuntimeConfig().apiBaseServer
    try {
      const res = await $fetch<LiveCostsResponse>(`${base}/cost-of-living`, { timeout: 8000 })
      return res ? applyCostOverrides(res) : baselineCosts()
    } catch {
      return baselineCosts()
    }
  },
  {
    maxAge: 60 * 60, // 1h
    staleMaxAge: 60 * 60 * 24 * 7,
    // Bumped from cost-of-living-v2: the old cached payloads (fs useStorage-backed) are still
    // live and this proxy's shape/source changed enough to not trust stale entries under the old key.
    name: 'cost-of-living-v3',
    getKey: () => 'live',
  }
)
