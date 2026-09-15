// Ponerle precio a cada ingrediente con la mediana nacional del SIPC del día,
// y decir cuál no se pudo.
//
// Para cada ingrediente con patrón SIPC se toman TODOS los artículos que
// matchean (las cinco marcas de arroz, las dos de papa), se pasa cada uno a
// pesos por gramo con su presentación, y se toma la mediana. Una marca sola es
// una marca; la mediana de cinco es el precio del arroz.
//
// Lo que no matchea hoy (el artículo no existe, o existe sin observaciones) cae
// al estimado fechado del ingrediente y sale marcado `estimado`. La página
// muestra ambos totales por separado: cuánto está medido y cuánto no.
import { INGREDIENTS } from './ingredients'
import type { Ingredient, PriceMap, PricedIngredient } from './types'

/** Lo que `GET /precios/articles` devuelve por artículo, en lo que acá importa. */
export interface SipcArticleLike {
  articleId?: number
  name: string
  qty?: number | null
  unit?: string | null
  p50?: number | null
  n?: number | null
}

/** Gramos comestibles que trae un artículo, o null si no se puede saber. */
export function articleGrams(article: SipcArticleLike, edibleGrams?: number): number | null {
  if (edibleGrams && edibleGrams > 0) return edibleGrams
  const qty = typeof article.qty === 'number' && article.qty > 0 ? article.qty : null
  if (!qty) return null
  switch (article.unit) {
    case 'kg':
    case 'l':
      return qty * 1000
    case 'g':
    case 'ml':
      return qty
    default:
      return null
  }
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

export function estimatedPrice(ingredient: Ingredient): PricedIngredient {
  return {
    pricePerPack: ingredient.price.estimateUyu,
    packGrams: ingredient.pack.grams,
    source: 'estimado',
    asOf: ingredient.price.asOf,
  }
}

export function priceOneIngredient(
  ingredient: Ingredient,
  articles: ReadonlyArray<SipcArticleLike>,
  day: string | null
): PricedIngredient {
  const sipc = ingredient.price.sipc
  if (!sipc) return estimatedPrice(ingredient)

  const perGram: number[] = []
  const names: string[] = []
  for (const article of articles) {
    if (typeof article.name !== 'string' || !sipc.pattern.test(article.name)) continue
    if (typeof article.p50 !== 'number' || !(article.p50 > 0)) continue
    const grams = articleGrams(article, sipc.edibleGrams)
    if (!grams) continue
    perGram.push((article.p50 / grams) * (sipc.factor ?? 1))
    names.push(article.name)
  }
  if (!perGram.length) return estimatedPrice(ingredient)

  const pricePerPack = median(perGram) * ingredient.pack.grams
  return {
    pricePerPack: Math.round(pricePerPack * 100) / 100,
    packGrams: ingredient.pack.grams,
    source: 'sipc',
    articleName:
      names.length === 1 ? names[0] : `mediana de ${names.length} artículos (${names[0]}, …)`,
    day: day ?? undefined,
    note: sipc.note,
  }
}

export function priceIngredients(
  articles: ReadonlyArray<SipcArticleLike>,
  day: string | null
): PriceMap {
  const out: PriceMap = {}
  for (const ingredient of INGREDIENTS) {
    out[ingredient.id] = priceOneIngredient(ingredient, articles, day)
  }
  return out
}

/** Todo estimado: lo que la página usa si el SIPC no contestó. */
export function estimatedPrices(): PriceMap {
  return priceIngredients([], null)
}
