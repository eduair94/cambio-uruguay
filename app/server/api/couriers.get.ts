// Public courier comparison data: the catalogue with the freshest scraped per-kg rates layered on
// top, plus the last-updated timestamp for the "actualizado" label. Cached briefly at the edge.
//
// Lazy bootstrap (same idea as the daily blog): if rates have never been scraped — or the last
// scrape is badly stale (cron missed > 2 days) — refresh once on demand so the page shows live
// data without waiting for the next cron tick. Scrape failures fall back to the seed catalogue.
import { scrapeAllCourierRates } from '../utils/courierScraper'
import {
  applyScrapeResults,
  getMergedCouriers,
  getRatesUpdatedAt,
} from '../utils/courierRatesStore'

const STALE_MS = 2 * 24 * 60 * 60 * 1000

export default defineCachedEventHandler(
  async () => {
    const last = await getRatesUpdatedAt()
    const stale = !last || Date.now() - new Date(last).getTime() > STALE_MS
    if (stale) {
      try {
        await applyScrapeResults(await scrapeAllCourierRates())
      } catch {
        // keep seed / last-good values on any scrape error
      }
    }
    const [couriers, updatedAt] = await Promise.all([getMergedCouriers(), getRatesUpdatedAt()])
    return { couriers, updatedAt }
  },
  { maxAge: 60 * 30, name: 'couriers', getKey: () => 'all' }
)
