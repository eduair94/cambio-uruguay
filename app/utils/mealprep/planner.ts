// El planificador: de un perfil, unas opciones y los precios del día, a siete
// días de cuatro comidas que se cocinan un solo día.
//
// Cómo reparte (ver spec 2026-09-15-meal-prep-semanal-design.md):
//   1. Elige 4 platos principales para los 14 almuerzos y cenas, con proteínas
//      distintas mientras el pool lo permita, y al menos 2 congelables si hay
//      freezer.
//   2. Recorre los turnos en orden y le da cada uno al principal con MENOS
//      porciones que PUEDE ocuparlo (heladera si el día ≤ fridgeDays, freezer si
//      es congelable), sin repetir el plato del turno anterior. Si ninguno
//      puede, entra una receta rápida que se hace ese día.
//   3. Escala la porción de cada plato al objetivo de kcal del turno (una sola
//      medida por plato: los tuppers se llenan iguales).
//   4. Si la proteína o las kcal semanales quedan cortas, suma refuerzos
//      declarados (atún, huevo, yogur / maní, pan, banana, queso).
//   5. Convierte todo a lista de compras con merma, paquetes enteros y el
//      precio medido o estimado de cada ingrediente.
import { ingredientById } from './ingredients'
import { bodyTargets, PROTEIN_DENSE_SHARE, type BodyTargets } from './nutrition'
import {
  addNutrients,
  recipeAllowed,
  recipeGrams,
  recipeNutrients,
  resolveAppliances,
  roundNutrients,
  scaleNutrients,
  ZERO,
} from './recipeMath'
import { RECIPES } from './recipes'
import { mulberry32, shuffle } from './rng'
import { storageFor, type Storage } from './safety'
import type {
  Appliance,
  IngredientCategory,
  IngredientKind,
  MealSlot,
  Nutrients,
  PlanOptions,
  PriceMap,
  Profile,
  Recipe,
  Restriction,
} from './types'

export const DAYS = [1, 2, 3, 4, 5, 6, 7] as const
export const SLOTS: ReadonlyArray<MealSlot> = ['desayuno', 'almuerzo', 'merienda', 'cena']
export const MAINS_PER_WEEK = 4
export const FACTOR_MIN = 0.6
export const FACTOR_MAX = 1.8
/** Bajo esto, se suma un refuerzo de proteína. */
export const PROTEIN_OK_SHARE = 0.9
export const MAX_PROTEIN_BOOSTS = 3
/** Bajo esto, se suma un refuerzo de energía. */
export const KCAL_OK_SHARE = 0.92
export const MAX_KCAL_BOOSTS = 4
/** g de proteína por 100 kcal desde el que un principal cuenta como "denso en proteína". */
export const PROTEIN_DENSE_G_PER_100KCAL = 7

export interface PlannedMeal {
  day: number
  slot: MealSlot
  recipeId: string
  recipeName: string
  storage: Storage
  factor: number
  /** Peso crudo de la porción, gramos. */
  grams: number
  nutrients: Nutrients
  /** Refuerzos sumados en este turno (proteína o energía), si los hubo. */
  boosts?: Array<{ ingredientId: string; name: string; grams: number }>
}

export interface DayPlan {
  day: number
  meals: PlannedMeal[]
  totals: Nutrients
}

export interface CookTask {
  recipeId: string
  name: string
  /** Porciones a cocinar (turnos × personas). */
  portions: number
  factor: number
  fridgePortions: number
  freezerPortions: number
  appliances: Appliance[]
  prepMinutes: number
  cookMinutes: number
  steps: string[]
  fridgeDays: number
  freezable: boolean
  reheat: string
  cold: boolean
  /** Ingredientes por porción ya escalados, gramos. */
  ingredients: Array<{ id: string; name: string; grams: number }>
  nutrients: Nutrients
  slot: Recipe['slot']
}

