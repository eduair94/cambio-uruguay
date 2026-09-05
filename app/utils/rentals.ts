// Shared vocabulary of the rental directory (/alquileres-uruguay).
//
// The rows are produced by the root backend job `sync_rentals.ts` and read from the app's Mongo by
// `server/api/rentals`. This module is the ONE place where the shape, the labels and the query
// contract live, so the page, the API route and the tests cannot drift apart.
//
// PURE module (no Vue/Nuxt runtime) so `normalizeRentalQuery` can be unit-tested in plain Node.
// Everything is prefixed `RENTAL_`/`rental` on purpose: `utils/` is a flat auto-import namespace
// and a bare `SOURCES` or `formatPrice` here would silently collide with another page's helper.

import { MUTUALISTA_SEDES, type MutualistaSede } from './mutualistaSedes'

/** Portals spell the same barrio as Cordón, CORDON or cordon. Match and group them together. */
export const RENTAL_COLLATION = { locale: 'es', strength: 1 } as const

/** Autocomplete follows the same user expectation: a keyboard without accents can find Cordón. */
export function rentalTextMatches(value: unknown, query: string): boolean {
  const fold = (text: unknown) =>
    String(text ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036F]/g, '')
      .toLocaleLowerCase('es')
  return fold(value).includes(fold(query))
}

export type RentalSource = 'mercadolibre' | 'infocasas' | 'facebook' | 'elpais' | 'casasweb'

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
  parkingSpaces: number | null
  furnished: true | null
  petsAllowed?: true | null
  guarantees?: RentalGuarantee[]
  publishedAt: string | null
  firstSeen: string
  lastSeen: string
}

/**
 * Tipos de garantía de alquiler. Espejo de `classes/rentals/guarantees.ts`.
 *
 * Se repite en vez de importarse porque `app/` es un paquete aparte y no puede alcanzar el backend
 * — la misma razón por la que existen los dos esquemas de mongoose. El tripwire de paridad vigila
 * que no se separen.
 */
export type RentalGuarantee =
  | 'anda'
  | 'contaduria'
  | 'aseguradora'
  | 'propietaria'
  | 'deposito'
  | 'bhu'
  | 'aConvenir'

/** Cómo se llama cada una en la página, y qué significa para quien nunca alquiló. */
export const RENTAL_GUARANTEE_LABELS: Record<RentalGuarantee, { label: string; hint: string }> = {
  anda: { label: 'ANDA', hint: 'Garantía de alquiler de ANDA' },
  contaduria: {
    label: 'Contaduría',
    hint: 'Contaduría General de la Nación, para funcionarios públicos',
  },
  aseguradora: { label: 'Aseguradora', hint: 'Póliza privada: Porto, Sura, Mapfre y similares' },
  propietaria: { label: 'Propietaria', hint: 'Un propietario sale de fiador' },
  deposito: { label: 'Depósito', hint: 'Meses de depósito en garantía' },
  bhu: { label: 'BHU', hint: 'Garantía del Banco Hipotecario' },
  aConvenir: { label: 'A convenir', hint: 'El aviso dice que la garantía se conversa' },
}

export const RENTAL_GUARANTEE_VALUES: readonly RentalGuarantee[] = Object.freeze(
  Object.keys(RENTAL_GUARANTEE_LABELS) as RentalGuarantee[]
)

/**
 * Los únicos que se OFRECEN como filtro y se muestran en la tarjeta.
 *
 * Se cosechan los siete, pero sólo se publican los tres con precisión medida sobre 460 avisos
 * leídos a mano, con piso de Wilson al 95 %:
 *
 *   contaduria   78/78  = 100 %   piso 95,3 %
 *   anda         57/57  = 100 %   piso 93,7 %
 *   aseguradora 191/191 = 100 %   piso 98,0 % (tras sacar la publicidad de las inmobiliarias)
 *
 * Los otros cuatro se guardan y NO se publican, cada uno por su motivo:
 *   deposito     66-83 % de precisión, piso 43,7 %. Depende de tres galpones que nadie pudo
 *                decidir sin abrir el aviso. Por debajo del listón del repo.
 *   bhu          3 de 3 leídos a mano, pero n=3 da piso 43,8 %: es una anécdota, no una medición.
 *                Y sus tres casos dicen "depósito BHU", que es UN producto partido en dos etiquetas.
 *   aConvenir    ídem, n=3.
 *   propietaria  CERO apariciones en 460 avisos: no es que mida mal, es que no se puede medir.
 *
 * Para publicar alguno hace falta medirlo sobre una muestra más grande, no cambiar este arreglo.
 */
