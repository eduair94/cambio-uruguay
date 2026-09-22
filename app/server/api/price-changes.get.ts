import { PriceChangeSnapshotModel } from '../models/PriceChangeSnapshot'
import { connectDb } from '../utils/db'
import type {
  PriceChangeRow,
  PriceChangeVertical,
  PriceChangesResponse,
} from '../../utils/priceChanges'

/**
 * La foto de `/cambios-de-precio-uruguay`, tal como la dejó el job `currency-price-changes`. Acá no
 * se agrega nada: recorrer las tres colecciones de historial son ~100k documentos y eso es trabajo de
 * job, no de visita.
 *
 * Sin foto (primer deploy, o el job todavía no corrió) devuelve `{ snapshot: null }` con 200: la
 * página dice que todavía no hay nada que mostrar, que es la verdad, en vez de un 500.
 */
const EMPTY: PriceChangesResponse = { snapshot: null }

export default defineEventHandler(async (event): Promise<PriceChangesResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=600, s-maxage=600, stale-while-revalidate=86400'
  )
  try {
    await connectDb()
    const doc = await PriceChangeSnapshotModel.findOne({ key: 'current' })
      // Sólo lo que la página pinta: nunca `_id`/`__v`/`key` ni los timestamps de mongoose.
      .select({ _id: 0, day: 1, generatedAt: 1, windowDays: 1, verticals: 1, changes: 1 })
      .maxTimeMS(4000)
      .lean()
    if (!doc) return EMPTY
    return {
      snapshot: {
        day: String(doc.day ?? ''),
        generatedAt: String(doc.generatedAt ?? ''),
        windowDays: Number(doc.windowDays ?? 7),
        verticals: (doc.verticals ?? []) as unknown as PriceChangeVertical[],
        changes: (doc.changes ?? []) as unknown as PriceChangeRow[],
      },
    }
  } catch (error) {
    console.error('[api/price-changes] failed', error)
    setResponseHeader(event, 'cache-control', 'no-store')
    return EMPTY
  }
})
