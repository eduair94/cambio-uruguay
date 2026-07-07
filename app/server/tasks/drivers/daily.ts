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
    const drivers = await ingestDrivers(['USD'])
    const news = await archiveTodayNews('USD')
    return { result: { drivers, news } }
  },
})
