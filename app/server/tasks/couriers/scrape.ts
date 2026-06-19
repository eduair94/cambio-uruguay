// Nitro scheduled task: refresh courier per-kg rates once a day. Registered in nuxt.config under
// `nitro.scheduledTasks`. Failed/implausible scrapes keep the previous good value (see the store).
import { scrapeAllCourierRates } from '../../utils/courierScraper'
import { applyScrapeResults } from '../../utils/courierRatesStore'

export default defineTask({
  meta: {
    name: 'couriers:scrape',
    description: 'Scrape and refresh courier per-kg shipping rates',
  },
  async run() {
    const results = await scrapeAllCourierRates()
    const updated = await applyScrapeResults(results)
    return { result: { updated, results } }
  },
})
