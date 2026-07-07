// Nitro scheduled task: refresh macro-driver snapshots and archive today's news.
// Registered in nuxt.config under `nitro.scheduledTasks`. Idempotent.
import { ingestDrivers } from '../../utils/drivers/ingest'
import { archiveTodayNews } from '../../utils/priceNews'

export default defineTask({
  meta: {
    name: 'drivers:daily',
    description: 'Ingest macro drivers (stooq + argentinadatos) and archive daily news',
  },
  async run() {
    // Isolate the two responsibilities: a driver-ingest failure (e.g. DB/bulkWrite)
    // must NOT skip the daily news archive — missed news days are permanent gaps,
    // the exact problem this archive exists to prevent (and vice versa).
    const result: { drivers?: unknown; news?: unknown; errors?: Record<string, string> } = {}
    try {
      result.drivers = await ingestDrivers(['USD'])
    } catch (e) {
      result.errors = { ...result.errors, drivers: String((e as Error)?.message ?? e) }
    }
    try {
      result.news = await archiveTodayNews('USD')
    } catch (e) {
      result.errors = { ...result.errors, news: String((e as Error)?.message ?? e) }
    }
    return { result }
  },
})
