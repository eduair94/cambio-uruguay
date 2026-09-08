// La proyección del documento de canasta del backend a lo que la calculadora
// necesita.
//
// Existe como función pura y no inline en la ruta porque ya se rompió una vez
// exactamente así: el campo `nationalCost` se agregó al backend y al tipo de la
// página, la ruta lo dejó afuera de su proyección, y el bloque simplemente no
// renderizó — sin error, sin test rojo, sin nada que avisara. Una proyección que
// se puede testear es una proyección que no pierde campos en silencio.
//
// Se proyecta en vez de reenviar el documento entero a propósito: el documento
// trae `cheapestStores` y `shelfVerdicts`, que son decenas de filas que esta
// página no usa y que inflarían el payload de cada visita.

export interface MeasuredBasketCost {
  food: number
  nonFood: number
  total: number
  itemsPriced: number
  foodItems: number
  nonFoodItems: number
  items: number
}

export interface MeasuredBasket {
  day: string | null
  basketVersion: number | null
  basketItems: number | null
  qualifiedStores: number | null
  nationalRatio: number | null
  nationalCost: MeasuredBasketCost | null
}

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/**
 * El costo nacional, o null si el documento no lo trae.
 *
 * Un documento guardado antes de que el campo existiera devuelve null y no un
 * objeto de ceros: un cero acá se lee como "la comida sale $0", no como
 * "todavía no lo medimos".
 */
export function projectBasketCost(raw: unknown): MeasuredBasketCost | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  const food = num(c.food)
  const nonFood = num(c.nonFood)
  const itemsPriced = num(c.itemsPriced)
  if (food === null || nonFood === null || !itemsPriced) return null
  return {
    food,
    nonFood,
    total: num(c.total) ?? food + nonFood,
    itemsPriced,
    foodItems: num(c.foodItems) ?? 0,
    nonFoodItems: num(c.nonFoodItems) ?? 0,
    items: num(c.items) ?? itemsPriced,
  }
}

/** El documento de canasta proyectado, o null cuando no hay lectura usable. */
export function projectBasket(raw: unknown): MeasuredBasket | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  if (typeof b.day !== 'string' || !b.day) return null
  return {
    day: b.day,
    basketVersion: num(b.basketVersion),
    basketItems: num(b.basketItems),
    qualifiedStores: num(b.qualifiedStores),
    nationalRatio: num(b.nationalRatio),
    nationalCost: projectBasketCost(b.nationalCost),
  }
}
