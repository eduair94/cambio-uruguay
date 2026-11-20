// El tablero de uso que escribe `currency-usage-insights`. Owner-only: mezcla tráfico por página de
// cinco fuentes y la lista de lo que hay que arreglar. Falla cerrada sin NUXT_ADMIN_EMAILS (503).
//
// Lee SÓLO `{ key: 'site' }` y excluye `state`: el documento hermano `{ key: 'state' }` es la memoria
// del job (contadores de cuota, primera vez en el sitemap) y no sale nunca.
import { UsageInsightSnapshotModel } from '../models/UsageInsightSnapshot'
import { connectDb } from '../utils/db'
import { requireAdmin } from '../utils/requireAdmin'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')

  await connectDb()
  const snapshot = await UsageInsightSnapshotModel.findOne({ key: 'site' })
    .select({ _id: 0, __v: 0, state: 0 })
    .lean()

  if (!snapshot) {
    return {
      snapshot: null,
      hint: 'todavía no corrió `currency-usage-insights` (o falta APP_MONGO_URI en el VPS)',
    }
  }
  return { snapshot }
})
