// Cuánto rinde cada familia de página. Owner-only.
//
// Su vecina /api/site-analytics es pública a propósito: publica cuánta gente entra y qué lee. Ésta
// dice cuánto factura el sitio, que no es lo mismo, y por eso vive en otra colección y detrás del
// mismo `requireAdmin` que el tablero de Search Console. Sin `NUXT_ADMIN_EMAILS` configurado la
// ruta contesta 503 — falla cerrada.
import { SiteRevenueSnapshotModel } from '../models/SiteRevenueSnapshot'
import { connectDb } from '../utils/db'
import { requireAdmin } from '../utils/requireAdmin'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')

  await connectDb()
  const snapshot = await SiteRevenueSnapshotModel.findOne({ key: 'site' })
    .select({ _id: 0, __v: 0 })
    .lean()

  if (!snapshot) {
    return {
      snapshot: null,
      hint: 'todavía no corrió `currency-site-analytics` con el enlace AdSense↔GA4 creado',
    }
  }
  return { snapshot }
})
