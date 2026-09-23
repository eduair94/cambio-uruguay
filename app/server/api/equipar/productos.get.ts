import { EquiparListingModel } from '../../models/EquiparListing'
import { EquiparMetaModel } from '../../models/EquiparMeta'
import { retailProductosResponse } from '../../utils/retailProductos'
import type { EquiparProductosResponse } from '../../../utils/equiparProductos'

/**
 * The listing directory behind /equipar-casa-uruguay/productos — the `/api/cars` shape: paginated in
 * Mongo, with each facet counted over the query WITHOUT its own filter, so the panel can say how many
 * rows each option would return alongside everything else the reader already set.
 *
 * `?ids=a,b,c` is the reader's saved list asking "is this still published, and at what price?": it
 * returns exactly those rows, with no freshness window and no filters — a row the prune already
 * removed simply does not come back, which is the answer.
 *
 * El cuerpo vive en `server/utils/retailProductos.ts`, compartido con `/api/movilidad/productos`:
 * las dos colecciones guardan la misma fila y las dos páginas piden lo mismo, así que un arreglo en
 * la paginación o en una faceta vale para las dos en vez de tener que copiarse.
 */
export default defineEventHandler(async (event): Promise<EquiparProductosResponse> => {
  return retailProductosResponse(event, getQuery(event) as Record<string, unknown>, {
    model: EquiparListingModel,
    loadMeta: async () => {
      const meta = (await EquiparMetaModel.findOne({ key: 'equipar-casa-uruguay' })
        .select({ _id: 0, generatedAt: 1, usdUyu: 1 })
        .lean()) as { generatedAt?: string; usdUyu?: number } | null
      return { generatedAt: meta?.generatedAt ?? null, usdUyu: meta?.usdUyu ?? null }
    },
  })
})
