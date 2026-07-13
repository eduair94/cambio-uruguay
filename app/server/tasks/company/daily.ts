// Nitro scheduled task: refresh the volatile company-formation figures (IVA mínimo,
// BPS del titular/administrador/socio, ICOSA) via Gemini grounded search, keeping
// the verified baseline for anything out of band. Registered in nuxt.config under
// `nitro.scheduledTasks`.
import { refreshCompanyFigures } from '../../utils/companyFiguresLive'

export default defineTask({
  meta: {
    name: 'company:daily',
    description: 'Refresh company-formation figures (IVA mínimo, BPS, ICOSA) via Gemini',
  },
  async run() {
    const figures = await refreshCompanyFigures()
    return { result: { asOf: figures.asOf, updated: figures.updated } }
  },
})
