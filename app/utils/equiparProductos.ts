import type { PriceHistorySeries } from './priceHistory'
// Shapes, query handling and the reader's list for /equipar-casa-uruguay/productos.
//
// `app/utils` is a FLAT auto-import namespace: every export here is prefixed `equipar*` /
// `EQUIPAR_*`, like `equipar.ts`, so nothing collides with another page's helper.
import type { EquiparRoom, EquiparTier } from './equipar'
import { equiparMoney } from './equipar'
import { isEquiparCategorySlug } from './equiparCategoryPages'
import { isMovilidadCategorySlug } from './movilidad'
import {
  BICICLETA_RODADO_RANGOS,
  MONOPATIN_FICHA_EMPTY,
  MONOPATIN_POTENCIA_RANGOS,
  MONOPATIN_RASGO_CAMPOS,
  MONOPATIN_RUEDA_RANGOS,
  MONOPATIN_VELOCIDAD_RANGOS,
  monopatinAutonomiaLabel,
  monopatinCargaLabel,
  monopatinFichaActive,
  monopatinFichaNormalize,
  monopatinFichaParams,
  monopatinPesoLabel,
  monopatinPotenciaMinLabel,
  type MonopatinRasgo,
  type MonopatinSpecsPublic,
  type MovilidadFichaKey,
  type MovilidadFichaQuery,
} from './monopatinFicha'

export const EQUIPAR_PRODUCTOS_PATH = '/equipar-casa-uruguay/productos'
export const EQUIPAR_LISTA_PATH = '/equipar-casa-uruguay/mi-lista'
export const EQUIPAR_PRODUCTOS_PER_PAGE = 24
/** Lines the reader's list can hold. Sixty is more than a house needs and less than a browser minds. */
export const EQUIPAR_LISTA_MAX = 60

export const equiparProductoPath = (categoria: string): string =>
  `${EQUIPAR_PRODUCTOS_PATH}/${categoria}`

export const EQUIPAR_PRODUCTOS_SORTS = ['precio_asc', 'precio_desc', 'reciente'] as const
/** Sólo el directorio de monopatines: equipar los normaliza a `precio_asc`. */
export const MOVILIDAD_PRODUCTOS_SORTS = ['autonomia_desc', 'precio_km', 'peso_asc'] as const
export type EquiparProductosSort =
  (typeof EQUIPAR_PRODUCTOS_SORTS)[number] | (typeof MOVILIDAD_PRODUCTOS_SORTS)[number]
/** `short` is what the mobile toolbar button says; `title`, what the menu says. */
export const EQUIPAR_PRODUCTOS_SORT_ITEMS: ReadonlyArray<{
  title: string
  value: EquiparProductosSort
  short: string
}> = [
  { title: 'Menor precio', value: 'precio_asc', short: 'Menor precio' },
  { title: 'Mayor precio', value: 'precio_desc', short: 'Mayor precio' },
  { title: 'Vistos más recientemente', value: 'reciente', short: 'Más recientes' },
]
/** Los órdenes del directorio de monopatines: los de siempre más los de la ficha técnica. */
export const MOVILIDAD_PRODUCTOS_SORT_ITEMS: ReadonlyArray<{
  title: string
  value: EquiparProductosSort
  short: string
}> = [
  ...EQUIPAR_PRODUCTOS_SORT_ITEMS,
  { title: 'Mayor autonomía declarada', value: 'autonomia_desc', short: 'Más autonomía' },
  {
    title: 'Menor precio por km (sólo con autonomía declarada)',
    value: 'precio_km',
    short: '$ por km',
  },
  { title: 'Más liviano (sólo con peso declarado)', value: 'peso_asc', short: 'Más liviano' },
]

export type EquiparProductoCondicion = 'nuevo' | 'usado'
export type EquiparProductoFuente = 'mercadolibre' | 'facebook' | 'tienda'
export type EquiparProductoSource = 'store' | 'mercadolibre' | 'facebook'

