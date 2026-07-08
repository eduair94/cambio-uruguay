// Nitro scheduled task: refresh macro-driver snapshots, archive today's news,
// and record today's move explanation per currency. Registered in nuxt.config
// under `nitro.scheduledTasks`. Idempotent.
import { ingestDrivers } from '../../utils/drivers/ingest'
import { archiveTodayNews } from '../../utils/priceNews'
import { recordTodayExplanation } from '../../utils/moveExplanation'

const EXPLAINED_CURRENCIES = ['USD', 'EUR', 'ARS']

export default defineTask({
  meta: {
    name: 'drivers:daily',
    description:
      "Ingest macro drivers (FRED + argentinadatos), archive daily news, record today's move explanations",
  },
  async run() {
    // Each step is isolated: one failing currency/step must never skip the
    // others — a missed news/explanation day is a permanent gap.
    const result: {
      drivers?: unknown
      news?: unknown
      explanations?: Record<string, unknown>
      errors?: Record<string, string>
    } = {}
    try {
      // USD+EUR+ARS so EUR-only (eurusd) and ARS-only (arOfficial) drivers get
      // ingested too — previously only USD-tagged drivers were ever fetched.
      result.drivers = await ingestDrivers(EXPLAINED_CURRENCIES)
    } catch (e) {
      result.errors = { ...result.errors, drivers: String((e as Error)?.message ?? e) }
    }
    try {
      // USD only: the archived feed is Uruguay dollar/economy news, not
      // currency-specific — attributing it to EUR/ARS moves would misattribute.
      result.news = await archiveTodayNews('USD')
    } catch (e) {
      result.errors = { ...result.errors, news: String((e as Error)?.message ?? e) }
    }
    result.explanations = {}
    for (const currency of EXPLAINED_CURRENCIES) {
      try {
        result.explanations[currency] = await recordTodayExplanation(currency)
      } catch (e) {
        result.errors = {
          ...result.errors,
          [`explanation:${currency}`]: String((e as Error)?.message ?? e),
        }
      }
    }
    return { result }
  },
})
