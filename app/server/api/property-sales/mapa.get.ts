import { PropertySaleCatalogModel } from '../../models/PropertySaleCatalog'
import { connectDb } from '../../utils/db'
import { loadPropertySalesMeta } from '../../utils/propertySales'
import {
  propertySaleSummaryProjection,
  publicPropertySaleSummary,
} from '../../utils/propertySalesPublic'
import {
  PROPERTY_SALES_COLLATION,
  normalizePropertySalesQuery,
  type PropertySalesMapResponse,
} from '../../../utils/propertySales'
import {
  propertySalesLocatedFilter,
  propertySalesSort,
  propertySalesStages,
} from '../../../utils/propertySalesQuery'
import { resolvePropertySaleZone } from '../../../utils/propertySaleZones'

const MAX_POINTS = 400
export default defineEventHandler(async (event): Promise<PropertySalesMapResponse> => {
  const query = normalizePropertySalesQuery(getQuery(event) as Record<string, unknown>)
  try {
    await connectDb()
    const meta = await loadPropertySalesMeta()
    if (!meta) throw new Error('SALE_CATALOG_PREPARING')
    const stages = propertySalesStages(query, meta?.usdUyu || 0)
    const located = [...stages, { $match: propertySalesLocatedFilter() }]
    const [totals, locatedTotals, rows, zoneGroups] = await Promise.all([
      PropertySaleCatalogModel.aggregate([...stages, { $count: 'total' }])
        .collation(PROPERTY_SALES_COLLATION)
        .option({ maxTimeMS: 10000 }),
      PropertySaleCatalogModel.aggregate([...located, { $count: 'total' }])
        .collation(PROPERTY_SALES_COLLATION)
        .option({ maxTimeMS: 10000 }),
      PropertySaleCatalogModel.aggregate([
        ...located,
        { $sort: propertySalesSort(query) },
        { $limit: MAX_POINTS },
        { $project: propertySaleSummaryProjection },
      ])
        // Same unprojected sort as the list above, over the located adverts.
        .allowDiskUse(true)
        .collation(PROPERTY_SALES_COLLATION)
        .option({ maxTimeMS: 10000 }),
      // Zone markers aggregate only adverts WITHOUT a published coordinate. They link back to
      // that neighborhood's list and must never pretend to pinpoint a particular home.
      PropertySaleCatalogModel.aggregate([
        ...stages,
        {
          $match: {
            $nor: [propertySalesLocatedFilter()],
            department: 'Montevideo',
            neighborhood: { $type: 'string', $ne: '' },
          },
        },
        {
          $group: {
            _id: { department: '$department', neighborhood: '$neighborhood' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 250 },
      ])
        .collation(PROPERTY_SALES_COLLATION)
        .option({ maxTimeMS: 10000 }),
    ])
    const points = rows.map(publicPropertySaleSummary).flatMap(row =>
      row.geo
        ? [
            {
              key: row.key,
              lat: row.geo.lat,
              lng: row.geo.lng,
              precision: row.geo.precision,
              price: row.price,
              image: row.image,
              title: row.title,
              bedrooms: row.bedrooms,
              bathrooms: row.bathrooms,
              area: row.areas[query.areaBasis],
              areaBasis: query.areaBasis,
              neighborhood: row.neighborhood,
              locality: row.locality,
              department: row.department,
            },
          ]
        : []
    )
    setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
    return {
      points,
      zones: zoneGroups.flatMap(row => {
        const location = resolvePropertySaleZone(row._id.department, row._id.neighborhood)
        return location
          ? [
              {
                department: row._id.department,
                neighborhood: row._id.neighborhood,
                lat: location.lat,
                lng: location.lng,
                count: row.count,
              },
            ]
          : []
      }),
      total: Number(totals[0]?.total) || 0,
      located: Number(locatedTotals[0]?.total) || 0,
      shown: points.length,
      limit: MAX_POINTS,
    }
  } catch (error) {
    console.error('[api/property-sales/mapa] failed', error)
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage:
        error instanceof Error && error.message === 'SALE_CATALOG_PREPARING'
          ? 'Property sales catalogue is being prepared'
          : 'Property sales map is temporarily unavailable',
      // The public JSON stays generic; the report keeps what actually failed.
      cause: error,
    })
  }
})