export const EQUIPAR_CONDICION_LABELS: Readonly<Record<EquiparProductoCondicion, string>> = {
  nuevo: 'Nuevo',
  usado: 'Usado',
}
export const EQUIPAR_FUENTE_LABELS: Readonly<Record<EquiparProductoFuente, string>> = {
  mercadolibre: 'Mercado Libre',
  facebook: 'Facebook Marketplace',
  tienda: 'Tiendas',
}
/** The stored `source` of each query-side `fuente`. */
export const EQUIPAR_FUENTE_SOURCE: Readonly<Record<EquiparProductoFuente, EquiparProductoSource>> =
  {
    mercadolibre: 'mercadolibre',
    facebook: 'facebook',
    tienda: 'store',
  }
export const EQUIPAR_SOURCE_LABELS: Readonly<Record<EquiparProductoSource, string>> = {
  mercadolibre: 'Mercado Libre',
  facebook: 'Facebook Marketplace',
  store: 'Tienda',
}

// ---------------------------------------------------------------------------------------------
// Documents

/** The stored row, as `sync_equipar.ts` writes it (mirror of classes/equipar/listings.ts + firstSeen). */
export interface EquiparListingDoc {
  listingId: string
  category: string
  categoryLabel: string
  variant: string
  variantLabel: string
  tier: EquiparTier
  room: EquiparRoom
  rank: number
  variantRank: number
  regime: 'modelo' | 'commodity'
  condition: 'new' | 'used'
  source: EquiparProductoSource
  sellerKey: string
  sellerName: string
  channel: string
  officialStore: boolean
  brand: string
  brandKey: string
  title: string
  url: string
  image: string | null
  price: number
  currency: 'UYU' | 'USD'
  priceUyu: number
  listPrice: number | null
  location: string | null
  freeShipping: boolean | null
  suspect: boolean
  observedAt: string
  firstSeen: string
  lastSeen: string
}

/** What the API publishes per listing: the card's fields, nothing internal. */
export interface EquiparProductoPublic {
  listingId: string
  /** Cómo cambió el precio de ESTE aviso desde que lo medimos (`pricewatchoffers`, un punto por día).
   * Ausente mientras no tengamos dos lecturas suyas. */
  priceHistory?: PriceHistorySeries
  category: string
  categoryLabel: string
  variant: string
  variantLabel: string
  tier: EquiparTier
  rank: number
  condition: 'new' | 'used'
  source: EquiparProductoSource
  sellerKey: string
  sellerName: string
  brand: string
  title: string
  url: string
  image: string | null
  price: number
  currency: 'UYU' | 'USD'
  priceUyu: number
  listPrice: number | null
  location: string | null
  freeShipping: boolean | null
  lastSeen: string
  /** Sólo monopatín: la ficha técnica declarada (classes/movilidad/specs/). */
  specs?: MonopatinSpecsPublic
  /** Sólo monopatín: precio dividido por la autonomía declarada en la ficha. */
  uyuPerKm?: number
  /** Sólo monopatín: /monopatines-electricos-uruguay/<modelSlug>, cuando el aviso es de un modelo. */
  modelSlug?: string
}

export interface EquiparProductosFacet {
  slug: string
  name: string
  count: number
}

export interface EquiparProductosFacets {
  categorias: EquiparProductosFacet[]
  /** Only when the query has a category. */
  variantes: EquiparProductosFacet[]
  marcas: EquiparProductosFacet[]
  vendedores: EquiparProductosFacet[]
  fuentes: EquiparProductosFacet[]
  condiciones: EquiparProductosFacet[]
  /** Sólo el directorio de monopatines: cada opción contada sin su propio filtro. */
  ficha?: MonopatinFichaFacets
}

export interface MonopatinFichaFacets {
  autonomia: EquiparProductosFacet[]
  velocidad: EquiparProductosFacet[]
  potencia: EquiparProductosFacet[]
  carga: EquiparProductosFacet[]
  peso: EquiparProductosFacet[]
  rueda: EquiparProductosFacet[]
  /** Sólo bicicleta (vacío en monopatín, que filtra por `rueda`). */
  rodado?: EquiparProductosFacet[]
  rasgos: EquiparProductosFacet[]
  /** De los avisos de la consulta, cuántos tienen ficha propia leída. */
  conFicha: number
}

export const EQUIPAR_PRODUCTOS_EMPTY_FACETS: EquiparProductosFacets = {
  categorias: [],
  variantes: [],
  marcas: [],
  vendedores: [],
  fuentes: [],
  condiciones: [],
}

