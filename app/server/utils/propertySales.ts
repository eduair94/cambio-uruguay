import {
  PROPERTY_SALES_COLLATION,
  propertySaleIndexable,
  propertySalePath,
  type PropertySalesResponse,
} from '../../utils/propertySales'
import { PROPERTY_SALES_SEO_PILOT_KEYS } from '../../utils/propertySalesSeo'
import { propertySalesVisibleFilter } from '../../utils/propertySalesQuery'
import {
  PropertySaleCatalogModel,
  PropertySaleCatalogMetaModel,
} from '../models/PropertySaleCatalog'
import { connectDb } from './db'
import {
  propertySaleDetailProjection,
  publicPropertySaleListing,
  publicPropertySalesMeta,
} from './propertySalesPublic'

let coverageCache: { expires: number; value: PropertySalesResponse['coverage'] } | null = null
export async function loadPropertySalesMeta() {
  return publicPropertySalesMeta(
    await PropertySaleCatalogMetaModel.findOne({ key: 'uy-sales' })
      .select({ _id: 0 })
      .maxTimeMS(10000)
      .lean()
  )
}
/** Whole visible catalogue, never the last scrape batch and never the user's selected results. */
export async function loadPropertySalesCoverage(): Promise<PropertySalesResponse['coverage']> {
  if (coverageCache && coverageCache.expires > Date.now()) return coverageCache.value
  const now = Date.now()
  const rows = await PropertySaleCatalogModel.aggregate([
    { $match: propertySalesVisibleFilter(now) },
    { $group: { _id: '$source', listings: { $sum: 1 }, lastSeen: { $max: '$lastSeen' } } },
  ])
    .collation(PROPERTY_SALES_COLLATION)
    .option({ maxTimeMS: 10000 })
  const value: PropertySalesResponse['coverage'] = {
    computedAt: new Date(now).toISOString(),
    listings: rows.reduce((sum, row) => sum + row.listings, 0),
    sources: rows
      .filter(row => row._id === 'infocasas' || row._id === 'casasweb')
      .map(row => ({ key: row._id, listings: row.listings, lastSeen: row.lastSeen || null })),
  }
  coverageCache = { value, expires: now + 60_000 }
  return value
}
/** Same gate as each dossier. Re-reading an advert is not a content change: omit lastmod. */
export async function loadPropertySaleSitemapUrls(): Promise<Array<{ loc: string }>> {
  if (!PROPERTY_SALES_SEO_PILOT_KEYS.length) return []
  await connectDb()
  const rows = await PropertySaleCatalogModel.find({
    ...propertySalesVisibleFilter(),
    key: { $in: PROPERTY_SALES_SEO_PILOT_KEYS },
  })
    .select(propertySaleDetailProjection)
    .limit(50)
    .maxTimeMS(10000)
    .lean()
  return rows
    .map(publicPropertySaleListing)
    .filter(property => propertySaleIndexable(property))
    .map(property => ({ loc: propertySalePath(property.key) }))
}
