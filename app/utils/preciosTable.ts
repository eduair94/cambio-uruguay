// Filtros y orden de las tablas de precios de supermercado.
//
// Módulo puro, aparte de `preciosCatalog.ts` porque es lógica de TABLA (qué
// filas, en qué orden, qué dice la URL) y no del catálogo. Todo lleva prefijo
// `precios`: `app/utils/` es un namespace plano de auto-imports.

import { haversineKm } from './nearbyRates'
import {
  PRECIOS_MIN_OBSERVATIONS,
  preciosPerUnit,
  type PreciosArticleRow,
  type PreciosStoreRow,
} from './preciosCatalog'

export type PreciosSortDir = 'asc' | 'desc'

/** Sin tildes, en minúsculas y con los espacios colapsados: "Azúcar" = "azucar". */
export function preciosNormalize(text: unknown): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cada palabra de la búsqueda tiene que aparecer, en cualquier orden. */
export function preciosMatchesQuery(haystack: string, query: string): boolean {
  const tokens = preciosNormalize(query).split(' ').filter(Boolean)
  if (!tokens.length) return true
  const hay = preciosNormalize(haystack)
  return tokens.every(token => hay.includes(token))
}

// ---------------------------------------------------------------------------
// Rubros
// ---------------------------------------------------------------------------

export type PreciosCategoryId =
  | 'almacen'
  | 'bebidas'
  | 'lacteos'
  | 'carnes'
  | 'frutas'
  | 'limpieza'
  | 'higiene'
  | 'otros'

export const PRECIOS_CATEGORIES: Array<{ id: Exclude<PreciosCategoryId, 'otros'>; label: string }> =
  [
    { id: 'almacen', label: 'Almacén' },
    { id: 'lacteos', label: 'Lácteos y huevos' },
    { id: 'carnes', label: 'Carnes y fiambres' },
    { id: 'frutas', label: 'Frutas y verduras' },
    { id: 'bebidas', label: 'Bebidas' },
    { id: 'limpieza', label: 'Limpieza' },
    { id: 'higiene', label: 'Higiene y cuidado personal' },
  ]

/**
 * El SIPC no publica rubro: trae un "grupo" por producto ("Aceite de girasol",
 * "Shampoo Dove") y hay 196. Se deriva por reglas ORDENADAS sobre el texto sin
 * tildes, y el orden importa: "jabón de tocador" es higiene antes de que "jabón"
 * sea limpieza, "agua jane" es hipoclorito antes de ser agua, y "pulpa de
 * tomate" es almacén antes de que "tomate" sea verdura. El test corre las reglas
 * contra el catálogo real y exige que ningún artículo caiga en "otros".
 */
const CATEGORY_RULES: Array<[Exclude<PreciosCategoryId, 'otros'>, RegExp]> = [
  [
    'higiene',
    /\b(shampoo|acondicionador|jabon de tocador|jabon de glicerina|desodorante|pasta dental|cepillo dental|afeitadora|panales|toallitas femeninas|toallas femeninas|crema facial|protector solar|repelente|talco|perfume|colonia|tinta|algodon|curitas|gasa|cinta leuco|alcohol)\b/,
  ],
  [
    'limpieza',
    /\b(detergente|hipoclorito|lavandina|jabon en polvo|jabon para ropa|suavizante|limpiador|papel higienico|esponja|insecticida)\b/,
  ],
  ['bebidas', /\b(agua de mesa|agua mineral|gaseosa|cerveza|vino|jugo|refresco)\b/],
  [
    'almacen',
    /\b(aceite|arroz|azucar|harina|fideos|yerba|cafe|cocoa|te negro|te verde|galletitas|sal fina|arvejas|pulpa de tomate|mayonesa|mermelada|dulce de membrillo|pan|polenta|lentejas|porotos|atun|choclo|caldo|vinagre|avena)\b/,
  ],
  ['lacteos', /\b(leche|manteca|margarina|queso|yogur|helado|huevos|crema de leche)\b/],
  [
    'carnes',
    /\b(vacuna|vacuno|carne|pollo|pescado|chorizos?|frankfurters?|hamburguesas?|jamon|leonesa|salame|mortadela|panceta|cerdo|milanesas?|asado|morcilla)\b/,
  ],
  [
    'frutas',
    /\b(banana|manzana|naranja|mandarina|limon|pera|papa|boniato|cebolla|tomate|zanahoria|lechuga|zapallo|zapallito|morron|acelga)\b/,
  ],
]

