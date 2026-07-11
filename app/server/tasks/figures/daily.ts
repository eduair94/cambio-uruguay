// Nitro scheduled task: refresh Uruguay's key national figures (salario mínimo,
// BPC, boleto STM, inflación) via Gemini grounded search, and run the drift
// watchdog that pings the admin when a figure baked into the site no longer
// matches reality. Registered in nuxt.config under `nitro.scheduledTasks`.
import { refreshUyFigures, checkFiguresDrift } from '../../utils/uyFiguresLive'

export default defineTask({
  meta: {
    name: 'figures:daily',
    description: 'Refresh UY key figures via Gemini + drift watchdog for baked constants',
  },
  async run() {
    const figures = await refreshUyFigures()
    const { drift, notified } = await checkFiguresDrift(figures)
    return { result: { asOf: figures.asOf, updated: figures.updated, drift, notified } }
  },
})
