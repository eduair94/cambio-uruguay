import { loadRentalServiceZoneIds } from '../../utils/rentalZoneServices'
import { publicRentalAdvertisers, rentalPublicPropertyProjection } from '../../utils/rentalDetail'
import { RentalListingModel } from '../../models/RentalListing'
import { RentalMetaModel } from '../../models/RentalMeta'
import { connectDb } from '../../utils/db'
import { getRentalCoverage } from '../../utils/rentalCoverage'
import { rentalDirectoryCacheKey } from '../../utils/rentalDirectoryWarm'
import {
  RENTAL_DISTANCE_SORT_FIELDS,
  rentalDistanceProjection,
  rentalDistanceStages,
} from '../../../utils/rentalDistance'
import {
  RENTAL_PRICE_PER_M2_SORT_FIELDS,
  rentalPricePerM2Stages,
} from '../../../utils/rentalPricePerM2'

import {
  annotateRentalAvailability,
  loadRentalAvailabilityIndex,
} from '../../utils/rentalAvailability'
import {
  RENTAL_COLLATION,
  RENTAL_STALE_DAYS,
  RENTAL_TOTAL_SORT_FIELDS,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalMongoSort,
  rentalOfferStages,
  rentalPublicStages,
  type RentalFacetValue,
  type RentalMeta,
  type RentalProperty,
  type RentalsResponse,
} from '../../../utils/rentals'

/**
 * The rental directory, filtered and paginated IN MONGO.
 *
 * Unlike /api/chairs — a few hundred rows sent whole and filtered in the browser — this collection
 * is tens of thousands of properties. Shipping it to the client would be a multi-megabyte payload
 * per visit, so every filter, the sort, the facet counts and the median all run as queries against
 * the compound indexes declared on the model.
 *
 * Rows whose adverts stopped appearing are excluded by `lastSeen`: the documents stay (the backend
 * prunes them later, and their history is worth keeping), but a flat nobody has published for a
 * week and a half is not shown as if it were on the market today.
 */
const STALE_DAYS = RENTAL_STALE_DAYS

/** Lo que el navegador y el borde pueden guardar; la memoria del proceso se rige por `maxAge`. */
export const RENTAL_DIRECTORY_CACHE_CONTROL = 'public, max-age=30, s-maxage=300'

/**
 * El directorio entero es un memo de 5 minutos por consulta, y el SSR de /alquileres-uruguay lo
 * lee de memoria: medido 2026-09-22, la página tardaba 4,5 s y el 100 % era esta ruta —seis
 * agregaciones sobre todo el inventario por pedido, con el sort en memoria porque `rentalPublicStages`
 * recalcula `freshAt` antes de ordenar—. Con dos permisos de SSR (`propertySsrAdmission`) eso
 * saturaba a 0,4 pedidos por segundo y el resto cobraba 503.
 *
 * La consulta de la primera página es idéntica para todo visitante (`availabilityRevision` sólo viaja
 * cuando el propio visitante reportó un aviso, y en SSR siempre es 0), así que no hay nada personal
 * que guardar. Un fallo NO se guarda: Nitro no almacena una respuesta cuando el handler lanza, y con
 * una entrada vencida en mano sirve la vieja y registra el error en vez de propagarlo.
 */