export function preciosCategory(row: { group?: string; name?: string }): PreciosCategoryId {
  const text = preciosNormalize(`${row.group || ''} ${row.name || ''}`)
  for (const [id, pattern] of CATEGORY_RULES) {
    if (pattern.test(text)) return id
  }
  return 'otros'
}

export function preciosCategoryLabel(id: string): string {
  return PRECIOS_CATEGORIES.find(category => category.id === id)?.label ?? 'Otros'
}

// ---------------------------------------------------------------------------
// Métricas por artículo
// ---------------------------------------------------------------------------

/**
 * Cuánto menos paga el que compra en el 10 % de locales más baratos, contra la
 * mediana. Con p10 y NO con el mínimo: el mínimo crudo puede ser la góndola
 * congelada o el error de carga que la guarda no deja encabezar, y ordenar por
 * él subiría justo esos productos a la cabeza de "dónde conviene buscar".
 */
export function preciosSavings(
  row: { p10?: number; p50?: number } | null | undefined
): number | null {
  const p10 = row?.p10
  const p50 = row?.p50
  if (!Number.isFinite(p10) || !Number.isFinite(p50) || !p50 || p50 <= 0) return null
  return Math.max(0, ((p50 as number) - (p10 as number)) / (p50 as number))
}

/** Precio por litro/kilo/unidad a precio mediano, o null si el envase no se puede leer. */
export function preciosMedianPerUnit(
  row: PreciosArticleRow
): { value: number; label: string } | null {
  return row.p50 ? preciosPerUnit(row.p50, row) : null
}

/** "Arroz Blanco" y "Arroz blanco", "Gaseosa Pepsi" y "Gaseosa Pepsi.": el mismo grupo. */
export function preciosGroupKey(group: string | undefined): string {
  return preciosNormalize(group).replace(/[.\s]+$/, '')
}

/**
 * La variante de cada grupo con el menor precio por unidad de referencia.
 *
 * Devuelve articleId → cuántas variantes se compararon. Sólo entran variantes
 * con muestra amplia y la MISMA unidad de referencia (no se compara un litro con
 * un kilo), hacen falta dos o más, y el ganador tiene que ser estrictamente más
 * barato que el segundo: un empate no tiene "mejor".
 */
export function preciosBestPerUnitInGroup(rows: PreciosArticleRow[]): Map<number, number> {
  const buckets = new Map<string, Array<{ articleId: number; value: number }>>()
  for (const row of rows) {
    if ((row.n ?? 0) < PRECIOS_MIN_OBSERVATIONS) continue
    const perUnit = preciosMedianPerUnit(row)
    if (!perUnit) continue
    const key = `${preciosGroupKey(row.group)}|${perUnit.label}`
    const list = buckets.get(key) || []
    list.push({ articleId: row.articleId, value: perUnit.value })
    buckets.set(key, list)
  }
  const best = new Map<number, number>()
  for (const list of buckets.values()) {
    if (list.length < 2) continue
    const sorted = [...list].sort((a, b) => a.value - b.value)
    const [first, second] = sorted
    if (first && second && first.value < second.value) best.set(first.articleId, list.length)
  }
  return best
}

// ---------------------------------------------------------------------------
// Orden genérico
// ---------------------------------------------------------------------------

type SortValue = number | string | null | undefined

/**
 * Ordena sin mutar. Los valores vacíos van SIEMPRE al final, en las dos
 * direcciones: un artículo sin precio por litro no es "el más barato por litro"
 * al ordenar de menor a mayor ni "el más caro" al invertir. Desempata por nombre
 * para que la misma URL muestre siempre el mismo orden.
 */
