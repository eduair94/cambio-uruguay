import { advertiserExpression } from './propertyAdvertiser'
import {
  PROPERTY_SALES_FRESH_DAYS,
  type PropertySalesQuery,
  type PropertySaleAmenity,
} from './propertySales'

type SaleStage = Record<string, any>
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const amenityExpressions: Record<PropertySaleAmenity, string> = {
  pool: '^(piscina|piscina climatizada|piscina abierta|piscina cerrada|pool)$',
  gym: '^(gimnasio|gym)$',
  terrace: '^(terraza|balc[oó]n|balc[oó]n\\s*(?:/\\s*)?terraza|terraza lavadero)$',
  garden: '^(jard[ií]n|patio|jard[ií]n\\s*/\\s*patio|[aá]reas verdes|zona de parque)$',
  barbecue:
    '^(barbacoa(?: com[uú]n)?|parrillero(?: individual|(?: abierto)? com[uú]n)?|parrillero\\s*/\\s*barbacoa)$',
  elevator: '^(ascensor|ascensores)$',
  security:
    '^(seguridad|seguridad 24 ?h(?:oras)?|porter[ií]a|portero|vigilancia|c[aá]maras de seguridad|sistema de alarma)$',
}

/** Mongo text regex is escaped and accent tolerant; caller cannot supply regex operators. */
export function propertySaleSearchPattern(value: string): string {
  return escaped(value.normalize('NFD').replace(/[\u0300-\u036F]/g, ''))
    .replace(/[aá]/gi, '[aáàäâ]')
    .replace(/[eé]/gi, '[eéèëê]')
    .replace(/[ií]/gi, '[iíìïî]')
    .replace(/[oó]/gi, '[oóòöô]')
    .replace(/[uú]/gi, '[uúùüû]')
    .replace(/n/gi, '[nñ]')
}
export function propertySalesVisibleFilter(now = Date.now()): Record<string, unknown> {
  return {
    operation: 'sale',
    source: { $in: ['infocasas', 'casasweb'] },
    propertyType: { $in: ['casa', 'apartamento'] },
    lastSeen: {
      $gte: new Date(now - PROPERTY_SALES_FRESH_DAYS * 86_400_000).toISOString(),
      $lte: new Date(now + 300_000).toISOString(),
    },
    'price.amount': { $type: 'number', $gt: 0, $lte: 1_000_000_000_000 },
    'price.currency': { $in: ['USD', 'UYU'] },
  }
}
export function propertySalesStages(
  query: PropertySalesQuery,
  usdUyu: number,
  now = Date.now()
): SaleStage[] {
  const match: Record<string, unknown> = propertySalesVisibleFilter(now)
  for (const field of ['department', 'locality', 'neighborhood'] as const)
    if (query[field]) match[field] = query[field]
  if (query.type !== 'all') match.propertyType = query.type
  if (query.source !== 'all') match.source = query.source
  if (query.bedrooms !== '') match.bedrooms = query.bedrooms === 8 ? { $gte: 8 } : query.bedrooms
  if (query.bathrooms !== '') match.bathrooms = { $gte: query.bathrooms }
  if (query.parking) match.parkingSpaces = { $gte: 1 }
  if (query.furnished) match.furnished = true
  if (query.photos) match.image = { $type: 'string', $regex: '^https?://' }
  if (query.seller) match.sellerName = query.seller
  if (query.agency) match['agency.key'] = query.agency
  if (query.owner) match['ownerDirect.declared'] = true
  if (query.keys.length) match.key = { $in: query.keys }
  if (query.amenity) match.amenities = { $regex: amenityExpressions[query.amenity], $options: 'i' }
  if (query.recent !== 'all')
    match.lastSeen = {
      $gte: new Date(now - Number(query.recent) * 86_400_000).toISOString(),
      $lte: new Date(now + 300_000).toISOString(),
    }
  if (query.q) {
    const terms = query.q.split(/\s+/).filter(Boolean).slice(0, 8)
    match.$and = terms.map(term => ({
      $or: ['title', 'description', 'department', 'locality', 'neighborhood', 'sellerName'].map(
        field => ({
          [field]: { $regex: propertySaleSearchPattern(term), $options: 'i' },
        })
      ),
    }))
  }
  const amount =
    query.currency === 'USD'
      ? {
          $cond: [
            { $eq: ['$price.currency', 'USD'] },
            '$price.amount',
            Number.isFinite(usdUyu) && usdUyu > 0 ? { $divide: ['$price.amount', usdUyu] } : null,
          ],
        }
      : {
          $cond: [
            { $eq: ['$price.currency', 'UYU'] },
            '$price.amount',
            Number.isFinite(usdUyu) && usdUyu > 0 ? { $multiply: ['$price.amount', usdUyu] } : null,
          ],
        }
  const range: Record<string, unknown> = {}
  if (query.minPrice !== null || query.maxPrice !== null || query.sort.startsWith('price_'))
    range._displayPrice = {
      $type: 'number',
      ...(query.minPrice !== null ? { $gte: query.minPrice } : {}),
      ...(query.maxPrice !== null ? { $lte: query.maxPrice } : {}),
    }
  if (query.minArea !== null || query.maxArea !== null)
    range._area = {
      $type: 'number',
      ...(query.minArea !== null ? { $gte: query.minArea } : {}),
      ...(query.maxArea !== null ? { $lte: query.maxArea } : {}),
    }
  return [
    { $match: match },
    ...(query.agency || query.owner
      ? [{ $match: { $expr: advertiserExpression(query, '$', now) } }]
      : []),
    {
      $addFields: {
        _displayPrice: amount,
        _area: `$areas.${query.areaBasis}`,
        _freshAt: { $ifNull: ['$publishedAt', { $ifNull: ['$firstSeen', ''] }] },
      },
    },
    ...(Object.keys(range).length ? [{ $match: range }] : []),
  ]
}
export function propertySalesSort(query: PropertySalesQuery): Record<string, 1 | -1> {
  if (query.sort === 'price_asc') return { _displayPrice: 1, key: 1 }
  if (query.sort === 'price_desc') return { _displayPrice: -1, key: 1 }
  if (query.sort === 'area_desc') return { _area: -1, key: 1 }
  return { _freshAt: -1, key: 1 }
}
export function propertySalesLocatedFilter(): Record<string, unknown> {
  return {
    'geo.lat': { $type: 'number', $gte: -35.5, $lte: -30 },
    'geo.lng': { $type: 'number', $gte: -58.6, $lte: -53 },
    'geo.precision': { $in: ['exact', 'approximate'] },
  }
}