export interface ShoppingLine {
  ingredientId: string
  name: string
  category: IngredientCategory
  pantry: boolean
  /** Se compra al peso (carnicería, verdulería): no hay "paquetes". */
  byWeight: boolean
  /** Gramos comestibles que usa el plan. */
  useGrams: number
  /** Gramos a comprar (con merma). */
  buyGrams: number
  packs: number
  packLabel: string
  packGrams: number
  pricePerPack: number
  /** Lo que se paga en la góndola: paquetes enteros, salvo la despensa, que va proporcional. */
  gondolaCost: number
  /** Lo que cuesta lo que se usa (proporcional). */
  usedCost: number
  source: 'sipc' | 'estimado'
  articleName?: string
  day?: string
  asOf?: string
  note?: string
}

export interface Shopping {
  lines: ShoppingLine[]
  gondolaTotal: number
  usedTotal: number
  /** Parte de `usedTotal` con precio medido en el SIPC. */
  measuredTotal: number
  estimatedTotal: number
  /** Por persona. */
  perDay: number
  perMeal: number
  priceDay: string | null
}

export interface WeekPlan {
  targets: BodyTargets
  options: PlanOptions
  days: DayPlan[]
  mains: Array<{ recipeId: string; name: string; portions: number }>
  cook: {
    tasks: CookTask[]
    estimatedMinutes: number
    containers: number
    freezerContainers: number
  }
  shopping: Shopping
  weekAverage: Nutrients
  /** Promedio semanal como fracción del objetivo. */
  adherence: { kcal: number; protein: number; fiber: number }
  adjustments: string[]
  warnings: string[]
  seed: number
}

interface Assignment {
  day: number
  slot: MealSlot
  recipe: Recipe
  storage: Storage
}

const clampFactor = (factor: number) =>
  Math.round(Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, factor)) * 20) / 20

export function eligibleRecipes(
  restrictions: ReadonlyArray<Restriction>,
  appliances: ReadonlyArray<Appliance>
): Recipe[] {
  return RECIPES.filter(recipe => recipeAllowed(recipe, restrictions, appliances))
}

/**
 * Los 4 principales de la semana. Primero uno por proteína, después se completa;
 * si hay freezer, a lo sumo uno no congelable (si el pool lo permite).
 */
/** Con freezer hay 14 turnos para principales en tandas; sin freezer sólo los 6 de heladera. */
export function mainsWanted(hasFreezer: boolean): number {
  return hasFreezer ? MAINS_PER_WEEK : MAINS_PER_WEEK - 1
}

export function pickMains(
  pool: ReadonlyArray<Recipe>,
  hasFreezer: boolean,
  seed: number,
  preferProtein = false,
  wanted = mainsWanted(hasFreezer)
): Recipe[] {
  const rng = mulberry32(seed)
  let order = shuffle(pool, rng)
  if (preferProtein) {
    // Orden estable por densidad de proteína en dos baldes: la variedad sigue
    // viniendo de la semilla, pero adentro del balde alto primero.
    const dense = (r: Recipe) => {
      const n = recipeNutrients(r)
      return n.kcal > 0 && (n.protein / n.kcal) * 100 >= PROTEIN_DENSE_G_PER_100KCAL ? 0 : 1
    }
    order = order
      .map((r, i) => ({ r, i }))
      .sort((a, b) => dense(a.r) - dense(b.r) || a.i - b.i)
      .map(x => x.r)
  }
  const picked: Recipe[] = []
  const proteins = new Set<string>()
  for (const recipe of order) {
    if (picked.length >= wanted) break
    if (proteins.has(recipe.protein)) continue
    picked.push(recipe)
    proteins.add(recipe.protein)
  }
  for (const recipe of order) {
    if (picked.length >= wanted) break
    if (!picked.includes(recipe)) picked.push(recipe)
  }
  if (hasFreezer) {
    // Con freezer hay 6 turnos de heladera y 8 de freezer: dos platos que no se
    // freezan se pelearían por los 6 y uno quedaría con una porción sola.
    const freezableInPool = order.filter(r => r.storage.freezable)
    const freezableWanted = Math.min(wanted - 1, freezableInPool.length)
    let have = picked.filter(r => r.storage.freezable).length
    for (let i = picked.length - 1; i >= 0 && have < freezableWanted; i--) {
      if (picked[i]!.storage.freezable) continue
      const replacement = freezableInPool.find(r => !picked.includes(r))
      if (!replacement) break
      picked[i] = replacement
      have++
    }
  }
  return picked
}

