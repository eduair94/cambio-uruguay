import { RentalListingModel } from '../../models/RentalListing'
import { RentalMetaModel } from '../../models/RentalMeta'
import { connectDb } from '../../utils/db'
import { getRentalCoverage } from '../../utils/rentalCoverage'
import {
  RENTAL_COLLATION,
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
const STALE_DAYS = 10

export default defineEventHandler(async (event): Promise<RentalsResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=180, s-maxage=300, stale-while-revalidate=86400'
  )

  const query = normalizeRentalQuery(getQuery(event) as Record<string, unknown>)

  try {
    await connectDb()
    const meta = (await RentalMetaModel.findOne({ key: 'uy-rentals' })
      .select({ _id: 0, __v: 0 })
      .lean()) as RentalMeta | null
    const usdUyu = Number(meta?.usdUyu) || 0

    // El filtro lo arma `buildRentalFilter` y no este archivo: lo comparte con /api/rentals/mapa,
    // y dos copias del mismo filtro terminan divergiendo — un mapa que muestra propiedades que la
    // lista no lista es la misma clase de contradicción que el sitio ya tuvo entre su meta
    // description y su propio FAQ.
    const { filter, nonLocation, withoutNeighborhood } = buildRentalFilter(
      query,
      STALE_DAYS,
      usdUyu
    )
    const sort = rentalMongoSort(query.sort)
    const offerStages = rentalOfferStages(query, usdUyu)
    const publicStages = rentalPublicStages(filter, STALE_DAYS)

    const [items, totals, departments, neighborhoods, dimensions, coverage] = await Promise.all([
      RentalListingModel.aggregate([
        ...publicStages,
        ...offerStages,
        { $sort: sort },
        { $skip: (query.page - 1) * query.perPage },
        { $limit: query.perPage },
        { $project: { _id: 0, __v: 0, createdAt: 0, updatedAt: 0, addressKey: 0 } },
      ]).collation(RENTAL_COLLATION),
      RentalListingModel.aggregate([...publicStages, { $count: 'total' }]).collation(
        RENTAL_COLLATION
      ),
      RentalListingModel.aggregate([
        ...rentalPublicStages(nonLocation, STALE_DAYS),
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 25 },
      ]).collation(RENTAL_COLLATION),
      // Exclude the neighborhood's own selection so selecting Pocitos does not hide Cordón.
      RentalListingModel.aggregate([
        ...rentalPublicStages(withoutNeighborhood, STALE_DAYS),
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
            price: [...offerStages, { $group: { _id: null, max: { $max: '$priceUyu' } } }],
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
        ...offerStages,
        { $sort: { priceUyu: 1 } },
        { $skip: Math.floor((total - 1) / 2) },
        { $limit: total % 2 === 0 ? 2 : 1 },
        { $project: { _id: 0, priceUyu: 1 } },
      ]).collation(RENTAL_COLLATION)
      const prices = middle.map(row => Number(row.priceUyu)).filter(Number.isFinite)
      medianUyu = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
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
      items: items as RentalProperty[],
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
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Rental search is temporarily unavailable',
    })
  }
})
