/** Public sale adverts. Separate from rentals and the private opportunity-analysis inputs. */
import { PROPERTY_SALES_SEO_PILOT_KEYS } from './propertySalesSeo'
import { agencyKey, type AdvertiserMetadata } from './propertyAdvertiser'
export type PropertySaleCurrency = 'USD' | 'UYU'
export type PropertySaleSource = 'infocasas' | 'casasweb'
export type PropertySaleAreaBasis = 'built' | 'total' | 'land' | 'reported'
export type PropertySaleCondition =
  | 'occupied'
  | 'needs_renovation'
  | 'project'
  | 'extra_purchase_costs'
  | 'special_layout'
  | 'optional_parking'
export interface PropertySaleMoney {
  amount: number
  currency: PropertySaleCurrency
}
export interface PropertySaleListing extends AdvertiserMetadata {
  key: string
  id: string
  operation: 'sale'
  source: PropertySaleSource
  listingId: string
  url: string
  title: string
  description: string
  images: string[]
  image: string | null
  sellerName: string
  department: string
  locality: string
  neighborhood: string
  propertyType: 'casa' | 'apartamento'
  bedrooms: number | null
  bathrooms: number | null
  parkingSpaces: number | null
  price: PropertySaleMoney
  expenses: PropertySaleMoney | null
  areas: Record<PropertySaleAreaBasis | 'terrace', number | null>
  amenities: string[]
  furnished: true | null
  conditions: PropertySaleCondition[]
  geo: { lat: number; lng: number; precision: 'exact' | 'approximate' } | null
  lastSeen: string
  publishedAt: string | null
  firstSeen: string | null
}
export type PropertySaleSummary = Omit<PropertySaleListing, 'description' | 'images' | 'amenities'>
export interface PropertySaleSourceCoverage {
  key: PropertySaleSource
  listings: number
  lastSeen: string | null
}
export interface PropertySalesMeta {
  key: 'uy-sales'
  version: 1
  generatedAt: string
  lastSourceReadAt: string | null
  usdUyu: number
  total: number
  freshDays: 21
  sourceCoverage: 'partial'
  sources: Array<PropertySaleSourceCoverage & { complete: false }>
}
export interface PropertySaleFacet {
  value: string
  count: number
}
export const PROPERTY_SALES_PATH = '/venta-viviendas-uruguay'
export const PROPERTY_SALES_FRESH_DAYS = 21
export const PROPERTY_SALES_COLLATION = { locale: 'es', strength: 1 } as const
export const PROPERTY_SALES_AMENITIES = [
  'pool',
  'gym',
  'terrace',
  'garden',
  'barbecue',
  'elevator',
  'security',
] as const
export type PropertySaleAmenity = (typeof PROPERTY_SALES_AMENITIES)[number]
export interface PropertySalesQuery {
  q: string
  department: string
  locality: string
  neighborhood: string
  type: 'all' | 'casa' | 'apartamento'
  source: 'all' | PropertySaleSource
  bedrooms: '' | number
  bathrooms: '' | number
  minPrice: number | null
  maxPrice: number | null
  currency: PropertySaleCurrency
  minArea: number | null
  maxArea: number | null
  areaBasis: PropertySaleAreaBasis
  parking: boolean
  furnished: boolean
  amenity: '' | PropertySaleAmenity
  seller: string
  agency: string
  owner: boolean
  photos: boolean
  recent: 'all' | '1' | '3' | '7'
  sort: 'recent' | 'price_asc' | 'price_desc' | 'area_desc'
  page: number
  perPage: number
  view: 'lista' | 'mapa'
  keys: string[]
}
export interface PropertySalesResponse {
  items: PropertySaleSummary[]
  total: number
  page: number
  pages: number
  perPage: number
  usdUyu: number
  query: PropertySalesQuery
  facets: Record<
    'departments' | 'localities' | 'neighborhoods' | 'types' | 'sellers' | 'sources',
    PropertySaleFacet[]
  >
  coverage: { listings: number; sources: PropertySaleSourceCoverage[]; computedAt: string }
  meta: PropertySalesMeta | null
}
export interface PropertySaleMapPoint {
  key: string
  lat: number
  lng: number
  precision: 'exact' | 'approximate'
  price: PropertySaleMoney
  image: string | null
  title: string
  bedrooms: number | null
  bathrooms: number | null
  area: number | null
  areaBasis: PropertySaleAreaBasis
  neighborhood: string
  locality: string
  department: string
}
export interface PropertySalesMapResponse {
  points: PropertySaleMapPoint[]
  zones: Array<{
    department: string
    neighborhood: string
    lat: number
    lng: number
    count: number
  }>
  total: number
  located: number
  shown: number
  limit: number
}
export interface PropertySaleDetailResponse {
  property: PropertySaleListing
  usdUyu: number
  indexable: boolean
  similar: PropertySaleSummary[]
}

const text = (value: unknown, max = 90) =>
  typeof value === 'string'
    ? value
        .trim()
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001F]/g, '')
        .slice(0, max)
    : ''