/** Recetas en tandas que quedaron con UNA porción: nadie cocina una tanda para eso. */
export function singlePortionBatch(assignments: ReadonlyArray<Assignment>): Set<string> {
  const count = new Map<string, number>()
  for (const a of assignments) {
    if (!a.recipe.batch || a.storage === 'fresco') continue
    count.set(a.recipe.id, (count.get(a.recipe.id) ?? 0) + 1)
  }
  return new Set([...count.entries()].filter(([, n]) => n < 2).map(([id]) => id))
}

/** Turnos de principales en orden: día 1 almuerzo, día 1 cena, día 2 … */
export function assignMains(
  mains: ReadonlyArray<Recipe>,
  quickPool: ReadonlyArray<Recipe>,
  hasFreezer: boolean
): { assignments: Assignment[]; missing: Array<{ day: number; slot: MealSlot }> } {
  const portions = new Map<string, number>(mains.map(m => [m.id, 0]))
  const assignments: Assignment[] = []
  const missing: Array<{ day: number; slot: MealSlot }> = []
  let previous: string | null = null
  let quickCursor = 0

  for (const day of DAYS) {
    for (const slot of ['almuerzo', 'cena'] as const) {
      const allowed = mains
        .map(recipe => ({ recipe, storage: storageFor(day, recipe, hasFreezer) }))
        .filter((c): c is { recipe: Recipe; storage: Storage } => c.storage !== null)
      const notRepeated = allowed.filter(c => c.recipe.id !== previous)
      const candidates = notRepeated.length ? notRepeated : allowed
      let chosen: { recipe: Recipe; storage: Storage } | null = null
      if (candidates.length) {
        // Menos porciones primero; a igual cantidad, el que NO se freeza (sólo
        // puede vivir en los días de heladera, si no queda con una porción sola).
        const score = (c: { recipe: Recipe }) =>
          portions.get(c.recipe.id)! * 2 + (c.recipe.storage.freezable ? 1 : 0)
        chosen = candidates.reduce((best, c) => (score(c) < score(best) ? c : best))
        portions.set(chosen.recipe.id, portions.get(chosen.recipe.id)! + 1)
      } else if (quickPool.length) {
        const recipe = quickPool[quickCursor % quickPool.length]!
        quickCursor++
        chosen = { recipe, storage: 'fresco' }
      }
      if (!chosen) {
        missing.push({ day, slot })
        previous = null
        continue
      }
      assignments.push({ day, slot, recipe: chosen.recipe, storage: chosen.storage })
      previous = chosen.recipe.id
    }
  }
  return { assignments, missing }
}

/** Dos recetas de un turno, alternadas por día, respetando la conservación. */
export function assignPair(
  slot: 'desayuno' | 'merienda',
  pool: ReadonlyArray<Recipe>,
  hasFreezer: boolean,
  seed: number
): { assignments: Assignment[]; missing: Array<{ day: number; slot: MealSlot }> } {
  const rng = mulberry32(seed)
  const order = shuffle(pool, rng)
  const pair = order.slice(0, 2)
  const assignments: Assignment[] = []
  const missing: Array<{ day: number; slot: MealSlot }> = []
  for (const day of DAYS) {
    const preferred = pair.length ? pair[(day - 1) % pair.length]! : null
    const ordered = preferred ? [preferred, ...pair.filter(r => r !== preferred), ...order] : order
    let chosen: Assignment | null = null
    for (const recipe of ordered) {
      const storage = storageFor(day, recipe, hasFreezer)
      if (storage) {
        chosen = { day, slot, recipe, storage }
        break
      }
    }
    if (chosen) assignments.push(chosen)
    else missing.push({ day, slot })
  }
  return { assignments, missing }
}

/** Un factor por receta: el promedio de los objetivos de los turnos que ocupa ÷ kcal base. */
export function factorsFor(
  assignments: ReadonlyArray<Assignment>,
  slotTargets: Record<MealSlot, number>
): Map<string, number> {
  const targets = new Map<string, number[]>()
  for (const a of assignments) {
    const list = targets.get(a.recipe.id) ?? []
    list.push(slotTargets[a.slot])
    targets.set(a.recipe.id, list)
  }
  const factors = new Map<string, number>()
  for (const a of assignments) {
    if (factors.has(a.recipe.id)) continue
    const list = targets.get(a.recipe.id)!
    const mean = list.reduce((s, v) => s + v, 0) / list.length
    const base = recipeNutrients(a.recipe).kcal
    factors.set(a.recipe.id, clampFactor(base > 0 ? mean / base : 1))
  }
  return factors
}

