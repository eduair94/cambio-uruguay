// El escenario del visitante: presets, validación y cómo viaja en la URL.
//
// Que el escenario entre y salga de la query string no es un adorno: la comparación sólo sirve si se
// puede compartir ("mirá, con MI trayecto el monopatín se paga en 9 meses"), y una página de
// calculadora que no se puede enlazar con sus números puestos no se enlaza nunca.
//
// `app/utils/` es un namespace PLANO, así que todo va con prefijo `transportScenario`/`TRANSPORT_`.
import { TRANSPORT_DEFAULT_SCENARIO, type TransportScenario } from './transportModel'

export interface TransportScenarioPreset {
  slug: string
  label: string
  description: string
  scenario: Partial<TransportScenario>
}

/**
 * Los cuatro trayectos que cubren casi todo lo que la gente pregunta. No son inventados: son las
 * cuatro combinaciones donde el veredicto CAMBIA (corto/largo × todos los días/algunos días), que es
 * lo único que justifica poner un preset en vez de dejar los controles vacíos.
 */
export const TRANSPORT_SCENARIO_PRESETS: readonly TransportScenarioPreset[] = [
  {
    slug: 'barrio-centro',
    label: 'Del barrio al Centro, todos los días',
    description: '7 km, 5 días por semana, ida y vuelta.',
    scenario: { distanceKm: 7, daysPerWeek: 5, tripsPerDay: 2 },
  },
  {
    slug: 'cerca',
    label: 'Cerca, pero todos los días',
    description:
      '3 km, 5 días por semana. La distancia donde caminar y el monopatín compiten en serio.',
    scenario: { distanceKm: 3, daysPerWeek: 5, tripsPerDay: 2 },
  },
  {
    slug: 'lejos',
    label: 'Lejos, todos los días',
    description: '15 km, 5 días por semana. Acá el ómnibus deja de ser el más rápido.',
    scenario: { distanceKm: 15, daysPerWeek: 5, tripsPerDay: 2 },
  },
  {
    slug: 'medio-tiempo',
    label: 'Tres días por semana',
    description:
      '7 km, 3 días. La mitad de los viajes cambia el punto de equilibrio más que la distancia.',
    scenario: { distanceKm: 7, daysPerWeek: 3, tripsPerDay: 2 },
  },
]

const NUMBER_KEYS = [
  'distanceKm',
  'daysPerWeek',
  'tripsPerDay',
  'horizonMonths',
  'financingMonths',
  'parkingHoursPerTrip',
  'wageHourlyUyu',
] as const

const BOOLEAN_KEYS = [
  'alreadyOwned',
  'parkingPaid',
  'includeDepreciation',
  'includeTheftRisk',
  'includeRain',
] as const

/** Rangos que la página no deja pasar. Fuera de rango se acota, nunca se rechaza en silencio. */
export const TRANSPORT_SCENARIO_LIMITS: Record<
  (typeof NUMBER_KEYS)[number],
  { min: number; max: number }
> = {
  distanceKm: { min: 0.5, max: 120 },
  daysPerWeek: { min: 1, max: 7 },
  tripsPerDay: { min: 1, max: 8 },
  horizonMonths: { min: 6, max: 120 },
  financingMonths: { min: 1, max: 72 },
  parkingHoursPerTrip: { min: 0, max: 12 },
  wageHourlyUyu: { min: 0, max: 100000 },
}

function clampNumber(key: (typeof NUMBER_KEYS)[number], value: number): number {
  const { min, max } = TRANSPORT_SCENARIO_LIMITS[key]
  return Math.min(max, Math.max(min, value))
}

/** Normaliza cualquier entrada a un escenario usable, sin tirar nunca. */
export function transportScenarioNormalize(
  input: Partial<TransportScenario> | null | undefined
): TransportScenario {
  const scenario: TransportScenario = { ...TRANSPORT_DEFAULT_SCENARIO }
  if (!input) return scenario
  for (const key of NUMBER_KEYS) {
    const raw = input[key]
    if (raw == null) continue
    const value = typeof raw === 'string' ? Number(raw) : raw
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    if (key === 'wageHourlyUyu') {
      scenario.wageHourlyUyu = value > 0 ? clampNumber(key, value) : null
      continue
    }
    scenario[key] = clampNumber(key, value)
  }
  for (const key of BOOLEAN_KEYS) {
    const raw = input[key]
    if (typeof raw === 'boolean') scenario[key] = raw
  }
  if (input.financing === 'contado' || input.financing === 'cuotas')
    scenario.financing = input.financing
  if (input.condition === 'nuevo' || input.condition === 'usado')
    scenario.condition = input.condition
  return scenario
}

/** Claves cortas para que la URL sea compartible y no un párrafo. */
const QUERY_KEYS: Record<string, keyof TransportScenario> = {
  km: 'distanceKm',
  d: 'daysPerWeek',
  v: 'tripsPerDay',
  h: 'horizonMonths',
  f: 'financing',
  n: 'financingMonths',
  t: 'alreadyOwned',
  p: 'parkingPaid',
  ph: 'parkingHoursPerTrip',
  c: 'condition',
  w: 'wageHourlyUyu',
  dep: 'includeDepreciation',
  rob: 'includeTheftRisk',
  llu: 'includeRain',
}

export function transportScenarioFromQuery(query: Record<string, unknown>): TransportScenario {
  const partial: Record<string, unknown> = {}
  for (const [short, key] of Object.entries(QUERY_KEYS)) {
    const raw = query[short]
    if (raw == null || raw === '') continue
    const value = Array.isArray(raw) ? raw[0] : raw
    if (BOOLEAN_KEYS.includes(key as (typeof BOOLEAN_KEYS)[number])) {
      partial[key] = value === '1' || value === 'true' || value === true
      continue
    }
    partial[key] = value
  }
  return transportScenarioNormalize(partial as Partial<TransportScenario>)
}

/** Sólo lo que difiere del default viaja en la URL: un enlace con quince parámetros no se comparte. */
export function transportScenarioToQuery(scenario: TransportScenario): Record<string, string> {
  const query: Record<string, string> = {}
  for (const [short, key] of Object.entries(QUERY_KEYS)) {
    const value = scenario[key]
    const fallback = TRANSPORT_DEFAULT_SCENARIO[key]
    if (value === fallback || value == null) continue
    query[short] = typeof value === 'boolean' ? (value ? '1' : '0') : String(value)
  }
  return query
}
