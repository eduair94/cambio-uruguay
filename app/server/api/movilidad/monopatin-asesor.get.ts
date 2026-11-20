import { MovilidadSpecSnapshotModel } from '../../models/MovilidadSpecSnapshot'
import { connectDb } from '../../utils/db'
import type { MonopatinCandidato } from '../../../utils/monopatinAsesor'
import type { MonopatinSpecStats } from '../../../utils/movilidad'

/**
 * Los candidatos del asesor "¿Cuál te conviene?" de /monopatines-electricos-uruguay: cada aviso de
 * monopatín con ficha técnica propia leída, en el snapshot que deja `currency-movilidad-specs` cada
 * hora (classes/movilidad/specs/snapshot.ts). Este pedido sólo lee ese documento: el asesor corre en
 * el navegador sobre la lista, porque los controles tienen que responder en el acto.
 *
 * Caché de 300 s, como el directorio. Sin snapshot (antes de la primera corrida) o con la base
 * caída, 503 sin caché: la página dice que el asesor se está actualizando.
 */
export interface MonopatinAsesorResponse {
  generatedAt: string
  candidates: MonopatinCandidato[]
  stats: MonopatinSpecStats | null
}

export default defineEventHandler(async (event): Promise<MonopatinAsesorResponse> => {
  try {
    await connectDb()
    const doc = (await MovilidadSpecSnapshotModel.findOne({ key: 'monopatin-electrico' })
      .select({ _id: 0, generatedAt: 1, candidates: 1, stats: 1 })
      .lean()) as unknown as MonopatinAsesorResponse | null
    if (!doc?.generatedAt) throw new Error('sin snapshot')
    setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=300')
    return {
      generatedAt: doc.generatedAt,
      candidates: Array.isArray(doc.candidates) ? doc.candidates : [],
      stats: doc.stats ?? null,
    }
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'El asesor se está actualizando',
      cause: error,
    })
  }
})
