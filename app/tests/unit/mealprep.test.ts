// El motor del planificador: nutrición, seguridad, asignación, compras.
import { describe, expect, it } from 'vitest'
import { bodyTargets, basalRate, SLOT_SHARE } from '../../utils/mealprep/nutrition'
import {
  buildWeekPlan,
  DEFAULT_OPTIONS,
  DEFAULT_PROFILE,
  eligibleRecipes,
  pickMains,
  type WeekPlan,
} from '../../utils/mealprep/planner'
import { priceIngredients } from '../../utils/mealprep/pricing'
import { recipeById, RECIPES } from '../../utils/mealprep/recipes'
import { storageFor } from '../../utils/mealprep/safety'
import type { PlanOptions, Profile } from '../../utils/mealprep/types'
import fixture from './fixtures/precios-articles-2026-09-14.json'

const PRICES = priceIngredients(fixture.articles, fixture.day)

const plan = (profile: Partial<Profile> = {}, options: Partial<PlanOptions> = {}): WeekPlan =>
  buildWeekPlan({ ...DEFAULT_PROFILE, ...profile }, { ...DEFAULT_OPTIONS, ...options }, PRICES)

describe('nutrición', () => {
  it('Mifflin–St Jeor a mano: hombre 30 años, 175 cm, 78 kg', () => {
    // 10·78 + 6,25·175 − 5·30 + 5 = 780 + 1093,75 − 150 + 5 = 1728,75
    expect(basalRate(DEFAULT_PROFILE)).toBeCloseTo(1728.75, 2)
    const t = bodyTargets(DEFAULT_PROFILE)
    expect(t.bmr).toBe(1729)
    expect(t.tdee).toBe(Math.round(1728.75 * 1.375))
    expect(t.kcal).toBe(2380)
    expect(t.protein).toBe(Math.round(1.6 * 78))
    expect(t.fat).toBe(Math.round((2380 * 0.28) / 9))
    expect(t.bmiLabel).toBe('sobrepeso')
  })

  it('mujer: −161, y el piso de 1.200 kcal frena el objetivo "bajar"', () => {
    const small: Profile = {
      sex: 'f',
      age: 25,
      heightCm: 155,
      weightKg: 48,
      activity: 'sedentario',
      goal: 'bajar',
    }
    // 480 + 968,75 − 125 − 161 = 1162,75 · 1,2 = 1395,3 · 0,85 = 1186 < 1200
    const t = bodyTargets(small)
    expect(t.kcal).toBe(1200)
    expect(t.flooredAtMinimum).toBe(true)
  })

  it('la proteína nunca pasa del 35 % de las kcal', () => {
    const t = bodyTargets({
      sex: 'f',
      age: 40,
      heightCm: 150,
      weightKg: 95,
      activity: 'sedentario',
      goal: 'bajar',
    })
    expect(t.protein * 4).toBeLessThanOrEqual(t.kcal * 0.35 + 4)
  })

  it('el reparto por turno suma las kcal del día', () => {
    expect(Object.values(SLOT_SHARE).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 9)
    const t = bodyTargets(DEFAULT_PROFILE)
    const sum = Object.values(t.slots).reduce((s, v) => s + v, 0)
    expect(Math.abs(sum - t.kcal)).toBeLessThanOrEqual(3)
  })

  it('acota entradas absurdas en vez de calcular con ellas', () => {
    const t = bodyTargets({ ...DEFAULT_PROFILE, age: 5, heightCm: 900, weightKg: -3 })
    expect(Number.isFinite(t.kcal)).toBe(true)
    expect(t.kcal).toBeGreaterThan(1000)
  })
})