export interface EquiparProductosResponse {
  generatedAt: string | null
  usdUyu: number | null
  total: number
  page: number
  perPage: number
  items: EquiparProductoPublic[]
  facets: EquiparProductosFacets
  /** Rows kept out of the directory because the band doubted their price. */
  suspect: number
}

// ---------------------------------------------------------------------------------------------
// Query

export interface EquiparProductosQuery {
  categoria: string
  variante: string
  condicion: '' | EquiparProductoCondicion
  fuente: '' | EquiparProductoFuente
  vendedor: string
  marca: string
  precioMin: number | null
  precioMax: number | null
  q: string
  orden: EquiparProductosSort
  page: number
  /** Sólo con la vertical de movilidad: los filtros por ficha técnica. Ausente en equipar. */
  ficha?: MovilidadFichaQuery
}

/** Una clave que un chip puede sacar: un campo de la consulta o uno de la ficha. */
export type EquiparQueryKey =
  keyof EquiparProductosQuery | `ficha.${MovilidadFichaKey}` | `ficha.rasgos.${MonopatinRasgo}`

const EQUIPAR_Q_MAX = 80
const SLUG = /^[a-z0-9-]{1,60}$/
const KEY = /^[a-z0-9:_.-]{1,80}$/

const text = (value: unknown): string => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim() : ''
}

const slugOf = (value: unknown, pattern: RegExp): string => {
  const raw = text(value).toLowerCase()
  return pattern.test(raw) ? raw : ''
}

const money = (value: unknown): number | null => {
  const raw = text(value).replace(/[.\s]/g, '')
  if (!/^\d{1,9}$/.test(raw)) return null
  const number = Number(raw)
  return number > 0 ? number : null
}

/**
 * Las dos verticales que comparten este directorio: `/equipar-casa-uruguay/productos` y el que
 * llevan adentro `/monopatines-electricos-uruguay` y `/bicicletas-electricas-uruguay`.
 *
 * Existe por un bug medido en producción el 22/9/2026: el normalizador validaba la categoría
 * SIEMPRE contra el vocabulario de equipar, así que `?categoria=monopatin-electrico` se caía en
 * silencio y el directorio de monopatines servía también las bicicletas. La categoría sigue
 * validándose — una inventada no llega a la consulta — pero contra el vocabulario de QUIEN pregunta.
 */
export type RetailProductosVertical = 'equipar' | 'movilidad'

export const retailProductosCategoriaValida = (
  slug: string,
  vertical: RetailProductosVertical
): boolean =>
  vertical === 'movilidad' ? isMovilidadCategorySlug(slug) : isEquiparCategorySlug(slug)

export function equiparProductosNormalize(
  raw: Record<string, unknown>,
  vertical: RetailProductosVertical = 'equipar'
): EquiparProductosQuery {
  const categoria = slugOf(raw.categoria, SLUG)
  const validCategoria =
    categoria && retailProductosCategoriaValida(categoria, vertical) ? categoria : ''
  const condicion = text(raw.condicion)
  const fuente = text(raw.fuente)
  const orden = text(raw.orden)
  const page = Number.parseInt(text(raw.page), 10)
  const precioMin = money(raw.precioMin)
  const precioMax = money(raw.precioMax)
  const sorts: readonly string[] =
    vertical === 'movilidad'
      ? [...EQUIPAR_PRODUCTOS_SORTS, ...MOVILIDAD_PRODUCTOS_SORTS]
      : EQUIPAR_PRODUCTOS_SORTS
  const query: EquiparProductosQuery = {
    categoria: validCategoria,
    variante: validCategoria ? slugOf(raw.variante, KEY) : '',
    condicion: condicion === 'nuevo' || condicion === 'usado' ? condicion : '',
    fuente: fuente === 'mercadolibre' || fuente === 'facebook' || fuente === 'tienda' ? fuente : '',
    vendedor: slugOf(raw.vendedor, KEY),
    marca: slugOf(raw.marca, KEY),
    precioMin,
    // A range whose ends crossed is a typo, not a query: keep the lower bound only.
    precioMax: precioMin !== null && precioMax !== null && precioMax < precioMin ? null : precioMax,
    q: text(raw.q).slice(0, EQUIPAR_Q_MAX),
    orden: sorts.includes(orden) ? (orden as EquiparProductosSort) : 'precio_asc',
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, 500) : 1,
  }
  if (vertical === 'movilidad') query.ficha = monopatinFichaNormalize(raw)
  return query
}

