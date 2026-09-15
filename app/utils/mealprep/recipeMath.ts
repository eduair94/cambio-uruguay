// Lo que se calcula sobre UNA receta: nutrientes de la porción base, qué tipos
// de ingrediente lleva (para las restricciones), si se puede hacer con lo que
// hay en la cocina, y cuánto sale la porción.
import { ingredientById } from './ingredients'
import type { Appliance, IngredientKind, Nutrients, PriceMap, Recipe, Restriction } from './types'

export const ZERO: Nutrients = Object.freeze({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })

export function addNutrients(a: Nutrients, b: Nutrients, factor = 1): Nutrients {
  return {
    kcal: a.kcal + b.kcal * factor,
    protein: a.protein + b.protein * factor,
    carbs: a.carbs + b.carbs * factor,
    fat: a.fat + b.fat * factor,
    fiber: a.fiber + b.fiber * factor,
  }
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  return addNutrients(ZERO, n, factor)
}

export function roundNutrients(n: Nutrients): Nutrients {
  return {
    kcal: Math.round(n.kcal),
    protein: Math.round(n.protein),
    carbs: Math.round(n.carbs),
    fat: Math.round(n.fat),
    fiber: Math.round(n.fiber),
  }
}

/** Nutrientes de la porción base (factor 1), con peso crudo. */
export function recipeNutrients(recipe: Recipe): Nutrients {
  let total: Nutrients = ZERO
  for (const line of recipe.ingredients) {
    total = addNutrients(total, ingredientById(line.id).per100, line.grams / 100)
  }
  return total
}

/** Peso crudo comestible de la porción base, en gramos. */
export function recipeGrams(recipe: Recipe): number {
  return recipe.ingredients.reduce((sum, line) => sum + line.grams, 0)
}

export function recipeKinds(recipe: Recipe): Set<IngredientKind> {
  return new Set(recipe.ingredients.map(line => ingredientById(line.id).kind))
}

const BANNED_BY_RESTRICTION: Record<Restriction, IngredientKind[]> = {
  vegetariano: ['carne-roja', 'ave', 'pescado'],
  'sin-pescado': ['pescado'],
  'sin-carne-roja': ['carne-roja'],
  'sin-lactosa': ['lacteo'],
}

export function recipeAllowedByRestrictions(
  recipe: Recipe,
  restrictions: ReadonlyArray<Restriction>
): boolean {
  const kinds = recipeKinds(recipe)
  for (const restriction of restrictions) {
    for (const banned of BANNED_BY_RESTRICTION[restriction]) {
      if (kinds.has(banned)) return false
    }
  }
  return true
}

/** Los electrodomésticos con los que se va a hacer, ya resueltos los reemplazos. */
export function resolveAppliances(
  recipe: Recipe,
  available: ReadonlyArray<Appliance>
): Appliance[] | null {
  const have = new Set<Appliance>(available)
  have.add('sin-coccion')
  const resolved: Appliance[] = []
  for (const needed of recipe.appliances) {
    if (have.has(needed)) {
      resolved.push(needed)
      continue
    }
    const alternative = recipe.alternatives?.[needed]
    if (alternative && have.has(alternative)) {
      resolved.push(alternative)
      continue
    }
    return null
  }
  return resolved
}

export function recipeAllowed(
  recipe: Recipe,
  restrictions: ReadonlyArray<Restriction>,
  appliances: ReadonlyArray<Appliance>
): boolean {
  return (
    recipeAllowedByRestrictions(recipe, restrictions) &&
    resolveAppliances(recipe, appliances) !== null
  )
}

/** Costo proporcional de la porción base (lo que se come, con merma), en pesos. */
export function recipeCost(recipe: Recipe, prices: PriceMap): number {
  let cost = 0
  for (const line of recipe.ingredients) {
    const ingredient = ingredientById(line.id)
    const price = prices[line.id]
    if (!price) continue
    const buyGrams = line.grams / (1 - ingredient.waste)
    cost += (price.pricePerPack / price.packGrams) * buyGrams
  }
  return cost
}
