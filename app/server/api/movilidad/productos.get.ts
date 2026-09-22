import { MovilidadListingModel } from '../../models/MovilidadListing'
import { MovilidadMetaModel } from '../../models/MovilidadMeta'
import { retailProductosResponse } from '../../utils/retailProductos'
import { MOVILIDAD_META_KEY } from '../../../utils/movilidad'
import type { EquiparProductosResponse } from '../../../utils/equiparProductos'

/**
 * El directorio con filtros de /monopatines-electricos-uruguay y /bicicletas-electricas-uruguay:
 * una fila por aviso que la banda aceptó, con foto, paginada en Mongo y con cada faceta contada
 * sobre la consulta SIN su propio filtro.
 *
 * Mismo cuerpo que `/api/equipar/productos` (`server/utils/retailProductos.ts`) porque
 * `movilidadlistings` guarda exactamente la misma fila; lo único propio es la colección y de qué
 * documento sale la fecha de la corrida. Caché de 300 s, como el de equipar: el job escribe una vez
 * por hora, así que una foto de cinco minutos nunca miente por mucho.
 *
 * No hace falta validar `categoria` contra las dos únicas de movilidad: la colección sólo tiene
 * esas dos, así que un slug inventado devuelve cero filas y las facetas siguen siendo las de acá.
 */
export default defineEventHandler(async (event): Promise<EquiparProductosResponse> => {
  return retailProductosResponse(event, getQuery(event) as Record<string, unknown>, {
    model: MovilidadListingModel,
    loadMeta: async () => {
      const meta = (await MovilidadMetaModel.findOne({ key: MOVILIDAD_META_KEY })
        .select({ _id: 0, generatedAt: 1, usdUyu: 1 })
        .lean()) as { generatedAt?: string; usdUyu?: number } | null
      return { generatedAt: meta?.generatedAt ?? null, usdUyu: meta?.usdUyu ?? null }
    },
  })
})
