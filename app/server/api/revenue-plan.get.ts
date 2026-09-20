// Sirve el plan de ingreso que arma el job de backend `currency-revenue-plan`.
//
// PRIVADA, y por las dos razones juntas. Como su vecina /api/search-console, devuelve trabajo
// derivado de las consultas que la gente tipea para llegar al sitio. Y como /api/site-revenue,
// lleva cifras de facturación: el RPM por familia de página está en cada fila de `families`. Un
// documento que cruza las dos cosas no puede salir por una ruta pública ni con un `.select()`.
// Cuenta de dueño solamente, y nunca cacheada en el borde.
import { RevenuePlanSnapshotModel } from '../models/RevenuePlanSnapshot'
import { connectDb } from '../utils/db'
import { requireAdmin } from '../utils/requireAdmin'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')

  await connectDb()
  const snapshot = await RevenuePlanSnapshotModel.findOne({ key: 'revenue_plan' })
    .select({ _id: 0, __v: 0 })
    .lean()

  if (!snapshot) {
    // Falta el documento = el job todavía no corrió. No es un error, y la página tiene su propio
    // estado vacío que dice qué app de pm2 mirar.
    return {
      snapshot: null,
      hint: 'todavía no corrió `currency-revenue-plan` (corre a las 11:50 UTC, después de currency-gsc)',
    }
  }
  return { snapshot }
})
