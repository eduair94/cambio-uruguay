import { createError, defineEventHandler, getQuery } from 'h3'
import { setHeaderUnlessSent } from '../../utils/cachedResponseHeader'
import { loadMinimumWage } from '../../utils/minimumWageRentals'
import {
  minimumWageQueryToParams,
  normalizeMinimumWageQuery,
  type MinimumWageResponse,
} from '../../../utils/minimumWage'

/**
 * Las formas de vivir con el salario mínimo contra los avisos vigentes. Las filas se arman una vez
 * por cosecha (`loadMinimumWageDataset`); acá sólo se filtra en memoria, y la respuesta se guarda
 * diez minutos por consulta normalizada: hay pocas combinaciones y el SSR de la página pide siempre
 * la misma.
 */
const cached = defineCachedEventHandler(
  async (event): Promise<MinimumWageResponse> =>
    loadMinimumWage(getQuery(event) as Record<string, unknown>),
  {
    name: 'rentals-minimum-wage-v1',
    getKey: event =>
      JSON.stringify(
        minimumWageQueryToParams(
          normalizeMinimumWageQuery(getQuery(event) as Record<string, unknown>)
        )
      ),
    maxAge: 600,
    staleMaxAge: 3600,
    swr: true,
    // En `nuxt dev` no se guarda nada: un `maxAge` corto no vence nunca en la caché de desarrollo.
    shouldBypassCache: () => process.env.NODE_ENV === 'development',
  }
)

// Nitro reemplaza `cache-control` en toda respuesta que sale del memo y descarta las cabeceras
// puestas antes de lanzar: las dos que se prometen van por fuera (mismo patrón que /api/rentals).
export default defineEventHandler(async (event): Promise<MinimumWageResponse> => {
  try {
    const response = await cached(event)
    // Ante un `If-None-Match` que coincide, el memo ya contestó 304 y cerró la respuesta: escribir
    // encima tiraba ERR_HTTP_HEADERS_SENT y este catch lo convertía en un 503 (ver /api/rentals).
    setHeaderUnlessSent(event, 'cache-control', 'public, max-age=60, s-maxage=300')
    return response as MinimumWageResponse
  } catch (error) {
    setHeaderUnlessSent(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Minimum wage rentals are temporarily unavailable',
      cause: error,
    })
  }
})
