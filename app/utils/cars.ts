import type {
  PublicCarCatalogMeta,
  PublicCarFlag,
  PublicCarFuel,
  PublicCarListing,
  PublicCarMarketRow,
  PublicCarMarketSnapshot,
  PublicCarOpportunityItem,
  PublicCarOpportunitySnapshot,
  PublicCarSeller,
  PublicCarSource,
  PublicCarTransmission,
} from './carsPublic'

// Every export is car-prefixed: app/utils is ONE auto-import namespace (formatUsd already exists).
export const CARS_PATH = '/autos-usados-uruguay'
export const CAR_OPPORTUNITIES_PATH = '/oportunidades-autos-usados-uruguay'
export const CARS_PER_PAGE = 24
export const CAR_OPPORTUNITIES_PER_PAGE = 20
export const CAR_MARKET_INDEX_MIN = 30
export const CAR_OPPORTUNITY_FRESH_DAYS = 2

export const CAR_SORTS = ['recent', 'price_asc', 'price_desc', 'km_asc', 'year_desc'] as const
export type CarSort = (typeof CAR_SORTS)[number]
export const CAR_FUELS: readonly PublicCarFuel[] = [
  'nafta',
  'diesel',
  'electrico',
  'hibrido',
  'gnc',
]
export const CAR_TRANSMISSIONS: readonly PublicCarTransmission[] = ['manual', 'automatica']
export const CAR_SELLERS: readonly PublicCarSeller[] = ['dealer', 'private']
export const CAR_DEPARTMENTS: readonly string[] = [
  'Artigas',
  'Canelones',
  'Cerro Largo',
  'Colonia',
  'Durazno',
  'Flores',
  'Florida',
  'Lavalleja',
  'Maldonado',
  'Montevideo',
  'Paysandú',
  'Río Negro',
  'Rivera',
  'Rocha',
  'Salto',
  'San José',
  'Soriano',
  'Tacuarembó',
  'Treinta y Tres',
]

export const CAR_FUEL_LABELS: Record<PublicCarFuel, string> = {
  nafta: 'Nafta',
  diesel: 'Diésel',
  electrico: 'Eléctrico',
  hibrido: 'Híbrido',
  gnc: 'GNC',
}
export const CAR_TRANSMISSION_LABELS: Record<PublicCarTransmission, string> = {
  manual: 'Manual',
  automatica: 'Automática',
}
export const CAR_SELLER_LABELS: Record<PublicCarSeller, string> = {
  dealer: 'Automotora',
  private: 'Dueño',
}
// Mirror of classes/autos/sources/registry.ts (app/tests/unit/carSourcesParity.test.ts compares them):
// which URLs of each source a public row may carry.
export const CAR_SOURCE_RULES: Record<
  PublicCarSource,
  { name: string; permalink: RegExp; pictureHost: RegExp }
> = {
  mercadolibre: {
    name: 'Mercado Libre',
    permalink: /^https:\/\/auto\.mercadolibre\.com\.uy\/MLU-/,
    pictureHost: /^http2\.mlstatic\.com$/,
  },
  clasiautos: {
    name: 'Clasiautos',
    permalink: /^https:\/\/clasiautos\.uy\/avisos\/[\w%-]+\/?$/,
    pictureHost: /^clasiautos\.uy$/,
  },
  julio: {
    name: 'Julio Automóviles',
    permalink: /^https:\/\/julioautomoviles\.com\.uy\/vehiculo\/[\w%-]+\/?$/,
    pictureHost: /^julioautomoviles\.com\.uy$/,
  },
  shoppingdeautos: {
    name: 'Shopping de Autos',
    permalink: /^https:\/\/shoppingdeautos\.uy\/producto\/[\w%-]+\/?$/,
    pictureHost: /^shoppingdeautos\.uy$/,
  },
  carper: {
    name: 'Carper',
    permalink: /^https:\/\/usados\.carper\.com\.uy\/[\w%/-]+$/,
    pictureHost: /^usados\.carper\.com\.uy$/,
  },
  fidocar: {
    name: 'Usados Fidocar',
    permalink: /^https:\/\/www\.usadosfidocar\.com\.uy\/modelo\/[\w%-]+$/,
    pictureHost: /^f\.fcdn\.app$/,
  },
  carone: {
    name: 'Car One',
    permalink: /^https:\/\/carone\.com\.uy\/[\w%-]+$/,
    pictureHost: /^cdn\.impel\.io$/,
  },
  facebook: {
    name: 'Facebook Marketplace',
    permalink: /^https:\/\/www\.facebook\.com\/marketplace\/item\/\d{6,20}\/$/,
    pictureHost: /^scontent[\w.-]*\.fbcdn\.net$/,
  },
}
export const CAR_SOURCES_PUBLIC = Object.keys(CAR_SOURCE_RULES) as PublicCarSource[]

