// Nitro scheduled task: refresh the live cost-of-living figures (salario mínimo,
// boleto STM, alquileres típicos) via Gemini grounded search, so the
// /herramientas/costo-de-vida tool stays current without manual edits. Registered
// in nuxt.config under `nitro.scheduledTasks`. Graceful: with no Gemini key it is
// a no-op that keeps the verified baseline.
import { refreshLiveCosts } from '../../utils/costOfLivingLive'

export default defineTask({
  meta: {
    name: 'costs:daily',
    description: 'Refresh live cost-of-living figures via Gemini grounded search',
  },
  async run() {
    const live = await refreshLiveCosts()
    return { result: { asOf: live.asOf, updated: live.updated } }
  },
})
