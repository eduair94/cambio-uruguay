import {
  CARS_PER_PAGE,
  carsMatch,
  carsSort,
  normalizeCarsQuery,
  type CarFacet,
  type CarsResponse,
} from '../../../utils/cars'
import { CarCatalogModel } from '../../models/CarCatalog'
import { carListingProjection, loadCarCatalogMeta, publicCarRow } from '../../utils/cars'
import { connectDb } from '../../utils/db'

async function facet(
  match: Record<string, unknown>,
  slugField: string,
  nameField: string,
  limit: number
): Promise<CarFacet[]> {
  const rows = await CarCatalogModel.aggregate<{ _id: string; name: string; count: number }>([
    { $match: match },
    { $group: { _id: `$${slugField}`, name: { $first: `$${nameField}` }, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
  ]).option({ maxTimeMS: 10_000 })
  return rows
    .filter(row => row._id)
    .map(row => ({ slug: String(row._id), name: String(row.name), count: row.count }))
}

export default defineEventHandler(async event => {
  const query = normalizeCarsQuery(getQuery(event) as Record<string, unknown>)
  try {
    await connectDb()
    const meta = await loadCarCatalogMeta()
    if (!meta) throw new Error('CAR_CATALOG_PREPARING')
    const now = new Date()
    const match = carsMatch(query, now, meta.freshDays)
    // "Menos kilómetros" must not lead with adverts whose km we refused to publish.
    if (query.sort === 'km_asc') match.km = { ...((match.km as object) || {}), $ne: null }
    const [total, rows, brands, models, departments] = await Promise.all([
      CarCatalogModel.countDocuments(match).maxTimeMS(10_000),
      CarCatalogModel.find(match)
        .select(carListingProjection)
        .sort(carsSort(query.sort))
        .skip((query.page - 1) * CARS_PER_PAGE)
        .limit(CARS_PER_PAGE)
        .maxTimeMS(10_000)
        .lean(),
      facet(
        carsMatch({ ...query, brand: '', model: '' }, now, meta.freshDays),
        'brandSlug',
        'brand',
        150
      ),
      query.brand
        ? facet(carsMatch({ ...query, model: '' }, now, meta.freshDays), 'marketSlug', 'model', 200)
        : Promise.resolve([]),
      facet(
        carsMatch({ ...query, department: '' }, now, meta.freshDays),
        'department',
        'department',
        19
      ),
    ])
    setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
    const response: CarsResponse = {
      generatedAt: meta.generatedAt,
      usdUyu: meta.usdUyu,
      total,
      page: query.page,
      perPage: CARS_PER_PAGE,
      items: rows.map(row => publicCarRow(row as Record<string, unknown>)),
      facets: { brands, models, departments },
      coverage: {
        listings: meta.listings,
        lastReadAt: meta.lastReadAt,
        lastFullReadAt: meta.lastFullReadAt,
        reportedTotal: meta.reportedTotal,
        opportunities: meta.opportunities,
        models: meta.models.slice(0, 60),
      },
    }
    return response
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Used-car directory is temporarily unavailable',
      cause: error,
    })
  }
})
