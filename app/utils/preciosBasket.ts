// La canasta fija de la página de precios de supermercado, artículo por artículo.
//
// Es una COPIA de `classes/precios/basket_v1.ts` (composición, cantidades) y de
// `NON_FOOD_NEEDS` de `classes/precios/basket.ts` (qué no es comida): el app y el
// backend son dos programas que no se importan entre sí al compilar.
// `tests/unit/preciosBasketParity.test.ts` falla si la copia se separa del
// original, y la página además se niega a dibujar la tabla si la suma de acá no
// da el `nationalCost` que publicó el backend ese día (`preciosBasketMatches`):
// una canasta nueva en el backend esconde la tabla en vez de publicar un total
// que no es el suyo.
//
// Módulo puro y con prefijo `precios`: `app/utils/` es un namespace plano de
// auto-imports.

import { preciosSlug, type PreciosArticleRow } from './preciosCatalog'

export const PRECIOS_BASKET_VERSION = 1
export const PRECIOS_BASKET_PINNED_AT = '2026-09-07'

export interface PreciosBasketItem {
  articleId: number
  /** Cuántas unidades del envase entran: un supuesto declarado, no una medición. */
  qty: number
  need: string
  /** false para limpieza e higiene. */
  food: boolean
}

export const PRECIOS_BASKET_ITEMS: ReadonlyArray<PreciosBasketItem> = Object.freeze([
  { articleId: 1, qty: 2, need: 'aceite', food: true },
  { articleId: 17, qty: 3, need: 'arroz', food: true },
  { articleId: 25, qty: 2, need: 'azúcar', food: true },
  { articleId: 55, qty: 4, need: 'fideos', food: true },
  { articleId: 76, qty: 2, need: 'harina', food: true },
  { articleId: 73, qty: 1, need: 'polenta', food: true },
  { articleId: 87, qty: 2, need: 'huevos', food: true },
  { articleId: 30, qty: 2, need: 'carne picada', food: true },
  { articleId: 116, qty: 2, need: 'carne con hueso', food: true },
  { articleId: 130, qty: 2, need: 'pollo', food: true },
  { articleId: 103, qty: 1, need: 'manteca', food: true },
  { articleId: 137, qty: 1, need: 'queso rallado', food: true },
  { articleId: 153, qty: 4, need: 'yogur', food: true },
  { articleId: 50, qty: 1, need: 'dulce de leche', food: true },
  { articleId: 149, qty: 2, need: 'yerba', food: true },
  { articleId: 26, qty: 1, need: 'café', food: true },
  { articleId: 144, qty: 1, need: 'té', food: true },
  { articleId: 118, qty: 2, need: 'pan de molde', food: true },
  { articleId: 61, qty: 2, need: 'galletitas', food: true },
  { articleId: 135, qty: 4, need: 'pulpa de tomate', food: true },
  { articleId: 22, qty: 2, need: 'arvejas', food: true },
  { articleId: 142, qty: 1, need: 'sal', food: true },
  { articleId: 244, qty: 4, need: 'papa', food: true },
  { articleId: 254, qty: 3, need: 'tomate', food: true },
  { articleId: 277, qty: 3, need: 'manzana', food: true },
  { articleId: 255, qty: 3, need: 'banana', food: true },
  { articleId: 122, qty: 2, need: 'papel higiénico', food: false },
  { articleId: 46, qty: 1, need: 'detergente', food: false },
  { articleId: 92, qty: 1, need: 'jabón en polvo', food: false },
  { articleId: 82, qty: 2, need: 'hipoclorito', food: false },
  { articleId: 338, qty: 3, need: 'jabón de tocador', food: false },
  { articleId: 126, qty: 1, need: 'pasta dental', food: false },
  { articleId: 321, qty: 1, need: 'shampoo', food: false },
] satisfies PreciosBasketItem[])

