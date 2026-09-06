import {
  propertySaleHasGeo,
  type PropertySaleListing,
  type PropertySaleMoney,
  type PropertySaleSummary,
  type PropertySalesMeta,
} from '../../utils/propertySales'

export const propertySaleSummaryProjection = {
  _id: 0,
  key: 1,
  id: 1,
  operation: 1,
  source: 1,
  listingId: 1,
  url: 1,
  title: 1,
  image: 1,
  sellerName: 1,
  department: 1,
  locality: 1,
  neighborhood: 1,
  propertyType: 1,
  bedrooms: 1,
  bathrooms: 1,
  parkingSpaces: 1,
  'price.amount': 1,
  'price.currency': 1,
  'expenses.amount': 1,
  'expenses.currency': 1,
  'areas.built': 1,
  'areas.total': 1,
  'areas.land': 1,
  'areas.terrace': 1,
  'areas.reported': 1,
  furnished: 1,
  conditions: 1,
  'geo.lat': 1,
  'geo.lng': 1,
  'geo.precision': 1,
  lastSeen: 1,
  publishedAt: 1,
  firstSeen: 1,
} as const
export const propertySaleDetailProjection = {
  ...propertySaleSummaryProjection,
  description: 1,
  images: 1,
  amenities: 1,
} as const
const safeUrl = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}
const string = (value: unknown, max = 500) => (typeof value === 'string' ? value.slice(0, max) : '')
const nullableNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
const publicMoney = (value: PropertySaleMoney | null | undefined): PropertySaleMoney | null => {
  const amount = nullableNumber(value?.amount)
  return amount !== null && (value?.currency === 'USD' || value?.currency === 'UYU')
    ? { amount, currency: value.currency }
    : null
}

/** Rebuild every nested object: adding a private field to storage cannot change this response. */
export function publicPropertySaleSummary(row: PropertySaleSummary): PropertySaleSummary {
  const price = publicMoney(row.price)
  if (!price || price.amount <= 0) throw new Error('Invalid public sale price')
  return {
    key: string(row.key),
    id: string(row.id),
    operation: 'sale',
    source: row.source,
    listingId: string(row.listingId),
    url: safeUrl(row.url) || '',
    title: string(row.title),
    image: safeUrl(row.image),
    sellerName: string(row.sellerName, 160),
    department: string(row.department, 90),
    locality: string(row.locality, 90),
    neighborhood: string(row.neighborhood, 90),
    propertyType: row.propertyType === 'casa' ? 'casa' : 'apartamento',
    bedrooms: nullableNumber(row.bedrooms),
    bathrooms: nullableNumber(row.bathrooms),
    parkingSpaces: nullableNumber(row.parkingSpaces),
    price,
    expenses: publicMoney(row.expenses),
    areas: {
      built: nullableNumber(row.areas?.built),
      total: nullableNumber(row.areas?.total),
      land: nullableNumber(row.areas?.land),
      terrace: nullableNumber(row.areas?.terrace),
      reported: nullableNumber(row.areas?.reported),
    },
    furnished: row.furnished === true ? true : null,
    conditions: Array.isArray(row.conditions)
      ? [
          ...new Set(
            row.conditions.filter(value =>
              [
                'occupied',
                'needs_renovation',
                'project',
                'extra_purchase_costs',
                'special_layout',
                'optional_parking',
              ].includes(value)
            )
          ),
        ]
      : [],
    geo: propertySaleHasGeo(row.geo)
      ? {
          lat: row.geo!.lat,
          lng: row.geo!.lng,
          precision: row.geo!.precision === 'exact' ? 'exact' : 'approximate',
        }
      : null,
    lastSeen: string(row.lastSeen, 40),
    publishedAt: row.publishedAt ? string(row.publishedAt, 40) : null,
    firstSeen: row.firstSeen ? string(row.firstSeen, 40) : null,
  }
}
export function publicPropertySaleListing(row: PropertySaleListing): PropertySaleListing {
  return {
    ...publicPropertySaleSummary(row),
    description: string(row.description, 12_000),
    images: [
      ...new Set(
        (Array.isArray(row.images) ? row.images : [])
          .map(safeUrl)
          .filter((value): value is string => !!value)
      ),
    ].slice(0, 32),
    amenities: [
      ...new Set(
        (Array.isArray(row.amenities) ? row.amenities : [])
          .filter(value => typeof value === 'string')
          .map(value => value.slice(0, 100))
      ),
    ].slice(0, 80),
  }
}
export function publicPropertySalesMeta(row: PropertySalesMeta | null): PropertySalesMeta | null {
  if (!row) return null
  return {
    key: 'uy-sales',
    version: 1,
    generatedAt: string(row.generatedAt, 40),
    lastSourceReadAt: row.lastSourceReadAt ? string(row.lastSourceReadAt, 40) : null,
    usdUyu: nullableNumber(row.usdUyu) || 0,
    total: nullableNumber(row.total) || 0,
    freshDays: 21,
    sourceCoverage: 'partial',
    sources: (row.sources || [])
      .filter(source => source.key === 'infocasas' || source.key === 'casasweb')
      .map(source => ({
        key: source.key,
        listings: nullableNumber(source.listings) || 0,
        lastSeen: source.lastSeen ? string(source.lastSeen, 40) : null,
        complete: false,
      })),
  }
}
