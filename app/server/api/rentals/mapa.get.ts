import { RentalListingModel } from '../../models/RentalListing'
import { connectDb } from '../../utils/db'
import {
  buildRentalFilter,
  normalizeRentalQuery,
  type RentalMapPoint,
  type RentalMapResponse,
} from '../../../utils/rentals'

/**
 * Los puntos del mapa para el filtro actual.
 *
 * RUTA APARTE de /api/rentals a propósito. La lista manda 24 propiedades completas —título,
 * ofertas, vendedor, imágenes— y el mapa necesita lo contrario: muchas propiedades con muy pocos
 * campos. Servir las dos cosas desde el mismo endpoint obligaría a elegir entre un mapa con 24
 * pines o una lista con un payload enorme.
 *
 * El filtro sale de `buildRentalFilter`, el mismo que usa la lista, para que el mapa no pueda
 * mostrar propiedades que la lista no lista.
 *
 * LO QUE ESTE ENDPOINT NO PUEDE DAR, y la página tiene que decirlo: sólo el 52,6 % de las
 * propiedades tiene coordenada (8.456 de 16.087 al 2026-09-03). Los portales no siempre publican
 * una, y geocodificar direcciones uruguayas a partir del texto del aviso es otro problema. Por eso
 * la respuesta trae `total` y `located` por separado: un mapa que muestra la mitad del inventario
 * sin decirlo es peor que uno que lo aclara.
 */
const STALE_DAYS = 10

/**
 * Tope de puntos por respuesta.
 *
 * 3.000 marcadores agrupados los dibuja Leaflet sin transpirar, y a ~90 bytes por punto son unos
 * 270 KB — que además viajan comprimidos y NUNCA por el payload del SSR, porque la página pide
 * esto sólo cuando alguien abre el mapa. Más que eso no mejora la lectura: arriba de tres mil
 * pines lo que se ve son los grupos, no los pines.
 */
const MAX_POINTS = 3000

export default defineEventHandler(async (event): Promise<RentalMapResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=180, s-maxage=300, stale-while-revalidate=86400'
  )

  const query = normalizeRentalQuery(getQuery(event) as Record<string, unknown>)
  const empty: RentalMapResponse = { points: [], total: 0, located: 0, shown: 0, limit: MAX_POINTS }

  try {
    await connectDb()
    const { filter } = buildRentalFilter(query, STALE_DAYS)

    // `$type: 'number'` y no `$ne: null`: los documentos viejos traen la coordenada ausente, no
    // nula, y un `$ne: null` los cuenta como si la tuvieran.
    const located: Record<string, unknown> = {
      ...filter,
      latitude: { $type: 'number' },
      longitude: { $type: 'number' },
    }

    const [total, locatedCount, rows] = await Promise.all([
      RentalListingModel.countDocuments(filter),
      RentalListingModel.countDocuments(located),
      RentalListingModel.find(located)
        .select({
          _id: 0,
          key: 1,
          latitude: 1,
          longitude: 1,
          price: 1,
          currency: 1,
          bedrooms: 1,
          area: 1,
          neighborhood: 1,
          'offers.url': 1,
        })
        // Mismo orden que la lista en su modo por defecto, para que "los primeros del mapa" y "los
        // primeros de la lista" sean las mismas propiedades cuando hay recorte.
        .sort({ freshAt: -1, key: 1 })
        .limit(MAX_POINTS)
        .lean(),
    ])

    const points: RentalMapPoint[] = []
    for (const row of rows as Array<Record<string, any>>) {
      const lat = Number(row.latitude)
      const lng = Number(row.longitude)
      // Un cero exacto en las dos es el null de los feeds, no la isla de Null: cae en el Golfo de
      // Guinea y arrastraría el encuadre del mapa a África.
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue
      points.push({
        key: String(row.key),
        lat,
        lng,
        price: Number(row.price) || 0,
        currency: row.currency === 'USD' ? 'USD' : 'UYU',
        bedrooms: typeof row.bedrooms === 'number' ? row.bedrooms : null,
        area: typeof row.area === 'number' ? row.area : null,
        neighborhood: String(row.neighborhood || ''),
        offers: Array.isArray(row.offers) ? row.offers.length : 0,
        url: (Array.isArray(row.offers) && row.offers[0]?.url) || '',
      })
    }

    return { points, total, located: locatedCount, shown: points.length, limit: MAX_POINTS }
  } catch {
    // Mongo caído: el mapa se muestra vacío y la lista sigue andando por su cuenta.
    return empty
  }
})
