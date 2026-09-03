// Shared vocabulary of the rental directory (/alquileres-uruguay).
//
// The rows are produced by the root backend job `sync_rentals.ts` and read from the app's Mongo by
// `server/api/rentals`. This module is the ONE place where the shape, the labels and the query
// contract live, so the page, the API route and the tests cannot drift apart.
//
// PURE module (no Vue/Nuxt runtime) so `normalizeRentalQuery` can be unit-tested in plain Node.
// Everything is prefixed `RENTAL_`/`rental` on purpose: `utils/` is a flat auto-import namespace
// and a bare `SOURCES` or `formatPrice` here would silently collide with another page's helper.

export type RentalSource = 'mercadolibre' | 'infocasas' | 'facebook'

export type RentalPropertyType =
  | 'apartamento'
  | 'casa'
  | 'habitacion'
  | 'local'
  | 'oficina'
  | 'terreno'
  | 'otro'

export type RentalSellerType = 'inmobiliaria' | 'particular' | 'desconocido'

export type RentalCurrency = 'UYU' | 'USD'

export interface RentalOffer {
  source: RentalSource
  listingId: string
  url: string
  title: string
  price: number
  currency: RentalCurrency
  priceUyu: number
  commonExpenses: number | null
  commonExpensesCurrency: RentalCurrency | null
  sellerName: string
  sellerType: RentalSellerType
  image: string | null
  publishedAt: string | null
  firstSeen: string
  lastSeen: string
}

export interface RentalProperty {
  key: string
  title: string
  propertyType: RentalPropertyType
  department: string
  neighborhood: string
  address: string
  addressKey: string
  latitude: number | null
  longitude: number | null
  bedrooms: number | null
  bathrooms: number | null
  area: number | null
  priceUyu: number
  price: number
  currency: RentalCurrency
  offers: RentalOffer[]
  sources: RentalSource[]
  /** What "más recientes" sorts by: the portal's publication date, else the day we first saw it. */
  freshAt: string
  firstSeen: string
  lastSeen: string
}

export interface RentalSourceRun {
  key: RentalSource
  ok: boolean
  listings: number
  note: string
}

export interface RentalMeta {
  key: string
  generatedAt: string
  mode: 'full' | 'fast'
  durationMs: number
  usdUyu: number
  properties: number
  offers: number
  merged: number
  sources: RentalSourceRun[]
}

export interface RentalFacetValue {
  value: string
  count: number
}

export interface RentalsResponse {
  meta: RentalMeta | null
  items: RentalProperty[]
  total: number
  page: number
  perPage: number
  /** Median rent in pesos for the CURRENT filter — the number that answers "¿está caro?". */
  medianUyu: number
  facets: {
    departments: RentalFacetValue[]
    neighborhoods: RentalFacetValue[]
    types: RentalFacetValue[]
    sources: RentalFacetValue[]
    priceMaxUyu: number
  }
}

export const RENTAL_SOURCE_LABEL: Record<RentalSource, string> = {
  mercadolibre: 'Mercado Libre',
  infocasas: 'InfoCasas',
  facebook: 'Facebook Marketplace',
}

export const RENTAL_TYPE_LABEL: Record<RentalPropertyType, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  habitacion: 'Habitación',
  local: 'Local',
  oficina: 'Oficina',
  terreno: 'Terreno',
  otro: 'Otro',
}

export const RENTAL_SELLER_LABEL: Record<RentalSellerType, string> = {
  inmobiliaria: 'Inmobiliaria',
  particular: 'Dueño directo',
  desconocido: 'Sin dato',
}

export type RentalSort = 'recientes' | 'precio' | 'precio-desc' | 'metros'

export const RENTAL_SORTS: ReadonlyArray<{ value: RentalSort; label: string }> = Object.freeze([
  { value: 'recientes', label: 'Más recientes' },
  { value: 'precio', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'metros', label: 'Más metros' },
])