const PACK_UNITS: Record<string, { one: string; many: string }> = {
  ml: { one: 'ml', many: 'ml' },
  l: { one: 'l', many: 'l' },
  g: { one: 'g', many: 'g' },
  kg: { one: 'kg', many: 'kg' },
  un: { one: 'unidad', many: 'unidades' },
}

/** Coma decimal sin pasar por `toLocaleString`: el mismo texto en el servidor y en el navegador. */
const decimal = (value: number): string => String(Math.round(value * 100) / 100).replace('.', ',')

/** "900 ml", "1,02 kg", "6 unidades"; vacío si el envase no se puede leer. */
export function preciosPackLabel(
  article: { qty?: number | null; unit?: string | null } | null | undefined
): string {
  const qty = article?.qty
  const unit = article?.unit ? PACK_UNITS[article.unit] : undefined
  if (!unit || typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0) return ''
  return `${decimal(qty)} ${qty === 1 ? unit.one : unit.many}`
}

export interface PreciosBasketLine {
  articleId: number
  need: string
  qty: number
  food: boolean
  name: string
  /** Vacío cuando el artículo no vino en la lectura: no hay ficha a la que enlazar. */
  slug: string
  pack: string
  median: number | null
  subtotal: number | null
  n: number
}

const validMedian = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null

/** Una fila por artículo de la canasta, en el orden fijado, con la mediana nacional de la lectura. */
export function preciosBasketLines(articles: PreciosArticleRow[]): PreciosBasketLine[] {
  const byId = new Map(articles.map(article => [article.articleId, article]))
  return PRECIOS_BASKET_ITEMS.map(item => {
    const article = byId.get(item.articleId)
    const median = validMedian(article?.p50)
    return {
      articleId: item.articleId,
      need: item.need,
      qty: item.qty,
      food: item.food,
      name: article?.name || item.need,
      slug: article?.name ? preciosSlug(article.name) : '',
      pack: preciosPackLabel(article),
      median,
      subtotal: median === null ? null : median * item.qty,
      n: article?.n ?? 0,
    }
  })
}

export interface PreciosBasketTotals {
  food: number
  nonFood: number
  total: number
  itemsPriced: number
  foodItems: number
  nonFoodItems: number
  items: number
  /** Las necesidades sin mediana ese día: un total sin ellas es parcial y lo tiene que decir. */
  missing: string[]
}

/** La misma suma que `nationalBasketCost` del backend, sobre las filas de la página. */
export function preciosBasketTotals(lines: PreciosBasketLine[]): PreciosBasketTotals {
  let food = 0
  let nonFood = 0
  let foodItems = 0
  let nonFoodItems = 0
  const missing: string[] = []
  for (const line of lines) {
    if (line.subtotal === null) {
      missing.push(line.need)
      continue
    }
    if (line.food) {
      food += line.subtotal
      foodItems++
    } else {
      nonFood += line.subtotal
      nonFoodItems++
    }
  }
  return {
    food,
    nonFood,
    total: food + nonFood,
    itemsPriced: foodItems + nonFoodItems,
    foodItems,
    nonFoodItems,
    items: lines.length,
    missing,
  }
}

const close = (a: unknown, b: number): boolean =>
  typeof a === 'number' && Number.isFinite(a) && Math.abs(a - b) <= 1

/**
 * Si la tabla de la página dice lo mismo que el total que publicó el backend. Si
 * no (otra versión de la canasta, una mediana que cambió entre las dos lecturas),
 * la página muestra sólo el total del backend y no una tabla que suma otra cosa.
 */
export function preciosBasketMatches(
  totals: PreciosBasketTotals,
  nationalCost:
    { food?: unknown; nonFood?: unknown; total?: unknown; itemsPriced?: unknown } | null | undefined
): boolean {
  if (!nationalCost) return false
  return (
    nationalCost.itemsPriced === totals.itemsPriced &&
    close(nationalCost.food, totals.food) &&
    close(nationalCost.nonFood, totals.nonFood) &&
    close(nationalCost.total, totals.total)
  )
}