describe('seguridad', () => {
  it('heladera hasta fridgeDays, freezer después sólo si congelable', () => {
    const guiso = recipeById('guiso_lentejas') // fridge 3, freezable
    expect(storageFor(3, guiso, true)).toBe('heladera')
    expect(storageFor(4, guiso, true)).toBe('freezer')
    expect(storageFor(4, guiso, false)).toBeNull()
    const tortilla = recipeById('tortilla_papa') // fridge 3, NO freezable
    expect(storageFor(3, tortilla, true)).toBe('heladera')
    expect(storageFor(4, tortilla, true)).toBeNull()
    const merluza = recipeById('merluza_pure') // fridge 2
    expect(storageFor(2, merluza, true)).toBe('heladera')
    expect(storageFor(3, merluza, true)).toBe('freezer')
    const omelette = recipeById('omelette_queso') // quick, no batch
    expect(storageFor(7, omelette, false)).toBe('fresco')
  })

  it('ningún tupper del plan viola su conservación, con cualquier semilla', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const hasFreezer of [true, false]) {
        const p = plan({}, { seed, hasFreezer })
        for (const day of p.days) {
          for (const meal of day.meals) {
            const recipe = recipeById(meal.recipeId)
            if (meal.storage === 'heladera')
              expect(day.day, `${seed} ${meal.recipeId}`).toBeLessThanOrEqual(
                recipe.storage.fridgeDays
              )
            if (meal.storage === 'freezer') {
              expect(recipe.storage.freezable, `${seed} ${meal.recipeId}`).toBe(true)
              expect(hasFreezer).toBe(true)
            }
            if (meal.storage === 'fresco')
              expect(recipe.quick, `${seed} ${meal.recipeId}`).toBe(true)
          }
        }
      }
    }
  })

  it('sin freezer, los días 4–7 de almuerzo y cena son recetas del día', () => {
    const p = plan({}, { hasFreezer: false })
    for (const day of p.days) {
      if (day.day < 4) continue
      for (const meal of day.meals) {
        if (meal.slot === 'almuerzo' || meal.slot === 'cena')
          expect(meal.storage, `día ${day.day}`).toBe('fresco')
      }
    }
    expect(p.cook.freezerContainers).toBe(0)
  })
})