/** Only what differs from the defaults, so a clean URL stays clean. */
export function equiparProductosParams(query: EquiparProductosQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.categoria) params.categoria = query.categoria
  if (query.variante) params.variante = query.variante
  if (query.condicion) params.condicion = query.condicion
  if (query.fuente) params.fuente = query.fuente
  if (query.vendedor) params.vendedor = query.vendedor
  if (query.marca) params.marca = query.marca
  if (query.precioMin !== null) params.precioMin = String(query.precioMin)
  if (query.precioMax !== null) params.precioMax = String(query.precioMax)
  if (query.q) params.q = query.q
  if (query.orden !== 'precio_asc') params.orden = query.orden
  if (query.page > 1) params.page = String(query.page)
  return { ...params, ...monopatinFichaParams(query.ficha) }
}

const EQUIPAR_FILTER_KEYS: ReadonlyArray<keyof EquiparProductosQuery> = [
  'categoria',
  'variante',
  'condicion',
  'fuente',
  'vendedor',
  'marca',
  'precioMin',
  'precioMax',
  'q',
]

/** Any filter set — order and page are navigation, not a filter. `ignore` is a route-fixed field. */
export function equiparProductosFiltered(
  query: EquiparProductosQuery,
  ignore: ReadonlyArray<keyof EquiparProductosQuery> = []
): boolean {
  if (!ignore.includes('ficha') && monopatinFichaActive(query.ficha)) return true
  return EQUIPAR_FILTER_KEYS.some(key => {
    if (ignore.includes(key)) return false
    const value = query[key]
    return value !== '' && value !== null
  })
}

function fichaWithout(
  ficha: MovilidadFichaQuery,
  keys: ReadonlyArray<EquiparQueryKey>
): MovilidadFichaQuery {
  if (keys.includes('ficha')) return { ...MONOPATIN_FICHA_EMPTY, rasgos: [] }
  const next: MovilidadFichaQuery = { ...ficha, rasgos: [...ficha.rasgos] }
  for (const key of keys) {
    if (!key.startsWith('ficha.')) continue
    const field = key.slice('ficha.'.length)
    if (field.startsWith('rasgos.')) {
      next.rasgos = next.rasgos.filter(rasgo => rasgo !== field.slice('rasgos.'.length))
    } else if (field in MONOPATIN_FICHA_EMPTY) {
      const empty = MONOPATIN_FICHA_EMPTY[field as MovilidadFichaKey]
      ;(next as unknown as Record<string, unknown>)[field] = Array.isArray(empty) ? [] : empty
    }
  }
  return next
}

export function equiparProductosWithout(
  query: EquiparProductosQuery,
  keys: ReadonlyArray<EquiparQueryKey>
): EquiparProductosQuery {
  const next: EquiparProductosQuery = { ...query, page: 1 }
  if (query.ficha) next.ficha = fichaWithout(query.ficha, keys)
  for (const raw of keys) {
    if (raw === 'ficha' || raw.startsWith('ficha.')) continue
    const key = raw as Exclude<keyof EquiparProductosQuery, 'ficha'>
    if (key === 'precioMin' || key === 'precioMax') next[key] = null
    else if (key === 'orden') next.orden = 'precio_asc'
    else if (key === 'page') next.page = 1
    else next[key] = ''
    // A variant only means something inside its category.
    if (key === 'categoria') next.variante = ''
  }
  return next
}

export interface EquiparFilterChip {
  key: string
  label: string
  keys: Array<EquiparQueryKey>
}

const facetName = (
  rows: EquiparProductosFacet[] | undefined,
  slug: string,
  fallback: string
): string => rows?.find(row => row.slug === slug)?.name ?? fallback