export const RENTAL_GUARANTEE_PUBLISHED: readonly RentalGuarantee[] = Object.freeze([
  'anda',
  'contaduria',
  'aseguradora',
])

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
  /** Only a count explicitly published by a portal; absence never means no parking. */
  parkingSpaces: number | null
  /** Only a published affirmative; null means the advert does not say. */
  furnished: true | null
  /**
   * ¿El aviso DICE que se aceptan mascotas?
   *
   * `true` sólo cuando el portal lo publica como dato estructurado (facility 222 de InfoCasas, o el
   * filtro IS_SUITABLE_FOR_PETS de MercadoLibre). `null` = el aviso no lo dice, que es la mayoría.
   * NO existe el `false`: ningún portal publica la negativa, así que la ausencia de este dato no
   * significa que no acepten. La página tiene que mostrarlo así.
   */
  petsAllowed: true | null
  /**
   * Garantías que el aviso dice aceptar. VACÍO = el aviso no lo dice, que es casi la mitad.
   * Nunca significa "no acepta ninguna": ningún portal publica la negativa.
   */
  guarantees: RentalGuarantee[]
  priceUyu: number
  price: number
  currency: RentalCurrency
  offers: RentalOffer[]
  /** The advert that satisfies the active offer filters; other offers remain available to compare. */
  matchingOffer?: RentalOffer
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

/** Global visible catalogue, independently from filters and the latest scraper run. */
export interface RentalCoverage {
  computedAt: string
  properties: number
  /** A property may appear under multiple sources, but only once under each source. */
  sources: Array<{ key: RentalSource; properties: number }>
}

export interface RentalsResponse {
  meta: RentalMeta | null
  /** Null means this count is unavailable; zero is reserved for a successful empty count. */
  coverage?: RentalCoverage | null
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
  elpais: 'Inmuebles El País',
  casasweb: 'Casasweb',
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
  /** OR across neighborhoods. The singular field remains for old bookmarked URLs. */
  neighborhoods: string[]
  type: string
  source: string
  bedrooms: number | null
  bedroomsExact: boolean
  bathrooms: number | null
  areaMin: number | null
  areaMax: number | null
  /** Published currency, independent from the UYU budget fields. */
  currency: RentalCurrency | ''
  priceMin: number | null
  priceMax: number | null
  /** Rent + published common expenses, in UYU, from the SAME offer. Unknown totals are excluded. */
  monthlyMax: number | null
  /** Published common expenses in UYU. Zero asks for an explicit no-expenses advert. */
  expensesMax: number | null
  /** Only properties published on more than one portal. */
  multi: boolean
  /** Sólo las que el portal publica como "se aceptan mascotas". Ver `petsAllowed`. */
  pets: boolean
  parking: boolean
  furnished: boolean
  /** Garantías pedidas. Una propiedad entra si acepta AL MENOS UNA de las marcadas. */
  guarantees: RentalGuarantee[]
  /** Sólo las que publican los gastos comunes, para poder comparar el costo real. */
  withExpenses: boolean
  /** Sólo las que alquila el dueño, sin inmobiliaria: se ahorra la comisión de un mes + IVA. */
  owner: boolean
  /** Ids de OSM de las sedes elegidas como punto de referencia. Vacío = sin filtro de distancia. */
  sedes: number[]
  /** Radio en km alrededor de cada sede elegida. */
  radioKm: number
  sort: RentalSort
  page: number
  perPage: number
}

const scalar = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value)
const clean = (value: unknown, max = 60): string => {
  const raw = scalar(value)
  return typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim().slice(0, max) : ''
}

