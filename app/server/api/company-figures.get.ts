// Live figures for /que-empresa-abrir-uruguay. Cached; a stale or missing store
// triggers a background refresh so the numbers stay current on their own. The
// verified baseline is the fallback, always — the request never blocks on Gemini.
import {
  ageInDays,
  baselineCompanyFigures,
  getStoredCompanyFigures,
  refreshCompanyFigures,
} from '../utils/companyFiguresLive'

let inFlight = false

export default defineCachedEventHandler(
  async () => {
    const stored = await getStoredCompanyFigures()
    if (stored && ageInDays(stored.asOf) < 8) return stored
    if (!inFlight) {
      inFlight = true
      refreshCompanyFigures()
        .catch(() => {})
        .finally(() => {
          inFlight = false
        })
    }
    return stored ?? baselineCompanyFigures()
  },
  {
    maxAge: 60 * 60,
    staleMaxAge: 60 * 60 * 24 * 7,
    name: 'company-figures-v1',
    getKey: () => 'live',
  }
)
