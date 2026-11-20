import { describe, expect, it } from 'vitest'
import type { PreciosArticleRow } from '../../utils/preciosCatalog'
import {
  PRECIOS_BASKET_ITEMS,
  PRECIOS_BASKET_PINNED_AT,
  PRECIOS_BASKET_VERSION,
  preciosBasketLines,
  preciosBasketMatches,
  preciosBasketTotals,
  preciosPackLabel,
} from '../../utils/preciosBasket'

// La lectura publicada el 2026-11-19 (GET /api/precios): articleId, cantidad de la canasta y
// mediana nacional. `basket.nationalCost` de ese día: food 8008.6, nonFood 1527, total 9535.6.
const READING_2026_11_19: Array<[number, number, number]> = [
  [1, 2, 109],
  [17, 3, 73.9],
  [25, 2, 52],
  [55, 4, 64],
  [76, 2, 64],
  [73, 1, 45],
  [87, 2, 121],
  [30, 2, 379],
  [116, 2, 489],
  [130, 2, 199],
  [103, 1, 109],
  [137, 1, 110],
  [153, 4, 93],
  [50, 1, 206],
  [149, 2, 196],
  [26, 1, 325],
  [144, 1, 44.9],
  [118, 2, 137],
  [61, 2, 87],
  [135, 4, 99],
  [22, 2, 47],
  [142, 1, 56],
  [244, 4, 109],
  [254, 3, 299],
  [277, 3, 119],
  [255, 3, 139],
  [122, 2, 119],
  [46, 1, 148],
  [92, 1, 189],
  [82, 2, 92],
  [338, 3, 78],
  [126, 1, 45],
  [321, 1, 489],
]

const NATIONAL_COST_2026_11_19 = {
  food: 8008.599999999999,
  nonFood: 1527,
  total: 9535.599999999999,
  itemsPriced: 33,
  foodItems: 26,
  nonFoodItems: 7,
  items: 33,
}

const articlesOf = (rows: Array<[number, number, number]>): PreciosArticleRow[] =>
  rows.map(([articleId, , p50]) => ({
    articleId,
    name: articleId === 1 ? 'Aceite de girasol - Óptimo' : `Artículo ${articleId}`,
    qty: articleId === 1 ? 900 : 1,
    unit: articleId === 1 ? 'ml' : 'kg',
    p50,
    n: 100 + articleId,
  }))

describe('la canasta fija del lado del sitio', () => {
  it('son 33 artículos, 26 alimentos y 7 de limpieza e higiene, sin repetir', () => {
    expect(PRECIOS_BASKET_VERSION).toBe(1)
    expect(PRECIOS_BASKET_PINNED_AT).toBe('2026-09-07')
    expect(PRECIOS_BASKET_ITEMS).toHaveLength(33)
    expect(PRECIOS_BASKET_ITEMS.filter(item => item.food)).toHaveLength(26)
    expect(PRECIOS_BASKET_ITEMS.filter(item => !item.food)).toHaveLength(7)
    expect(new Set(PRECIOS_BASKET_ITEMS.map(item => item.articleId)).size).toBe(33)
    expect(new Set(PRECIOS_BASKET_ITEMS.map(item => item.need)).size).toBe(33)
  })

  it('las cantidades son las de la lectura medida', () => {
    expect(PRECIOS_BASKET_ITEMS.map(item => [item.articleId, item.qty])).toEqual(
      READING_2026_11_19.map(([articleId, qty]) => [articleId, qty])
    )
  })
})

describe('preciosPackLabel', () => {
  it.each([
    [{ qty: 900, unit: 'ml' }, '900 ml'],
    [{ qty: 1, unit: 'kg' }, '1 kg'],
    [{ qty: 6, unit: 'un' }, '6 unidades'],
    [{ qty: 1, unit: 'un' }, '1 unidad'],
    [{ qty: 1.02, unit: 'kg' }, '1,02 kg'],
    [{ qty: 2.25, unit: 'l' }, '2,25 l'],
    [{ qty: 500, unit: 'g' }, '500 g'],
  ])('%o → %s', (input, expected) => {
    expect(preciosPackLabel(input)).toBe(expected)
  })

  it('un envase que no se puede leer no inventa nada', () => {
    expect(preciosPackLabel({ qty: 3, unit: 'cm' })).toBe('')
    expect(preciosPackLabel({ qty: null, unit: 'kg' })).toBe('')
    expect(preciosPackLabel({ qty: 0, unit: 'kg' })).toBe('')
    expect(preciosPackLabel(null)).toBe('')
  })
})

describe('preciosBasketLines y preciosBasketTotals', () => {
  it('la lectura del 2026-11-19 da exactamente el nationalCost publicado', () => {
    const lines = preciosBasketLines(articlesOf(READING_2026_11_19))
    expect(lines).toHaveLength(33)
    const first = lines[0]!
    expect(first).toMatchObject({
      articleId: 1,
      need: 'aceite',
      qty: 2,
      food: true,
      name: 'Aceite de girasol - Óptimo',
      slug: 'aceite-de-girasol-optimo',
      pack: '900 ml',
      median: 109,
      subtotal: 218,
      n: 101,
    })

    const totals = preciosBasketTotals(lines)
    expect(totals.food).toBeCloseTo(8008.6, 6)
    expect(totals.nonFood).toBeCloseTo(1527, 6)
    expect(totals.total).toBeCloseTo(9535.6, 6)
    expect(totals).toMatchObject({
      itemsPriced: 33,
      foodItems: 26,
      nonFoodItems: 7,
      items: 33,
      missing: [],
    })
    expect(preciosBasketMatches(totals, NATIONAL_COST_2026_11_19)).toBe(true)
  })

  it('un artículo sin mediana se nombra como faltante y la tabla deja de coincidir', () => {
    const withoutRice = articlesOf(READING_2026_11_19.filter(([articleId]) => articleId !== 17))
    const lines = preciosBasketLines(withoutRice)
    const rice = lines.find(line => line.articleId === 17)!
    expect(rice).toMatchObject({ median: null, subtotal: null, slug: '', n: 0 })

    const totals = preciosBasketTotals(lines)
    expect(totals.itemsPriced).toBe(32)
    expect(totals.foodItems).toBe(25)
    expect(totals.missing).toEqual(['arroz'])
    expect(totals.food).toBeCloseTo(8008.6 - 3 * 73.9, 6)
    expect(preciosBasketMatches(totals, NATIONAL_COST_2026_11_19)).toBe(false)
  })

  it('una mediana cero o negativa no cuenta como precio', () => {
    const rows = READING_2026_11_19.map(
      ([articleId, qty, p50]) =>
        [articleId, qty, articleId === 321 ? 0 : p50] as [number, number, number]
    )
    const totals = preciosBasketTotals(preciosBasketLines(articlesOf(rows)))
    expect(totals.missing).toEqual(['shampoo'])
    expect(totals.nonFoodItems).toBe(6)
  })

  it('no coincide si el total publicado se movió más de un peso o falta', () => {
    const totals = preciosBasketTotals(preciosBasketLines(articlesOf(READING_2026_11_19)))
    expect(preciosBasketMatches(totals, { ...NATIONAL_COST_2026_11_19, total: 9535.6 + 1.5 })).toBe(
      false
    )
    expect(preciosBasketMatches(totals, { ...NATIONAL_COST_2026_11_19, food: 8008.6 - 2 })).toBe(
      false
    )
    expect(preciosBasketMatches(totals, null)).toBe(false)
    expect(preciosBasketMatches(totals, { total: 'x' } as any)).toBe(false)
  })
})