export function preciosSortBy<T>(
  rows: T[],
  valueOf: (row: T) => SortValue,
  dir: PreciosSortDir,
  nameOf: (row: T) => string
): T[] {
  const sign = dir === 'desc' ? -1 : 1
  const isEmpty = (value: SortValue) =>
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'number' && !Number.isFinite(value))
  return [...rows].sort((a, b) => {
    const va = valueOf(a)
    const vb = valueOf(b)
    const ea = isEmpty(va)
    const eb = isEmpty(vb)
    if (ea !== eb) return ea ? 1 : -1
    let cmp = 0
    if (!ea && !eb) {
      cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' })
    }
    if (cmp !== 0) return cmp * sign
    return nameOf(a).localeCompare(nameOf(b), 'es', { sensitivity: 'base' })
  })
}

// ---------------------------------------------------------------------------
// Hub: tabla de artículos
// ---------------------------------------------------------------------------

export type PreciosArticleSortKey =
  | 'nombre'
  | 'barato'
  | 'mediana'
  | 'caro'
  | 'unidad'
  | 'ahorro'
  | 'locales'

export const PRECIOS_ARTICLE_SORTS: Record<
  PreciosArticleSortKey,
  { label: string; defaultDir: PreciosSortDir; value: (row: PreciosArticleRow) => SortValue }
> = {
  nombre: { label: 'Nombre', defaultDir: 'asc', value: row => row.name },
  barato: { label: 'Más barato', defaultDir: 'asc', value: row => row.min },
  mediana: { label: 'Mediana', defaultDir: 'asc', value: row => row.p50 },
  caro: { label: 'Más caro', defaultDir: 'asc', value: row => row.max },
  unidad: {
    label: 'Precio por litro o kilo',
    defaultDir: 'asc',
    value: row => preciosMedianPerUnit(row)?.value,
  },
  ahorro: { label: 'Ahorro buscando', defaultDir: 'desc', value: row => preciosSavings(row) },
  locales: { label: 'Locales', defaultDir: 'desc', value: row => row.n },
}

export interface PreciosArticleTableState {
  q: string
  rubro: PreciosCategoryId | ''
  orden: PreciosArticleSortKey
  dir: PreciosSortDir
  muestra: boolean
}

export const PRECIOS_ARTICLE_TABLE_DEFAULTS: PreciosArticleTableState = {
  q: '',
  rubro: '',
  orden: 'nombre',
  dir: 'asc',
  muestra: false,
}

export function preciosFilterArticles(
  rows: PreciosArticleRow[],
  state: Pick<PreciosArticleTableState, 'q' | 'rubro' | 'muestra'>
): PreciosArticleRow[] {
  return rows.filter(row => {
    if (state.rubro && preciosCategory(row) !== state.rubro) return false
    if (state.muestra && (row.n ?? 0) < PRECIOS_MIN_OBSERVATIONS) return false
    return preciosMatchesQuery(`${row.name} ${row.group || ''}`, state.q)
  })
}

export function preciosSortArticles(
  rows: PreciosArticleRow[],
  orden: PreciosArticleSortKey,
  dir: PreciosSortDir
): PreciosArticleRow[] {
  const sort = PRECIOS_ARTICLE_SORTS[orden] ?? PRECIOS_ARTICLE_SORTS.nombre
  return preciosSortBy(rows, sort.value, dir, row => row.name)
}

/** Cuántos artículos caen en cada rubro, para los chips del filtro. */
export function preciosCategoryCounts(rows: PreciosArticleRow[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    const id = preciosCategory(row)
    counts[id] = (counts[id] || 0) + 1
  }
  return counts
}

// ---------------------------------------------------------------------------
// Estado ↔ URL
// ---------------------------------------------------------------------------

const firstString = (value: unknown): string => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
}

const MAX_QUERY_TEXT = 60

/**
 * Lee la URL con lista blanca: un valor que no se reconoce vuelve al default en
 * lugar de producir una tabla vacía que nadie sabe por qué está vacía.
 */
