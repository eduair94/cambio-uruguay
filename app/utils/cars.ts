import type {
  PublicCarCatalogMeta,
  PublicCarFlag,
  PublicCarFuel,
  PublicCarFuelEconomy,
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

export const CAR_SORTS = [
  'recent',
  'price_asc',
  'price_desc',
  'km_asc',
  'year_desc',
  'consumption_asc',
] as const
export type CarSort = (typeof CAR_SORTS)[number]
/** Orden de las oportunidades: por defecto, la diferencia contra la mediana. */
export const CAR_OPPORTUNITY_SORTS = [
  'gap',
  'price_asc',
  'year_desc',
  'km_asc',
  'consumption_asc',
] as const
export type CarOpportunitySort = (typeof CAR_OPPORTUNITY_SORTS)[number]
/** Los escalones del filtro de consumo máximo, en litros cada 100 km. */
export const CAR_CONSUMPTION_STEPS = [5, 6, 7, 8, 10] as const
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
    pictureHost: /^(?:usados\.carper\.com\.uy|cdn\.pilotsolution\.net)$/,
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
  motorlider: {
    name: 'Motorlider',
    permalink: /^https:\/\/motorlider\.com\.uy\/catalogo\/[\w%-]+$/,
    pictureHost: /^f\.fcdn\.app$/,
  },
  duenodirecto: {
    name: 'Dueño Directo',
    permalink: /^https:\/\/vehiculos\.xn--dueodirecto-3db\.com\.uy\/vehiculos\/[\w%-]+$/,
    pictureHost: /^vehiculos\.xn--dueodirecto-3db\.com\.uy$/,
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
  financing: 'El precio publicado puede ser una entrega, no el precio del auto',
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
  /** Consumo máximo en litros cada 100 km, del aviso o estimado por modelo. */
  l100Max: number | null
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
  yearMin: number | null
  kmMax: number | null
  fuel: PublicCarFuel | ''
  transmission: PublicCarTransmission | ''
  l100Max: number | null
  department: string
  seller: PublicCarSeller | ''
  sort: CarOpportunitySort
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
    l100Max: integer(input.l100Max, 1, 30),
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
  if (query.l100Max !== null) match['fuelEconomy.litersPer100Km'] = { $lte: query.l100Max }
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
  // La API deja afuera los avisos sin dato cuando se ordena así (ver server/api/cars/index.get.ts).
  if (sort === 'consumption_asc') return { 'fuelEconomy.litersPer100Km': 1, priceUsd: 1, key: 1 }
  return { firstSeen: -1, key: 1 }
}

export const carKeyValid = (key: string): boolean =>
  /^(?:ml-MLU\d{6,14}|fb-\d{6,20}|(?:clasiautos|julio|sda|carper|fidocar|carone|motorlider|duenodirecto)-\d{1,12})$/.test(
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
    yearMin: integer(input.yearMin, 1950, 2100),
    kmMax: integer(input.kmMax, 1, 1_000_000),
    fuel: oneOf(input.fuel, CAR_FUELS),
    transmission: oneOf(input.transmission, CAR_TRANSMISSIONS),
    l100Max: integer(input.l100Max, 1, 30),
    department: oneOf(input.department, CAR_DEPARTMENTS),
    seller: oneOf(input.seller, CAR_SELLERS),
    sort: oneOf(input.sort, CAR_OPPORTUNITY_SORTS) || 'gap',
    page: integer(input.page, 1, 200) ?? 1,
  }
}

export function carOpportunityQueryParams(query: CarOpportunityQuery): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === '' || value === null || (key === 'page' && value === 1)) continue
    if (key === 'sort' && value === 'gap') continue
    params[key] = String(value)
  }
  return params
}

/** Lo que no tiene el dato (km, rendimiento) va al final en cualquier orden. */
const lastIfMissing = (a: number | null | undefined, b: number | null | undefined): number =>
  a == null ? (b == null ? 0 : 1) : b == null ? -1 : 0