const toNumber = (value: unknown): number | null => {
  const digits = clean(value, 30)
  // Reject malformed input instead of turning "abc12", "1e3" or repeated parameters into a price.
  if (!/^-?\d+(?:\.\d+)?$/.test(digits)) return null
  const parsed = Number(digits)
  return Number.isFinite(parsed) && Math.abs(parsed) <= Number.MAX_SAFE_INTEGER ? parsed : null
}
const toInt = (value: unknown): number | null => {
  const parsed = toNumber(value)
  return parsed === null ? null : Math.trunc(parsed)
}
const enabled = (value: unknown): boolean => scalar(value) === true || clean(value) === '1'
const positive = (value: unknown): number | null => {
  const parsed = toNumber(value)
  return parsed !== null && parsed > 0 ? parsed : null
}
const orderedRange = (min: number | null, max: number | null): [number | null, number | null] =>
  min !== null && max !== null && min > max ? [max, min] : [min, max]

function parseNeighborhoods(input: unknown): string[] {
  const values = (Array.isArray(input) ? input : [input]).flatMap(value =>
    clean(value, 1200).split(',')
  )
  return [...new Set(values.map(value => value.trim().slice(0, 60)).filter(Boolean))].slice(0, 20)
}

/**
 * The single reading of the query string. Used by the API route AND by the page, so a filter can
 * never mean one thing in the URL and another in the request.
 */