const cachedDirectory = defineCachedEventHandler(
  async (event): Promise<RentalsResponse> => {
    const query = normalizeRentalQuery(getQuery(event) as Record<string, unknown>)

    try {
      await connectDb()
      const availability = await loadRentalAvailabilityIndex()
      const excluded = availability.excludedAdvertIds(query.availability)
      const meta = (await RentalMetaModel.findOne({ key: 'uy-rentals' })
        .select({ _id: 0, __v: 0 })
        .lean()) as RentalMeta | null
      const usdUyu = Number(meta?.usdUyu) || 0

      // El filtro lo arma `buildRentalFilter` y no este archivo: lo comparte con /api/rentals/mapa,
      // y dos copias del mismo filtro terminan divergiendo — un mapa que muestra propiedades que la
      // lista no lista es la misma clase de contradicción que el sitio ya tuvo entre su meta
      // description y su propio FAQ.
      const serviceZones = query.servicios?.length
        ? await loadRentalServiceZoneIds(query.servicios)
        : undefined
      const { filter, nonLocation, withoutNeighborhood } = buildRentalFilter(
        query,
        STALE_DAYS,
        usdUyu,
        serviceZones
      )
      const sort = rentalMongoSort(query.sort)
      const offerStages = rentalOfferStages(query, usdUyu)
      // Sorting alone must not change the rental-price statistics for the same search.
      const priceStages = rentalOfferStages({ ...query, sort: 'precio' }, usdUyu)
      const publicStages = rentalPublicStages(filter, STALE_DAYS, excluded)

      const [items, totals, departments, neighborhoods, dimensions, coverage] = await Promise.all([
        RentalListingModel.aggregate([
          ...publicStages,
          ...offerStages,
          ...rentalDistanceStages(query),
          // On the advert chosen above: the card divides this same price by the same area.
          ...(query.sort === 'precio-m2' ? rentalPricePerM2Stages() : []),
          // Rich source evidence must not enter the blocking sort buffer.
          {
            $project: {
              ...rentalPublicPropertyProjection,
              ...rentalDistanceProjection(query),
              ...(query.sort === 'total'
                ? Object.fromEntries(RENTAL_TOTAL_SORT_FIELDS.map(field => [field, 1]))
                : {}),
              ...(query.sort === 'precio-m2'
                ? Object.fromEntries(RENTAL_PRICE_PER_M2_SORT_FIELDS.map(field => [field, 1]))
                : {}),
            },
          },
          { $sort: sort },
          { $skip: (query.page - 1) * query.perPage },
          { $limit: query.perPage },
          ...(query.sort === 'total' ? [{ $unset: [...RENTAL_TOTAL_SORT_FIELDS] }] : []),
          ...(query.sort === 'precio-m2' ? [{ $unset: [...RENTAL_PRICE_PER_M2_SORT_FIELDS] }] : []),
          ...(query.refLat !== null ? [{ $unset: [...RENTAL_DISTANCE_SORT_FIELDS] }] : []),
        ])
          // Deep offsets retain every preceding public row in Mongo's top-k sort. Even the slim
          // projection can exceed 100 MiB at this inventory size; allow bounded disk spill.
          .allowDiskUse(true)
          .collation(RENTAL_COLLATION),
        RentalListingModel.aggregate([...publicStages, { $count: 'total' }]).collation(
          RENTAL_COLLATION
        ),
        RentalListingModel.aggregate([
          ...rentalPublicStages(nonLocation, STALE_DAYS, excluded),
          { $group: { _id: '$department', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 25 },
        ]).collation(RENTAL_COLLATION),
        // Exclude the neighborhood's own selection so selecting Pocitos does not hide Cordón.
        RentalListingModel.aggregate([
          ...rentalPublicStages(withoutNeighborhood, STALE_DAYS, excluded),
          { $match: { neighborhood: { $ne: '' } } },
          { $group: { _id: '$neighborhood', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 250 },
        ]).collation(RENTAL_COLLATION),
        RentalListingModel.aggregate([
          ...publicStages,
          {
            $facet: {
              types: [
                { $group: { _id: '$propertyType', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
              ],
              sources: [
                { $unwind: '$sources' },
                { $group: { _id: '$sources', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
              ],
              price: [...priceStages, { $group: { _id: null, max: { $max: '$priceUyu' } } }],
            },
          },
        ]).collation(RENTAL_COLLATION),
        getRentalCoverage(meta?.generatedAt, STALE_DAYS),
      ])
      const total = Number(totals[0]?.total) || 0

      // The median is what tells someone whether a price is normal for the filter they built. Taken
      // by skipping to the middle of the sorted set rather than pushing every price into memory.
      let medianUyu = 0
      if (total > 0) {
        const middle = await RentalListingModel.aggregate([
          ...publicStages,
          ...priceStages,
          // The median needs one number per home, not its offers, galleries or identity evidence.
          { $project: { _id: 0, priceUyu: 1 } },
          { $sort: { priceUyu: 1 } },
          { $skip: Math.floor((total - 1) / 2) },
          { $limit: total % 2 === 0 ? 2 : 1 },
        ]).collation(RENTAL_COLLATION)
        const prices = middle.map(row => Number(row.priceUyu)).filter(Number.isFinite)
        medianUyu = prices.length
          ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
          : 0
      }

      const toFacet = (rows: Array<{ _id: string; count: number }>): RentalFacetValue[] =>
        (rows || [])
          .filter(row => row?._id)
          .map(row => ({ value: String(row._id), count: row.count }))

      const dimension = (dimensions?.[0] || {}) as Record<
        string,
        Array<{ _id: string; count: number }>
      >

      return {
        meta: (meta as RentalMeta | null) ?? null,
        coverage,
        items: (items as RentalProperty[]).map(property =>
          annotateRentalAvailability(publicRentalAdvertisers(property), availability)
        ),
        total,
        page: query.page,
        perPage: query.perPage,
        medianUyu,
        facets: {
          departments: toFacet(departments as Array<{ _id: string; count: number }>),
          neighborhoods: toFacet(neighborhoods),
          types: toFacet(dimension.types || []),
          sources: toFacet(dimension.sources || []),
          priceMaxUyu: Number((dimension.price?.[0] as unknown as { max?: number })?.max || 0),
        },
      }
    } catch (error) {
      console.error('[api/rentals] failed', error)
      throw createError({
        statusCode: 503,
        statusMessage: 'Rental search is temporarily unavailable',
        cause: error,
      })
    }
  },
  {
    name: 'rentals-directory',
    getKey: event => rentalDirectoryCacheKey(getQuery(event) as Record<string, unknown>),
    maxAge: 300,
    // Sirve la página vieja mientras UN worker la reconstruye (Nitro deduplica los fallos de caché
    // en vuelo), y sobrevive una hora sin backend antes de volver a cobrar el pedido entero.
    staleMaxAge: 3600,
    swr: true,
    // Quien acaba de reportar un aviso como alquilado tiene que verlo desaparecer ya. Y en `nuxt dev`
    // no se guarda nada: `page.route` sólo intercepta fetches del navegador, el primer render SSR
    // pega acá de verdad, y un `maxAge: 0` en Nitro no vence nunca (ttl 0 = sin vencimiento).
    // NODE_ENV y no `import.meta.dev` porque tests/unit/rentalsSortMemory.test.ts transpila este
    // archivo a CommonJS y lo corre en un VM, donde `import.meta` es un error de sintaxis.
    shouldBypassCache: event =>
      process.env.NODE_ENV === 'development' || Boolean(getQuery(event).availabilityRevision),
  }
)

// Nitro reemplaza `cache-control` con su propio `s-maxage/stale-while-revalidate` en toda respuesta
// que sale del memo, y descarta las cabeceras que el handler puso antes de lanzar. Por eso las dos
// cabeceras que este sitio promete —la del navegador y el `no-store` del 503— se ponen por fuera.
export default defineEventHandler(async (event): Promise<RentalsResponse> => {
  try {
    const response = await cachedDirectory(event)
    setResponseHeader(event, 'cache-control', RENTAL_DIRECTORY_CACHE_CONTROL)
    return response as RentalsResponse
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw error
  }
})
