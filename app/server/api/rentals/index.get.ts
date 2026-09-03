import { RentalListingModel } from '../../models/RentalListing'
import { RentalMetaModel } from '../../models/RentalMeta'
import { connectDb } from '../../utils/db'
import {
  buildRentalFilter,
  normalizeRentalQuery,
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
const STALE_DAYS = 10

export default defineEventHandler(async (event): Promise<RentalsResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=180, s-maxage=300, stale-while-revalidate=86400'
  )

  const query = normalizeRentalQuery(getQuery(event) as Record<string, unknown>)

  const empty: RentalsResponse = {
    meta: null,
    items: [],
    total: 0,
    page: query.page,
    perPage: query.perPage,
    medianUyu: 0,
    facets: { departments: [], neighborhoods: [], types: [], sources: [], priceMaxUyu: 0 },
  }

  try {
    await connectDb()

    // El filtro lo arma `buildRentalFilter` y no este archivo: lo comparte con /api/rentals/mapa,
    // y dos copias del mismo filtro terminan divergiendo — un mapa que muestra propiedades que la
    // lista no lista es la misma clase de contradicción que el sitio ya tuvo entre su meta
    // description y su propio FAQ.
    const { filter, nonLocation } = buildRentalFilter(query, STALE_DAYS)

    const sort: Record<string, 1 | -1> =
      query.sort === 'precio'
        ? { priceUyu: 1, lastSeen: -1 }
        : query.sort === 'precio-desc'
          ? { priceUyu: -1, lastSeen: -1 }
          : query.sort === 'metros'
            ? { area: -1, priceUyu: 1 }
            : // "Más recientes". The tiebreak is `key`, NOT price: every row shares today's date on
              // a fresh directory, and a price tiebreak filled page one with $3.500 garages.
              { freshAt: -1, key: 1 }

    const [items, total, meta, departments, dimensions] = await Promise.all([
      RentalListingModel.find(filter)
        .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0, addressKey: 0 })
        .sort(sort)
        .skip((query.page - 1) * query.perPage)
        .limit(query.perPage)
        .lean(),
      RentalListingModel.countDocuments(filter),
      RentalMetaModel.findOne({ key: 'uy-rentals' }).select({ _id: 0, __v: 0 }).lean(),
      RentalListingModel.aggregate([
        { $match: nonLocation },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 25 },
      ]),
      RentalListingModel.aggregate([
        { $match: filter },
        {
          $facet: {
            neighborhoods: [
              { $match: { neighborhood: { $ne: '' } } },
              { $group: { _id: '$neighborhood', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 80 },
            ],
            types: [
              { $group: { _id: '$propertyType', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            sources: [
              { $unwind: '$sources' },
              { $group: { _id: '$sources', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            price: [{ $group: { _id: null, max: { $max: '$priceUyu' } } }],
          },
        },
      ]),
    ])

    // The median is what tells someone whether a price is normal for the filter they built. Taken
    // by skipping to the middle of the sorted set rather than pushing every price into memory.
    let medianUyu = 0
    if (total > 0) {
      const middle = await RentalListingModel.find(filter)
        .select({ _id: 0, priceUyu: 1 })
        .sort({ priceUyu: 1 })
        .skip(Math.floor(total / 2))
        .limit(1)
        .lean()
      medianUyu = Number((middle?.[0] as { priceUyu?: number } | undefined)?.priceUyu || 0)
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
      items: items as unknown as RentalProperty[],
      total,
      page: query.page,
      perPage: query.perPage,
      medianUyu,
      facets: {
        departments: toFacet(departments as Array<{ _id: string; count: number }>),
        neighborhoods: toFacet(dimension.neighborhoods || []),
        types: toFacet(dimension.types || []),
        sources: toFacet(dimension.sources || []),
        priceMaxUyu: Number((dimension.price?.[0] as unknown as { max?: number })?.max || 0),
      },
    }
  } catch (error) {
    console.error('[api/rentals] failed', error)
    return empty
  }
})