export function preciosArticleStateFromQuery(
  query: Record<string, unknown>
): PreciosArticleTableState {
  const orden = firstString(query.orden) as PreciosArticleSortKey
  const validOrden = orden in PRECIOS_ARTICLE_SORTS ? orden : PRECIOS_ARTICLE_TABLE_DEFAULTS.orden
  const dir = firstString(query.dir)
  const rubro = firstString(query.rubro)
  return {
    q: firstString(query.q).slice(0, MAX_QUERY_TEXT),
    rubro: PRECIOS_CATEGORIES.some(category => category.id === rubro)
      ? (rubro as PreciosCategoryId)
      : '',
    orden: validOrden,
    dir: dir === 'asc' || dir === 'desc' ? dir : PRECIOS_ARTICLE_SORTS[validOrden].defaultDir,
    muestra: firstString(query.muestra) === '30',
  }
}

/** Sólo lo que difiere del default, así la URL limpia sigue siendo la canónica. */
export function preciosArticleQueryFromState(
  state: PreciosArticleTableState
): Record<string, string> {
  const out: Record<string, string> = {}
  const q = state.q.trim()
  if (q) out.q = q.slice(0, MAX_QUERY_TEXT)
  if (state.rubro) out.rubro = state.rubro
  if (state.orden !== PRECIOS_ARTICLE_TABLE_DEFAULTS.orden) out.orden = state.orden
  if (state.dir !== PRECIOS_ARTICLE_SORTS[state.orden].defaultDir) out.dir = state.dir
  if (state.muestra) out.muestra = '30'
  return out
}

// ---------------------------------------------------------------------------
// Hub: locales por nivel de precios de la canasta
// ---------------------------------------------------------------------------

export interface PreciosRankedStore {
  storeId: number
  storeName: string
  department?: string
  chain?: string
  address?: string
  ratio: number
  coverage: number
}

export type PreciosRankedSortKey = 'nivel' | 'cobertura' | 'local' | 'departamento'

export const PRECIOS_RANKED_SORTS: Record<
  PreciosRankedSortKey,
  { label: string; defaultDir: PreciosSortDir; value: (row: PreciosRankedStore) => SortValue }
> = {
  nivel: { label: 'Nivel de precios', defaultDir: 'asc', value: row => row.ratio },
  cobertura: { label: 'Cobertura', defaultDir: 'desc', value: row => row.coverage },
  local: { label: 'Local', defaultDir: 'asc', value: row => row.storeName },
  departamento: { label: 'Departamento', defaultDir: 'asc', value: row => row.department },
}

export function preciosSortRankedStores(
  rows: PreciosRankedStore[],
  orden: PreciosRankedSortKey,
  dir: PreciosSortDir
): PreciosRankedStore[] {
  const sort = PRECIOS_RANKED_SORTS[orden] ?? PRECIOS_RANKED_SORTS.nivel
  return preciosSortBy(rows, sort.value, dir, row => row.storeName)
}

// ---------------------------------------------------------------------------
// Ficha: local por local
// ---------------------------------------------------------------------------

export type PreciosStoreRowWithDistance = PreciosStoreRow & { distanceKm: number | null }

export interface PreciosStoreFilters {
  depto: string
  q: string
  ocultarViejos: boolean
  soloOfertas: boolean
  /** Sólo aplica cuando hay ubicación; null = sin límite. */
  radioKm: number | null
}

export const PRECIOS_STORE_FILTER_DEFAULTS: PreciosStoreFilters = {
  depto: '',
  q: '',
  ocultarViejos: false,
  soloOfertas: false,
  radioKm: null,
}

export const PRECIOS_RADIUS_OPTIONS = [2, 5, 10, 25]

export function preciosWithDistance(
  rows: PreciosStoreRow[],
  origin: { lat: number; lng: number } | null
): PreciosStoreRowWithDistance[] {
  return rows.map(row => ({
    ...row,
    distanceKm:
      origin && Number.isFinite(row.lat) && Number.isFinite(row.lon)
        ? haversineKm(origin, { lat: row.lat as number, lng: row.lon as number })
        : null,
  }))
}

