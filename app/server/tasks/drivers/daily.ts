// Nitro scheduled task: refresh macro-driver snapshots and archive today's news. Registered in
// nuxt.config under `nitro.scheduledTasks`. Idempotent.
//
// NOTE: this task used to ALSO record today's move explanation per currency (a third stage,
// Gemini-grounded). That stage — and ONLY that stage — moved to the backend
// (classes/explain/refresh.ts, pm2 currency-explain, 10:07 UTC, ~52 min after this task runs). The
// driver ingest and the news archive below are NOT Gemini and stayed here unchanged; see the
// migration plan's Task 9 for why the currency lists differ between them (news is USD-only,
// drivers/explanations are USD+EUR+ARS).
import { ingestDrivers } from '../../utils/drivers/ingest'
import { archiveTodayNews } from '../../utils/priceNews'

const EXPLAINED_CURRENCIES = ['USD', 'EUR', 'ARS']

export default defineTask({
  meta: {
    name: 'drivers:daily',
    description: 'Ingest macro drivers (FRED + argentinadatos), archive daily news',
  },
  async run() {
    // Each step is isolated: one failing step must never skip the other — a missed news day is a
    // permanent gap.
    const result: {
      drivers?: unknown
      news?: unknown
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
    return { result }
  },
})
