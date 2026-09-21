// Shapes, query handling and the reader's list for /equipar-casa-uruguay/productos.
//
// `app/utils` is a FLAT auto-import namespace: every export here is prefixed `equipar*` /
// `EQUIPAR_*`, like `equipar.ts`, so nothing collides with another page's helper.
import type { EquiparRoom, EquiparTier } from './equipar'
import { equiparMoney } from './equipar'
import { isEquiparCategorySlug } from './equiparCategoryPages'

export const EQUIPAR_PRODUCTOS_PATH = '/equipar-casa-uruguay/productos'
export const EQUIPAR_LISTA_PATH = '/equipar-casa-uruguay/mi-lista'
export const EQUIPAR_PRODUCTOS_PER_PAGE = 24
/** Lines the reader's list can hold. Sixty is more than a house needs and less than a browser minds. */
export const EQUIPAR_LISTA_MAX = 60

export const equiparProductoPath = (categoria: string): string =>
  `${EQUIPAR_PRODUCTOS_PATH}/${categoria}`

export const EQUIPAR_PRODUCTOS_SORTS = ['precio_asc', 'precio_desc', 'reciente'] as const
export type EquiparProductosSort = (typeof EQUIPAR_PRODUCTOS_SORTS)[number]
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
}

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

export function equiparProductosNormalize(raw: Record<string, unknown>): EquiparProductosQuery {
  const categoria = slugOf(raw.categoria, SLUG)
  const validCategoria = categoria && isEquiparCategorySlug(categoria) ? categoria : ''
  const condicion = text(raw.condicion)
  const fuente = text(raw.fuente)
  const orden = text(raw.orden)
  const page = Number.parseInt(text(raw.page), 10)
  const precioMin = money(raw.precioMin)
  const precioMax = money(raw.precioMax)
  return {
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
    orden: (EQUIPAR_PRODUCTOS_SORTS as readonly string[]).includes(orden)
      ? (orden as EquiparProductosSort)
      : 'precio_asc',
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, 500) : 1,
  }
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
  return params
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
  return EQUIPAR_FILTER_KEYS.some(key => {
    if (ignore.includes(key)) return false
    const value = query[key]
    return value !== '' && value !== null
  })
}

export function equiparProductosWithout(
  query: EquiparProductosQuery,
  keys: ReadonlyArray<keyof EquiparProductosQuery>
): EquiparProductosQuery {
  const next: EquiparProductosQuery = { ...query, page: 1 }
  for (const key of keys) {
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
  keys: Array<keyof EquiparProductosQuery>
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
  if (query.q) chips.push({ key: 'q', label: `“${query.q}”`, keys: ['q'] })
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
