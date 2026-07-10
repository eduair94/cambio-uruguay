// Live cost-of-living model for the /herramientas/costo-de-vida tool. Returns the
// static verified baseline merged with Gemini-refreshed live figures (salario
// mínimo, boleto STM, alquileres típicos) when available. Cached; a stale/missing
// store triggers a background refresh so the numbers stay current on their own.
import {
  getStoredCosts,
  refreshLiveCosts,
  baselineCosts,
  ageInDays,
} from '../utils/costOfLivingLive'

// Refresh at most once at a time (the daily task is the primary refresher; this is
// a self-healing backup for when the cron didn't run or the data went stale).
let inFlight = false

export default defineCachedEventHandler(
  async () => {
    const stored = await getStoredCosts()
    if (stored && ageInDays(stored.asOf) < 8) return stored

    if (!inFlight) {
      inFlight = true
      refreshLiveCosts()
        .catch(() => {})
        .finally(() => {
          inFlight = false
        })
    }
    return stored ?? baselineCosts()
  },
  {
    maxAge: 60 * 60, // 1h
    staleMaxAge: 60 * 60 * 24 * 7,
    name: 'cost-of-living',
    getKey: () => 'live',
  }
)
