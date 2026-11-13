import {
  internalListingQuery,
  LISTINGS_NOTE,
  OPEN_DATA_SITE,
  openDataEnvelope,
  openRental,
  RENTAL_FILTERS,
  type RawRentalListing,
} from '../../../utils/openData'
import { openDataError, openDataHeaders } from '../../utils/openData'

interface RentalsPage {
  items?: RawRentalListing[]
  total?: number
  meta?: { generatedAt?: string; updatedAt?: string } | null
}

/**
 * Búsqueda pública de alquileres: la MISMA consulta que hace el directorio (`/api/rentals`, con su
 * caché), traducida a la forma pública. Nada de lo que la ficha esconde sale por acá: sin fotos,
 * contactos, coordenadas ni URL del portal de origen (ver el encabezado de utils/openData.ts).
 */
export default defineEventHandler(async event => {
  const { query, page, limit } = internalListingQuery(
    getQuery(event) as Record<string, unknown>,
    RENTAL_FILTERS
  )
  let res: RentalsPage
  try {
    res = await $fetch<RentalsPage>('/api/rentals', { query, timeout: 20_000 })
  } catch {
    openDataError(event, 503, 'el directorio no responde por un momento')
  }
  openDataHeaders(event, 900)
  const items = (res.items ?? []).slice(0, limit).map(openRental)
  const params = new URLSearchParams(query).toString()
  return openDataEnvelope(
    { total: res.total ?? items.length, pagina: page, avisos: items },
    {
      pagina: `${OPEN_DATA_SITE}/alquileres-uruguay${params ? `?${params}` : ''}`,
      actualizado: res.meta?.generatedAt ?? res.meta?.updatedAt ?? null,
      licensed: false,
      nota: LISTINGS_NOTE,
    }
  )
})