interface BoostOption {
  ingredientId: string
  grams: number
  slot: MealSlot
  label: string
}

const BANNED_KINDS: Record<Restriction, IngredientKind[]> = {
  vegetariano: ['carne-roja', 'ave', 'pescado'],
  'sin-pescado': ['pescado'],
  'sin-carne-roja': ['carne-roja'],
  'sin-lactosa': ['lacteo'],
}

function allowedBoosts(
  all: BoostOption[],
  restrictions: ReadonlyArray<Restriction>
): BoostOption[] {
  const banned = new Set(restrictions.flatMap(r => BANNED_KINDS[r]))
  return all.filter(option => !banned.has(ingredientById(option.ingredientId).kind))
}

/** Refuerzos de proteína, del más eficiente (proteína por kcal) al menos. */
export function proteinBoostOptions(restrictions: ReadonlyArray<Restriction>): BoostOption[] {
  return allowedBoosts(
    [
      {
        ingredientId: 'atun_lata',
        grams: 60,
        slot: 'almuerzo',
        label: 'media lata de atún sobre el almuerzo',
      },
      {
        ingredientId: 'huevo',
        grams: 50,
        slot: 'almuerzo',
        label: 'un huevo duro con el almuerzo',
      },
      { ingredientId: 'yogur', grams: 200, slot: 'merienda', label: 'un yogur más en la merienda' },
    ],
    restrictions
  )
}

/** Refuerzos de energía para objetivos altos que la porción máxima no alcanza. */
export function kcalBoostOptions(restrictions: ReadonlyArray<Restriction>): BoostOption[] {
  return allowedBoosts(
    [
      {
        ingredientId: 'mani',
        grams: 30,
        slot: 'merienda',
        label: 'un puñado más de maní en la merienda',
      },
      {
        ingredientId: 'pan_molde',
        grams: 60,
        slot: 'almuerzo',
        label: 'dos rebanadas de pan con el almuerzo',
      },
      {
        ingredientId: 'banana',
        grams: 120,
        slot: 'desayuno',
        label: 'una banana más en el desayuno',
      },
      { ingredientId: 'queso', grams: 30, slot: 'cena', label: 'un trozo de queso con la cena' },
    ],
    restrictions
  )
}

/** Suma `option` a todos los turnos de su slot y devuelve los gramos semanales agregados. */
function applyBoost(meals: PlannedMeal[], option: BoostOption): number {
  const ingredient = ingredientById(option.ingredientId)
  let grams = 0
  for (const meal of meals) {
    if (meal.slot !== option.slot) continue
    meal.nutrients = addNutrients(
      meal.nutrients,
      scaleNutrients(ingredient.per100, option.grams / 100)
    )
    meal.grams += option.grams
    meal.boosts = [
      ...(meal.boosts ?? []),
      { ingredientId: option.ingredientId, name: ingredient.name, grams: option.grams },
    ]
    grams += option.grams
  }
  return grams
}