function opportunityOrder(
  sort: CarOpportunitySort,
  a: PublicCarOpportunityItem,
  b: PublicCarOpportunityItem
): number {
  if (sort === 'price_asc') return a.subject.priceUsd - b.subject.priceUsd
  if (sort === 'year_desc') return b.subject.year - a.subject.year || b.gap - a.gap
  if (sort === 'km_asc')
    return lastIfMissing(a.subject.km, b.subject.km) || (a.subject.km ?? 0) - (b.subject.km ?? 0)
  if (sort === 'consumption_asc') {
    const left = a.subject.fuelEconomy?.litersPer100Km
    const right = b.subject.fuelEconomy?.litersPer100Km
    return lastIfMissing(left, right) || (left ?? 0) - (right ?? 0) || b.gap - a.gap
  }
  return (a.tier === b.tier ? 0 : a.tier === 'strict' ? -1 : 1) || b.gap - a.gap
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
    .filter(entry => query.yearMin === null || entry.subject.year >= query.yearMin)
    .filter(
      entry =>
        query.kmMax === null || (entry.subject.km !== null && entry.subject.km <= query.kmMax)
    )
    .filter(entry => !query.fuel || entry.subject.fuel === query.fuel)
    .filter(entry => !query.transmission || entry.subject.transmission === query.transmission)
    .filter(
      entry =>
        query.l100Max === null ||
        (entry.subject.fuelEconomy != null &&
          entry.subject.fuelEconomy.litersPer100Km <= query.l100Max)
    )
    .sort(
      (a, b) => opportunityOrder(query.sort, a, b) || a.subject.key.localeCompare(b.subject.key)
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
/**
 * When the advert states a cash price different from the number the portal lists, `price` is the
 * cash price and this says what the portal shows. The listed number is often the down payment
 * ("US$8990 y cuotas" under "US$12990 Contado"), and showing only it would sell a false bargain.
 */
export const carListedPriceNote = (
  car: Pick<PublicCarListing, 'listedPrice' | 'currency'>
): string | null =>
  car.listedPrice == null
    ? null
    : `Precio de contado que indica el aviso. En el portal figura ${formatCarPrice({ price: car.listedPrice, currency: car.currency })}.`
export const carPercent = (gap: number): string => `${Math.round(gap * 100)} %`

const oneDecimal = (value: number): string => String(Math.round(value * 10) / 10).replace('.', ',')

/** "6,3 L/100 km" si lo dice el aviso; "≈ 6,3 L/100 km" si es una estimación. */
export function formatCarFuelEconomy(
  economy: PublicCarFuelEconomy | null | undefined
): string | null {
  if (!economy) return null
  return `${economy.basis === 'advert' ? '' : '≈ '}${oneDecimal(economy.litersPer100Km)} L/100 km`
}

/**
 * De dónde sale el número, dicho entero. Una estimación nunca se presenta como dato del aviso: dice
 * cuántos vendedores la sostienen y de qué autos.
 */
export function carFuelEconomySource(
  economy: PublicCarFuelEconomy | null | undefined
): string | null {
  if (!economy) return null
  if (economy.basis === 'advert') {
    const parts = [
      economy.city !== null ? `ciudad ${oneDecimal(economy.city)} L/100 km` : null,
      economy.highway !== null ? `ruta ${oneDecimal(economy.highway)} L/100 km` : null,
    ].filter(Boolean)
    return parts.length ? `Según el aviso: ${parts.join(', ')}.` : 'Según el aviso.'
  }
  const sellers = economy.sellers ?? 0
  if (economy.basis === 'model_engine')
    return `Estimado: lo que declaran ${sellers} vendedores del mismo modelo y motor.`
  if (economy.basis === 'model')
    return `Estimado: lo que declaran ${sellers} vendedores del mismo modelo.`
  return `Estimación gruesa: lo que declaran ${sellers} vendedores de autos con el mismo motor y combustible.`
}
export const formatCarDate = (iso: string | null | undefined): string =>
  iso
    ? new Intl.DateTimeFormat('es-UY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Montevideo',
      }).format(new Date(iso))
    : '—'