describe('planificador', () => {
  it('cubre los 28 turnos y es determinista con la misma semilla', () => {
    const a = plan({}, { seed: 7 })
    const b = plan({}, { seed: 7 })
    expect(a.days.flatMap(d => d.meals).length).toBe(28)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    const c = plan({}, { seed: 8 })
    expect(JSON.stringify(c.mains)).not.toBe(JSON.stringify(a.mains))
  })

  it('elige 4 principales con al menos 3 proteínas distintas y a lo sumo 1 no congelable', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const p = plan({}, { seed })
      expect(p.mains.length).toBe(4)
      const proteins = new Set(p.mains.map(m => recipeById(m.recipeId).protein))
      expect(proteins.size, `seed ${seed}`).toBeGreaterThanOrEqual(3)
      expect(
        p.mains.filter(m => recipeById(m.recipeId).storage.freezable).length
      ).toBeGreaterThanOrEqual(3)
      expect(p.mains.reduce((s, m) => s + m.portions, 0)).toBe(14)
    }
  })

  it('sin freezer elige 3 principales para los 6 turnos de heladera', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const p = plan({}, { seed, hasFreezer: false })
      expect(p.mains.length, `seed ${seed}`).toBe(3)
      expect(p.mains.reduce((s, m) => s + m.portions, 0)).toBe(6)
    }
  })

  it('nadie cocina una tanda para una porción sola', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const hasFreezer of [true, false]) {
        for (const restrictions of [[], ['vegetariano' as const], ['sin-lactosa' as const]]) {
          const p = plan({}, { seed, hasFreezer, restrictions })
          for (const task of p.cook.tasks) {
            expect(
              task.portions,
              `seed ${seed} freezer ${hasFreezer} ${task.recipeId}`
            ).toBeGreaterThanOrEqual(2)
          }
        }
      }
    }
  })

  it('no repite el mismo principal en dos turnos seguidos', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const p = plan({}, { seed })
      const mains = p.days.flatMap(d =>
        d.meals.filter(m => m.slot === 'almuerzo' || m.slot === 'cena')
      )
      for (let i = 1; i < mains.length; i++) {
        expect(mains[i]!.recipeId, `seed ${seed} turno ${i}`).not.toBe(mains[i - 1]!.recipeId)
      }
    }
  })

  it('las porciones del mismo plato tienen el mismo tamaño (los tuppers se llenan iguales)', () => {
    const p = plan()
    const byRecipe = new Map<string, Set<number>>()
    for (const meal of p.days.flatMap(d => d.meals)) {
      const set = byRecipe.get(meal.recipeId) ?? new Set()
      set.add(meal.factor)
      byRecipe.set(meal.recipeId, set)
    }
    for (const [id, factors] of byRecipe) expect(factors.size, id).toBe(1)
  })

  it('la semana promedia ±12 % de las kcal objetivo y ≥90 % de la proteína', () => {
    const profiles: Profile[] = [
      DEFAULT_PROFILE,
      { sex: 'f', age: 28, heightCm: 162, weightKg: 58, activity: 'ligero', goal: 'mantener' },
      { sex: 'f', age: 45, heightCm: 165, weightKg: 85, activity: 'sedentario', goal: 'bajar' },
      { sex: 'm', age: 22, heightCm: 182, weightKg: 70, activity: 'alto', goal: 'subir' },
      { sex: 'm', age: 60, heightCm: 170, weightKg: 90, activity: 'sedentario', goal: 'bajar' },
    ]
    for (const profile of profiles) {
      for (const seed of [1, 2, 3]) {
        const p = plan(profile, { seed })
        expect(p.adherence.kcal, `${JSON.stringify(profile)} seed ${seed}`).toBeGreaterThan(0.88)
        expect(p.adherence.kcal, `${JSON.stringify(profile)} seed ${seed}`).toBeLessThan(1.12)
        expect(
          p.adherence.protein,
          `${JSON.stringify(profile)} seed ${seed} P`
        ).toBeGreaterThanOrEqual(0.9)
      }
    }
  })

  it('vegetariano: ninguna receta con carne, pollo ni pescado', () => {
    const p = plan({}, { restrictions: ['vegetariano'] })
    for (const meal of p.days.flatMap(d => d.meals)) {
      const recipe = recipeById(meal.recipeId)
      expect(['pollo', 'carne', 'pescado'].includes(recipe.protein), meal.recipeId).toBe(false)
    }
    for (const line of p.shopping.lines) {
      expect(
        [
          'pechuga_pollo',
          'pata_muslo',
          'carne_picada',
          'carne_vacuna',
          'merluza',
          'atun_lata',
          'jamon_cocido',
        ].includes(line.ingredientId),
        line.ingredientId
      ).toBe(false)
    }
  })

  it('sin lactosa: ni queso, ni leche, ni yogur, ni en el refuerzo', () => {
    const p = plan({ goal: 'bajar' }, { restrictions: ['sin-lactosa'] })
    for (const line of p.shopping.lines) {
      expect(
        ['leche', 'yogur', 'queso', 'queso_rallado', 'manteca', 'dulce_de_leche'].includes(
          line.ingredientId
        ),
        line.ingredientId
      ).toBe(false)
    }
  })

  it('sin airfryer pero con horno, las recetas de airfryer entran por la alternativa', () => {
    const withOven = eligibleRecipes([], ['anafe', 'microondas', 'horno'])
    expect(withOven.some(r => r.id === 'milanesas_pollo')).toBe(true)
    const neither = eligibleRecipes([], ['anafe', 'microondas'])
    expect(neither.some(r => r.id === 'milanesas_pollo')).toBe(false)
    const p = plan({}, { appliances: ['anafe', 'microondas'] })
    for (const task of p.cook.tasks)
      expect(task.appliances.includes('airfryer'), task.recipeId).toBe(false)
  })

  it('con sólo microondas sigue armando algo, y avisa', () => {
    const p = plan({}, { appliances: ['microondas'], hasFreezer: false })
    expect(p.warnings.length).toBeGreaterThan(0)
    expect(p.days.flatMap(d => d.meals).length).toBeGreaterThan(14)
  })

  it('pickMains no se cae con un pool vacío o chico', () => {
    expect(pickMains([], true, 1)).toEqual([])
    const two = RECIPES.filter(r => r.id === 'guiso_lentejas' || r.id === 'tortilla_papa')
    expect(pickMains(two, true, 1).length).toBe(2)
  })
})

