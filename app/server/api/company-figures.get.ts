// Figures for /que-empresa-abrir-uruguay. The app does no LLM refresh (that moved
// to the backend), so this serves whatever a future backend refresher has written
// into the `company` store, falling back to the verified baseline — which is the
// authoritative data today. Cached; never blocks.
import { baselineCompanyFigures, getStoredCompanyFigures } from '../utils/companyFiguresLive'

export default defineCachedEventHandler(
  async () => {
    const stored = await getStoredCompanyFigures()
    return stored ?? baselineCompanyFigures()
  },
  {
    maxAge: 60 * 60,
    staleMaxAge: 60 * 60 * 24 * 7,
    name: 'company-figures-v1',
    getKey: () => 'live',
  }
)
