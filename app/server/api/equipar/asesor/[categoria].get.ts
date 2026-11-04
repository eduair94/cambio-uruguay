import { EquiparSpecSnapshotModel } from '../../../models/EquiparSpecSnapshot'
import { connectDb } from '../../../utils/db'
import { isEquiparFichaCategoria } from '../../../../utils/equiparFicha'
import type { EquiparAsesorCandidato } from '../../../../utils/equiparAsesor'

/**
 * Los candidatos del asesor "¿Qué tamaño necesitás?" de /equipar-casa-uruguay/<categoria>: los
 * avisos con ficha del vendedor de heladeras, lavarropas, televisores y aires, en el snapshot que deja
 * `currency-equipar-specs` cada hora (classes/equipar/specs/snapshot.ts). Este pedido sólo lee ese
 * documento: el asesor corre en el navegador sobre la lista.
 *
 * Una categoría sin ficha es 404 antes de tocar la base. Sin snapshot (antes de la primera corrida)
 * o con la base caída, 503 sin caché: la página dice que el asesor se está actualizando.
 */
export interface EquiparAsesorResponse {
  generatedAt: string
  candidates: EquiparAsesorCandidato[]
  total: number
  withFicha: number
}

export default defineEventHandler(async (event): Promise<EquiparAsesorResponse> => {
  const categoria = String(getRouterParam(event, 'categoria') || '')
  if (!isEquiparFichaCategoria(categoria)) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Categoría sin asesor' })
  }
  try {
    await connectDb()
    const doc = (await EquiparSpecSnapshotModel.findOne({ key: categoria })
      .select({ _id: 0, generatedAt: 1, candidates: 1, total: 1, withFicha: 1 })
      .maxTimeMS(5000)
      .lean()) as unknown as EquiparAsesorResponse | null
    if (!doc?.generatedAt) throw new Error('sin snapshot')
    setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=300')
    return {
      generatedAt: doc.generatedAt,
      candidates: Array.isArray(doc.candidates) ? doc.candidates : [],
      total: doc.total ?? 0,
      withFicha: doc.withFicha ?? 0,
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
