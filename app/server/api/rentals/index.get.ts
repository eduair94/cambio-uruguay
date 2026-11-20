import type { PipelineStage } from 'mongoose'
import { loadRentalServiceZoneIds } from '../../utils/rentalZoneServices'
import { setHeaderUnlessSent } from '../../utils/cachedResponseHeader'
import { publicRentalAdvertisers, rentalPublicPropertyProjection } from '../../utils/rentalDetail'
import {
  rentalGalleryProjection,
  withRentalGalleryPreviews,
  type RentalGalleryRow,
} from '../../utils/rentalGalleryPreview'
import { RentalListingModel } from '../../models/RentalListing'
import { RentalMetaModel } from '../../models/RentalMeta'
import { connectDb } from '../../utils/db'
import { getRentalCoverage } from '../../utils/rentalCoverage'
import { rentalDirectoryCacheKey } from '../../utils/rentalDirectoryWarm'
import {
  orderByKeys,
  rentalDirectoryCardsPipeline,
  rentalDirectoryCardsStages,
  rentalDirectoryKeysPipeline,
} from '../../utils/rentalDirectoryOrder'
import {
  normalizeRentalDirectoryParts,
  type RentalsDirectoryResponse,
} from '../../../utils/rentalDirectoryParts'
import {
  RENTAL_DISTANCE_SORT_FIELDS,
  rentalDistanceProjection,
  rentalDistanceStages,
} from '../../../utils/rentalDistance'
import {
  RENTAL_PRICE_PER_M2_SORT_FIELDS,
  rentalPricePerM2Stages,
} from '../../../utils/rentalPricePerM2'
import { rentalBarrioOptionPlausible } from '../../../utils/rentalBarrioOption'