describe('compras', () => {
  it('paquetes enteros por arriba, merma aplicada, y los totales cierran', () => {
    const p = plan()
    for (const line of p.shopping.lines) {
      expect(line.buyGrams).toBeGreaterThanOrEqual(line.useGrams)
      expect(line.packs * line.packGrams + 1).toBeGreaterThanOrEqual(line.buyGrams)
      expect(line.gondolaCost).toBeGreaterThanOrEqual(line.usedCost - 1)
      expect(line.source === 'sipc' ? line.day : line.asOf).toBeTruthy()
    }
    const used = p.shopping.lines.reduce((s, l) => s + l.usedCost, 0)
    expect(p.shopping.usedTotal).toBe(used)
    expect(p.shopping.measuredTotal + p.shopping.estimatedTotal).toBe(p.shopping.usedTotal)
    expect(p.shopping.gondolaTotal).toBeGreaterThanOrEqual(p.shopping.usedTotal)
    expect(p.shopping.priceDay).toBe('2026-09-14')
  })

  it('la banana se compra con cáscara: 35 % más que lo que se come', () => {
    const p = plan()
    const banana = p.shopping.lines.find(l => l.ingredientId === 'banana')
    if (!banana) return
    expect(banana.buyGrams / banana.useGrams).toBeCloseTo(1 / 0.65, 1)
  })

  it('dos personas duplican lo que se usa pero no el precio unitario', () => {
    const one = plan()
    const two = plan({}, { people: 2 })
    const riceOne = one.shopping.lines.find(l => l.ingredientId === 'arroz')
    const riceTwo = two.shopping.lines.find(l => l.ingredientId === 'arroz')
    if (riceOne && riceTwo) {
      expect(riceTwo.useGrams).toBeCloseTo(riceOne.useGrams * 2, -1)
      expect(riceTwo.pricePerPack).toBe(riceOne.pricePerPack)
    }
    expect(two.shopping.perDay).toBeCloseTo(one.shopping.perDay, -2)
  })

  it('la mayor parte del gasto está medido en el SIPC', () => {
    const p = plan()
    expect(p.shopping.measuredTotal / p.shopping.usedTotal).toBeGreaterThan(0.5)
  })

  it('el día de cocina lista todos los principales en tandas y cuenta los tuppers', () => {
    const p = plan()
    const batchIds = new Set(
      p.days
        .flatMap(d => d.meals)
        .filter(m => m.storage !== 'fresco')
        .map(m => m.recipeId)
    )
    expect(new Set(p.cook.tasks.map(t => t.recipeId))).toEqual(batchIds)
    expect(p.cook.containers).toBe(p.cook.tasks.reduce((s, t) => s + t.portions, 0))
    expect(p.cook.estimatedMinutes).toBeGreaterThan(60)
    expect(p.cook.estimatedMinutes).toBeLessThan(300)
  })

  it('un plato hecho ese día no cuenta como tupper aunque su receta sea batch', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const p = plan({}, { seed, hasFreezer: false })
      const tuppers = p.days.flatMap(d => d.meals).filter(m => m.storage !== 'fresco').length
      expect(p.cook.containers, `seed ${seed}`).toBe(tuppers)
      for (const task of p.cook.tasks) {
        const own = p.days
          .flatMap(d => d.meals)
          .filter(m => m.recipeId === task.recipeId && m.storage !== 'fresco').length
        expect(task.portions, `${seed} ${task.recipeId}`).toBe(own)
      }
    }
  })
})
