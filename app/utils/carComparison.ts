import { carKeyValid } from './cars'
import type { PublicCarEquipment, PublicCarListing } from './carsPublic'

export const CAR_COMPARISON_PATH = '/autos-usados-uruguay/comparar'
export const CAR_COMPARISON_LIMIT = 3

/** Public advert IDs only; never accept URLs, Mongo operators or an unbounded selection. */
export function carComparisonKeys(value: unknown): string[] {
  const input = Array.isArray(value) ? value.filter(v => typeof v === 'string') : [value]
  const keys = input.flatMap(v => (typeof v === 'string' ? v.slice(0, 500).split(',') : []))
  return [...new Set(keys.map(key => key.trim()).filter(carKeyValid))].slice(
    0,
    CAR_COMPARISON_LIMIT
  )
}

export function carComparisonLocation(value: unknown) {
  const keys = carComparisonKeys(value)
  return {
    path: CAR_COMPARISON_PATH,
    query: keys.length ? { autos: keys.join(',') } : {},
  }
}

/** Absence in a seller's spec sheet is unknown, never "no". Contradictions stay unknown too. */
export function carComparisonEquipment(
  car: Pick<PublicCarListing, 'specs'>,
  equipment: PublicCarEquipment
): boolean | null {
  if (!car.specs) return null
  const yes = car.specs.equipment.includes(equipment)
  const no = car.specs.missing.includes(equipment)
  return yes === no ? null : yes
}

/** Declared risks include mechanical failure and intensive use, which have no legacy flag. */
export function carComparisonWarningItems(car: Pick<PublicCarListing, 'flags' | 'risks'>) {
  return [
    ...car.flags.map(flag => ({ labelKey: `flagLabels.${flag}`, quote: '' })),
    ...car.risks.map(risk => ({ labelKey: `riskLabels.${risk.category}`, quote: risk.quote })),
  ]
}

export interface CarComparisonEntry {
  car: PublicCarListing
  stale: boolean
}

export interface CarComparisonResponse {
  items: CarComparisonEntry[]
  missing: string[]
}

/** Preserve the sender's order, including when Mongo returns the rows in a different order. */
export function assembleCarComparison(
  keys: string[],
  cars: PublicCarListing[],
  freshDays: number,
  now = Date.now()
): CarComparisonResponse {
  const byKey = new Map(cars.map(car => [car.key, car]))
  const items: CarComparisonEntry[] = []
  const missing: string[] = []
  for (const key of carComparisonKeys(keys)) {
    const car = byKey.get(key)
    if (!car) {
      missing.push(key)
      continue
    }
    const lastSeen = Date.parse(car.lastSeen)
    items.push({
      car,
      stale: !Number.isFinite(lastSeen) || now - lastSeen > freshDays * 86_400_000,
    })
  }
  return { items, missing }
}
