// Nitro scheduled task: record today's AI directional-lean analysis + external
// forecast comparison for every currency currently quoted live. Registered in
// nuxt.config under `nitro.scheduledTasks`, runs after `drivers:daily` so the
// price series it reads from is already fresh. Idempotent.
import { listActiveCurrencies, recordTodayPrediction } from '../../utils/pricePrediction'

export default defineTask({
  meta: {
    name: 'predictions:daily',
    description:
      "Record today's AI price-lean analysis + external forecast comparison per currency",
  },
  async run() {
    const currencies = await listActiveCurrencies()
    const results: Record<string, { recorded: boolean; date: string }> = {}
    const errors: Record<string, string> = {}
    for (const currency of currencies) {
      try {
        results[currency] = await recordTodayPrediction(currency)
      } catch (e) {
        errors[currency] = String((e as Error)?.message ?? e)
      }
    }
    return { result: { results, errors } }
  },
})