export function carSafePermalink(source: PublicCarSource, url: unknown): string {
  return typeof url === 'string' && CAR_SOURCE_RULES[source].permalink.test(url) ? url : ''
}

export function carSafePicture(source: PublicCarSource, url: unknown): string | null {
  if (typeof url !== 'string') return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      CAR_SOURCE_RULES[source].pictureHost.test(parsed.host)
      ? url
      : null
  } catch {
    return null
  }
}

export const CAR_FLAG_LABELS: Record<PublicCarFlag, string> = {
  financing: 'El título habla de entrega o cuotas',
  price_mismatch: 'El título menciona otro precio',
  damaged: 'Menciona choque, airbags o reparaciones',
  recovered: 'Menciona recupero de seguro o robo',
  paperwork: 'Menciona deuda, papeles o matrículas',
  foreign_plate: 'Menciona chapa extranjera',
}

export interface CarsQuery {
  q: string
  brand: string
  model: string
  yearMin: number | null
  yearMax: number | null
  kmMax: number | null
  priceMin: number | null
  priceMax: number | null
  fuel: PublicCarFuel | ''
  transmission: PublicCarTransmission | ''
  department: string
  seller: PublicCarSeller | ''
  source: PublicCarSource | ''
  sort: CarSort
  page: number
}

export interface CarFacet {
  slug: string
  name: string
  count: number
}

export interface CarsResponse {
  generatedAt: string
  usdUyu: number
  total: number
  page: number
  perPage: number
  items: PublicCarListing[]
  facets: { brands: CarFacet[]; models: CarFacet[]; departments: CarFacet[]; sources: CarFacet[] }
  coverage: Pick<
    PublicCarCatalogMeta,
    | 'listings'
    | 'lastReadAt'
    | 'lastFullReadAt'
    | 'reportedTotal'
    | 'opportunities'
    | 'models'
    | 'sources'
  >
}

export interface CarDetailResponse {
  car: PublicCarListing
  cohort: PublicCarMarketRow | null
  market: { slug: string; brand: string; model: string; listings: number } | null
  similar: PublicCarListing[]
  opportunity: PublicCarOpportunityItem | null
}

export interface CarMarketResponse {
  market: PublicCarMarketSnapshot
  listings: PublicCarListing[]
  opportunities: PublicCarOpportunityItem[]
  indexable: boolean
}

export interface CarOpportunityQuery {
  tier: 'strict' | 'exploratory' | ''
  brand: string
  priceMax: number | null
  department: string
  seller: PublicCarSeller | ''
  page: number
}

