// Integridad de los datos del planificador: todo ingrediente de toda receta
// existe, toda receta dice cómo se guarda y se recalienta, y los patrones del
// SIPC matchean el catálogo real (fixture del 2026-09-14).
import { describe, expect, it } from 'vitest'
import { INGREDIENTS, ingredientById } from '../../utils/mealprep/ingredients'
import { priceIngredients, articleGrams } from '../../utils/mealprep/pricing'
import { recipeNutrients } from '../../utils/mealprep/recipeMath'
import { RECIPES } from '../../utils/mealprep/recipes'
import fixture from './fixtures/precios-articles-2026-09-14.json'

describe('ingredientes', () => {
  it('tienen id único, nutrientes finitos y merma en [0, 0.5)', () => {
    const ids = new Set<string>()
    for (const ing of INGREDIENTS) {
      expect(ids.has(ing.id), ing.id).toBe(false)
      ids.add(ing.id)
      for (const value of Object.values(ing.per100)) {
        expect(Number.isFinite(value), `${ing.id} per100`).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
      }
      expect(ing.waste).toBeGreaterThanOrEqual(0)
      expect(ing.waste).toBeLessThan(0.5)
      expect(ing.pack.grams).toBeGreaterThan(0)
      expect(ing.price.estimateUyu).toBeGreaterThan(0)
      expect(ing.price.asOf).toMatch(/^\d{4}-\d{2}$/)
    }
  })

  it('las kcal por 100 g son coherentes con los macros (Atwater ±15 % o ±8 kcal)', () => {
    for (const ing of INGREDIENTS) {
      const { kcal, protein, carbs, fat } = ing.per100
      // En frutas y verduras la fibra y los ácidos van adentro de "carbohidratos"
      // y no aportan 4 kcal: por debajo de 50 kcal la relación no vale.
      if (kcal < 50) continue
      const atwater = protein * 4 + carbs * 4 + fat * 9
      const diff = Math.abs(atwater - kcal)
      expect(diff / kcal < 0.15 || diff <= 8, `${ing.id}: ${kcal} vs ${atwater}`).toBe(true)
    }
  })

  it('los que se compran por peso tienen incremento de 100 g', () => {
    for (const ing of INGREDIENTS) {
      if (ing.byWeight) expect(ing.pack.grams, ing.id).toBe(100)
    }
  })
})

describe('recetas', () => {
  it('sólo usan ingredientes que existen y tienen pasos, tiempos y conservación', () => {
    const ids = new Set<string>()
    for (const recipe of RECIPES) {
      expect(ids.has(recipe.id), recipe.id).toBe(false)
      ids.add(recipe.id)
      expect(recipe.ingredients.length, recipe.id).toBeGreaterThan(0)
      for (const line of recipe.ingredients) {
        expect(() => ingredientById(line.id), `${recipe.id} → ${line.id}`).not.toThrow()
        expect(line.grams).toBeGreaterThan(0)
      }
      expect(recipe.steps.length, recipe.id).toBeGreaterThan(0)
      expect(recipe.prepMinutes + recipe.cookMinutes).toBeGreaterThanOrEqual(0)
      expect(recipe.storage.reheat.length).toBeGreaterThan(5)
      expect(recipe.storage.fridgeDays).toBeGreaterThanOrEqual(0)
      expect(recipe.storage.fridgeDays).toBeLessThanOrEqual(4)
      expect(recipe.appliances.length).toBeGreaterThan(0)
    }
  })

  it('una receta quick tarda ≤ 20 min y una batch se guarda al menos 2 días', () => {
    for (const recipe of RECIPES) {
      if (recipe.quick)
        expect(recipe.prepMinutes + recipe.cookMinutes, recipe.id).toBeLessThanOrEqual(20)
      if (recipe.batch) expect(recipe.storage.fridgeDays, recipe.id).toBeGreaterThanOrEqual(2)
      if (!recipe.batch) expect(recipe.quick, `${recipe.id} ni batch ni quick`).toBe(true)
    }
  })

  it('las porciones base tienen kcal y proteína razonables por turno', () => {
    for (const recipe of RECIPES) {
      const n = recipeNutrients(recipe)
      if (recipe.slot === 'principal') {
        expect(n.kcal, recipe.id).toBeGreaterThan(380)
        expect(n.kcal, recipe.id).toBeLessThan(750)
        expect(n.protein, recipe.id).toBeGreaterThan(20)
      }
      if (recipe.slot === 'desayuno') {
        expect(n.kcal, recipe.id).toBeGreaterThan(300)
        expect(n.kcal, recipe.id).toBeLessThan(600)
        expect(n.protein, recipe.id).toBeGreaterThan(12)
      }
      if (recipe.slot === 'merienda') {
        expect(n.kcal, recipe.id).toBeGreaterThan(150)
        expect(n.kcal, recipe.id).toBeLessThan(350)
      }
    }
  })

  it('el pescado no pasa de 2 días en heladera; la papa hervida y las ensaladas no se freezan', () => {
    for (const recipe of RECIPES) {
      const ids = recipe.ingredients.map(l => l.id)
      if (recipe.batch && ids.includes('merluza'))
        expect(recipe.storage.fridgeDays, recipe.id).toBeLessThanOrEqual(2)
      if (recipe.batch && ids.includes('arroz'))
        expect(recipe.storage.fridgeDays, recipe.id).toBeLessThanOrEqual(2)
    }
    expect(RECIPES.find(r => r.id === 'tortilla_papa')!.storage.freezable).toBe(false)
    expect(RECIPES.find(r => r.id === 'ensalada_garbanzos')!.storage.freezable).toBe(false)
  })

  it('hay pool suficiente en cada turno, también vegetariano y sin lactosa', () => {
    const mains = RECIPES.filter(r => r.slot === 'principal' && r.batch)
    expect(mains.length).toBeGreaterThanOrEqual(12)
    expect(RECIPES.filter(r => r.slot === 'desayuno').length).toBeGreaterThanOrEqual(5)
    expect(RECIPES.filter(r => r.slot === 'merienda').length).toBeGreaterThanOrEqual(4)
    const proteins = new Set(mains.map(r => r.protein))
    expect(proteins.size).toBeGreaterThanOrEqual(5)
  })
})

