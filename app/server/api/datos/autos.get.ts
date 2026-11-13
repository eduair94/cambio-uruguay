import {
  CAR_FILTERS,
  internalListingQuery,
  LISTINGS_NOTE,
  OPEN_DATA_SITE,
  openCar,
  openDataEnvelope,
  type RawCarListing,
} from '../../../utils/openData'
import { openDataError, openDataHeaders } from '../../utils/openData'

interface CarsPage {
  generatedAt?: string
  total?: number
  items?: RawCarListing[]
}

/**
 * Búsqueda pública de autos usados: la misma consulta del directorio (`/api/cars`) en la forma
 * pública. Sin fotos, sin nombre de vendedor, sin enlace al aviso original (ver utils/openData.ts).
 */
export default defineEventHandler(async event => {
  const { query, page, limit } = internalListingQuery(
    getQuery(event) as Record<string, unknown>,
    CAR_FILTERS
  )
  let res: CarsPage
  try {
    res = await $fetch<CarsPage>('/api/cars', { query, timeout: 20_000 })
  } catch {
    openDataError(event, 503, 'el directorio no responde por un momento')
  }
  openDataHeaders(event, 900)
  const items = (res.items ?? []).slice(0, limit).map(openCar)
  const params = new URLSearchParams(query).toString()
  return openDataEnvelope(
    { total: res.total ?? items.length, pagina: page, avisos: items },
    {
      pagina: `${OPEN_DATA_SITE}/autos-usados-uruguay${params ? `?${params}` : ''}`,
      actualizado: res.generatedAt ?? null,
      licensed: false,
      nota: LISTINGS_NOTE,
    }
  )
})