/** One chip per filter set, so each can be removed without opening the panel. */
export function equiparProductosChips(
  query: EquiparProductosQuery,
  facets?: EquiparProductosFacets,
  fixedCategoria?: string
): EquiparFilterChip[] {
  const chips: EquiparFilterChip[] = []
  if (query.categoria && query.categoria !== fixedCategoria) {
    chips.push({
      key: 'categoria',
      label: facetName(facets?.categorias, query.categoria, query.categoria),
      keys: ['categoria'],
    })
  }
  if (query.variante) {
    chips.push({
      key: 'variante',
      label: facetName(facets?.variantes, query.variante, query.variante),
      keys: ['variante'],
    })
  }
  if (query.condicion) {
    chips.push({
      key: 'condicion',
      label: EQUIPAR_CONDICION_LABELS[query.condicion],
      keys: ['condicion'],
    })
  }
  if (query.fuente) {
    chips.push({ key: 'fuente', label: EQUIPAR_FUENTE_LABELS[query.fuente], keys: ['fuente'] })
  }
  if (query.marca) {
    chips.push({
      key: 'marca',
      label: facetName(facets?.marcas, query.marca, query.marca),
      keys: ['marca'],
    })
  }
  if (query.vendedor) {
    chips.push({
      key: 'vendedor',
      label: facetName(facets?.vendedores, query.vendedor, query.vendedor),
      keys: ['vendedor'],
    })
  }
  if (query.precioMin !== null) {
    chips.push({
      key: 'precioMin',
      label: `Desde ${equiparMoneyNbsp(query.precioMin)}`,
      keys: ['precioMin'],
    })
  }
  if (query.precioMax !== null) {
    chips.push({
      key: 'precioMax',
      label: `Hasta ${equiparMoneyNbsp(query.precioMax)}`,
      keys: ['precioMax'],
    })
  }
  if (query.ficha) chips.push(...fichaChips(query.ficha))
  if (query.q) chips.push({ key: 'q', label: `“${query.q}”`, keys: ['q'] })
  return chips
}

function fichaChips(ficha: MovilidadFichaQuery): EquiparFilterChip[] {
  const chips: EquiparFilterChip[] = []
  const add = (key: EquiparQueryKey, label: string) => chips.push({ key, label, keys: [key] })
  if (ficha.autonomia !== null) add('ficha.autonomia', monopatinAutonomiaLabel(ficha.autonomia))
  if (ficha.velocidad) add('ficha.velocidad', MONOPATIN_VELOCIDAD_RANGOS[ficha.velocidad].label)
  if (ficha.potencia) add('ficha.potencia', MONOPATIN_POTENCIA_RANGOS[ficha.potencia].label)
  if (ficha.potenciaMin !== null)
    add('ficha.potenciaMin', monopatinPotenciaMinLabel(ficha.potenciaMin))
  if (ficha.carga !== null) add('ficha.carga', monopatinCargaLabel(ficha.carga))
  if (ficha.peso !== null) add('ficha.peso', monopatinPesoLabel(ficha.peso))
  if (ficha.rueda)
    add('ficha.rueda', `Ruedas: ${MONOPATIN_RUEDA_RANGOS[ficha.rueda].label.toLowerCase()}`)
  if (ficha.rodado)
    add('ficha.rodado', `Rodado: ${BICICLETA_RODADO_RANGOS[ficha.rodado].label.toLowerCase()}`)
  for (const rasgo of ficha.rasgos)
    add(`ficha.rasgos.${rasgo}`, MONOPATIN_RASGO_CAMPOS[rasgo].label)
  if (ficha.soloFicha) add('ficha.soloFicha', 'Sólo con ficha técnica')
  return chips
}

// ---------------------------------------------------------------------------------------------
// Money

/** `$ 30.000` with a hard space, so "$" and the figure never split across lines on a phone. */
export const equiparMoneyNbsp = (value: number): string => `$\u00A0${equiparMoney(value).slice(1)}`

/** The seller's own price, in the seller's own currency. */
export function equiparProductoPrecio(
  producto: Pick<EquiparProductoPublic, 'price' | 'currency'>
): string {
  return producto.currency === 'USD'
    ? `US$\u00A0${Math.round(producto.price).toLocaleString('es-UY')}`
    : equiparMoneyNbsp(producto.price)
}

