// El directorio de armadores de muebles que el job diario `currency-armadores` deja en
// `armadorsnapshots` (base del app). Público: cada fila sale de una fuente pública y la página
// muestra cuál. Sin documento devuelve null y la página dibuja su estado vacío: un 500 convertiría
// "el job todavía no corrió" en una página rota.
import { ArmadorSnapshotModel } from '../models/ArmadorSnapshot'
import { connectDb } from '../utils/db'
import { armadoresCompact } from '../../utils/armadores'

export default defineEventHandler(async event => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=900, s-maxage=1800, stale-while-revalidate=86400'
  )
  try {
    await connectDb()
    const doc = await ArmadorSnapshotModel.findOne({ key: 'mvd' })
      .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0, notes: 0, counts: 0 })
      .lean()
    return armadoresCompact(doc as never)
  } catch {
    return null
  }
})