export function buildWeekPlan(
  profileInput: Profile,
  options: PlanOptions,
  prices: PriceMap
): WeekPlan {
  const targets = bodyTargets(profileInput)
  const people = Math.max(1, Math.min(6, Math.round(options.people || 1)))
  const warnings: string[] = []
  const adjustments: string[] = []

  const eligible = eligibleRecipes(options.restrictions, options.appliances)
  // Sin freezer los principales sólo viven en los 6 turnos de heladera (días
  // 1–3): un plato de 2 días cubriría 4 y dejaría a otro con una porción.
  const mainsPool = eligible.filter(
    r => r.slot === 'principal' && r.batch && (options.hasFreezer || r.storage.fridgeDays >= 3)
  )
  const quickPool = eligible.filter(r => r.slot === 'principal' && r.quick)
  const breakfastPool = eligible.filter(r => r.slot === 'desayuno')
  const snackPool = eligible.filter(r => r.slot === 'merienda')

  const excluded = RECIPES.length - eligible.length
  if (excluded > 0) {
    warnings.push(
      `${excluded} receta${excluded === 1 ? '' : 's'} quedaron afuera por tus restricciones o por lo que tenés en la cocina.`
    )
  }
  if (!options.hasFreezer) {
    warnings.push(
      'Sin freezer, los tuppers de heladera llegan hasta el día 3. Del día 4 en adelante el plan pone recetas de 10–20 minutos que se hacen ese día.'
    )
  }

  // Nadie cocina una tanda para una porción sola: si un plato en tandas queda
  // con una, sale del pool y se vuelve a repartir. Acota a unas pocas vueltas.
  let mains = pickMains(
    mainsPool,
    options.hasFreezer,
    options.seed,
    targets.proteinShare >= PROTEIN_DENSE_SHARE
  )
  let mainAssign = assignMains(mains, quickPool, options.hasFreezer)
  for (let round = 0; round < MAINS_PER_WEEK; round++) {
    const lonely = singlePortionBatch(mainAssign.assignments)
    if (!lonely.size || mains.length <= 1) break
    mains = mains.filter(m => !lonely.has(m.id))
    mainAssign = assignMains(mains, quickPool, options.hasFreezer)
  }
  if (mains.length < mainsWanted(options.hasFreezer)) {
    warnings.push(
      `Con estas restricciones sólo hay ${mains.length} principales para cocinar en tandas: se repiten más.`
    )
  }

  let breakfastPoolLeft = breakfastPool
  let breakfastAssign = assignPair(
    'desayuno',
    breakfastPoolLeft,
    options.hasFreezer,
    options.seed + 11
  )
  for (let round = 0; round < 3; round++) {
    const lonely = singlePortionBatch(breakfastAssign.assignments)
    if (!lonely.size) break
    breakfastPoolLeft = breakfastPoolLeft.filter(r => !lonely.has(r.id))
    breakfastAssign = assignPair(
      'desayuno',
      breakfastPoolLeft,
      options.hasFreezer,
      options.seed + 11
    )
  }
  const snackAssign = assignPair('merienda', snackPool, options.hasFreezer, options.seed + 23)
  const missing = [...mainAssign.missing, ...breakfastAssign.missing, ...snackAssign.missing]
  if (missing.length) {
    warnings.push(
      `${missing.length} turno${missing.length === 1 ? '' : 's'} sin receta posible con lo que tenés (${missing
        .map(m => `día ${m.day} ${m.slot}`)
        .join(', ')}).`
    )
  }

  const assignments = [
    ...mainAssign.assignments,
    ...breakfastAssign.assignments,
    ...snackAssign.assignments,
  ]
  const factors = factorsFor(assignments, targets.slots)

  // Comidas planificadas, por día.
  const meals: PlannedMeal[] = assignments.map(a => {
    const factor = factors.get(a.recipe.id) ?? 1
    return {
      day: a.day,
      slot: a.slot,
      recipeId: a.recipe.id,
      recipeName: a.recipe.name,
      storage: a.storage,
      factor,
      grams: Math.round(recipeGrams(a.recipe) * factor),
      nutrients: scaleNutrients(recipeNutrients(a.recipe), factor),
    }
  })

  // Refuerzos declarados: proteína si la semana queda corta, energía si la
  // porción máxima no llega al objetivo (una persona de 3.000 kcal no come el
  // doble de guiso: come guiso y algo más).
  const boostGrams = new Map<string, number>()
  const avg = (key: keyof Nutrients) =>
    meals.reduce((s, m) => s + m.nutrients[key], 0) / DAYS.length
  const proteinBoosts = proteinBoostOptions(options.restrictions)
  for (let round = 0; round < MAX_PROTEIN_BOOSTS; round++) {
    if (avg('protein') >= targets.protein * PROTEIN_OK_SHARE) break
    const option = proteinBoosts[round % proteinBoosts.length]
    if (!option) break
    const grams = applyBoost(meals, option)
    boostGrams.set(option.ingredientId, (boostGrams.get(option.ingredientId) ?? 0) + grams)
    const protein = Math.round(
      (ingredientById(option.ingredientId).per100.protein * option.grams) / 100
    )
    adjustments.push(
      `La proteína quedaba corta: se suma ${option.label} todos los días (+${protein} g de proteína).`
    )
  }
  const kcalBoosts = kcalBoostOptions(options.restrictions)
  for (let round = 0; round < MAX_KCAL_BOOSTS; round++) {
    if (avg('kcal') >= targets.kcal * KCAL_OK_SHARE) break
    const option = kcalBoosts[round % kcalBoosts.length]
    if (!option) break
    const grams = applyBoost(meals, option)
    boostGrams.set(option.ingredientId, (boostGrams.get(option.ingredientId) ?? 0) + grams)
    const kcal = Math.round((ingredientById(option.ingredientId).per100.kcal * option.grams) / 100)
    adjustments.push(
      `Las porciones máximas no llegan a tu objetivo: se suma ${option.label} todos los días (+${kcal} kcal).`
    )
  }

  const days: DayPlan[] = DAYS.map(day => {
    const dayMeals = SLOTS.map(slot => meals.find(m => m.day === day && m.slot === slot)).filter(
      (m): m is PlannedMeal => Boolean(m)
    )
    const totals = dayMeals.reduce((acc, m) => addNutrients(acc, m.nutrients), ZERO)
    return { day, meals: dayMeals, totals: roundNutrients(totals) }
  })

  const weekAverage = roundNutrients(
    scaleNutrients(
      days.reduce((acc, d) => addNutrients(acc, d.totals), ZERO),
      1 / DAYS.length
    )
  )
  const adherence = {
    kcal: weekAverage.kcal / targets.kcal,
    protein: weekAverage.protein / targets.protein,
    fiber: weekAverage.fiber / targets.fiber,
  }
  if (adherence.protein < PROTEIN_OK_SHARE) {
    warnings.push(
      `Aun con refuerzos, la proteína promedio queda en ${Math.round(adherence.protein * 100)} % del objetivo.`
    )
  }
  if (adherence.kcal < KCAL_OK_SHARE) {
    warnings.push(
      `Aun con refuerzos, las kcal promedio quedan en ${Math.round(adherence.kcal * 100)} % del objetivo: sumá una colación más por tu cuenta.`
    )
  }

  // Día de cocina: principales en tandas + desayunos en tandas.
  // Sólo lo que va a un tupper: una receta que es batch Y rápida (fideos con
  // atún) puede aparecer además "hecha ese día", y eso no se cocina el domingo.
  const batched = assignments.filter(a => a.recipe.batch && a.storage !== 'fresco')
  const batchIds = new Set(batched.map(a => a.recipe.id))
  const tasks: CookTask[] = []
  for (const recipeId of batchIds) {
    const recipe = batched.find(a => a.recipe.id === recipeId)!.recipe
    const own = batched.filter(a => a.recipe.id === recipeId)
    const factor = factors.get(recipeId) ?? 1
    tasks.push({
      recipeId,
      name: recipe.name,
      portions: own.length * people,
      factor,
      fridgePortions: own.filter(a => a.storage === 'heladera').length * people,
      freezerPortions: own.filter(a => a.storage === 'freezer').length * people,
      appliances: resolveAppliances(recipe, options.appliances) ?? recipe.appliances,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      steps: recipe.steps,
      fridgeDays: recipe.storage.fridgeDays,
      freezable: recipe.storage.freezable,
      reheat: recipe.storage.reheat,
      cold: Boolean(recipe.storage.cold),
      ingredients: recipe.ingredients.map(line => ({
        id: line.id,
        name: ingredientById(line.id).name,
        grams: Math.round(line.grams * factor),
      })),
      nutrients: roundNutrients(scaleNutrients(recipeNutrients(recipe), factor)),
      slot: recipe.slot,
    })
  }
  // Lo que hierve solo primero (guisos, legumbres), después el airfryer, después lo corto.
  const rank = (t: CookTask) =>
    (t.slot === 'principal' ? 0 : 10) + (t.appliances.includes('airfryer') ? 1 : 0)
  tasks.sort((a, b) => rank(a) - rank(b) || b.cookMinutes - a.cookMinutes)
  const prep = tasks.reduce((s, t) => s + t.prepMinutes, 0)
  const cookSum = tasks.reduce((s, t) => s + t.cookMinutes, 0)
  const estimatedMinutes = Math.round((prep + cookSum * 0.6) / 5) * 5
  const containers = tasks.reduce((s, t) => s + t.portions, 0)
  const freezerContainers = tasks.reduce((s, t) => s + t.freezerPortions, 0)

  // Lista de compras.
  const useGrams = new Map<string, number>()
  for (const meal of meals) {
    const recipe = RECIPES.find(r => r.id === meal.recipeId)!
    for (const line of recipe.ingredients) {
      useGrams.set(line.id, (useGrams.get(line.id) ?? 0) + line.grams * meal.factor * people)
    }
  }
  for (const [id, grams] of boostGrams) {
    useGrams.set(id, (useGrams.get(id) ?? 0) + grams * people)
  }
  const lines: ShoppingLine[] = []
  for (const [id, grams] of useGrams) {
    const ingredient = ingredientById(id)
    const price = prices[id]
    if (!price) continue
    const buyGrams = grams / (1 - ingredient.waste)
    const packs = Math.max(1, Math.ceil(buyGrams / price.packGrams - 1e-9))
    const perGram = price.pricePerPack / price.packGrams
    lines.push({
      ingredientId: id,
      name: ingredient.name,
      category: ingredient.category,
      pantry: Boolean(ingredient.pantry),
      byWeight: Boolean(ingredient.byWeight),
      useGrams: Math.round(grams),
      buyGrams: Math.round(buyGrams),
      packs,
      packLabel: ingredient.pack.label,
      packGrams: price.packGrams,
      pricePerPack: price.pricePerPack,
      // La despensa (aceite, sal, cocoa, harina) no se compra entera cada semana:
      // se cobra lo que se usa. Lo demás, paquetes enteros.
      gondolaCost: ingredient.pantry
        ? Math.round(perGram * buyGrams)
        : Math.round(packs * price.pricePerPack),
      usedCost: Math.round(perGram * buyGrams),
      source: price.source,
      articleName: price.articleName,
      day: price.day,
      asOf: price.asOf,
      note: price.note,
    })
  }
  const categoryOrder: IngredientCategory[] = [
    'carniceria',
    'verduleria',
    'lacteos',
    'almacen',
    'despensa',
  ]
  lines.sort(
    (a, b) =>
      Number(a.pantry) - Number(b.pantry) ||
      categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) ||
      b.usedCost - a.usedCost
  )
  const gondolaTotal = lines.reduce((s, l) => s + l.gondolaCost, 0)
  const usedTotal = lines.reduce((s, l) => s + l.usedCost, 0)
  const measuredTotal = lines.filter(l => l.source === 'sipc').reduce((s, l) => s + l.usedCost, 0)
  const priceDay = lines.find(l => l.day)?.day ?? null
  if (!priceDay) {
    warnings.push('El SIPC no contestó: todos los precios son estimados de septiembre de 2026.')
  }

  return {
    targets,
    options: { ...options, people },
    days,
    mains: mains.map(m => ({
      recipeId: m.id,
      name: m.name,
      // Sólo las porciones en tandas: un principal que además es rápido puede
      // volver a aparecer "hecho ese día" y eso no es un tupper.
      portions: mainAssign.assignments.filter(a => a.recipe.id === m.id && a.storage !== 'fresco')
        .length,
    })),
    cook: { tasks, estimatedMinutes, containers, freezerContainers },
    shopping: {
      lines,
      gondolaTotal,
      usedTotal,
      measuredTotal,
      estimatedTotal: usedTotal - measuredTotal,
      perDay: Math.round(usedTotal / DAYS.length / people),
      perMeal: Math.round(usedTotal / (DAYS.length * SLOTS.length) / people),
      priceDay,
    },
    weekAverage,
    adherence,
    adjustments,
    warnings,
    seed: options.seed,
  }
}

export const DEFAULT_PROFILE: Profile = Object.freeze({
  sex: 'm',
  age: 30,
  heightCm: 175,
  weightKg: 78,
  activity: 'ligero',
  goal: 'mantener',
})

export const DEFAULT_OPTIONS: PlanOptions = Object.freeze({
  people: 1,
  restrictions: [],
  appliances: ['airfryer', 'microondas', 'anafe'],
  hasFreezer: true,
  seed: 1,
})
