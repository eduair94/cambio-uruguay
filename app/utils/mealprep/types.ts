// El dominio del planificador de viandas (/meal-prep-uruguay).
//
// Módulo puro: sin Vue, sin fetch. Lo importan la página, la ruta de precios y
// los tests. Vive en un subdirectorio a propósito: `app/utils/` es un namespace
// PLANO de auto-imports y estos nombres (Recipe, Ingredient…) chocarían.

export type MealSlot = 'desayuno' | 'almuerzo' | 'merienda' | 'cena'

/** Qué turno puede ocupar una receta. `principal` = almuerzo o cena. */
export type RecipeSlot = 'desayuno' | 'principal' | 'merienda'

export type Appliance = 'airfryer' | 'microondas' | 'anafe' | 'horno' | 'sin-coccion'

export type ProteinSource =
  | 'pollo'
  | 'carne'
  | 'huevo'
  | 'pescado'
  | 'legumbre'
  | 'lacteo'
  | 'ninguna'

export type IngredientCategory = 'carniceria' | 'verduleria' | 'almacen' | 'lacteos' | 'despensa'

/** Lo que decide las restricciones: se deriva de los ingredientes, no se declara por receta. */
export type IngredientKind = 'carne-roja' | 'ave' | 'pescado' | 'huevo' | 'lacteo' | 'vegetal'

export interface Nutrients {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface SipcMatch {
  /** Contra `name` del artículo de `GET /precios/articles`. */
  pattern: RegExp
  /**
   * Gramos comestibles que trae UNA unidad del artículo cuando el catálogo no
   * lo dice (huevos "6 Unidades", lechuga "1 Unidades") o cuando lo que se come
   * pesa menos que lo que se compra (arvejas 300 g brutos → 200 g escurridos).
   */
  edibleGrams?: number
  /** Multiplicador declarado (pechuga ≈ 1,9× el kilo de pollo entero). */
  factor?: number
  /** Por qué el factor, en una frase; se muestra al lado del precio. */
  note?: string
}

export interface IngredientPrice {
  sipc?: SipcMatch
  /** Pesos por `pack.grams`, fechado. Se usa sólo si no hay SIPC o el SIPC no matchea hoy. */
  estimateUyu: number
  asOf: string
}

export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  kind: IngredientKind
  /** Por 100 g CRUDOS y comestibles. */
  per100: Nutrients
  /** Fracción que se tira (hueso, cáscara). Compra = uso ÷ (1 − waste). */
  waste: number
  /** Unidad de góndola. `grams` es el incremento mínimo de compra. */
  pack: { grams: number; label: string }
  /** Se compra por peso (carne, verdura): el incremento es 100 g y no el paquete. */
  byWeight?: boolean
  price: IngredientPrice
  /** Sal, aceite, especias: se cobran proporcional y se listan aparte. */
  pantry?: boolean
}

export interface RecipeIngredient {
  id: string
  /** Gramos comestibles POR PORCIÓN base. */
  grams: number
}

export interface RecipeStorage {
  /** Días máximos en heladera (≤4 °C) contados desde el día de cocina. 0 = se come ese día. */
  fridgeDays: number
  freezable: boolean
  /** Cómo se recalienta. Va en la etiqueta del tupper. */
  reheat: string
  /** Se come frío o a temperatura ambiente; no se recalienta. */
  cold?: boolean
}

export interface Recipe {
  id: string
  name: string
  slot: RecipeSlot
  /** Todos los que hacen falta. */
  appliances: Appliance[]
  /** Reemplazos aceptados: `{ airfryer: 'horno' }` = si no hay airfryer, sirve el horno. */
  alternatives?: Partial<Record<Appliance, Appliance>>
  protein: ProteinSource
  /** ≤20 min de principio a fin: puede hacerse el mismo día sin batch. */
  quick: boolean
  /** Se cocina el día de cocina y se guarda en tuppers. */
  batch: boolean
  ingredients: RecipeIngredient[]
  steps: string[]
  prepMinutes: number
  cookMinutes: number
  storage: RecipeStorage
  /** Una línea de por qué está en la lista (para la ficha). */
  why?: string
}

export type Sex = 'f' | 'm'
export type Activity = 'sedentario' | 'ligero' | 'moderado' | 'alto' | 'muy-alto'
export type Goal = 'mantener' | 'bajar' | 'subir'

export interface Profile {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: Activity
  goal: Goal
}

export type Restriction = 'vegetariano' | 'sin-pescado' | 'sin-carne-roja' | 'sin-lactosa'

export interface PlanOptions {
  people: number
  restrictions: Restriction[]
  appliances: Appliance[]
  hasFreezer: boolean
  seed: number
}

export interface PricedIngredient {
  pricePerPack: number
  packGrams: number
  source: 'sipc' | 'estimado'
  /** Nombre del artículo del SIPC que se tomó, o de los que se promediaron. */
  articleName?: string
  /** Día de medición del SIPC. */
  day?: string
  asOf?: string
  note?: string
}

export type PriceMap = Record<string, PricedIngredient>
