// Public loan-comparison data: the catalogue with the freshest scraped TEAs layered on top, plus the
// last-updated timestamp. Cached briefly at the edge. Lazy bootstrap: if rates were never scraped or
// the last scrape is badly stale (> 2 days), refresh once on demand; scrape failures fall back to the
// seed catalogue.
import { scrapeAllLenderRates } from '../utils/loanScraper'
import {
  applyLoanScrapeResults,
  getMergedLenders,
  getLoanRatesUpdatedAt,
} from '../utils/loanRatesStore'

const STALE_MS = 2 * 24 * 60 * 60 * 1000

export default defineCachedEventHandler(
  async () => {
    const last = await getLoanRatesUpdatedAt()
    const stale = !last || Date.now() - new Date(last).getTime() > STALE_MS
    if (stale) {
      try {
        await applyLoanScrapeResults(await scrapeAllLenderRates())
      } catch {
        // keep seed / last-good values on any scrape error
      }
    }
    const [lenders, updatedAt] = await Promise.all([getMergedLenders(), getLoanRatesUpdatedAt()])
    return { lenders, updatedAt }
  },
  { maxAge: 60 * 30, name: 'prestamos', getKey: () => 'all' }
)
