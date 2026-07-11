// Live key national figures (salario mínimo, BPC, boleto STM, inflación) for the
// finance pages. Cached; a stale/missing store triggers a background refresh so the
// numbers stay current on their own. Verified baseline as fallback.
import {
  getStoredFigures,
  refreshUyFigures,
  baselineFigures,
  ageInDays,
} from '../utils/uyFiguresLive'

let inFlight = false

export default defineCachedEventHandler(
  async () => {
    const stored = await getStoredFigures()
    if (stored && ageInDays(stored.asOf) < 8) return stored
    if (!inFlight) {
      inFlight = true
      refreshUyFigures()
        .catch(() => {})
        .finally(() => {
          inFlight = false
        })
    }
    return stored ?? baselineFigures()
  },
  {
    maxAge: 60 * 60,
    staleMaxAge: 60 * 60 * 24 * 7,
    name: 'uy-figures-v1',
    getKey: () => 'live',
  }
)
