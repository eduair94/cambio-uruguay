// Sirve la cola de "qué escribir" que arma el job de backend `currency-search-demand`.
//
// PRIVADA, por la misma razón que su vecina /api/search-console y una más: además de consultas
// reales, esta lista dice dónde el sitio NO llega y qué SERP se evaluó como ganable. Es el plan de
// contenido, no un dato del sitio. Cuenta de dueño solamente, y nunca cacheada en el borde.
import { SearchDemandQueueModel } from '../models/SearchDemandQueue'
import { connectDb } from '../utils/db'
import { requireAdmin } from '../utils/requireAdmin'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')

  await connectDb()
  const queue = await SearchDemandQueueModel.findOne({ key: 'demand_queue' })
    .select({ _id: 0, __v: 0 })
    .lean()

  if (!queue) {
    return {
      queue: null,
      hint: 'todavía no corrió `currency-search-demand` (corre los domingos 06:40 UTC)',
    }
  }
  return { queue }
})