export const RENTAL_PER_PAGE = 24
export const RENTAL_PER_PAGE_MAX = 48

export interface RentalQuery {
  q: string
  department: string
  neighborhood: string
  type: string
  source: string
  bedrooms: number | null
  priceMin: number | null
  priceMax: number | null
  /** Only properties published on more than one portal. */
  multi: boolean
  sort: RentalSort
  page: number
  perPage: number
}

const toInt = (value: unknown): number | null => {
  // `Number('')` is 0, not NaN. Without this guard an ABSENT `bedrooms` reads as 0 and silently
  // filters the whole directory down to monoambientes, and an absent `perPage` collapses to the
  // minimum page size.
  const digits = String(value ?? '').replace(/[^\d.-]/g, '')
  if (!digits) return null
  const parsed = Number(digits)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

const clean = (value: unknown, max = 60): string =>
  String(value ?? '')
    .trim()
    .slice(0, max)

/**
 * The single reading of the query string. Used by the API route AND by the page, so a filter can
 * never mean one thing in the URL and another in the request.
 */
export function normalizeRentalQuery(input: Record<string, unknown> = {}): RentalQuery {
  const sortRaw = clean(input.sort, 12) as RentalSort
  const sort = RENTAL_SORTS.some(option => option.value === sortRaw) ? sortRaw : 'recientes'
  const page = Math.max(1, toInt(input.page) ?? 1)
  const perPage = Math.min(
    RENTAL_PER_PAGE_MAX,
    Math.max(6, toInt(input.perPage) ?? RENTAL_PER_PAGE)
  )
  const bedrooms = toInt(input.bedrooms)
  const priceMin = toInt(input.priceMin)
  const priceMax = toInt(input.priceMax)

  return {
    q: clean(input.q, 80),
    department: clean(input.department),
    neighborhood: clean(input.neighborhood),
    type: clean(input.type, 20),
    source: clean(input.source, 20),
    bedrooms: bedrooms !== null && bedrooms >= 0 && bedrooms <= 10 ? bedrooms : null,
    priceMin: priceMin !== null && priceMin > 0 ? priceMin : null,
    priceMax: priceMax !== null && priceMax > 0 ? priceMax : null,
    multi: String(input.multi ?? '') === '1' || input.multi === true,
    sort,
    page,
    perPage,
  }
}

/** Only the parameters that differ from the default, so the URL stays readable and cacheable. */
export function rentalQueryToParams(query: RentalQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.q) params.q = query.q
  if (query.department) params.department = query.department
  if (query.neighborhood) params.neighborhood = query.neighborhood
  if (query.type) params.type = query.type
  if (query.source) params.source = query.source
  if (query.bedrooms !== null) params.bedrooms = String(query.bedrooms)
  if (query.priceMin !== null) params.priceMin = String(query.priceMin)
  if (query.priceMax !== null) params.priceMax = String(query.priceMax)
  if (query.multi) params.multi = '1'
  if (query.sort !== 'recientes') params.sort = query.sort
  if (query.page > 1) params.page = String(query.page)
  return params
}

/** "hoy", "ayer", "hace 5 días" — from an ISO date, without pulling in a date library. */
export function rentalAgeLabel(iso: string | null | undefined, today = new Date()): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return ''
  const days = Math.round(
    (Date.parse(`${today.toISOString().slice(0, 10)}T00:00:00Z`) -
      Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)) /
      86_400_000
  )
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 30) return `hace ${days} días`
  const months = Math.round(days / 30)
  return months <= 1 ? 'hace un mes' : `hace ${months} meses`
}

/** The rent as the advert states it, plus the other currency in brackets. */
export function rentalPriceLabel(price: number, currency: RentalCurrency, usdUyu: number): string {
  const pesos = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 })
  if (currency === 'USD') {
    const converted = usdUyu > 0 ? ` ($ ${pesos.format(Math.round(price * usdUyu))})` : ''
    return `U$S ${pesos.format(Math.round(price))}${converted}`
  }
  const converted = usdUyu > 0 ? ` (U$S ${pesos.format(Math.round(price / usdUyu))})` : ''
  return `$ ${pesos.format(Math.round(price))}${converted}`
}

