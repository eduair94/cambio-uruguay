// Nitro scheduled task: refresh the live debt-relief figures (BCU usury caps)
// via Gemini grounded search, so /saldar-deudas-uruguay stays current without
// manual edits. Registered in nuxt.config under nitro.scheduledTasks. Graceful:
// with no Gemini key it is a no-op that keeps the verified baseline.
import { refreshLiveDebtRelief } from '../../utils/debtReliefLive'

export default defineTask({
  meta: {
    name: 'debt-relief:monthly',
    description: 'Refresh live debt-relief figures (usury caps) via Gemini grounded search',
  },
  async run() {
    const live = await refreshLiveDebtRelief()
    return { result: { asOf: live.asOf, updated: live.updated } }
  },
})
