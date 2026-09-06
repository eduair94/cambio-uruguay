import { PropertySaleCatalogModel } from '../../../models/PropertySaleCatalog'
import { connectDb } from '../../../utils/db'
import { loadPropertySalesMeta } from '../../../utils/propertySales'
import {
  propertySaleDetailProjection,
  propertySaleSummaryProjection,
  publicPropertySaleListing,
  publicPropertySaleSummary,
} from '../../../utils/propertySalesPublic'
import {
  PROPERTY_SALES_COLLATION,
  propertySaleIndexable,
  propertySaleValidKey,
  type PropertySaleDetailResponse,
} from '../../../../utils/propertySales'
import { propertySalesVisibleFilter } from '../../../../utils/propertySalesQuery'

export default defineEventHandler(async (event): Promise<PropertySaleDetailResponse> => {
  const key = getRouterParam(event, 'key')
  if (!propertySaleValidKey(key))
    throw createError({ statusCode: 404, statusMessage: 'Property sale advert is not available' })
  let page: PropertySaleDetailResponse | null = null
  try {
    await connectDb()
    const [row, meta] = await Promise.all([
      PropertySaleCatalogModel.findOne({ ...propertySalesVisibleFilter(), key })
        .select(propertySaleDetailProjection)
        .maxTimeMS(10000)
        .lean(),
      loadPropertySalesMeta(),
    ])
    if (row) {
      const property = publicPropertySaleListing(row)
      // Similar adverts are independent records; these are not identity matches or a valuation.
      const location: Record<string, unknown> = { department: property.department }
      if (property.locality) location.locality = property.locality
      if (property.neighborhood) location.neighborhood = property.neighborhood
      const related =
        property.department && (property.locality || property.neighborhood)
          ? await PropertySaleCatalogModel.find({
              ...propertySalesVisibleFilter(),
              ...location,
              propertyType: property.propertyType,
              key: { $ne: key },
              ...(property.bedrooms !== null ? { bedrooms: property.bedrooms } : {}),
            })
              .select(propertySaleSummaryProjection)
              .sort({ publishedAt: -1, firstSeen: -1, key: 1 })
              .limit(6)
              .collation(PROPERTY_SALES_COLLATION)
              .maxTimeMS(10000)
              .lean()
          : []
      page = {
        property,
        usdUyu: meta?.usdUyu || 0,
        indexable: propertySaleIndexable(property),
        similar: related.map(publicPropertySaleSummary),
      }
    }
  } catch (error) {
    console.error('[api/property-sales/ficha] failed', error)
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Property sale advert is temporarily unavailable',
    })
  }
  if (!page) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Property sale advert is not available' })
  }
  setResponseHeader(event, 'cache-control', 'public, max-age=30, s-maxage=60')
  return page
})
