// Live debt-relief figures (usury caps + refi rates) for /saldar-deudas-uruguay.
// Returns the verified baseline merged with the monthly Gemini refresh when
// available. Cached; a stale/missing store triggers a background refresh so the
// numbers stay current on their own. Mirrors /api/cost-of-living.
import {
  getStoredDebtRelief,
  refreshLiveDebtRelief,
  baselineDebtRelief,
  ageInDays,
} from '../utils/debtReliefLive'

let inFlight = false

export default defineCachedEventHandler(
  async () => {
    const stored = await getStoredDebtRelief()
    // Monthly cadence → treat anything under ~35 days old as fresh.
    if (stored && ageInDays(stored.asOf) < 35) return stored

    if (!inFlight) {
      inFlight = true
      refreshLiveDebtRelief()
        .catch(() => {})
        .finally(() => {
          inFlight = false
        })
    }
    return stored ?? baselineDebtRelief()
  },
  {
    maxAge: 60 * 60 * 6, // 6h
    staleMaxAge: 60 * 60 * 24 * 40,
    name: 'debt-relief-v1',
    getKey: () => 'live',
  }
)
