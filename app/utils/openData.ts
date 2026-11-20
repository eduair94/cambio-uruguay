// app/utils/openData.ts
// La API de DATOS ABIERTOS del sitio (`/api/datos/*`): las estadísticas de precios que el sitio ya
// calcula todos los días (alquileres, viviendas en venta, autos usados) y una búsqueda de avisos
// con la forma pública y estable que un tercero puede usar sin pedir permiso.
//
// Por qué existe una capa aparte y no se abre CORS sobre las rutas que usa la página: la forma de
// `/api/rentals`, `/api/cars` o `/api/market-series` cambia cuando cambia la página, y un tercero
// que integró esa forma se rompe sin aviso. Esta capa es el CONTRATO: nombres en español, campos
// documentados en el OpenAPI de abajo y versión en `version`. Si una ruta interna cambia, se
// arregla el mapeo de acá y el contrato sigue igual.
//
// Qué se licencia y qué no (y por qué el corte está donde está):
// - Las ESTADÍSTICAS (medianas, cuartiles, variaciones, conteos) son elaboración propia: van con
//   licencia CC BY 4.0. Se pide citar la fuente con un enlace; es la condición de la licencia, y
//   el que publica elige cómo y dónde (un enlace que el editor decide poner es editorial; un
//   enlace escondido en un widget no lo es — ver el encabezado de utils/widgetEmbed.ts).
// - Los AVISOS son de sus anunciantes y de los portales donde se publicaron. No los licenciamos:
//   la búsqueda devuelve una ficha mínima con el enlace a la ficha del sitio, sin fotos, sin
//   contactos, sin coordenadas y sin la URL del portal de origen, para buscar y enlazar, no para
//   espejar un directorio ajeno. La página de alquileres importa El País con un permiso fechado
//   de su operador (AGENTS.md) que no se extiende a terceros.
//
// Módulo PURO (sin Vue/Nuxt): las rutas, la página /datos-abiertos-uruguay y los tests comparten
// esta fuente.

import {
  carSeriesKey,
  housingSeriesKey,
  isMarketSeriesKey,
  MARKET_BEDROOM_ORDER,
  MARKET_TYPE_ORDER,
  type MarketBedrooms,
  type MarketCurrency,
  type MarketSeriesDoc,
  type MarketSeriesPoint,
  type MarketTypeBucket,
  type MarketVertical,
} from './marketSeries'

export const OPEN_DATA_VERSION = '1.0'
export const OPEN_DATA_SITE = 'https://cambio-uruguay.com'
export const OPEN_DATA_PAGE = `${OPEN_DATA_SITE}/datos-abiertos-uruguay`
export const OPEN_DATA_BASE = `${OPEN_DATA_SITE}/api/datos`
export const OPEN_DATA_MCP = 'https://mcp.cambio-uruguay.com/mcp'

export const OPEN_DATA_LICENSE = Object.freeze({
  nombre: 'CC BY 4.0',
  url: 'https://creativecommons.org/licenses/by/4.0/deed.es',
})

/** La línea de crédito que pedimos, en texto y en HTML listo para pegar. */
export const OPEN_DATA_ATTRIBUTION = Object.freeze({
  texto: 'Fuente: Cambio Uruguay (cambio-uruguay.com)',
  html: '<a href="https://cambio-uruguay.com">Fuente: Cambio Uruguay</a>',
})

export interface OpenDataEnvelope<T> {
  version: string
  fuente: {
    nombre: string
    url: string
    pagina: string
    atribucion: string
    licencia: { nombre: string; url: string } | null
    nota?: string
  }
  actualizado: string | null
  datos: T
}

/**
 * Toda respuesta viaja con su crédito: quien guarda el JSON guarda también de dónde salió y bajo
 * qué condiciones. `licensed: false` para los avisos (ver el encabezado).
 */
export function openDataEnvelope<T>(
  datos: T,
  options: { pagina: string; actualizado?: string | null; licensed?: boolean; nota?: string }
): OpenDataEnvelope<T> {
  const licensed = options.licensed !== false
  return {
    version: OPEN_DATA_VERSION,
    fuente: {
      nombre: 'Cambio Uruguay',
      url: OPEN_DATA_SITE,
      pagina: options.pagina,
      atribucion: OPEN_DATA_ATTRIBUTION.texto,
      licencia: licensed ? { ...OPEN_DATA_LICENSE } : null,
      ...(options.nota ? { nota: options.nota } : {}),
    },
    actualizado: options.actualizado ?? null,
    datos,
  }
}