// ---------------------------------------------------------------------------------------------
// The reader's list

/**
 * A line is a SNAPSHOT of the listing at the moment it was added, not just its id: the list has to
 * keep reading after the listing is gone from the directory, and "ya no está publicado" is only
 * sayable next to what it used to say.
 */
export interface EquiparListaLine {
  listingId: string
  category: string
  categoryLabel: string
  variantLabel: string
  tier: EquiparTier
  rank: number
  title: string
  priceUyu: number
  price: number
  currency: 'UYU' | 'USD'
  condition: 'new' | 'used'
  sellerName: string
  source: EquiparProductoSource
  url: string
  image: string | null
  /** `YYYY-MM-DD`, the reader's day. */
  addedAt: string
}

export function equiparListaFromProducto(producto: EquiparProductoPublic): EquiparListaLine {
  return {
    listingId: producto.listingId,
    category: producto.category,
    categoryLabel: producto.categoryLabel,
    variantLabel: producto.variantLabel,
    tier: producto.tier,
    rank: producto.rank,
    title: producto.title,
    priceUyu: producto.priceUyu,
    price: producto.price,
    currency: producto.currency,
    condition: producto.condition,
    sellerName: producto.sellerName,
    source: producto.source,
    url: producto.url,
    image: producto.image,
    addedAt: new Date().toISOString().slice(0, 10),
  }
}

/** What a stored line must look like to be trusted back out of localStorage. */
export function equiparListaValida(value: unknown): value is EquiparListaLine {
  if (!value || typeof value !== 'object') return false
  const line = value as Record<string, unknown>
  return (
    typeof line.listingId === 'string' &&
    line.listingId.length > 0 &&
    typeof line.category === 'string' &&
    typeof line.categoryLabel === 'string' &&
    typeof line.title === 'string' &&
    typeof line.priceUyu === 'number' &&
    Number.isFinite(line.priceUyu) &&
    typeof line.url === 'string' &&
    (line.tier === 'S' || line.tier === 'A' || line.tier === 'B' || line.tier === 'C') &&
    typeof line.rank === 'number'
  )
}

const TIER_ORDER: Record<EquiparTier, number> = { S: 0, A: 1, B: 2, C: 3 }

/** Necessity order — tier, then the registry rank — the same order the equipar page prints. */
export function equiparListaOrdenar(lines: readonly EquiparListaLine[]): EquiparListaLine[] {
  return [...lines].sort(
    (a, b) =>
      TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
      a.rank - b.rank ||
      a.category.localeCompare(b.category) ||
      a.priceUyu - b.priceUyu
  )
}

export const equiparListaTotal = (lines: readonly EquiparListaLine[]): number =>
  lines.reduce((sum, line) => sum + line.priceUyu, 0)

/** Tier-S categories with no line yet: what the house still cannot function without. */
export function equiparListaFaltantes(
  lines: readonly EquiparListaLine[],
  categorias: ReadonlyArray<{ key: string; label: string; tier: EquiparTier }>
): Array<{ key: string; label: string }> {
  const have = new Set(lines.map(line => line.category))
  return categorias
    .filter(categoria => categoria.tier === 'S' && !have.has(categoria.key))
    .map(categoria => ({ key: categoria.key, label: categoria.label }))
}

/** The list as plain text, to paste anywhere. */
export function equiparListaTexto(
  lines: readonly EquiparListaLine[],
  usdUyu: number | null
): string {
  const ordered = equiparListaOrdenar(lines)
  const total = equiparListaTotal(ordered)
  const rows = ordered.map(
    line =>
      `${line.categoryLabel} — ${line.title} — ${equiparMoneyNbsp(line.priceUyu)}${
        line.condition === 'used' ? ' (usado)' : ''
      } — ${line.url}`
  )
  const usd =
    usdUyu && usdUyu > 0
      ? ` (≈ US$\u00A0${Math.round(total / usdUyu).toLocaleString('es-UY')})`
      : ''
  return [
    `Mi lista para equipar la casa — cambio-uruguay.com${EQUIPAR_PRODUCTOS_PATH}`,
    '',
    ...rows,
    '',
    `Total: ${equiparMoneyNbsp(total)}${usd}`,
  ].join('\n')
}
