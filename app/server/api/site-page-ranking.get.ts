// El ranking de páginas por visita que escribe `currency-site-analytics`. Owner-only.
//
// Su vecina /api/site-analytics es pública (top 25 de todo el tráfico). Ésta lleva el tramo de valor
// de cada familia y por dónde se entra a cada página, que es la lista de trabajo del sitio y no se
// publica. Mismo `requireAdmin` que el tablero de Search Console: sin `NUXT_ADMIN_EMAILS`
// configurado contesta 503 — falla cerrada.
import { SitePageRankingModel } from '../models/SitePageRanking'
import { connectDb } from '../utils/db'
import { requireAdmin } from '../utils/requireAdmin'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')

  await connectDb()
  const snapshot = await SitePageRankingModel.findOne({ key: 'site' })
    .select({ _id: 0, __v: 0 })
    .lean()

  if (!snapshot) {
    return {
      snapshot: null,
      hint: 'todavía no corrió `currency-site-analytics` con el paso del ranking (o falta APP_MONGO_URI en el VPS)',
    }
  }
  return { snapshot }
})