export const LISTINGS_NOTE =
  'Los avisos son de sus anunciantes y de los portales donde se publicaron: no se licencian. Usalos para buscar y enlazar a la ficha (campo url), no para republicar el directorio.'

// ── Mercados (series de precios) ──────────────────────────────────────────────

export const OPEN_DATA_MARKETS = ['alquiler', 'venta', 'autos'] as const
export type OpenDataMarket = (typeof OPEN_DATA_MARKETS)[number]

const MARKET_PAGES: Readonly<Record<MarketVertical, string>> = Object.freeze({
  alquiler: '/evolucion-precio-alquileres-uruguay',
  venta: '/evolucion-precio-viviendas-uruguay',
  autos: '/evolucion-precio-autos-usados-uruguay',
})

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const one = (value: unknown): string => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

export function isOpenDataMarket(value: unknown): value is OpenDataMarket {
  return (OPEN_DATA_MARKETS as readonly string[]).includes(one(value))
}

export type MarketQueryResult =
  { ok: true; key: string; market: OpenDataMarket } | { ok: false; error: string }

/** Ámbito del sitio a partir de departamento/barrio legibles ("montevideo", "pocitos"). */
function scopeOf(department: string, neighborhood: string): string | null {
  if (!department && !neighborhood) return 'uy'
  if (!SLUG.test(department)) return null
  if (!neighborhood) return `d:${department}`
  if (!SLUG.test(neighborhood)) return null
  return `b:${department}:${neighborhood}`
}

/**
 * Parámetros legibles → clave de una serie. Acepta también `clave` tal cual la usa el sitio
 * (`alquiler|UYU|apartamento|2|d:montevideo`), que es lo que devuelven `mercado` y `actual`.
 */
export function marketKeyFromQuery(query: Record<string, unknown>): MarketQueryResult {
  const raw = Array.isArray(query.clave) ? query.clave[0] : query.clave
  if (typeof raw === 'string' && raw) {
    if (!isMarketSeriesKey(raw)) return { ok: false, error: 'clave inválida' }
    return { ok: true, key: raw, market: raw.split('|')[0] as OpenDataMarket }
  }
  const market = one(query.mercado)
  if (!isOpenDataMarket(market))
    return { ok: false, error: 'mercado debe ser alquiler, venta o autos' }
  if (market === 'autos') {
    const model = one(query.modelo)
    const year = one(query.anio)
    if (model && !SLUG.test(model)) return { ok: false, error: 'modelo inválido' }
    if (year && !/^(?:19|20)\d{2}$/.test(year)) return { ok: false, error: 'anio inválido' }
    if (year && !model) return { ok: false, error: 'anio necesita modelo' }
    return { ok: true, market, key: carSeriesKey(model || null, year ? Number(year) : null) }
  }
  const parsed = housingDims(query, market)
  if (!parsed.ok) return parsed
  const scope = scopeOf(one(query.departamento), one(query.barrio))
  if (!scope) return { ok: false, error: 'departamento o barrio inválido' }
  const key = housingSeriesKey(market, parsed.currency, parsed.type, parsed.bedrooms, scope)
  return isMarketSeriesKey(key) ? { ok: true, market, key } : { ok: false, error: 'serie inválida' }
}

type HousingDims =
  | { ok: true; currency: MarketCurrency; type: MarketTypeBucket; bedrooms: MarketBedrooms }
  | { ok: false; error: string }

function housingDims(query: Record<string, unknown>, market: 'alquiler' | 'venta'): HousingDims {
  const currency = (one(query.moneda) || (market === 'alquiler' ? 'uyu' : 'usd')).toUpperCase()
  if (currency !== 'UYU' && currency !== 'USD')
    return { ok: false, error: 'moneda debe ser UYU o USD' }
  const type = (one(query.tipo) || 'todas') as MarketTypeBucket
  if (!MARKET_TYPE_ORDER.includes(type))
    return { ok: false, error: 'tipo debe ser apartamento, casa o todas' }
  const bedroomsRaw = one(query.dormitorios) || 'any'
  const bedrooms = (bedroomsRaw === 'todos' ? 'any' : bedroomsRaw) as MarketBedrooms
  if (!MARKET_BEDROOM_ORDER.includes(bedrooms))
    return { ok: false, error: 'dormitorios debe ser 0, 1, 2, 3, 4plus o todos' }
  return { ok: true, currency, type, bedrooms }
}