export interface CarOpportunitiesResponse {
  generatedAt: string
  usdUyu: number
  policy: PublicCarOpportunitySnapshot['policy']
  stats: PublicCarOpportunitySnapshot['stats']
  total: number
  page: number
  perPage: number
  items: PublicCarOpportunityItem[]
  brands: CarFacet[]
  departments: string[]
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function text(value: unknown, max = 60): string {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' ? first.trim().slice(0, max) : ''
}

function integer(value: unknown, min: number, max: number): number | null {
  const raw = text(value, 12)
  if (!/^\d+$/.test(raw)) return null
  const number = Number(raw)
  return number >= min && number <= max ? number : null
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | '' {
  const raw = text(value)
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : ''
}

const slugParam = (value: unknown): string => {
  const raw = text(value, 80)
  return SLUG.test(raw) ? raw : ''
}

export function normalizeCarsQuery(input: Record<string, unknown>): CarsQuery {
  return {
    q: text(input.q, 80),
    brand: slugParam(input.brand),
    model: slugParam(input.model),
    yearMin: integer(input.yearMin, 1950, 2100),
    yearMax: integer(input.yearMax, 1950, 2100),
    kmMax: integer(input.kmMax, 1, 1_000_000),
    priceMin: integer(input.priceMin, 1, 1_000_000),
    priceMax: integer(input.priceMax, 1, 1_000_000),
    fuel: oneOf(input.fuel, CAR_FUELS),
    transmission: oneOf(input.transmission, CAR_TRANSMISSIONS),
    department: oneOf(input.department, CAR_DEPARTMENTS),
    seller: oneOf(input.seller, CAR_SELLERS),
    source: oneOf(input.source, CAR_SOURCES_PUBLIC),
    sort: oneOf(input.sort, CAR_SORTS) || 'recent',
    page: integer(input.page, 1, 500) ?? 1,
  }
}

export function carsQueryParams(query: CarsQuery): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === '' || value === null) continue
    if (key === 'sort' && value === 'recent') continue
    if (key === 'page' && value === 1) continue
    params[key] = String(value)
  }
  return params
}

export function carsFiltered(query: CarsQuery): boolean {
  return Object.keys(carsQueryParams(query)).length > 0
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ACCENTS: Record<string, string> = {
  a: '[aáàä]',
  e: '[eéèë]',
  i: '[iíìï]',
  o: '[oóòö]',
  u: '[uúùü]',
  n: '[nñ]',
}

function accentInsensitive(value: string): string {
  const folded = value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
  return escapeRegex(folded).replace(/[aeioun]/g, letter => ACCENTS[letter]!)
}

export function carsMatch(query: CarsQuery, now: Date, freshDays: number): Record<string, unknown> {
  const match: Record<string, unknown> = {
    lastSeen: { $gte: new Date(now.getTime() - freshDays * 86_400_000).toISOString() },
  }
  if (query.brand) match.brandSlug = query.brand
  if (query.model) match.marketSlug = query.model
  if (query.yearMin !== null || query.yearMax !== null) {
    match.year = {
      ...(query.yearMin !== null ? { $gte: query.yearMin } : {}),
      ...(query.yearMax !== null ? { $lte: query.yearMax } : {}),
    }
  }
  if (query.kmMax !== null) match.km = { $ne: null, $lte: query.kmMax }
  if (query.priceMin !== null || query.priceMax !== null) {
    match.priceUsd = {
      ...(query.priceMin !== null ? { $gte: query.priceMin } : {}),
      ...(query.priceMax !== null ? { $lte: query.priceMax } : {}),
    }
  }
  if (query.fuel) match.fuel = query.fuel
  if (query.transmission) match.transmission = query.transmission
  if (query.department) match.department = query.department
  if (query.seller) match.sellerType = query.seller
  if (query.source) match.source = query.source
  if (query.q) match.title = { $regex: accentInsensitive(query.q), $options: 'i' }
  return match
}

export function carsSort(sort: CarSort): Record<string, 1 | -1> {
  if (sort === 'price_asc') return { priceUsd: 1, key: 1 }
  if (sort === 'price_desc') return { priceUsd: -1, key: 1 }
  if (sort === 'km_asc') return { km: 1, key: 1 }
  if (sort === 'year_desc') return { year: -1, priceUsd: 1, key: 1 }
  return { firstSeen: -1, key: 1 }
}

export const carKeyValid = (key: string): boolean =>
  /^(?:ml-MLU\d{6,14}|fb-\d{6,20}|(?:clasiautos|julio|sda|carper|fidocar|carone)-\d{1,12})$/.test(
    key
  )
export const carMarketSlugValid = (value: string): boolean => value.length <= 80 && SLUG.test(value)
export const carPath = (key: string): string => `${CARS_PATH}/${key}`
export const carMarketPath = (marketSlug: string): string => `${CARS_PATH}/precios/${marketSlug}`

export function normalizeCarOpportunityQuery(input: Record<string, unknown>): CarOpportunityQuery {
  return {
    tier: oneOf(input.tier, ['strict', 'exploratory'] as const),
    brand: slugParam(input.brand),
    priceMax: integer(input.priceMax, 1, 1_000_000),
    department: oneOf(input.department, CAR_DEPARTMENTS),
    seller: oneOf(input.seller, CAR_SELLERS),
    page: integer(input.page, 1, 200) ?? 1,
  }
}

export function carOpportunityQueryParams(query: CarOpportunityQuery): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === '' || value === null || (key === 'page' && value === 1)) continue
    params[key] = String(value)
  }
  return params
}