export function normalizeRentalQuery(input: Record<string, unknown> = {}): RentalQuery {
  const sortRaw = clean(input.sort, 12) as RentalSort
  const sort = RENTAL_SORTS.some(option => option.value === sortRaw) ? sortRaw : 'recientes'
  const page = Math.min(10_000, Math.max(1, toInt(input.page) ?? 1))
  const perPage = Math.min(
    RENTAL_PER_PAGE_MAX,
    Math.max(6, toInt(input.perPage) ?? RENTAL_PER_PAGE)
  )
  const bedrooms = toInt(input.bedrooms)
  const bathrooms = toInt(input.bathrooms)
  const [priceMin, priceMax] = orderedRange(positive(input.priceMin), positive(input.priceMax))
  const [areaMin, areaMax] = orderedRange(positive(input.areaMin), positive(input.areaMax))
  const neighborhoods = parseNeighborhoods(input.neighborhoods ?? input.neighborhood)
  const currency = clean(input.currency).toUpperCase()
  const expensesMax = toNumber(input.expensesMax)
  const type = clean(input.type, 20)
  const source = clean(input.source, 30)

  return {
    q: clean(input.q, 80),
    department: clean(input.department),
    neighborhood: neighborhoods.length === 1 ? neighborhoods[0]! : '',
    neighborhoods,
    type: Object.hasOwn(RENTAL_TYPE_LABEL, type) ? type : '',
    source: Object.hasOwn(RENTAL_SOURCE_LABEL, source) ? source : '',
    bedrooms: bedrooms !== null && bedrooms >= 0 && bedrooms <= 10 ? bedrooms : null,
    bedroomsExact: enabled(input.bedroomsExact),
    bathrooms: bathrooms !== null && bathrooms >= 1 && bathrooms <= 20 ? bathrooms : null,
    areaMin,
    areaMax,
    currency: currency === 'UYU' || currency === 'USD' ? currency : '',
    priceMin,
    priceMax,
    monthlyMax: positive(input.monthlyMax),
    expensesMax: expensesMax !== null && expensesMax >= 0 ? expensesMax : null,
    multi: enabled(input.multi),
    pets: enabled(input.pets),
    parking: enabled(input.parking),
    furnished: enabled(input.furnished),
    guarantees: parseGuarantees(input.garantia ?? input.guarantees),
    withExpenses: enabled(input.gc ?? input.withExpenses),
    owner: enabled(input.dueno ?? input.owner),
    sedes: parseSedes(input.sedes),
    radioKm: parseRadio(input.radio ?? input.radioKm),
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
  if (query.neighborhoods.length > 1) params.neighborhoods = query.neighborhoods.join(',')
  else if (query.neighborhoods.length === 1) params.neighborhood = query.neighborhoods[0]!
  else if (query.neighborhood) params.neighborhood = query.neighborhood
  if (query.type) params.type = query.type
  if (query.source) params.source = query.source
  if (query.bedrooms !== null) params.bedrooms = String(query.bedrooms)
  if (query.bedroomsExact) params.bedroomsExact = '1'
  if (query.bathrooms !== null) params.bathrooms = String(query.bathrooms)
  if (query.areaMin !== null) params.areaMin = String(query.areaMin)
  if (query.areaMax !== null) params.areaMax = String(query.areaMax)
  if (query.currency) params.currency = query.currency
  if (query.priceMin !== null) params.priceMin = String(query.priceMin)
  if (query.priceMax !== null) params.priceMax = String(query.priceMax)
  if (query.monthlyMax !== null) params.monthlyMax = String(query.monthlyMax)
  if (query.expensesMax !== null) params.expensesMax = String(query.expensesMax)
  if (query.multi) params.multi = '1'
  if (query.pets) params.pets = '1'
  if (query.parking) params.parking = '1'
  if (query.furnished) params.furnished = '1'
  if (query.guarantees.length) params.garantia = query.guarantees.join(',')
  if (query.withExpenses) params.gc = '1'
  if (query.owner) params.dueno = '1'
  if (query.sedes.length) params.sedes = query.sedes.join(',')
  if (query.radioKm !== RADIO_KM_DEFAULT) params.radio = String(query.radioKm)
  if (query.sort !== 'recientes') params.sort = query.sort
  if (query.page > 1) params.page = String(query.page)
  if (query.perPage !== RENTAL_PER_PAGE) params.perPage = String(query.perPage)
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

/**
 * El costo mensual real de un aviso: alquiler + gastos comunes, en pesos.
 *
 * POR QUE IMPORTA: sobre 16.300 propiedades, las que publican gastos comunes tienen una mediana de
 * $4.650, que es el 15 % del alquiler. Un apartamento de $30.000 cuesta $34.650, y el directorio
 * mostraba sólo los $30.000.
 *
 * SE CALCULA POR AVISO, NO POR PROPIEDAD, y eso no es un detalle. De las 971 propiedades donde dos
 * portales declaran gastos comunes, 438 (45 %) discrepan en más de un 15 %. Mezclar el alquiler más
 * barato con los gastos comunes de OTRO aviso daría un total que ningún aviso ofrece. Se suma lo
 * que dice un mismo aviso o no se suma nada.
 *
 * Devuelve `null` cuando el aviso no publica los gastos: el 71 % no lo hace, y estimarlos con la
 * mediana seria inventar el numero mas caro de la busqueda.
 */
export function totalMonthlyUyu(
  offer: Pick<RentalOffer, 'priceUyu' | 'commonExpenses' | 'commonExpensesCurrency'>,
  usdUyu: number
): number | null {
  const expenses = rentalCommonExpensesUyu(offer, usdUyu)
  if (expenses === null || !Number.isFinite(offer.priceUyu) || !(offer.priceUyu > 0)) return null
  return Math.round(offer.priceUyu + expenses)
}

/** Zero is meaningful only when explicitly published; unknown amount/currency stays unknown. */
export function rentalCommonExpensesUyu(
  offer: Pick<RentalOffer, 'commonExpenses' | 'commonExpensesCurrency'>,
  usdUyu: number
): number | null {
  const expenses = offer.commonExpenses
  if (typeof expenses !== 'number' || !Number.isFinite(expenses) || expenses < 0) return null
  if (expenses === 0) return 0
  if (offer.commonExpensesCurrency === 'UYU') return expenses
  if (offer.commonExpensesCurrency === 'USD' && Number.isFinite(usdUyu) && usdUyu > 0)
    return expenses * usdUyu
  return null
}

/** All offer-specific filters must be satisfied by one advert, never by mixing two portals. */
export function rentalOfferMatchesQuery(
  offer: RentalOffer,
  query: RentalQuery,
  usdUyu: number
): boolean {
  if (query.source && offer.source !== query.source) return false
  if (query.currency && offer.currency !== query.currency) return false
  if (query.owner && offer.sellerType !== 'particular') return false
  if (query.priceMin !== null && offer.priceUyu < query.priceMin) return false
  if (query.priceMax !== null && offer.priceUyu > query.priceMax) return false
  if (
    query.withExpenses &&
    (typeof offer.commonExpenses !== 'number' ||
      !Number.isFinite(offer.commonExpenses) ||
      offer.commonExpenses < 0)
  )
    return false
  if (query.expensesMax !== null) {
    const expenses = rentalCommonExpensesUyu(offer, usdUyu)
    if (expenses === null || expenses > query.expensesMax) return false
  }
  if (query.monthlyMax !== null) {
    const total = totalMonthlyUyu(offer, usdUyu)
    if (total === null || total > query.monthlyMax) return false
  }
  return Number.isFinite(offer.priceUyu) && offer.priceUyu > 0
}

/** Cheapest matching advert; same selection is used by list cards and map popups. */
export function rentalMatchingOffer(
  offers: RentalOffer[],
  query: RentalQuery,
  usdUyu: number
): RentalOffer | undefined {
  return offers
    .filter(offer => rentalOfferMatchesQuery(offer, query, usdUyu))
    .sort((a, b) => a.priceUyu - b.priceUyu)[0]
}

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

function parseGuarantees(input: unknown): RentalGuarantee[] {
  const wanted = new Set(
    (Array.isArray(input) ? input.map(value => clean(value)).join(',') : clean(input, 160))
      .split(',')
      .map(part => part.trim())
  )
  // Sólo los publicados: un filtro por un tipo que no se muestra devolvería resultados que nadie
  // puede ver de dónde salen.
  return RENTAL_GUARANTEE_PUBLISHED.filter(value => wanted.has(value))
}

/** Cuántas sedes se pueden cruzar a la vez. Cada una suma un `$expr` a la consulta. */
const MAX_SEDES = 6

/** Radio por defecto y banda. Menos de 300 m no dice nada; más de 10 km ya no es "cerca". */
export const RADIO_KM_DEFAULT = 1.5
const RADIO_KM_MIN = 0.3
const RADIO_KM_MAX = 10

function parseSedes(input: unknown): number[] {
  const raw = (
    Array.isArray(input) ? input.map(value => clean(value)).join(',') : clean(input, 160)
  )
    .split(',')
    .map(part => Number(part.trim()))
    .filter(id => Number.isSafeInteger(id) && id > 0)
  return [...new Set(raw)].slice(0, MAX_SEDES)
}

function parseRadio(input: unknown): number {
  const km = toNumber(input)
  if (km === null) return RADIO_KM_DEFAULT
  return Math.min(RADIO_KM_MAX, Math.max(RADIO_KM_MIN, Math.round(km * 10) / 10))
}

/**
 * "¿Está este documento a menos de `km` de este punto?", como expresión de agregación.
 *
 * Se calcula en Mongo con la fórmula del semiverseno sobre los `latitude`/`longitude` que ya
 * existen. NO se usa `$geoWithin`/`$centerSphere`: esos necesitan UN campo con el par de
 * coordenadas y acá son dos escalares sueltos — y no fallan, devuelven cero documentos en silencio.
 * Tampoco una caja de lat/lng sola: es un cuadrado, y medido contra estas sedes se pasa del radio
 * declarado entre 5,9 % y 23,4 % de las filas. Publicar "a 2 km" y entregar cosas a 2,8 km sería
 * inventar una cifra.
 */
function withinKm(lat: number, lng: number, km: number): Record<string, unknown> {
  const rad = (deg: number) => (deg * Math.PI) / 180
  return {
    $lte: [
      {
        $multiply: [
          6371,
          {
            $acos: {
              $min: [
                1,
                {
                  $add: [
                    {
                      $multiply: [Math.sin(rad(lat)), { $sin: { $degreesToRadians: '$latitude' } }],
                    },
                    {
                      $multiply: [
                        Math.cos(rad(lat)),
                        { $cos: { $degreesToRadians: '$latitude' } },
                        { $cos: { $subtract: [{ $degreesToRadians: '$longitude' }, rad(lng)] } },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
      km,
    ],
  }
}

/** Las sedes elegidas, resueltas por su id de OSM. Un id que no existe se ignora. */
function sedesPorId(ids: readonly number[]): MutualistaSede[] {
  if (!ids.length) return []
  const wanted = new Set(ids)
  return MUTUALISTA_SEDES.filter(sede => wanted.has(sede.osmId))
}

export function buildRentalFilter(
  query: RentalQuery,
  staleDays: number,
  usdUyu = 0
): {
  filter: Record<string, unknown>
  nonLocation: Record<string, unknown>
  withoutNeighborhood: Record<string, unknown>
} {
  const cutoff = new Date(Date.now() - staleDays * 86_400_000).toISOString().slice(0, 10)
  const nonLocation: Record<string, unknown> = { lastSeen: { $gte: cutoff } }

  if (query.type) nonLocation.propertyType = query.type
  if (query.source) nonLocation.sources = query.source
  if (query.bedrooms !== null)
    nonLocation.bedrooms =
      query.bedrooms === 0 || query.bedroomsExact ? query.bedrooms : { $gte: query.bedrooms }
  if (query.bathrooms !== null) nonLocation.bathrooms = { $gte: query.bathrooms }
  if (query.areaMin !== null || query.areaMax !== null) {
    nonLocation.area = {
      $type: 'number',
      ...(query.areaMin !== null ? { $gte: query.areaMin } : {}),
      ...(query.areaMax !== null ? { $lte: query.areaMax } : {}),
    }
  }
  if (query.multi) nonLocation['sources.1'] = { $exists: true }
  // `true` o nada: ningún portal publica la negativa, así que no existe el filtro "no acepta".
  if (query.pets) nonLocation.petsAllowed = true
  if (query.parking) nonLocation.parkingSpaces = { $gte: 1 }
  if (query.furnished) nonLocation.furnished = true
  // AL MENOS UNA de las marcadas: quien tiene ANDA y también puede pagar una póliza quiere ver las
  // dos. Pedir que las acepte todas dejaría casi nada y no es lo que nadie busca.
  if (query.guarantees.length) nonLocation.guarantees = { $in: query.guarantees }
  const offer: Record<string, unknown> = {}
  if (query.source) offer.source = query.source
  if (query.currency) offer.currency = query.currency
  if (query.owner) offer.sellerType = 'particular'
  if (query.withExpenses || query.expensesMax !== null || query.monthlyMax !== null)
    offer.commonExpenses = { $type: 'number', $gte: 0 }
  if (query.priceMin !== null || query.priceMax !== null) {
    offer.priceUyu = {
      $type: 'number',
      ...(query.priceMin !== null ? { $gte: query.priceMin } : {}),
      ...(query.priceMax !== null ? { $lte: query.priceMax } : {}),
    }
  }
  if (Object.keys(offer).length) nonLocation.offers = { $elemMatch: offer }
  // Cheap index prefilter. A minimum must stay on the offer: another portal may advertise less.
  if (query.priceMax !== null) {
    nonLocation.priceUyu = {
      $lte: query.priceMax,
    }
  }
  if (query.monthlyMax !== null || query.expensesMax !== null) {
    nonLocation.$expr = rentalBudgetExpression(query, usdUyu)
  }
  if (query.q) {
    // A plain, anchored-free regex over the two fields a person actually types into: the street
    // and the advert's headline. Escaped, because a stray "(" from a paste must not 500.
    const safe = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(safe, 'i')
    nonLocation.$or = [{ title: pattern }, { address: pattern }, { neighborhood: pattern }]
  }

  // ── Cerca de una sede ──
  //
  // LA GUARDA DE COORDENADA NO ES OPCIONAL. `$degreesToRadians` de un campo ausente da `null`, todo
  // el semiverseno colapsa a `null`, y `{$lte: [null, 2]}` es TRUE por el orden BSON: sin esto,
  // TODA fila sin coordenada pasa cualquier radio. Medido sobre la colección real el 2026-09-04,
  // pidiendo 2 km del hospital de Médica Uruguaya con 2+ dormitorios: 2.878 filas sin la guarda
  // contra 544 con ella. Las 2.334 fantasma incluían propiedades en Maldonado, Canelones y
  // Paysandú, que la página habría mostrado bajo el rótulo "a menos de 2 km".
  const puntos = sedesPorId(query.sedes)
  if (puntos.length) {
    nonLocation.latitude = { $type: 'number' }
    nonLocation.longitude = { $type: 'number' }
    const cerca = puntos.map(sede => ({ $expr: withinKm(sede.lat, sede.lng, query.radioKm) }))
    // Va en `$and` y no en `$or` de primer nivel porque el buscador de texto ya usa `$or`.
    const previos = Array.isArray(nonLocation.$and) ? (nonLocation.$and as unknown[]) : []
    nonLocation.$and = [...previos, cerca.length === 1 ? cerca[0] : { $or: cerca }]
  }

  const filter: Record<string, unknown> = { ...nonLocation }
  if (query.department) filter.department = query.department
  const withoutNeighborhood = { ...filter }
  if (query.neighborhoods.length) filter.neighborhood = { $in: query.neighborhoods }
  else if (query.neighborhood) filter.neighborhood = query.neighborhood

  return { filter, nonLocation, withoutNeighborhood }
}

/** Mongo equivalent of rentalOfferMatchesQuery for budgets; arithmetic never coerces unknown to 0. */
function rentalOfferExpression(query: RentalQuery, usdUyu: number): Record<string, unknown> {
  const rate = Number.isFinite(usdUyu) && usdUyu > 0 ? usdUyu : null
  const expense = '$$offer.commonExpenses'
  const expenseCurrency = '$$offer.commonExpensesCurrency'
  // The $cond protects arithmetic even on malformed historical Mixed documents. Mongo $and does
  // not promise short-circuit evaluation, so a sibling type guard alone cannot prevent a 500.
  const expensesUyu = {
    $cond: [
      { $and: [{ $isNumber: expense }, { $gte: [expense, 0] }] },
      {
        $switch: {
          branches: [
            { case: { $eq: [expense, 0] }, then: 0 },
            { case: { $eq: [expenseCurrency, 'UYU'] }, then: expense },
            {
              case: { $eq: [expenseCurrency, 'USD'] },
              then: rate === null ? null : { $multiply: [expense, rate] },
            },
          ],
          default: null,
        },
      },
      null,
    ],
  }
  const conditions: unknown[] = [
    { $isNumber: '$$offer.priceUyu' },
    { $gt: ['$$offer.priceUyu', 0] },
  ]
  if (query.monthlyMax !== null || query.expensesMax !== null)
    conditions.push({ $ne: ['$$expenses', null] })
  if (query.withExpenses) {
    conditions.push({ $isNumber: expense }, { $gte: [expense, 0] })
  }
  if (query.source) conditions.push({ $eq: ['$$offer.source', query.source] })
  if (query.currency) conditions.push({ $eq: ['$$offer.currency', query.currency] })
  if (query.owner) conditions.push({ $eq: ['$$offer.sellerType', 'particular'] })
  if (query.priceMin !== null) conditions.push({ $gte: ['$$offer.priceUyu', query.priceMin] })
  if (query.priceMax !== null) conditions.push({ $lte: ['$$offer.priceUyu', query.priceMax] })
  if (query.expensesMax !== null) conditions.push({ $lte: ['$$expenses', query.expensesMax] })
  if (query.monthlyMax !== null) {
    conditions.push({
      $lte: [
        {
          $floor: {
            $add: [
              {
                $convert: { input: '$$offer.priceUyu', to: 'double', onError: null, onNull: null },
              },
              '$$expenses',
              0.5,
            ],
          },
        },
        query.monthlyMax,
      ],
    })
  }
  return { $let: { vars: { expenses: expensesUyu }, in: { $and: conditions } } }
}

function rentalBudgetExpression(query: RentalQuery, usdUyu: number): Record<string, unknown> {
  return {
    $anyElementTrue: [
      {
        $map: {
          input: { $cond: [{ $isArray: '$offers' }, '$offers', []] },
          as: 'offer',
          in: rentalOfferExpression(query, usdUyu),
        },
      },
    ],
  }
}

/**
 * Public inventory is based on recently observed adverts, independently from historical storage.
 * A partial/failed portal may keep its archived offers indefinitely; another portal refreshing
 * the property must not turn those old prices, amenities or source counts into current evidence.
 * Both list/map and EVERY facet/count run this stage before interpreting the query.
 */
export function rentalPublicStages(filter: Record<string, unknown>, staleDays: number) {
  const cutoff = new Date(Date.now() - staleDays * 86_400_000).toISOString().slice(0, 10)
  const derived = new Set([
    'offers',
    'sources',
    'sources.1',
    'petsAllowed',
    'furnished',
    'parkingSpaces',
    'guarantees',
    'priceUyu',
    '$expr',
  ])
  const prefilter = Object.fromEntries(Object.entries(filter).filter(([key]) => !derived.has(key)))
  return [
    // Location/specification indexes still apply before deriving current offer evidence.
    { $match: prefilter },
    {
      $set: {
        offers: {
          $filter: {
            input: { $cond: [{ $isArray: '$offers' }, '$offers', []] },
            as: 'offer',
            cond: {
              $and: [
                { $eq: [{ $type: '$$offer.lastSeen' }, 'string'] },
                { $gte: ['$$offer.lastSeen', cutoff] },
                { $isNumber: '$$offer.priceUyu' },
                { $gt: ['$$offer.priceUyu', 0] },
              ],
            },
          },
        },
      },
    },
    { $match: { 'offers.0': { $exists: true } } },
    {
      $set: {
        sources: { $setUnion: ['$offers.source', []] },
        petsAllowed: { $cond: [{ $in: [true, '$offers.petsAllowed'] }, true, null] },
        furnished: { $cond: [{ $in: [true, '$offers.furnished'] }, true, null] },
        parkingSpaces: { $max: '$offers.parkingSpaces' },
        guarantees: {
          $reduce: {
            input: '$offers',
            initialValue: [],
            in: {
              $setUnion: [
                '$$value',
                { $cond: [{ $isArray: '$$this.guarantees' }, '$$this.guarantees', []] },
              ],
            },
          },
        },
        lastSeen: { $max: '$offers.lastSeen' },
        freshAt: {
          $ifNull: [{ $max: '$offers.publishedAt' }, { $max: '$offers.firstSeen' }],
        },
        matchingOffer: {
          $reduce: {
            input: '$offers',
            initialValue: null,
            in: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$$value', null] },
                    { $lt: ['$$this.priceUyu', '$$value.priceUyu'] },
                  ],
                },
                '$$this',
                '$$value',
              ],
            },
          },
        },
      },
    },
    {
      $set: {
        priceUyu: '$matchingOffer.priceUyu',
        price: '$matchingOffer.price',
        currency: '$matchingOffer.currency',
      },
    },
    { $match: filter },
  ]
}

/** Select and price the matching advert inside Mongo, before ordering or paginating results. */
export function rentalOfferStages(query: RentalQuery, usdUyu: number) {
  // The default property already stores its cheapest offer. Preserve indexed sorts in the common
  // case; derive a different headline price only when an offer-specific filter requires it.
  if (
    !query.source &&
    !query.currency &&
    !query.owner &&
    !query.withExpenses &&
    query.priceMin === null &&
    query.monthlyMax === null &&
    query.expensesMax === null
  )
    return []
  return [
    {
      $set: {
        matchingOffer: {
          $reduce: {
            input: {
              $filter: {
                input: { $cond: [{ $isArray: '$offers' }, '$offers', []] },
                as: 'offer',
                cond: rentalOfferExpression(query, usdUyu),
              },
            },
            initialValue: null,
            in: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$$value', null] },
                    { $lt: ['$$this.priceUyu', '$$value.priceUyu'] },
                  ],
                },
                '$$this',
                '$$value',
              ],
            },
          },
        },
      },
    },
    {
      $set: {
        priceUyu: { $ifNull: ['$matchingOffer.priceUyu', '$priceUyu'] },
        price: { $ifNull: ['$matchingOffer.price', '$price'] },
        currency: { $ifNull: ['$matchingOffer.currency', '$currency'] },
      },
    },
  ]
}

/** Stable tie-breaks keep adjacent pages from repeating or skipping equal-price properties. */
export function rentalMongoSort(sort: RentalSort): Record<string, 1 | -1> {
  if (sort === 'precio') return { priceUyu: 1, key: 1 }
  if (sort === 'precio-desc') return { priceUyu: -1, key: 1 }
  if (sort === 'metros') return { area: -1, priceUyu: 1, key: 1 }
  return { freshAt: -1, key: 1 }
}
