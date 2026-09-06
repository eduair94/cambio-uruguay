import { PropertySaleCatalogModel } from '../../models/PropertySaleCatalog'
import { connectDb } from '../../utils/db'
import { loadPropertySalesCoverage, loadPropertySalesMeta } from '../../utils/propertySales'
import {
  propertySaleSummaryProjection,
  publicPropertySaleSummary,
} from '../../utils/propertySalesPublic'
import {
  PROPERTY_SALES_COLLATION,
  normalizePropertySalesQuery,
  type PropertySalesResponse,
  type PropertySaleFacet,
} from '../../../utils/propertySales'
import { propertySalesSort, propertySalesStages } from '../../../utils/propertySalesQuery'

export default defineEventHandler(async (event): Promise<PropertySalesResponse> => {
  const query = normalizePropertySalesQuery(getQuery(event) as Record<string, unknown>)
  try {
    await connectDb()
    const meta = await loadPropertySalesMeta()
    if (!meta) throw new Error('SALE_CATALOG_PREPARING')
    const usdUyu = meta?.usdUyu || 0
    const now = Date.now()
    const stages = propertySalesStages(query, usdUyu, now)
    // A location facet excludes itself and its more specific children so users can change area.
    const facet = (field: string, excluded: string[]) => {
      const input = { ...query }
      for (const name of excluded)
        (input as unknown as Record<string, unknown>)[name] =
          name === 'type' || name === 'source' ? 'all' : ''
      return PropertySaleCatalogModel.aggregate([
        ...propertySalesStages(input, usdUyu, now),
        { $match: { [field]: { $type: 'string', $ne: '' } } },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: field === 'sellerName' ? 150 : 250 },
      ])
        .collation(PROPERTY_SALES_COLLATION)
        .option({ maxTimeMS: 10000 })
    }
    const [totals, departments, localities, neighborhoods, types, sellers, sources, coverage] =
      await Promise.all([
        PropertySaleCatalogModel.aggregate([...stages, { $count: 'total' }])
          .collation(PROPERTY_SALES_COLLATION)
          .option({ maxTimeMS: 10000 }),
        facet('department', ['department', 'locality', 'neighborhood']),
        facet('locality', ['locality', 'neighborhood']),
        facet('neighborhood', ['neighborhood']),
        facet('propertyType', ['type']),
        facet('sellerName', ['seller']),
        facet('source', ['source']),
        loadPropertySalesCoverage(),
      ])
    const total = Number(totals[0]?.total) || 0
    const pages = Math.ceil(total / query.perPage)
    const page = Math.min(query.page, Math.max(1, pages))
    const rows = await PropertySaleCatalogModel.aggregate([
      ...stages,
      { $sort: propertySalesSort(query) },
      { $skip: (page - 1) * query.perPage },
      { $limit: query.perPage },
      { $project: propertySaleSummaryProjection },
    ])
      .collation(PROPERTY_SALES_COLLATION)
      .option({ maxTimeMS: 10000 })
    const toFacet = (values: Array<{ _id: string; count: number }>): PropertySaleFacet[] =>
      values.map(row => ({ value: row._id, count: row.count }))
    setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
    return {
      items: rows.map(publicPropertySaleSummary),
      total,
      page,
      pages,
      perPage: query.perPage,
      usdUyu,
      query: { ...query, page },
      meta,
      coverage,
      facets: {
        departments: toFacet(departments),
        localities: toFacet(localities),
        neighborhoods: toFacet(neighborhoods),
        types: toFacet(types),
        sellers: toFacet(sellers),
        sources: toFacet(sources),
      },
    }
  } catch (error) {
    console.error('[api/property-sales] search failed', error)
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage:
        error instanceof Error && error.message === 'SALE_CATALOG_PREPARING'
          ? 'Property sales catalogue is being prepared'
          : 'Property sales search is temporarily unavailable',
    })
  }
})