export function queryCarOpportunities(
  snapshot: PublicCarOpportunitySnapshot,
  input: Record<string, unknown>,
  now = new Date()
): CarOpportunitiesResponse {
  const query = normalizeCarOpportunityQuery(input)
  const cutoff = now.getTime() - CAR_OPPORTUNITY_FRESH_DAYS * 86_400_000
  // The API retires stale adverts itself: a failed job must not keep showing sold cars as deals.
  const fresh = snapshot.items.filter(entry => Date.parse(entry.subject.lastSeen) >= cutoff)
  const brands = new Map<string, CarFacet>()
  for (const entry of fresh) {
    const facet = brands.get(entry.subject.brandSlug) ?? {
      slug: entry.subject.brandSlug,
      name: entry.subject.brand,
      count: 0,
    }
    facet.count++
    brands.set(facet.slug, facet)
  }
  const filtered = fresh
    .filter(entry => !query.tier || entry.tier === query.tier)
    .filter(entry => !query.brand || entry.subject.brandSlug === query.brand)
    .filter(entry => query.priceMax === null || entry.subject.priceUsd <= query.priceMax)
    .filter(entry => !query.department || entry.subject.department === query.department)
    .filter(entry => !query.seller || entry.subject.sellerType === query.seller)
    .sort(
      (a, b) =>
        (a.tier === b.tier ? 0 : a.tier === 'strict' ? -1 : 1) ||
        b.gap - a.gap ||
        a.subject.key.localeCompare(b.subject.key)
    )
  const start = (query.page - 1) * CAR_OPPORTUNITIES_PER_PAGE
  return {
    generatedAt: snapshot.generatedAt,
    usdUyu: snapshot.usdUyu,
    policy: snapshot.policy,
    stats: snapshot.stats,
    total: filtered.length,
    page: query.page,
    perPage: CAR_OPPORTUNITIES_PER_PAGE,
    items: filtered.slice(start, start + CAR_OPPORTUNITIES_PER_PAGE),
    brands: [...brands.values()].sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug)),
    departments: [
      ...new Set(fresh.map(entry => entry.subject.department).filter((d): d is string => !!d)),
    ].sort((a, b) => a.localeCompare(b, 'es')),
  }
}

const grouped = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
export const formatCarUsd = (value: number): string => `US$ ${grouped(value)}`
export const formatCarKm = (km: number | null): string =>
  km === null ? 'km no informado' : `${grouped(km)} km`
export const formatCarPrice = (car: Pick<PublicCarListing, 'price' | 'currency'>): string =>
  car.currency === 'USD' ? formatCarUsd(car.price) : `$ ${grouped(car.price)}`
export const carPercent = (gap: number): string => `${Math.round(gap * 100)} %`
export const formatCarDate = (iso: string | null | undefined): string =>
  iso
    ? new Intl.DateTimeFormat('es-UY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Montevideo',
      }).format(new Date(iso))
    : '—'
