// The drift watchdog. NOT Gemini: it fetches the figures the backend already refreshed and compares
// them with the constants baked into this app's prose/data (SALARY_REFERENCE, UY_FACTS, the FAQ),
// pinging the admin once per distinct drift so a human updates them. It stayed in the app because
// the numbers it watches live in the app, the Telegram creds live in the app's runtimeConfig, and
// it spends no AI call at all.
import { checkFiguresDrift } from '../../utils/figuresDrift'
import type { UyFigures } from '../../utils/uyFiguresFallback'

export default defineTask({
  meta: { name: 'figures:drift', description: 'Compare live UY figures with the constants baked into the site' },
  async run() {
    const figures = await $fetch<UyFigures>('/api/uy-figures')
    const { drift, notified } = await checkFiguresDrift(figures)
    return { result: { drift, notified } }
  },
})
