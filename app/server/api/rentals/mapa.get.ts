import type { PipelineStage } from 'mongoose'
import { loadRentalServiceZoneIds } from '../../utils/rentalZoneServices'
import { RentalListingModel } from '../../models/RentalListing'
import { RentalMetaModel } from '../../models/RentalMeta'
import { connectDb } from '../../utils/db'
import { loadRentalAvailabilityIndex } from '../../utils/rentalAvailability'
import { setHeaderUnlessSent } from '../../utils/cachedResponseHeader'
import { rentalSortKeyProjection } from '../../utils/rentalDirectoryOrder'
import {
  RENTAL_MEMO_HEADER,
  RENTAL_WORKER_HEADER,
  formatRentalMemoHeader,
  hashIds,
  rentalMemo,
  rentalMemoKey,
  rentalWorkerId,
  type RentalMemoKind,
  type RentalMemoState,
} from '../../utils/rentalMemo'
import {
  rentalAvailabilityAdvertId,
  type RentalAvailabilitySummary,
} from '../../../utils/rentalAvailability'
import { rentalDistanceProjection, rentalDistanceStages } from '../../../utils/rentalDistance'
import { rentalPricePerM2Stages } from '../../../utils/rentalPricePerM2'
import {
  RENTAL_COLLATION,
  RENTAL_STALE_DAYS,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalMongoSort,
  rentalOfferStages,
  rentalPublicStages,
  type RentalMapPoint,
  type RentalMapResponse,
  type RentalQuery,
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
 *
 * Since 2026-11-20 (spec P4, docs/app/RENTALS_DIRECTORY_API.md): ONE points pass that also counts
 * the located homes, marker-only points (half the bytes), and a per-worker memo (`map` kind of
 * server/utils/rentalMemo.ts), so a reopened map reads memory instead of re-deriving the whole
 * inventory (it was 5–12 s and 856 KB from outside). Points are at most 15 minutes old.
 */
const STALE_DAYS = RENTAL_STALE_DAYS

/**
 * Tope de puntos por respuesta.
 *
 * 3.000 marcadores agrupados los dibuja Leaflet sin transpirar, y a ~90 bytes por punto son unos
 * 270 KB — que además viajan comprimidos y NUNCA por el payload del SSR, porque la página pide
 * esto sólo cuando alguien abre el mapa. Más que eso no mejora la lectura: arriba de tres mil
 * pines lo que se ve son los grupos, no los pines. Also the `$facet` that carries them is ONE
 * document (16 MB cap): 3,000 rows with their sort keys measured 1.07 MB on production
 * (tests/unit/rentalsMapProjection.test.ts refuses a cap above 5,000).
 */
const MAX_POINTS = 3000

/**
 * What a marker needs, and nothing else: its key, point, barrio and price, plus the offer Mongo
 * chose (`rentalOfferStages`, else the cheapest current offer of `rentalPublicStages`), the same
 * offer the list card shows, whose source and id are what availability reports hang on. Bedrooms,
 * area, the offer count and the advert link were 47.7 % of the bytes and nothing read them: the
 * page opens the property detail for those.
 */
const MAP_POINT_FIELDS = Object.freeze({
  key: 1,
  latitude: 1,
  longitude: 1,
  neighborhood: 1,
  price: 1,
  currency: 1,
  'matchingOffer.price': 1,
  'matchingOffer.currency': 1,
  'matchingOffer.source': 1,
  'matchingOffer.listingId': 1,
})

/**
 * The points pass. Pure, and exported so a production check runs this array itself.
 *
 * It ends in one `$facet`: `located` counts every located home of the search, `points` sorts them
 * and keeps the first `MAX_POINTS`. Until 2026-11-20 the located count was a third full pass of
 * its own; it is the same rows (measured on production: 51,268 = 51,268).
 *
 * EVERY key of the `$sort` has to survive the `$project` before it: Mongo sorts a missing field as
 * null without a word, every row ties and the map silently falls to the next key. Before
 * 2026-11-20 that happened twice here ("baja" and "precio-m2"); `rentalSortKeyProjection` is the
 * list's own rule for it (tests/unit/rentalsMapProjection.test.ts checks every sort).
 */
export function rentalMapPointsPipeline(
  query: RentalQuery,
  publicLocated: object[],
  offerStages: object[]
): PipelineStage[] {
  return [
    ...publicLocated,
    ...offerStages,
    ...rentalDistanceStages(query),
    // On the advert chosen above, as the list does.
    ...(query.sort === 'precio-m2' ? rentalPricePerM2Stages() : []),
    // Discard rich descriptions, galleries and private identity before Mongo keeps sort rows.
    {
      $project: {
        _id: 0,
        ...MAP_POINT_FIELDS,
        ...rentalDistanceProjection(query),
        ...rentalSortKeyProjection(query),
      },
    },
    {
      $facet: {
        located: [{ $count: 'n' }],
        points: [{ $sort: rentalMongoSort(query.sort) }, { $limit: MAX_POINTS }],
      },
    },
  ] as PipelineStage[]
}

type RentalMapRole = 'map' | 'mapCount'

/** The one call chain every rentals aggregation goes through (spec §1), here for the map's two. */
function aggregateMap<T>(
  role: RentalMapRole,
  pipeline: PipelineStage[],
  allowDiskUse = false
): Promise<T[]> {
  return RentalListingModel.aggregate(pipeline)
    .allowDiskUse(allowDiskUse)
    .option({ maxTimeMS: 20_000, comment: `rentals:${role}` })
    .collation(RENTAL_COLLATION) as unknown as Promise<T[]>
}

/** One memo entry: the points without availability (it changes on every report), frozen. */
interface RentalMapMemoValue {
  points: readonly RentalMapPoint[]
  /** The availability id of each point's offer, in the same order (`null` when it has none). */
  advertIds: readonly (string | null)[]
  total: number
  located: number
}

/**
 * Both passes of one map, run together; the exchange rate is read here, never in a key.
 * One memo slot covers two aggregations until P7 reads total from the facet memo.
 */
async function buildRentalMap(
  query: RentalQuery,
  excluded: string[],
  serviceZones: string[] | null | undefined
): Promise<{ value: RentalMapMemoValue; weight: number }> {
  const meta = await RentalMetaModel.findOne({ key: 'uy-rentals' }).select({ usdUyu: 1 }).lean()
  const usdUyu = Number(meta?.usdUyu) || 0
  const { filter } = buildRentalFilter(query, STALE_DAYS, usdUyu, serviceZones)

  // `$type: 'number'` y no `$ne: null`: los documentos viejos traen la coordenada ausente, no
  // nula, y un `$ne: null` los cuenta como si la tuvieran.
  const located: Record<string, unknown> = {
    ...filter,
    latitude: { $type: 'number', $gte: -35.5, $lte: -30 },
    longitude: { $type: 'number', $gte: -58.6, $lte: -53 },
  }
  const [totals, [mapped]] = await Promise.all([
    aggregateMap<{ total?: number }>('mapCount', [
      ...rentalPublicStages(filter, STALE_DAYS, excluded),
      { $count: 'total' },
    ] as PipelineStage[]),
    aggregateMap<{ located?: Array<{ n?: number }>; points?: Array<Record<string, any>> }>(
      'map',
      rentalMapPointsPipeline(
        query,
        rentalPublicStages(located, STALE_DAYS, excluded),
        rentalOfferStages(query, usdUyu)
      ),
      // The points branch is a top-k sort of slim rows; the disk stays allowed in case a larger
      // catalogue ever pushes it past Mongo's 100 MiB.
      true
    ),
  ])

  const points: RentalMapPoint[] = []
  const advertIds: (string | null)[] = []
  for (const row of mapped?.points ?? []) {
    const lat = Number(row.latitude)
    const lng = Number(row.longitude)
    // Un cero exacto en las dos es el null de los feeds, no la isla de Null: cae en el Golfo de
    // Guinea y arrastraría el encuadre del mapa a África.
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue
    const offer = row.matchingOffer ?? undefined
    points.push(
      Object.freeze({
        key: String(row.key),
        lat,
        lng,
        ...(query.refLat !== null
          ? {
              distanceKm:
                typeof row.distanceKm === 'number' && Number.isFinite(row.distanceKm)
                  ? row.distanceKm
                  : null,
            }
          : {}),
        price: Number(offer?.price ?? row.price) || 0,
        currency: (offer?.currency ?? row.currency) === 'USD' ? 'USD' : 'UYU',
        neighborhood: String(row.neighborhood || ''),
      } satisfies RentalMapPoint)
    )
    advertIds.push(rentalAvailabilityAdvertId(offer?.source, offer?.listingId))
  }

  const value: RentalMapMemoValue = Object.freeze({
    points: Object.freeze(points),
    advertIds: Object.freeze(advertIds),
    total: Number(totals[0]?.total) || 0,
    located: Number(mapped?.located?.[0]?.n) || 0,
  })
  // Three bytes of heap per byte of JSON, plus the arrays and numbers around them.
  return { value, weight: 3 * JSON.stringify(points).length + 1024 }
}

/** The stored points as they are, or a copy with the reports of this moment on their adverts. */
function withAvailability(
  value: RentalMapMemoValue,
  byAdvertId: ReadonlyMap<string, RentalAvailabilitySummary>
): RentalMapPoint[] {
  if (byAdvertId.size === 0) return value.points as RentalMapPoint[]
  return value.points.map((point, i) => {
    const summary = byAdvertId.get(value.advertIds[i] ?? '')
    return summary ? { availability: summary, ...point } : point
  })
}

interface RentalMemoRecord {
  kind: RentalMemoKind | 'outer'
  state: RentalMemoState
}

/** For the after-deploy classification (spec §3.1), never for the browser; nothing personal. */
function setRentalMemoHeaders(
  event: Parameters<typeof setHeaderUnlessSent>[0],
  records: readonly RentalMemoRecord[]
) {
  const memo = formatRentalMemoHeader(records)
  if (memo) setHeaderUnlessSent(event, RENTAL_MEMO_HEADER, memo)
  setHeaderUnlessSent(event, RENTAL_WORKER_HEADER, rentalWorkerId())
}

export default defineEventHandler(async (event): Promise<RentalMapResponse> => {
  setResponseHeader(event, 'cache-control', 'public, max-age=30, s-maxage=60')
  // Every memo lookup of this request, in order (P7 adds the facet lookup for `total`).
  const records: RentalMemoRecord[] = []
  if (event.context) event.context.rentalsMemo = records

  const query = normalizeRentalQuery(getQuery(event) as Record<string, unknown>)
  try {
    await connectDb()
    const availability = await loadRentalAvailabilityIndex()
    const excluded = availability.excludedAdvertIds(query.availability)
    const serviceZones = query.servicios?.length
      ? await loadRentalServiceZoneIds(query.servicios)
      : undefined
    // Hidden adverts and the barrios of a service filter change the answer: both are in the key.
    // The cutoff day and the exchange rate are not: they age out with the TTL.
    const key = rentalMemoKey('map', query, {
      zones: hashIds(serviceZones),
      excluded: hashIds(excluded),
    })
    // A refused or failed build without an entry under an hour old throws: 503 below.
    const { value, state } = await rentalMemo.get<RentalMapMemoValue>('map', key, () =>
      buildRentalMap(query, excluded, serviceZones)
    )
    records.push({ kind: 'map', state })

    const points = withAvailability(value, availability.byAdvertId)
    const { total, located: locatedCount } = value
    setRentalMemoHeaders(event, records)
    return { points, total, located: locatedCount, shown: points.length, limit: MAX_POINTS }
  } catch (error) {
    console.error('[api/rentals/mapa] failed', error)
    setResponseHeader(event, 'cache-control', 'no-store')
    setRentalMemoHeaders(event, records)
    throw createError({
      statusCode: 503,
      statusMessage: 'Rental map is temporarily unavailable',
      cause: error,
    })
  }
})
