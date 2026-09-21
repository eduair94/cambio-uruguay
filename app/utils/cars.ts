import type {
  PublicCarBody,
  PublicCarBodyType,
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
/**
 * Las carrocerías que ofrece el filtro. El valor de cada aviso sale de su ficha propia, de la
 * palabra que escribió el vendedor o de la carrocería de su modelo (classes/autos/bodyType.ts);
 * un aviso sin el dato NUNCA cumple un filtro de carrocería, igual que pasa con los kilómetros.
 */
export const CAR_BODY_TYPES: readonly PublicCarBodyType[] = [
  'sedan',
  'hatchback',
  'suv',
  'pickup',
  'rural',
  'furgon',
  'monovolumen',
  'coupe',
  'cabriolet',
]
export const CAR_BODY_LABELS: Record<PublicCarBodyType, string> = {
  sedan: 'Sedán',
  hatchback: 'Hatchback',
  suv: 'SUV o crossover',
  pickup: 'Pick-up',
  rural: 'Rural o familiar',
  furgon: 'Furgón o van',
  monovolumen: 'Monovolumen o minibús',
  coupe: 'Coupé',
  cabriolet: 'Cabriolet',
}
/** Las puertas que declara la ficha del aviso. */
export const CAR_DOOR_OPTIONS = [2, 3, 4, 5] as const
/** Las familias de color de classes/autos/bodyType.ts, en el orden en que aparecen en el país. */
export const CAR_COLORS = [
  'blanco',
  'gris',
  'plata',
  'rojo',
  'azul',
  'negro',
  'verde',
  'celeste',
  'beige',
  'marron',
  'dorado',
  'bordo',
  'naranja',
  'amarillo',
  'violeta',
] as const
export const CAR_COLOR_LABELS: Record<string, string> = {
  blanco: 'Blanco',
  gris: 'Gris',
  plata: 'Plata',
  rojo: 'Rojo',
  azul: 'Azul',
  negro: 'Negro',
  verde: 'Verde',
  celeste: 'Celeste',
  beige: 'Beige',
  marron: 'Marrón',
  dorado: 'Dorado',
  bordo: 'Bordó',
  naranja: 'Naranja',
  amarillo: 'Amarillo',
  violeta: 'Violeta',
}
/** Cuántos días hace que el aviso está publicado, para el filtro de novedades. */
export const CAR_SINCE_STEPS = [1, 3, 7, 30] as const
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
  { name: string; permalink: RegExp; pictureHost: RegExp; contactPage: string | null }
> = {
  mercadolibre: {
    name: 'Mercado Libre',
    permalink: /^https:\/\/auto\.mercadolibre\.com\.uy\/MLU-/,
    pictureHost: /^http2\.mlstatic\.com$/,
    contactPage: null,
  },
  clasiautos: {
    name: 'Clasiautos',
    permalink: /^https:\/\/clasiautos\.uy\/avisos\/[\w%-]+\/?$/,
    pictureHost: /^clasiautos\.uy$/,
    contactPage: null,
  },
  julio: {
    name: 'Julio Automóviles',
    permalink: /^https:\/\/julioautomoviles\.com\.uy\/vehiculo\/[\w%-]+\/?$/,
    pictureHost: /^julioautomoviles\.com\.uy$/,
    contactPage: 'https://julioautomoviles.com.uy/contacto/',
  },
  shoppingdeautos: {
    name: 'Shopping de Autos',
    permalink: /^https:\/\/shoppingdeautos\.uy\/producto\/[\w%-]+\/?$/,
    pictureHost: /^shoppingdeautos\.uy$/,
    contactPage: 'https://shoppingdeautos.uy/contacto/',
  },
  carper: {
    name: 'Carper',
    permalink: /^https:\/\/usados\.carper\.com\.uy\/[\w%/-]+$/,
    pictureHost: /^(?:usados\.carper\.com\.uy|cdn\.pilotsolution\.net)$/,
    contactPage: 'https://usados.carper.com.uy/contacto/',
  },
  fidocar: {
    name: 'Usados Fidocar',
    permalink: /^https:\/\/www\.usadosfidocar\.com\.uy\/modelo\/[\w%-]+$/,
    pictureHost: /^f\.fcdn\.app$/,
    contactPage: 'https://www.usadosfidocar.com.uy/contacto',
  },
  carone: {
    name: 'Car One',
    permalink: /^https:\/\/carone\.com\.uy\/[\w%-]+$/,
    pictureHost: /^cdn\.impel\.io$/,
    contactPage: 'https://carone.com.uy/contacto',
  },
  motorlider: {
    name: 'Motorlider',
    permalink: /^https:\/\/motorlider\.com\.uy\/catalogo\/[\w%-]+$/,
    pictureHost: /^f\.fcdn\.app$/,
    contactPage: 'https://motorlider.com.uy/contacto',
  },
  duenodirecto: {
    name: 'Dueño Directo',
    permalink: /^https:\/\/vehiculos\.xn--dueodirecto-3db\.com\.uy\/vehiculos\/[\w%-]+$/,
    pictureHost: /^vehiculos\.xn--dueodirecto-3db\.com\.uy$/,
    contactPage: null,
  },
  facebook: {
    name: 'Facebook Marketplace',
    permalink: /^https:\/\/www\.facebook\.com\/marketplace\/item\/\d{6,20}\/$/,
    pictureHost: /^scontent[\w.-]*\.fbcdn\.net$/,
    contactPage: null,
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
  /** Carrocería: sedán, SUV, pick-up… Ver CAR_BODY_TYPES. */
  body: PublicCarBodyType | ''
  /** Puertas y color, que sólo conocemos de la ficha propia del aviso. */
  doors: number | null
  color: string
  department: string
  seller: PublicCarSeller | ''
  source: PublicCarSource | ''
  /** Sólo avisos cuyo precio BAJÓ desde que lo miramos. */
  priceDrop: boolean
  /** Sólo los que están baratos contra autos iguales. */
  opportunity: boolean
  /** Saca los avisos donde el vendedor declara deuda, choque, recupero o papeles. */
  noRisk: boolean
  /** Publicados en los últimos N días (la primera vez que los vimos). */
  sinceDays: number | null
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
  facets: {
    brands: CarFacet[]
    models: CarFacet[]
    departments: CarFacet[]
    sources: CarFacet[]
    bodies: CarFacet[]
  }
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

/**
 * Los filtros sobre el aviso mismo que comparten las listas de oportunidades y de autos con deuda:
 * las dos son listas de avisos (`subject`) con algo encima, y una persona que filtra por consumo en
 * una espera poder hacerlo en la otra.
 */
export interface CarSubjectFilters {
  priceMax: number | null
  yearMin: number | null
  kmMax: number | null
  fuel: PublicCarFuel | ''
  transmission: PublicCarTransmission | ''
  /** Carrocería: sedán, SUV, pick-up… Ver CAR_BODY_TYPES. */
  body: PublicCarBodyType | ''
  /** Consumo máximo en litros cada 100 km, del aviso o estimado por modelo. */
  l100Max: number | null
  department: string
  seller: PublicCarSeller | ''
}

/** Los mismos filtros como los tiene un formulario: todo texto. */
export type CarSubjectDraft = { [K in keyof CarSubjectFilters]: string }

export interface CarOpportunityQuery extends CarSubjectFilters {
  tier: 'strict' | 'exploratory' | ''
  brand: string
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
  // "15.000", "US$ 15.000" and "15 000" are how people write an amount here; a strict digits-only
  // parse silently ignored the budget of anyone who typed the thousands separator.
  const raw = text(value, 20)
    .replace(/u\$s|us\$|usd|\$/gi, '')
    .replace(/[.,\s]/g, '')
  if (!/^\d+$/.test(raw)) return null
  const number = Number(raw)
  return number >= min && number <= max ? number : null
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | '' {
  const raw = text(value)
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : ''
}

/** Un interruptor de la URL: sólo "1" lo prende, para que `?priceDrop=0` no encienda nada. */
function flag(value: unknown): boolean {
  return text(value, 4) === '1'
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
    body: oneOf(input.body, CAR_BODY_TYPES),
    doors: integer(input.doors, 1, 9),
    color: oneOf(input.color, CAR_COLORS),
    department: oneOf(input.department, CAR_DEPARTMENTS),
    seller: oneOf(input.seller, CAR_SELLERS),
    source: oneOf(input.source, CAR_SOURCES_PUBLIC),
    priceDrop: flag(input.priceDrop),
    opportunity: flag(input.opportunity),
    noRisk: flag(input.noRisk),
    sinceDays: integer(input.sinceDays, 1, 365),
    sort: oneOf(input.sort, CAR_SORTS) || 'recent',
    page: integer(input.page, 1, 500) ?? 1,
  }
}

export function carsQueryParams(query: CarsQuery): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === '' || value === null || value === false) continue
    if (key === 'sort' && value === 'recent') continue
    if (key === 'page' && value === 1) continue
    params[key] = value === true ? '1' : String(value)
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
  if (query.body) match['body.type'] = query.body
  if (query.doors !== null) match.doors = query.doors
  if (query.color) match.color = query.color
  if (query.department) match.department = query.department
  if (query.seller) match.sellerType = query.seller
  if (query.source) match.source = query.source
  if (query.priceDrop) match.priceDrop = { $ne: null }
  if (query.opportunity) match.opportunity = { $ne: null }
  // Sin riesgo declarado = el aviso no dice nada. La ausencia no es una afirmación de que el auto
  // esté limpio, sólo de que el vendedor no declaró nada; por eso el filtro se llama así.
  if (query.noRisk) match['risks.0'] = { $exists: false }
  if (query.sinceDays !== null)
    match.firstSeen = { $gte: new Date(now.getTime() - query.sinceDays * 86_400_000).toISOString() }
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

export function normalizeCarSubjectFilters(input: Record<string, unknown>): CarSubjectFilters {
  return {
    priceMax: integer(input.priceMax, 1, 1_000_000),
    yearMin: integer(input.yearMin, 1950, 2100),
    kmMax: integer(input.kmMax, 1, 1_000_000),
    fuel: oneOf(input.fuel, CAR_FUELS),
    transmission: oneOf(input.transmission, CAR_TRANSMISSIONS),
    body: oneOf(input.body, CAR_BODY_TYPES),
    l100Max: integer(input.l100Max, 1, 30),
    department: oneOf(input.department, CAR_DEPARTMENTS),
    seller: oneOf(input.seller, CAR_SELLERS),
  }
}

export const carSubjectDraft = (filters: CarSubjectFilters): CarSubjectDraft => ({
  priceMax: filters.priceMax?.toString() ?? '',
  yearMin: filters.yearMin?.toString() ?? '',
  kmMax: filters.kmMax?.toString() ?? '',
  fuel: filters.fuel,
  transmission: filters.transmission,
  body: filters.body,
  l100Max: filters.l100Max?.toString() ?? '',
  department: filters.department,
  seller: filters.seller,
})

/** Si un aviso pasa los filtros. Sin el dato (km, consumo) nunca cumple un tope. */
export function carSubjectMatches(subject: PublicCarListing, filters: CarSubjectFilters): boolean {
  if (filters.priceMax !== null && subject.priceUsd > filters.priceMax) return false
  if (filters.yearMin !== null && subject.year < filters.yearMin) return false
  if (filters.kmMax !== null && (subject.km === null || subject.km > filters.kmMax)) return false
  if (filters.fuel && subject.fuel !== filters.fuel) return false
  if (filters.transmission && subject.transmission !== filters.transmission) return false
  if (filters.body && subject.body?.type !== filters.body) return false
  if (
    filters.l100Max !== null &&
    (subject.fuelEconomy == null || subject.fuelEconomy.litersPer100Km > filters.l100Max)
  )
    return false
  if (filters.department && subject.department !== filters.department) return false
  if (filters.seller && subject.sellerType !== filters.seller) return false
  return true
}

/** Lo que no tiene el dato (km, consumo) va al final en cualquier orden. */
const lastIfMissing = (a: number | null | undefined, b: number | null | undefined): number =>
  a == null ? (b == null ? 0 : 1) : b == null ? -1 : 0

/**
 * El orden por un dato del aviso. Devuelve 0 para el orden propio de cada lista ("gap"), que lo
 * resuelve quien llama.
 */
export function carSubjectOrder(sort: string, a: PublicCarListing, b: PublicCarListing): number {
  if (sort === 'price_asc') return a.priceUsd - b.priceUsd
  if (sort === 'year_desc') return b.year - a.year
  if (sort === 'km_asc') return lastIfMissing(a.km, b.km) || (a.km ?? 0) - (b.km ?? 0)
  if (sort === 'consumption_asc') {
    const left = a.fuelEconomy?.litersPer100Km
    const right = b.fuelEconomy?.litersPer100Km
    return lastIfMissing(left, right) || (left ?? 0) - (right ?? 0)
  }
  return 0
}

export function normalizeCarOpportunityQuery(input: Record<string, unknown>): CarOpportunityQuery {
  return {
    tier: oneOf(input.tier, ['strict', 'exploratory'] as const),
    brand: slugParam(input.brand),
    ...normalizeCarSubjectFilters(input),
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

function opportunityOrder(
  sort: CarOpportunitySort,
  a: PublicCarOpportunityItem,
  b: PublicCarOpportunityItem
): number {
  if (sort !== 'gap') return carSubjectOrder(sort, a.subject, b.subject) || b.gap - a.gap
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
    .filter(entry => carSubjectMatches(entry.subject, query))
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

/**
 * "SUV o crossover" si lo dice el aviso; "≈ SUV o crossover" si sale de los demás avisos del mismo
 * modelo — el mismo signo que usa el consumo estimado, y por el mismo motivo.
 */
export const formatCarBody = (body: PublicCarBody | null | undefined): string | null =>
  body ? `${body.basis === 'advert' ? '' : '≈ '}${CAR_BODY_LABELS[body.type]}` : null

/** De dónde sale la carrocería, dicho entero. */
export const carBodySource = (body: PublicCarBody | null | undefined): string | null =>
  body
    ? body.basis === 'advert'
      ? 'Según el aviso.'
      : 'Estimada: es la carrocería que declaran los demás avisos del mismo modelo.'
    : null

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

/** Un filtro activo, como lo muestra la barra de chips arriba de los resultados. */
export interface CarFilterChip {
  /** Identidad estable para `:key`. */
  key: string
  /** Lo que el chip dice: ya lleva su contexto ("Desde 2015", no "2015"). */
  label: string
  /** Qué campos de la consulta limpia su cruz. Un rango se saca de a una punta. */
  keys: Array<keyof CarsQuery>
}

/**
 * Los filtros activos, en el orden en que la gente los piensa: qué auto, de qué
 * año, a qué precio, con cuántos kilómetros, y recién después el detalle.
 *
 * Las marcas y los modelos llegan como slug, así que el nombre lindo sale de las
 * facetas que devolvió la API. Si la faceta no está (la consulta filtra por una
 * marca que hoy no tiene avisos), el chip muestra el slug antes que desaparecer:
 * un filtro invisible es peor que uno mal escrito.
 */
export function carsFilterChips(
  query: CarsQuery,
  facets?: { brands?: CarFacet[]; models?: CarFacet[]; sources?: CarFacet[] }
): CarFilterChip[] {
  const chips: CarFilterChip[] = []
  const add = (key: string, label: string, keys: Array<keyof CarsQuery>) =>
    chips.push({ key, label, keys })
  const named = (list: CarFacet[] | undefined, slug: string) =>
    list?.find(item => item.slug === slug)?.name ?? slug

  if (query.q) add('q', `"${query.q}"`, ['q'])
  if (query.brand) add('brand', named(facets?.brands, query.brand), ['brand', 'model'])
  if (query.model) add('model', named(facets?.models, query.model), ['model'])
  if (query.body) add('body', CAR_BODY_LABELS[query.body], ['body'])

  if (query.yearMin && query.yearMax)
    add('year', `${query.yearMin}–${query.yearMax}`, ['yearMin', 'yearMax'])
  else if (query.yearMin) add('yearMin', `Desde ${query.yearMin}`, ['yearMin'])
  else if (query.yearMax) add('yearMax', `Hasta ${query.yearMax}`, ['yearMax'])

  const usd = (value: number) => `US$ ${value.toLocaleString('es-UY')}`
  if (query.priceMin && query.priceMax)
    add('price', `${usd(query.priceMin)}–${usd(query.priceMax)}`, ['priceMin', 'priceMax'])
  else if (query.priceMin) add('priceMin', `Desde ${usd(query.priceMin)}`, ['priceMin'])
  else if (query.priceMax) add('priceMax', `Hasta ${usd(query.priceMax)}`, ['priceMax'])

  if (query.kmMax) add('kmMax', `Hasta ${query.kmMax.toLocaleString('es-UY')} km`, ['kmMax'])
  if (query.l100Max) add('l100Max', `Hasta ${query.l100Max} L/100 km`, ['l100Max'])
  if (query.fuel) add('fuel', CAR_FUEL_LABELS[query.fuel], ['fuel'])
  if (query.transmission)
    add('transmission', CAR_TRANSMISSION_LABELS[query.transmission], ['transmission'])
  if (query.doors) add('doors', `${query.doors} puertas`, ['doors'])
  if (query.color) add('color', CAR_COLOR_LABELS[query.color] ?? query.color, ['color'])
  if (query.department) add('department', query.department, ['department'])
  if (query.seller) add('seller', CAR_SELLER_LABELS[query.seller], ['seller'])
  if (query.sinceDays)
    add('sinceDays', query.sinceDays === 1 ? 'Vistos hoy' : `Últimos ${query.sinceDays} días`, [
      'sinceDays',
    ])
  if (query.source) add('source', named(facets?.sources, query.source), ['source'])
  if (query.priceDrop) add('priceDrop', 'Bajó de precio', ['priceDrop'])
  if (query.opportunity) add('opportunity', 'Sólo oportunidades', ['opportunity'])
  if (query.noRisk) add('noRisk', 'Sin deuda ni choque declarados', ['noRisk'])

  return chips
}

/**
 * La consulta sin esos campos. `sort` y `page` no son filtros: sacar un filtro
 * vuelve a la página 1, pero conserva el orden que la persona eligió.
 */
export function carsQueryWithout(query: CarsQuery, keys: Array<keyof CarsQuery>): CarsQuery {
  const next: Record<string, unknown> = { ...query }
  for (const key of keys) next[key] = ''
  // Los interruptores viajan como "1"; cualquier otra cosa los apaga, así que '' alcanza para
  // los tres tipos de campo y el normalizador vuelve a decidir la forma final.
  for (const key of ['priceDrop', 'opportunity', 'noRisk'] as const) {
    if (!keys.includes(key)) next[key] = query[key] ? '1' : ''
  }
  return normalizeCarsQuery({ ...next, sort: query.sort, page: 1 })
}