/** "2 dorm · 1 baño · 60 m²", skipping whatever the portal never said. */
export function rentalSpecsLabel(
  property: Pick<RentalProperty, 'bedrooms' | 'bathrooms' | 'area'>
): string {
  const parts: string[] = []
  if (property.bedrooms !== null) {
    parts.push(property.bedrooms === 0 ? 'monoambiente' : `${property.bedrooms} dorm`)
  }
  if (property.bathrooms !== null)
    parts.push(`${property.bathrooms} baño${property.bathrooms === 1 ? '' : 's'}`)
  if (property.area !== null) parts.push(`${property.area} m²`)
  return parts.join(' · ')
}

/** Un punto del mapa: lo mínimo para dibujar un marcador y su globo. */
export interface RentalMapPoint {
  key: string
  lat: number
  lng: number
  /** Precio en la moneda del aviso, ya formateado por el servidor para no mandar dos campos. */
  price: number
  currency: RentalCurrency
  bedrooms: number | null
  area: number | null
  neighborhood: string
  /** Cuántos portales publican esta misma propiedad. */
  offers: number
  /** El aviso al que lleva el globo. */
  url: string
}

export interface RentalMapResponse {
  points: RentalMapPoint[]
  /** Propiedades que cumplen el filtro, tengan o no coordenada. */
  total: number
  /** De ésas, cuántas tienen una coordenada utilizable. */
  located: number
  /** Cuántas se mandaron: `located` recortado al tope. */
  shown: number
  /** El tope que se aplicó, para que la página pueda decirlo sin adivinarlo. */
  limit: number
}

/**
 * El filtro de Mongo que corresponde a una consulta del directorio.
 *
 * Vive acá y no dentro del endpoint porque lo usan DOS rutas —la lista y el mapa— y si cada una
 * armara el suyo, un filtro aplicado en una y no en la otra daría un mapa que muestra propiedades
 * que la lista no lista. Es la misma clase de contradicción que el sitio ya tuvo entre la meta
 * description y el FAQ de la home.
 *
 * Devuelve DOS filtros porque las facetas los necesitan distintos: `nonLocation` lleva todo menos
 * departamento y barrio (contar el facet de departamento con el departamento ya aplicado dejaría
 * "1" al lado de todos los demás), y `filter` es el completo.
 */
export function buildRentalFilter(
  query: RentalQuery,
  staleDays: number
): { filter: Record<string, unknown>; nonLocation: Record<string, unknown> } {
  const cutoff = new Date(Date.now() - staleDays * 86_400_000).toISOString().slice(0, 10)
  const nonLocation: Record<string, unknown> = { lastSeen: { $gte: cutoff } }

  if (query.type) nonLocation.propertyType = query.type
  if (query.source) nonLocation.sources = query.source
  if (query.bedrooms !== null) nonLocation.bedrooms = { $gte: query.bedrooms }
  if (query.multi) nonLocation['sources.1'] = { $exists: true }
  if (query.priceMin !== null || query.priceMax !== null) {
    nonLocation.priceUyu = {
      ...(query.priceMin !== null ? { $gte: query.priceMin } : {}),
      ...(query.priceMax !== null ? { $lte: query.priceMax } : {}),
    }
  }
  if (query.q) {
    // A plain, anchored-free regex over the two fields a person actually types into: the street
    // and the advert's headline. Escaped, because a stray "(" from a paste must not 500.
    const safe = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(safe, 'i')
    nonLocation.$or = [{ title: pattern }, { address: pattern }, { neighborhood: pattern }]
  }

  const filter: Record<string, unknown> = { ...nonLocation }
  if (query.department) filter.department = query.department
  if (query.neighborhood) filter.neighborhood = query.neighborhood

  return { filter, nonLocation }
}
