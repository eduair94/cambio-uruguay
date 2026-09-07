// Los precios de supermercado del SIPC, del lado del sitio.
//
// `app/utils/` es un namespace PLANO de auto-imports, así que todo lo de acá
// lleva prefijo `precios` a propósito: ya hubo choques (`UI_VALUE`, `IVA_RATE`)
// y un nombre genérico acá rompe otra página sin avisar.
//
// Módulo puro: la página y los tests comparten esta lógica y no hay Vue adentro.

export interface PreciosArticleRow {
  articleId: number
  name: string
  group?: string
  variant?: string
  unitRaw?: string
  qty?: number | null
  unit?: string | null
  image?: string | null
  n?: number
  min?: number
  p10?: number
  p50?: number
  p90?: number
  max?: number
}

export interface PreciosStoreRow {
  storeId: number
  storeName: string
  chain?: string
  department?: string
  address?: string
  lat?: number | null
  lon?: number | null
  price: number
  sourceDay: string
  promo?: boolean
  freshness: 'fresh' | 'aging' | 'stale'
  verdict: 'ok' | 'suspect' | 'reject'
  blockedReason?: string | null
}

/**
 * Mínimo de observaciones para que la página del artículo entre al índice.
 *
 * Con menos, la página existe —alguien puede llegar por un enlace— pero no
 * promete una comparación que la muestra no sostiene: medido, "Nalga vacuna con
 * hueso" tiene 28 filas en todo el país contra las 670 del aceite de girasol.
 */
export const PRECIOS_MIN_OBSERVATIONS = 30

export function preciosSlug(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function preciosArticleFromSlug(
  slug: string,
  articles: PreciosArticleRow[]
): PreciosArticleRow | null {
  const target = preciosSlug(slug)
  if (!target) return null
  return articles.find(article => preciosSlug(article.name) === target) ?? null
}

export function preciosIndexable(article: { n?: number } | null | undefined): boolean {
  return (article?.n ?? 0) >= PRECIOS_MIN_OBSERVATIONS
}

/** Cuántas veces se abre el precio del mismo artículo entre el más barato y el más caro. */
export function preciosSpread(
  stats: { min?: number; max?: number } | null | undefined
): number | null {
  const min = stats?.min
  const max = stats?.max
  if (!min || !max || min <= 0) return null
  return max / min
}

const UNIT_BASES: Record<string, { per: number; label: string }> = {
  ml: { per: 1000, label: 'litro' },
  l: { per: 1, label: 'litro' },
  g: { per: 1000, label: 'kilo' },
  kg: { per: 1, label: 'kilo' },
  un: { per: 1, label: 'unidad' },
}

/**
 * Precio por unidad de referencia, para poder comparar envases distintos.
 *
 * Devuelve null cuando el envase no se pudo leer, que pasa en 4 de los 215
 * artículos (vienen en "Centímetros" y "Centímetros Cúbicos"). Inventar un
 * denominador ahí publicaría una comparación falsa.
 */
export function preciosPerUnit(
  price: number,
  article: { qty?: number | null; unit?: string | null } | null | undefined
): { value: number; label: string } | null {
  const qty = article?.qty
  const unit = article?.unit
  if (!Number.isFinite(price) || price <= 0) return null
  if (!qty || !Number.isFinite(qty) || qty <= 0 || !unit) return null
  const base = UNIT_BASES[unit]
  if (!base) return null
  return { value: (price / qty) * base.per, label: base.label }
}

export function preciosFreshnessLabel(freshness: string): string {
  if (freshness === 'fresh') return 'al día'
  if (freshness === 'aging') return 'de hace unos días'
  return 'quieta desde hace más de dos semanas'
}

export const PRECIOS_FRESHNESS_COLOR: Record<string, string> = {
  fresh: 'success',
  aging: 'warning',
  stale: 'error',
}