import {
  annotateRentalAvailability,
  loadRentalAvailabilityIndex,
} from '../../utils/rentalAvailability'
import {
  RENTAL_COLLATION,
  RENTAL_STALE_DAYS,
  RENTAL_RECENT_SORT_FIELDS,
  RENTAL_TOTAL_SORT_FIELDS,
  rentalMedianFacet,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalMongoSort,
  rentalOfferStages,
  rentalPublicStages,
  rentalRecentSortProjection,
  type RentalFacetValue,
  type RentalMeta,
  type RentalProperty,
  type RentalQuery,
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

/**
 * The barrio selector shows up to 250 names, read from the 5,000 most published ones. The names it
 * drops (utils/rentalBarrioOption.ts) take places in whatever is read, and with ties broken
 * alphabetically a surface ("40 m2 40 m2") sorts before every barrio with as many adverts.
 * Measured on 2026-11-08 in Montevideo:
 *  - reading 250, the selector stopped at the barrios with 4 adverts;
 *  - reading 1,000, at those with 2: Casasweb's surfaces alone ("61 m2 61 m2", almost one per
 *    advert) made over 1,000 distinct names, so Retiro and Chacarita (1 advert each) stayed out.
 * Reading more costs little: the grouping runs over every advert anyway, and the reply is cut at
 * 250.
 */
const BARRIO_FACET_SIZE = 250
const BARRIO_FACET_READ = 5000

const DEPARTMENT_FACET_STAGES = [
  { $group: { _id: '$department', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 25 },
]

const NEIGHBORHOOD_FACET_STAGES = [
  { $match: { neighborhood: { $ne: '' } } },
  { $group: { _id: '$neighborhood', count: { $sum: 1 } } },
  { $sort: { count: -1, _id: 1 } },
  { $limit: BARRIO_FACET_READ },
]

/**
 * `buildRentalFilter` returns shallow copies of one filter, so two variants that hold the same keys
 * with the same values select exactly the same properties.
 */
function sameRentalFilter(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = Object.keys(a)
  return (
    keys.length === Object.keys(b).length &&
    keys.every(key => Object.prototype.hasOwnProperty.call(b, key) && a[key] === b[key])
  )
}

/** Every aggregation of this route says what it is, so mongod's slow-op log counts them by role. */
type RentalAggregateRole = 'keys' | 'cards' | 'legacy' | 'facet' | 'dept' | 'barrio'

const RENTAL_AGGREGATE_MAX_TIME_MS: Readonly<Record<RentalAggregateRole, number>> = {
  keys: 20_000,
  cards: 10_000,
  legacy: 20_000,
  facet: 20_000,
  dept: 20_000,
  barrio: 20_000,
}

/**
 * The one place this route reaches `rentallistings`. The collation stays last: it is the case- and
 * accent-insensitive comparison every pass needs (tests/unit/rentalsMap.test.ts), and the call the
 * tests' stubs resolve.
 */
function aggregateRentals<T>(
  role: RentalAggregateRole,
  pipeline: PipelineStage[],
  allowDiskUse = false
): Promise<T[]> {
  return RentalListingModel.aggregate(pipeline)
    .allowDiskUse(allowDiskUse)
    .option({ maxTimeMS: RENTAL_AGGREGATE_MAX_TIME_MS[role], comment: `rentals:${role}` })
    .collation(RENTAL_COLLATION) as unknown as Promise<T[]>
}

/** Mongo's MaxTimeMSExpired: the database is saturated, and a second pass would only add to it. */
function isMaxTimeExpired(error: unknown): boolean {
  const { code, codeName } = (error ?? {}) as { code?: unknown; codeName?: unknown }
  return code === 50 || codeName === 'MaxTimeMSExpired'
}

/**
 * The single pass: one page of the search, sorted, cards included. Pure, and exported so the
 * production check of an order change runs THIS array and not a copy of it that can drift from the
 * route. `publicStages` is `rentalPublicStages(filter, …)` and `offerStages` is
 * `rentalOfferStages(query, …)`.
 *
 * Since 2026-11-20 the route no longer runs it over the whole search: it is the CARDS pass, run
 * over the keys of the page (server/utils/rentalDirectoryOrder.ts), and the fallback when the keys
 * or the cards pass fail for any reason but a timeout.
 */
export function rentalDirectoryItemsPipeline(
  query: RentalQuery,
  publicStages: object[],
  offerStages: object[]
): PipelineStage[] {
  const recentSortFields = rentalRecentSortProjection(query)
  return [
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
        ...recentSortFields,
        ...(query.sort === 'total'
          ? Object.fromEntries(RENTAL_TOTAL_SORT_FIELDS.map(field => [field, 1]))
          : {}),
        ...(query.sort === 'precio-m2'
          ? Object.fromEntries(RENTAL_PRICE_PER_M2_SORT_FIELDS.map(field => [field, 1]))
          : {}),
      },
    },
    { $sort: rentalMongoSort(query.sort) },
    { $skip: (query.page - 1) * query.perPage },
    { $limit: query.perPage },
    ...(query.sort === 'total' ? [{ $unset: [...RENTAL_TOTAL_SORT_FIELDS] }] : []),
    ...(Object.keys(recentSortFields).length ? [{ $unset: [...RENTAL_RECENT_SORT_FIELDS] }] : []),
    ...(query.sort === 'precio-m2' ? [{ $unset: [...RENTAL_PRICE_PER_M2_SORT_FIELDS] }] : []),
    ...(query.refLat !== null ? [{ $unset: [...RENTAL_DISTANCE_SORT_FIELDS] }] : []),
  ] as PipelineStage[]
}

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
  async (event): Promise<RentalsDirectoryResponse> => {
    const input = getQuery(event) as Record<string, unknown>
    const query = normalizeRentalQuery(input)
    // `items` for the next page of a scroll, `facets` for the barrio list of another department,
    // the whole response otherwise (utils/rentalDirectoryParts.ts).
    const parts = normalizeRentalDirectoryParts(input.parts)

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
      const offerStages = rentalOfferStages(query, usdUyu)
      // Sorting alone must not change the rental-price statistics for the same search.
      const priceStages = rentalOfferStages({ ...query, sort: 'precio' }, usdUyu)
      const publicStages = rentalPublicStages(filter, STALE_DAYS, excluded)
      // Every pass below but the cards pass reads the whole public inventory (`rentalPublicStages`
      // re-derives each property's current offers before anything can filter on them), so each one
      // is a full scan of `rentallistings`. Measured on the VPS on 2026-11-13: ~600 uncached
      // searches in five hours ran ~7,500 s of these scans, up to six at once, and their bursts
      // (513 s of scanning inside one minute) are what starve the other routes' 4 s queries into
      // MaxTimeMSExpired 503s (Sentry CAMBIO-URUGUAY-BACKEND-12, docs/app/SENTRY_ERRORS.md). The
      // count always rides the facet pass, and so do the department and barrio counts whenever
      // their filter is this one: the unfiltered directory reads the inventory twice (the keys of
      // the page, and the facet pass) plus the cards of the page by key, instead of five times.
      // `parts=items` reads it once, `parts=facets` once plus the passes it cannot fold.
      const foldDepartments = sameRentalFilter(nonLocation, filter)
      const foldNeighborhoods = sameRentalFilter(withoutNeighborhood, filter)

      // The page: the keys in the search's order, then the cards of those keys only, in that order
      // (server/utils/rentalDirectoryOrder.ts). Same stages as the single pass, so the same cards.
      const pageItems = async (): Promise<RentalProperty[]> => {
        try {
          const keyRows = await aggregateRentals<{ key?: unknown }>(
            'keys',
            rentalDirectoryKeysPipeline(query, publicStages, offerStages, {
              skip: (query.page - 1) * query.perPage,
              limit: query.perPage,
            }),
            // Deep offsets retain every preceding public row in Mongo's top-k sort; even the keys
            // alone may spill on a deep page of a wide search.
            true
          )
          const keys = keyRows
            .map(row => row?.key)
            .filter((key): key is string => typeof key === 'string')
          if (!keys.length) return []
          const cards = await aggregateRentals<RentalProperty>(
            'cards',
            rentalDirectoryCardsPipeline(
              query,
              // The keys pass's own stages, so the same current-offer cutoff (never a second
              // `rentalPublicStages`, whose clock may have passed midnight since).
              rentalDirectoryCardsStages(publicStages, keys),
              offerStages,
              keys.length,
              rentalDirectoryItemsPipeline
            )
          )
          return orderByKeys(cards, keys)
        } catch (error) {
          // A saturated database answers 503 as before: a second full pass would only add to it.
          if (isMaxTimeExpired(error)) throw error
          console.warn('[api/rentals] fallback', error)
          return aggregateRentals<RentalProperty>(
            'legacy',
            rentalDirectoryItemsPipeline(query, publicStages, offerStages),
            // The single pass sorts every public card: at this inventory size even the slim
            // projection can exceed 100 MiB, so it may spill to disk.
            true
          )
        }
      }

      // The card carousels' photos, read for this page only (see rentalGalleryPreview.ts). A failed
      // read leaves each card with its cover: fewer photos, never a broken search.
      const cardItems = async () => {
        const items = await pageItems()
        const galleries = items.length
          ? await RentalListingModel.find(
              { key: { $in: items.map(property => property.key) } },
              rentalGalleryProjection
            )
              .lean<RentalGalleryRow[]>()
              .catch(() => [])
          : []
        return withRentalGalleryPreviews(items, galleries).map(property =>
          annotateRentalAvailability(publicRentalAdvertisers(property), availability)
        )
      }

      const searchFacets = async () => {
        const [departmentRows, neighborhoodRows, dimensions] = await Promise.all([
          foldDepartments
            ? null
            : aggregateRentals<{ _id: string; count: number }>('dept', [
                ...rentalPublicStages(nonLocation, STALE_DAYS, excluded),
                ...DEPARTMENT_FACET_STAGES,
              ] as PipelineStage[]),
          // Exclude the neighborhood's own selection so selecting Pocitos does not hide Cordón.
          foldNeighborhoods
            ? null
            : aggregateRentals<{ _id: string; count: number }>('barrio', [
                ...rentalPublicStages(withoutNeighborhood, STALE_DAYS, excluded),
                ...NEIGHBORHOOD_FACET_STAGES,
              ] as PipelineStage[]),
          aggregateRentals<Record<string, Array<{ _id: string; count: number }>>>('facet', [
            ...publicStages,
            {
              $facet: {
                total: [{ $count: 'total' }],
                ...(foldDepartments ? { departments: DEPARTMENT_FACET_STAGES } : {}),
                ...(foldNeighborhoods ? { neighborhoods: NEIGHBORHOOD_FACET_STAGES } : {}),
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
                // The median rides this same pass instead of a seventh one (see rentalMedianFacet).
                median: rentalMedianFacet(priceStages),
              },
            },
          ] as PipelineStage[]),
        ])

        const toFacet = (rows: Array<{ _id: string; count: number }>): RentalFacetValue[] =>
          (rows || [])
            .filter(row => row?._id)
            .map(row => ({ value: String(row._id), count: row.count }))

        const dimension = (dimensions?.[0] || {}) as Record<
          string,
          Array<{ _id: string; count: number }>
        >
        const total = Number((dimension.total?.[0] as unknown as { total?: number })?.total) || 0
        const departments = departmentRows ?? dimension.departments ?? []
        const neighborhoods = neighborhoodRows ?? dimension.neighborhoods ?? []
        // The median is what tells someone whether a price is normal for the filter they built.
        const median = Number((dimension.median?.[0] as unknown as { median?: number })?.median)
        const medianUyu = total > 0 && Number.isFinite(median) ? Math.round(median) : 0

        return {
          total,
          medianUyu,
          facets: {
            departments: toFacet(departments),
            // The barrio selector offers no surface, no country (the barrio pages' rule) and no
            // street address ("Sarandí 888"): utils/rentalBarrioOption.ts.
            // A URL that already filters by one still works.
            neighborhoods: toFacet(neighborhoods)
              .filter(row => rentalBarrioOptionPlausible(row.value))
              .slice(0, BARRIO_FACET_SIZE),
            types: toFacet(dimension.types || []),
            sources: toFacet(dimension.sources || []),
            priceMaxUyu: Number((dimension.price?.[0] as unknown as { max?: number })?.max || 0),
          },
        }
      }

      if (parts === 'items') {
        // The next page of a scroll reads the cards only: no facet, department, barrio or
        // coverage pass. The page already holds the count of page 1's response.
        return {
          parts: 'items',
          items: await cardItems(),
          total: null,
          page: query.page,
          perPage: query.perPage,
        }
      }
      if (parts === 'facets') return { parts: 'facets', ...(await searchFacets()) }

      const [items, counts, coverage] = await Promise.all([
        cardItems(),
        searchFacets(),
        getRentalCoverage(meta?.generatedAt, STALE_DAYS),
      ])
      return {
        meta: (meta as RentalMeta | null) ?? null,
        coverage,
        items,
        total: counts.total,
        page: query.page,
        perPage: query.perPage,
        medianUyu: counts.medianUyu,
        facets: counts.facets,
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
// Pero NUNCA sobre una respuesta ya enviada: ante un `If-None-Match` que coincide, el memo contesta
// 304 y cierra la respuesta él mismo, y escribir una cabecera encima tiraba ERR_HTTP_HEADERS_SENT y
// convertía ese 304 en un 500 (Sentry CAMBIO-URUGUAY-BACKEND-14).
export default defineEventHandler(async (event): Promise<RentalsDirectoryResponse> => {
  try {
    const response = await cachedDirectory(event)
    setHeaderUnlessSent(event, 'cache-control', RENTAL_DIRECTORY_CACHE_CONTROL)
    return response as RentalsDirectoryResponse
  } catch (error) {
    setHeaderUnlessSent(event, 'cache-control', 'no-store')
    throw error
  }
})