export function preciosFilterStoreRows(
  rows: PreciosStoreRowWithDistance[],
  filters: PreciosStoreFilters
): PreciosStoreRowWithDistance[] {
  return rows.filter(row => {
    if (filters.depto && row.department !== filters.depto) return false
    if (filters.ocultarViejos && row.freshness === 'stale') return false
    if (filters.soloOfertas && !row.promo) return false
    // Sin coordenada no hay distancia: con un radio activo, un local que no se
    // puede ubicar no está "cerca", y mostrarlo diría que sí.
    if (filters.radioKm !== null && (row.distanceKm === null || row.distanceKm > filters.radioKm)) {
      return false
    }
    return preciosMatchesQuery(
      `${row.storeName} ${row.chain || ''} ${row.address || ''}`,
      filters.q
    )
  })
}

export type PreciosStoreSortKey = 'precio' | 'fecha' | 'local' | 'distancia'

export const PRECIOS_STORE_SORTS: Record<
  PreciosStoreSortKey,
  {
    label: string
    defaultDir: PreciosSortDir
    value: (row: PreciosStoreRowWithDistance) => SortValue
  }
> = {
  precio: { label: 'Precio', defaultDir: 'asc', value: row => row.price },
  fecha: { label: 'Dato más reciente', defaultDir: 'desc', value: row => row.sourceDay },
  local: { label: 'Local', defaultDir: 'asc', value: row => row.storeName },
  distancia: { label: 'Más cerca', defaultDir: 'asc', value: row => row.distanceKm },
}

export function preciosSortStoreRows(
  rows: PreciosStoreRowWithDistance[],
  orden: PreciosStoreSortKey,
  dir: PreciosSortDir
): PreciosStoreRowWithDistance[] {
  const sort = PRECIOS_STORE_SORTS[orden] ?? PRECIOS_STORE_SORTS.precio
  return preciosSortBy(rows, sort.value, dir, row => row.storeName)
}

/**
 * La fila más barata que puede encabezar, con la MISMA regla que el backend
 * (`rankable`): ni sospechosa ni quieta. El resumen "más barato con estos
 * filtros" no puede coronar a la góndola que la ficha se niega a coronar.
 */
export function preciosCheapestRankable<T extends PreciosStoreRow>(rows: T[]): T | null {
  let best: T | null = null
  for (const row of rows) {
    if (row.verdict !== 'ok' || row.freshness === 'stale') continue
    if (!best || row.price < best.price) best = row
  }
  return best
}

export interface PreciosStoreTableState {
  depto: string
  q: string
  ocultarViejos: boolean
  soloOfertas: boolean
  orden: Exclude<PreciosStoreSortKey, 'distancia'>
  dir: PreciosSortDir
}

/**
 * La ubicación y el radio NO van a la URL: una dirección compartible con las
 * coordenadas de alguien es exactamente lo que no hay que fabricar.
 */
export function preciosStoreStateFromQuery(query: Record<string, unknown>): PreciosStoreTableState {
  const orden = firstString(query.orden)
  const validOrden = (['precio', 'fecha', 'local'] as const).includes(orden as any)
    ? (orden as PreciosStoreTableState['orden'])
    : 'precio'
  const dir = firstString(query.dir)
  return {
    depto: firstString(query.depto).slice(0, MAX_QUERY_TEXT),
    q: firstString(query.local).slice(0, MAX_QUERY_TEXT),
    ocultarViejos: firstString(query.viejos) === 'no',
    soloOfertas: firstString(query.ofertas) === '1',
    orden: validOrden,
    dir: dir === 'asc' || dir === 'desc' ? dir : PRECIOS_STORE_SORTS[validOrden].defaultDir,
  }
}

export function preciosStoreQueryFromState(state: PreciosStoreTableState): Record<string, string> {
  const out: Record<string, string> = {}
  if (state.depto) out.depto = state.depto
  const q = state.q.trim()
  if (q) out.local = q.slice(0, MAX_QUERY_TEXT)
  if (state.ocultarViejos) out.viejos = 'no'
  if (state.soloOfertas) out.ofertas = '1'
  if (state.orden !== 'precio') out.orden = state.orden
  if (state.dir !== PRECIOS_STORE_SORTS[state.orden].defaultDir) out.dir = state.dir
  return out
}