const number = (value: unknown, max: number) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  if (value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, max) : null
}
const checked = (value: unknown) => value === true || value === '1' || value === 'true'
const integer = (value: unknown, fallback: number, max: number) => {
  const parsed = number(value, max)
  return parsed !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
export function propertySaleValidKey(value: unknown): value is string {
  return typeof value === 'string' && /^(?:infocasas|casasweb)-\d{1,20}$/.test(value)
}
export function normalizePropertySalesQuery(input: Record<string, unknown>): PropertySalesQuery {
  const beds = number(input.bedrooms, 8)
  const baths = number(input.bathrooms, 8)
  const rawKeys = Array.isArray(input.keys)
    ? input.keys
    : typeof input.keys === 'string'
      ? input.keys.split(',')
      : []
  return {
    q: text(input.q, 100),
    department: text(input.department),
    locality: text(input.locality),
    neighborhood: text(input.neighborhood),
    type: input.type === 'casa' || input.type === 'apartamento' ? input.type : 'all',
    source: input.source === 'infocasas' || input.source === 'casasweb' ? input.source : 'all',
    bedrooms: beds !== null && Number.isInteger(beds) ? beds : '',
    bathrooms: baths !== null && Number.isInteger(baths) && baths >= 1 ? baths : '',
    minPrice: number(input.minPrice, 1_000_000_000),
    maxPrice: number(input.maxPrice, 1_000_000_000),
    currency: input.currency === 'UYU' ? 'UYU' : 'USD',
    minArea: number(input.minArea, 1_000_000),
    maxArea: number(input.maxArea, 1_000_000),
    areaBasis: ['total', 'land', 'reported'].includes(String(input.areaBasis))
      ? (input.areaBasis as PropertySaleAreaBasis)
      : 'built',
    parking: checked(input.parking),
    furnished: checked(input.furnished),
    amenity: PROPERTY_SALES_AMENITIES.includes(input.amenity as PropertySaleAmenity)
      ? (input.amenity as PropertySaleAmenity)
      : '',
    seller: text(input.seller),
    agency: agencyKey(input.agency),
    owner: input.dueno === '1' || input.owner === '1' || input.owner === true,
    photos: checked(input.photos),
    recent: ['1', '3', '7'].includes(String(input.recent))
      ? (String(input.recent) as PropertySalesQuery['recent'])
      : 'all',
    sort: ['price_asc', 'price_desc', 'area_desc'].includes(String(input.sort))
      ? (input.sort as PropertySalesQuery['sort'])
      : 'recent',
    page: integer(input.page, 1, 500),
    perPage: integer(input.perPage, 24, 48),
    view: input.view === 'mapa' ? 'mapa' : 'lista',
    keys: [...new Set(rawKeys.filter(propertySaleValidKey))].slice(0, 48),
  }
}
export function propertySalesQueryToParams(query: PropertySalesQuery): Record<string, string> {
  const defaults = normalizePropertySalesQuery({})
  const params: Record<string, string> = {}
  for (const key of Object.keys(defaults) as Array<keyof PropertySalesQuery>) {
    const value = query[key]
    if (key === 'keys') {
      if (query.keys.length) params.keys = query.keys.join(',')
      continue
    }
    if (value !== defaults[key] && value !== null && value !== '')
      params[key] = typeof value === 'boolean' ? (value ? '1' : '0') : String(value)
  }
  return params
}
export function propertySalePath(key: string): string {
  return `${PROPERTY_SALES_PATH}/${encodeURIComponent(key)}`
}
export function propertySalesFiltered(input: Record<string, unknown>): boolean {
  const query = normalizePropertySalesQuery(input)
  return Object.keys(propertySalesQueryToParams(query)).some(key => key !== 'view')
}
export function propertySaleHasGeo(geo: PropertySaleListing['geo']): boolean {
  return (
    !!geo &&
    Number.isFinite(geo.lat) &&
    Number.isFinite(geo.lng) &&
    geo.lat >= -35.5 &&
    geo.lat <= -30 &&
    geo.lng >= -58.6 &&
    geo.lng <= -53
  )
}
export function propertySaleIndexable(property: PropertySaleListing, now = Date.now()): boolean {
  return (
    PROPERTY_SALES_SEO_PILOT_KEYS.includes(property.key) &&
    propertySaleHasPageQuality(property, now)
  )
}
export function propertySaleHasPageQuality(
  property: PropertySaleListing,
  now = Date.now()
): boolean {
  const seen = Date.parse(property.lastSeen)
  return (
    propertySaleValidKey(property.key) &&
    Number.isFinite(seen) &&
    seen <= now + 300_000 &&
    seen >= now - PROPERTY_SALES_FRESH_DAYS * 86_400_000 &&
    property.title.length >= 15 &&
    property.description.length >= 180 &&
    !!property.image &&
    !!property.department &&
    !!(property.locality || property.neighborhood) &&
    property.price.amount > 0 &&
    property.bedrooms !== null &&
    property.bathrooms !== null &&
    Object.values(property.areas).some(value => value !== null && value > 0)
  )
}
export function propertySaleMoney(
  amount: number,
  currency: PropertySaleCurrency = 'USD',
  locale = 'es'
): string {
  return `${currency === 'USD' ? 'U$S' : '$'} ${new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale === 'pt' ? 'pt-BR' : 'es-UY', { maximumFractionDigits: 0 }).format(amount)}`
}
