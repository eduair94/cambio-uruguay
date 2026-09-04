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
  /** Sólo las que el portal publica como "se aceptan mascotas". Ver `petsAllowed`. */
  pets: boolean
  /** Garantías pedidas. Una propiedad entra si acepta AL MENOS UNA de las marcadas. */
  guarantees: RentalGuarantee[]
  /** Sólo las que publican los gastos comunes, para poder comparar el costo real. */
  withExpenses: boolean
  /** Ids de OSM de las sedes elegidas como punto de referencia. Vacío = sin filtro de distancia. */
  sedes: number[]
  /** Radio en km alrededor de cada sede elegida. */
  radioKm: number
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
    pets: String(input.pets ?? '') === '1' || input.pets === true,
    guarantees: parseGuarantees(input.garantia),
    withExpenses: String(input.gc ?? '') === '1' || input.gc === true,
    sedes: parseSedes(input.sedes),
    radioKm: parseRadio(input.radio),
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
  const expenses = offer.commonExpenses
  if (typeof expenses !== 'number' || !(expenses > 0)) return null
  if (!(offer.priceUyu > 0)) return null
  // Los gastos vienen en su propia moneda: 929 avisos de 6.739 la tienen distinta a la del
  // alquiler. Sin la cotizacion de la corrida no se pueden sumar, y sumarlos igual seria un error
  // de un factor 40.
  if (offer.commonExpensesCurrency === 'USD') {
    if (!(usdUyu > 0)) return null
    return Math.round(offer.priceUyu + expenses * usdUyu)
  }
  return Math.round(offer.priceUyu + expenses)
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
    String(input ?? '')
      .split(',')
      .map(part => part.trim())
  )
  return RENTAL_GUARANTEE_VALUES.filter(value => wanted.has(value))
}

/** Cuántas sedes se pueden cruzar a la vez. Cada una suma un `$expr` a la consulta. */
const MAX_SEDES = 6

/** Radio por defecto y banda. Menos de 300 m no dice nada; más de 10 km ya no es "cerca". */
export const RADIO_KM_DEFAULT = 1.5
const RADIO_KM_MIN = 0.3
const RADIO_KM_MAX = 10

function parseSedes(input: unknown): number[] {
  const raw = String(input ?? '')
    .split(',')
    .map(part => Number(part.trim()))
    .filter(id => Number.isSafeInteger(id) && id > 0)
  return [...new Set(raw)].slice(0, MAX_SEDES)
}

function parseRadio(input: unknown): number {
  const km = Number(input)
  if (!Number.isFinite(km)) return RADIO_KM_DEFAULT
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
  staleDays: number
): { filter: Record<string, unknown>; nonLocation: Record<string, unknown> } {
  const cutoff = new Date(Date.now() - staleDays * 86_400_000).toISOString().slice(0, 10)
  const nonLocation: Record<string, unknown> = { lastSeen: { $gte: cutoff } }

  if (query.type) nonLocation.propertyType = query.type
  if (query.source) nonLocation.sources = query.source
  if (query.bedrooms !== null) nonLocation.bedrooms = { $gte: query.bedrooms }
  if (query.multi) nonLocation['sources.1'] = { $exists: true }
  // `true` o nada: ningún portal publica la negativa, así que no existe el filtro "no acepta".
  if (query.pets) nonLocation.petsAllowed = true
  // AL MENOS UNA de las marcadas: quien tiene ANDA y también puede pagar una póliza quiere ver las
  // dos. Pedir que las acepte todas dejaría casi nada y no es lo que nadie busca.
  if (query.guarantees.length) nonLocation.guarantees = { $in: query.guarantees }
  if (query.withExpenses) nonLocation['offers.commonExpenses'] = { $type: 'number', $gt: 0 }
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
  if (query.neighborhood) filter.neighborhood = query.neighborhood

  return { filter, nonLocation }
}