/**
 * El prefijo de clave de TODAS las cohortes de una foto (`actual`): mismo mercado, moneda, tipo y
 * dormitorios en todos los lugares, o todos los modelos de autos. Un prefijo anclado usa el índice
 * de `key`, así que la consulta nunca recorre la colección entera.
 */
export function marketSnapshotPrefix(
  query: Record<string, unknown>
): { ok: true; market: OpenDataMarket; prefix: string } | { ok: false; error: string } {
  const market = one(query.mercado)
  if (!isOpenDataMarket(market))
    return { ok: false, error: 'mercado debe ser alquiler, venta o autos' }
  if (market === 'autos') return { ok: true, market, prefix: 'autos|USD|m:' }
  const parsed = housingDims(query, market)
  if (!parsed.ok) return parsed
  const department = one(query.departamento)
  if (department && !SLUG.test(department)) return { ok: false, error: 'departamento inválido' }
  const base = `${market}|${parsed.currency}|${parsed.type}|${parsed.bedrooms}|`
  return { ok: true, market, prefix: department ? `${base}b:${department}:` : base }
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** La página del sitio que dibuja esa misma serie, con la selección ya puesta. */
export function marketPageUrl(key: string): string {
  const parts = key.split('|')
  const vertical = parts[0] as MarketVertical
  const page = `${OPEN_DATA_SITE}${MARKET_PAGES[vertical] ?? MARKET_PAGES.alquiler}`
  const params = new URLSearchParams()
  if (vertical === 'autos') {
    const model = /m:([a-z0-9-]+)/.exec(key)?.[1]
    const year = /\|y:(\d{4})$/.exec(key)?.[1]
    if (model) params.set('modelo', model)
    if (year) params.set('anio', year)
  } else {
    const [, currency, type, bedrooms, scope] = parts
    if (currency !== (vertical === 'alquiler' ? 'UYU' : 'USD')) params.set('moneda', currency!)
    if (scope && scope !== 'uy') params.set('zona', scope)
    if (type && type !== 'todas') params.set('tipo', type)
    if (bedrooms && bedrooms !== 'any') params.set('dormitorios', bedrooms)
  }
  const query = params.toString()
  return query ? `${page}?${query}` : page
}

export interface OpenMarketPoint {
  fecha: string
  avisos: number
  p25: number | null
  mediana: number | null
  p75: number | null
  medianaPorM2: number | null
  /** Variación de la MISMA oferta (cada aviso contra su propio precio), fracción: 0.012 = +1,2 %. */
  variacion7d: number | null
  variacion30d: number | null
  variacion90d: number | null
}

export interface OpenMarketRow {
  clave: string
  etiqueta: string
  mercado: MarketVertical
  moneda: MarketCurrency
  ambito: string
  departamento: string | null
  barrio: string | null
  tipo: MarketTypeBucket | null
  dormitorios: MarketBedrooms | null
  marca: string | null
  modelo: string | null
  anio: number | null
  ultimo: OpenMarketPoint
  url: string
}

export function openMarketPoint(point: MarketSeriesPoint): OpenMarketPoint {
  return {
    fecha: point.d,
    avisos: point.n,
    p25: point.p25,
    mediana: point.med,
    p75: point.p75,
    medianaPorM2: point.m2?.med ?? null,
    variacion7d: point.w7?.chg ?? null,
    variacion30d: point.w30?.chg ?? null,
    variacion90d: point.w90?.chg ?? null,
  }
}

type MarketRowSource = Pick<MarketSeriesDoc, 'key' | 'dims' | 'labels' | 'label' | 'latest'>

export function openMarketRow(doc: MarketRowSource): OpenMarketRow {
  return {
    clave: doc.key,
    etiqueta: doc.label,
    mercado: doc.dims.vertical,
    moneda: doc.dims.currency,
    ambito: doc.dims.scope,
    departamento: doc.labels.department,
    barrio: doc.labels.neighborhood,
    tipo: doc.dims.propertyType,
    dormitorios: doc.dims.bedrooms,
    marca: doc.labels.brand,
    modelo: doc.labels.model,
    anio: doc.dims.year,
    ultimo: openMarketPoint(doc.latest),
    url: marketPageUrl(doc.key),
  }
}

// ── Avisos (búsqueda) ─────────────────────────────────────────────────────────

export const OPEN_LISTINGS_MAX = 24

/** Sólo los filtros documentados pasan a la ruta interna; el resto se ignora. */
export const RENTAL_FILTERS = Object.freeze({
  q: 'q',
  departamento: 'department',
  barrio: 'neighborhood',
  tipo: 'type',
  dormitorios: 'bedrooms',
  moneda: 'currency',
  precioMin: 'priceMin',
  precioMax: 'priceMax',
  mascotas: 'pets',
  amueblado: 'furnished',
  orden: 'sort',
  pagina: 'page',
} as const)

export const CAR_FILTERS = Object.freeze({
  q: 'q',
  marca: 'brand',
  modelo: 'model',
  anioMin: 'yearMin',
  anioMax: 'yearMax',
  kmMax: 'kmMax',
  precioMinUsd: 'priceMin',
  precioMaxUsd: 'priceMax',
  combustible: 'fuel',
  caja: 'transmission',
  departamento: 'department',
  vendedor: 'seller',
  orden: 'sort',
  pagina: 'page',
} as const)

/**
 * Filtros públicos (en español) → la query de la ruta interna. La página interna siempre trae
 * hasta 24 avisos (el tamaño que ya cachea el sitio); `limit` es cuántos devuelve la API pública.
 */
export function internalListingQuery(
  query: Record<string, unknown>,
  filters: Readonly<Record<string, string>>
): { query: Record<string, string>; page: number; limit: number } {
  const out: Record<string, string> = {}
  for (const [pub, internal] of Object.entries(filters)) {
    const raw = Array.isArray(query[pub]) ? (query[pub] as unknown[])[0] : query[pub]
    if (raw === undefined || raw === null || raw === '') continue
    const value = String(raw).trim().slice(0, 80)
    if (value) out[internal] = value
  }
  const asked = Number(out.page)
  const page = Number.isInteger(asked) && asked >= 1 && asked <= 50 ? asked : 1
  if (page > 1) out.page = String(page)
  else delete out.page
  const wanted = Number(Array.isArray(query.porPagina) ? query.porPagina[0] : query.porPagina)
  const limit =
    Number.isInteger(wanted) && wanted >= 1
      ? Math.min(wanted, OPEN_LISTINGS_MAX)
      : OPEN_LISTINGS_MAX
  return { query: out, page, limit }
}

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null
const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

export interface RawRentalListing {
  key: string
  title?: string
  propertyType?: string
  department?: string
  neighborhood?: string
  bedrooms?: number | null
  bathrooms?: number | null
  area?: number | null
  furnished?: boolean | null
  petsAllowed?: boolean | null
  price?: number
  priceUyu?: number
  currency?: string
  sources?: string[]
  firstSeen?: string
  lastSeen?: string
}

export interface OpenRental {
  id: string
  titulo: string | null
  tipo: string | null
  departamento: string | null
  barrio: string | null
  dormitorios: number | null
  banos: number | null
  superficieM2: number | null
  amueblado: boolean | null
  mascotas: boolean | null
  precio: number | null
  moneda: string | null
  precioPesos: number | null
  portales: string[]
  vistoPorPrimeraVez: string | null
  vistoPorUltimaVez: string | null
  url: string
}

export function openRental(raw: RawRentalListing): OpenRental {
  return {
    id: raw.key,
    titulo: str(raw.title),
    tipo: str(raw.propertyType),
    departamento: str(raw.department),
    barrio: str(raw.neighborhood),
    dormitorios: num(raw.bedrooms),
    banos: num(raw.bathrooms),
    superficieM2: num(raw.area),
    amueblado: typeof raw.furnished === 'boolean' ? raw.furnished : null,
    mascotas: typeof raw.petsAllowed === 'boolean' ? raw.petsAllowed : null,
    precio: num(raw.price),
    moneda: str(raw.currency),
    precioPesos: num(raw.priceUyu),
    portales: Array.isArray(raw.sources) ? raw.sources.filter(s => typeof s === 'string') : [],
    vistoPorPrimeraVez: str(raw.firstSeen),
    vistoPorUltimaVez: str(raw.lastSeen),
    url: `${OPEN_DATA_SITE}/alquileres/${encodeURIComponent(raw.key)}`,
  }
}

export interface RawCarListing {
  key: string
  sourceName?: string
  source?: string
  brand?: string
  model?: string
  marketSlug?: string
  title?: string
  year?: number
  km?: number | null
  priceUsd?: number
  transmission?: string | null
  fuel?: string | null
  body?: { type?: string } | null
  trim?: string | null
  department?: string | null
  sellerType?: string | null
  firstSeen?: string
  lastSeen?: string
  opportunity?: unknown
}

export interface OpenCar {
  id: string
  titulo: string | null
  marca: string | null
  modelo: string | null
  modeloSlug: string | null
  version: string | null
  anio: number | null
  km: number | null
  precioUsd: number | null
  combustible: string | null
  caja: string | null
  carroceria: string | null
  departamento: string | null
  vendedor: 'automotora' | 'particular' | null
  portal: string | null
  oportunidad: boolean
  vistoPorPrimeraVez: string | null
  vistoPorUltimaVez: string | null
  url: string
  precioDelModelo: string | null
}

export function openCar(raw: RawCarListing): OpenCar {
  const slug = str(raw.marketSlug)
  return {
    id: raw.key,
    titulo: str(raw.title),
    marca: str(raw.brand),
    modelo: str(raw.model),
    modeloSlug: slug,
    version: str(raw.trim),
    anio: num(raw.year),
    km: num(raw.km),
    precioUsd: num(raw.priceUsd),
    combustible: str(raw.fuel),
    caja: str(raw.transmission),
    carroceria: str(raw.body?.type),
    departamento: str(raw.department),
    vendedor:
      raw.sellerType === 'dealer'
        ? 'automotora'
        : raw.sellerType === 'private'
          ? 'particular'
          : null,
    portal: str(raw.sourceName) ?? str(raw.source),
    oportunidad: Boolean(raw.opportunity),
    vistoPorPrimeraVez: str(raw.firstSeen),
    vistoPorUltimaVez: str(raw.lastSeen),
    url: `${OPEN_DATA_SITE}/autos-usados-uruguay/${encodeURIComponent(raw.key)}`,
    precioDelModelo:
      slug && SLUG.test(slug) ? `${OPEN_DATA_SITE}/autos-usados-uruguay/precios/${slug}` : null,
  }
}

// ── Catálogo (lo que dibuja la página y lo que sirve /api/datos) ──────────────

export interface OpenDataParam {
  nombre: string
  descripcion: string
  ejemplo?: string
  valores?: readonly string[]
}

export interface OpenDataEndpoint {
  id: string
  ruta: string
  titulo: string
  descripcion: string
  licencia: boolean
  parametros: readonly OpenDataParam[]
  ejemplo: string
}

const MARKET_PARAMS: readonly OpenDataParam[] = [
  { nombre: 'mercado', descripcion: 'Qué mercado', valores: OPEN_DATA_MARKETS },
  {
    nombre: 'moneda',
    descripcion:
      'Moneda de los avisos (nunca se convierte). Por defecto UYU en alquiler, USD en venta',
    valores: ['UYU', 'USD'],
  },
  { nombre: 'tipo', descripcion: 'Tipo de vivienda', valores: MARKET_TYPE_ORDER },
  {
    nombre: 'dormitorios',
    descripcion: 'Dormitorios',
    valores: ['todos', '0', '1', '2', '3', '4plus'],
  },
  { nombre: 'departamento', descripcion: 'Slug del departamento', ejemplo: 'montevideo' },
  { nombre: 'barrio', descripcion: 'Slug del barrio (con departamento)', ejemplo: 'pocitos' },
  { nombre: 'modelo', descripcion: 'Autos: slug marca-modelo', ejemplo: 'toyota-hilux' },
  { nombre: 'anio', descripcion: 'Autos: año del modelo', ejemplo: '2018' },
]

export const OPEN_DATA_ENDPOINTS: readonly OpenDataEndpoint[] = Object.freeze([
  {
    id: 'actual',
    ruta: '/api/datos/mercado/actual',
    titulo: 'Precio de hoy, lugar por lugar',
    descripcion:
      'La mediana, el p25, el p75 y la variación de la misma oferta del último día, para todos los departamentos y barrios (o todos los modelos de auto) con muestra suficiente. Es la tabla para comparar: cuánto se pide por un apartamento de 2 dormitorios en cada barrio.',
    licencia: true,
    parametros: MARKET_PARAMS.filter(p => !['barrio', 'modelo', 'anio'].includes(p.nombre)),
    ejemplo:
      '/api/datos/mercado/actual?mercado=alquiler&tipo=apartamento&dormitorios=2&departamento=montevideo',
  },
  {
    id: 'serie',
    ruta: '/api/datos/mercado/serie',
    titulo: 'La serie diaria de una cohorte',
    descripcion:
      'Un punto por día desde el arranque de la medición: nivel (p25, mediana, p75, mediana por m²) y variación de la misma oferta a 7, 30 y 90 días. Se pide con parámetros legibles o con la clave que devuelven las otras rutas.',
    licencia: true,
    parametros: [
      ...MARKET_PARAMS,
      {
        nombre: 'clave',
        descripcion: 'Alternativa: la clave tal cual la devuelve /actual',
        ejemplo: 'alquiler|UYU|apartamento|2|d:montevideo',
      },
    ],
    ejemplo:
      '/api/datos/mercado/serie?mercado=alquiler&tipo=apartamento&dormitorios=2&departamento=montevideo&barrio=pocitos',
  },
  {
    id: 'mercado',
    ruta: '/api/datos/mercado',
    titulo: 'Qué hay medido',
    descripcion:
      'Los lugares (o modelos de auto) que tienen serie hoy, con cuántos avisos hay detrás, desde qué día se mide y los mayores movimientos de la misma oferta.',
    licencia: true,
    parametros: MARKET_PARAMS.slice(0, 1),
    ejemplo: '/api/datos/mercado?mercado=autos',
  },
  {
    id: 'alquileres',
    ruta: '/api/datos/alquileres',
    titulo: 'Buscar alquileres',
    descripcion:
      'Avisos vigentes del directorio de alquileres (Mercado Libre, InfoCasas, Casasweb, El País, Facebook y más, unificados), con el enlace a su ficha. Hasta 24 por página.',
    licencia: false,
    parametros: [
      { nombre: 'departamento', descripcion: 'Departamento', ejemplo: 'Montevideo' },
      { nombre: 'barrio', descripcion: 'Barrio', ejemplo: 'Cordón' },
      { nombre: 'tipo', descripcion: 'apartamento, casa, …', ejemplo: 'apartamento' },
      { nombre: 'dormitorios', descripcion: 'Mínimo de dormitorios', ejemplo: '2' },
      { nombre: 'moneda', descripcion: 'UYU o USD' },
      { nombre: 'precioMin', descripcion: 'Precio mínimo' },
      { nombre: 'precioMax', descripcion: 'Precio máximo', ejemplo: '30000' },
      { nombre: 'mascotas', descripcion: '1 = acepta mascotas' },
      { nombre: 'amueblado', descripcion: '1 = amueblado' },
      { nombre: 'q', descripcion: 'Texto libre' },
      { nombre: 'orden', descripcion: 'recientes, precio, precio-desc, metros, baja' },
      { nombre: 'pagina', descripcion: 'Página (1–50)' },
      { nombre: 'porPagina', descripcion: 'Avisos por página (máx. 24)' },
    ],
    ejemplo:
      '/api/datos/alquileres?departamento=Montevideo&barrio=Cordón&dormitorios=2&precioMax=30000',
  },
  {
    id: 'autos',
    ruta: '/api/datos/autos',
    titulo: 'Buscar autos usados',
    descripcion:
      'Avisos vigentes del directorio de autos usados (diez fuentes, un auto una sola vez), en dólares, con el enlace a su ficha y a la página de precios del modelo. Hasta 24 por página.',
    licencia: false,
    parametros: [
      { nombre: 'marca', descripcion: 'Slug de la marca', ejemplo: 'toyota' },
      { nombre: 'modelo', descripcion: 'Slug marca-modelo', ejemplo: 'toyota-corolla' },
      { nombre: 'anioMin', descripcion: 'Año mínimo' },
      { nombre: 'anioMax', descripcion: 'Año máximo' },
      { nombre: 'kmMax', descripcion: 'Kilómetros máximos' },
      { nombre: 'precioMinUsd', descripcion: 'Precio mínimo en US$' },
      { nombre: 'precioMaxUsd', descripcion: 'Precio máximo en US$', ejemplo: '15000' },
      { nombre: 'combustible', descripcion: 'nafta, diesel, hibrido, electrico' },
      { nombre: 'caja', descripcion: 'manual o automatica' },
      { nombre: 'departamento', descripcion: 'Departamento' },
      { nombre: 'vendedor', descripcion: 'dealer o private' },
      { nombre: 'q', descripcion: 'Texto libre' },
      { nombre: 'orden', descripcion: 'price_asc, price_desc, km_asc, year_desc' },
      { nombre: 'pagina', descripcion: 'Página (1–50)' },
      { nombre: 'porPagina', descripcion: 'Avisos por página (máx. 24)' },
    ],
    ejemplo: '/api/datos/autos?marca=toyota&anioMin=2015&precioMaxUsd=15000&orden=price_asc',
  },
])

/** OpenAPI 3.1 de la API de datos abiertos, armado del mismo catálogo que dibuja la página. */
export function openDataOpenApi(): Record<string, unknown> {
  const paths: Record<string, unknown> = {}
  for (const endpoint of OPEN_DATA_ENDPOINTS) {
    paths[endpoint.ruta] = {
      get: {
        operationId: endpoint.id,
        summary: endpoint.titulo,
        description: endpoint.licencia
          ? `${endpoint.descripcion}\n\nLicencia CC BY 4.0: citá «${OPEN_DATA_ATTRIBUTION.texto}» con un enlace.`
          : `${endpoint.descripcion}\n\n${LISTINGS_NOTE}`,
        parameters: endpoint.parametros.map(param => ({
          name: param.nombre,
          in: 'query',
          required: param.nombre === 'mercado' && endpoint.id !== 'serie',
          description: param.descripcion,
          schema: param.valores
            ? { type: 'string', enum: [...param.valores] }
            : { type: 'string', ...(param.ejemplo ? { example: param.ejemplo } : {}) },
        })),
        responses: {
          '200': {
            description: 'Sobre con la fuente, la licencia y los datos en `datos`.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } },
          },
          '400': { description: 'Parámetro inválido; el motivo viene en `statusMessage`.' },
        },
      },
    }
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'Cambio Uruguay — datos abiertos',
      version: OPEN_DATA_VERSION,
      description:
        'Estadísticas diarias de precios pedidos de alquileres, viviendas en venta y autos usados en Uruguay, y búsqueda de avisos. Sin clave, sin registro, CORS abierto. Las estadísticas van con licencia CC BY 4.0; los avisos no se licencian.',
      license: { name: OPEN_DATA_LICENSE.nombre, url: OPEN_DATA_LICENSE.url },
      contact: { name: 'Cambio Uruguay', url: `${OPEN_DATA_SITE}/contacto` },
    },
    externalDocs: { url: OPEN_DATA_PAGE },
    servers: [{ url: OPEN_DATA_SITE }],
    paths,
    components: {
      schemas: {
        Envelope: {
          type: 'object',
          required: ['version', 'fuente', 'datos'],
          properties: {
            version: { type: 'string' },
            fuente: {
              type: 'object',
              properties: {
                nombre: { type: 'string' },
                url: { type: 'string' },
                pagina: { type: 'string' },
                atribucion: { type: 'string' },
                licencia: { type: ['object', 'null'] },
                nota: { type: 'string' },
              },
            },
            actualizado: { type: ['string', 'null'] },
            datos: {},
          },
        },
      },
    },
  }
}
