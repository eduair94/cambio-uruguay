// «Uno al azar»: una cuenta publicada que haya publicado en los últimos 180 días, distinta cada vez
// (sin caché). Con `?rubro=`, una de ese rubro.
import { EmprendimientoListingModel } from '../../models/EmprendimientoListing'
import { connectDb } from '../../utils/db'
import { loadOptOuts } from '../../utils/emprendimientos'
import { isEmprendimientoRubro } from '../../../utils/emprendimientos'

export default defineEventHandler(async event => {
  setResponseHeaders(event, { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' })
  const rubro = String(getQuery(event).rubro ?? '')
  try {
    await connectDb()
    const since = new Date(Date.now() - 180 * 86_400_000).toISOString().slice(0, 10)
    const optOuts = await loadOptOuts()
    const filter: Record<string, unknown> = { lastPostAt: { $gte: since } }
    if (isEmprendimientoRubro(rubro)) filter.rubro = rubro
    const rows = (
      await EmprendimientoListingModel.find(filter, { _id: 0, handle: 1 }).lean()
    ).filter(row => !optOuts.has(row.handle))
    if (!rows.length) return { handle: null }
    return { handle: rows[Math.floor(Math.random() * rows.length)]!.handle }
  } catch {
    return { handle: null }
  }
})