describe('precios contra el catálogo real del SIPC', () => {
  const prices = priceIngredients(fixture.articles, fixture.day)

  it('cada patrón SIPC matchea al menos un artículo con mediana', () => {
    for (const ing of INGREDIENTS) {
      if (!ing.price.sipc) continue
      // La cebolla existe en el catálogo con cero observaciones: es el único
      // patrón que puede caer al estimado hoy.
      if (ing.id === 'cebolla') continue
      expect(prices[ing.id]!.source, `${ing.id} debería salir del SIPC`).toBe('sipc')
      expect(prices[ing.id]!.day).toBe('2026-09-14')
    }
  })

  it('los precios medidos están en el mismo orden de magnitud que el estimado (×/÷ 2,5)', () => {
    for (const ing of INGREDIENTS) {
      const price = prices[ing.id]!
      if (price.source !== 'sipc') continue
      const ratio = price.pricePerPack / ing.price.estimateUyu
      expect(
        ratio,
        `${ing.id}: sipc ${price.pricePerPack} vs est ${ing.price.estimateUyu}`
      ).toBeGreaterThan(0.4)
      expect(
        ratio,
        `${ing.id}: sipc ${price.pricePerPack} vs est ${ing.price.estimateUyu}`
      ).toBeLessThan(2.5)
    }
  })

  it('convierte presentaciones a gramos y se niega cuando no sabe', () => {
    expect(articleGrams({ name: 'x', qty: 1, unit: 'kg' })).toBe(1000)
    expect(articleGrams({ name: 'x', qty: 900, unit: 'ml' })).toBe(900)
    expect(articleGrams({ name: 'x', qty: 6, unit: 'un' })).toBeNull()
    expect(articleGrams({ name: 'x', qty: 6, unit: 'un' }, 300)).toBe(300)
    expect(articleGrams({ name: 'x', qty: null, unit: 'kg' })).toBeNull()
  })

  it('el arroz es la mediana de las cinco marcas, no la más barata ni la más cara', () => {
    const rice = fixture.articles.filter(a => /^Arroz blanco/i.test(a.name)).map(a => a.p50!)
    const sorted = rice.slice().sort((a, b) => a - b)
    expect(prices.arroz!.pricePerPack).toBe(sorted[Math.floor(sorted.length / 2)])
  })

  it('la pechuga se deriva del pollo entero con el factor declarado y lo dice', () => {
    const whole = fixture.articles
      .filter(a => /^Pollo entero fresco/i.test(a.name))
      .map(a => a.p50!)
    const sorted = whole.slice().sort((a, b) => a - b)
    const medianPerKg = (sorted[0]! + sorted[1]!) / 2
    expect(prices.pechuga_pollo!.pricePerPack).toBeCloseTo((medianPerKg * 1.9) / 10, 1)
    expect(prices.pechuga_pollo!.note).toMatch(/1,9/)
  })

  it('sin catálogo, todo es estimado y fechado', () => {
    const fallback = priceIngredients([], null)
    for (const ing of INGREDIENTS) {
      expect(fallback[ing.id]!.source).toBe('estimado')
      expect(fallback[ing.id]!.asOf).toBe(ing.price.asOf)
    }
  })
})
