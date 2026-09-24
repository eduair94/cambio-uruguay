// El asesor de compra (/que-auto-comprar-uruguay): de lo que la persona contesta a una lista corta
// de modelo + año que puede comprar hoy, con el por qué, lo que resigna y cuánto cuesta tenerlo.
//
// Corre en el servidor por pedido (/api/cars/advisor) sobre la tabla chica que arma el job
// (`caradvisorsnapshots`, classes/autos/advisor.ts): el análisis pesado ya está hecho, acá sólo se
// filtra y se ordena. Es pura para que los tests la ejerciten sin Nuxt.
//
// TRES DECISIONES QUE LA PÁGINA TIENE QUE PODER EXPLICAR:
//  * El año se elige por la MEDIANA: "con tu plata llegás a un 2019" quiere decir que la mitad de
//    los 2019 entra. El año siguiente aparece aparte si su cuarto más barato entra ("negociando").
//  * Los puntajes son RELATIVOS al grupo que pasó los filtros. Un auto no es "bueno en repuestos"
//    en abstracto: es más barato de mantener que las otras opciones que tenés.
//  * Lo que falta no castiga ni premia: vale el punto medio y se dice. Un modelo sin relevamiento de
//    repuestos no es un modelo con repuestos caros.
import { CAR_BODY_TYPES, CAR_FUELS, formatCarUsd } from './cars'
import { CAR_ADVISOR_FIGURES, estimatePatenteUyu, type LatinNcapEntry } from './carAdvisorFigures'
import { latinNcapResults } from './latinNcap'
import type {
  PublicCarAdvisorModel,
  PublicCarAdvisorParts,
  PublicCarAdvisorShare,
  PublicCarAdvisorSnapshot,
  PublicCarAdvisorVariant,
  PublicCarBodyType,
  PublicCarFuel,
  PublicCarPartPrice,
  PublicCarTransmission,
} from './carsPublic'
import { TRANSPORT_MODE_ASSUMPTIONS } from './transportAssumptions'

export type CarAdvisorUse = 'ciudad' | 'mixto' | 'ruta' | 'carga' | 'campo'
export type CarAdvisorPriority =
  | 'costo'
  | 'reventa'
  | 'repuestos'
  | 'seguridad'
  | 'espacio'
  | 'nuevo'
export type CarAdvisorExclusion =
  | 'presupuesto'
  | 'caja'
  | 'combustible'
  | 'carroceria'
  | 'uso'
  | 'plazas'
  | 'debajo'

export const CAR_ADVISOR_USES: ReadonlyArray<{
  value: CarAdvisorUse
  title: string
  hint: string
}> = [
  { value: 'ciudad', title: 'Ciudad', hint: 'Trayectos cortos, estacionar en la calle.' },
  { value: 'mixto', title: 'Ciudad y ruta', hint: 'Lo de todos los días y alguna escapada.' },
  { value: 'ruta', title: 'Mucha ruta', hint: 'Viajes largos: consumo y potencia pesan más.' },
  { value: 'carga', title: 'Trabajo y carga', hint: 'Pick-up, furgón o rural.' },
  { value: 'campo', title: 'Campo y balasto', hint: 'Pick-up o SUV, mejor si hay 4x4.' },
]

export const CAR_ADVISOR_PRIORITIES: ReadonlyArray<{
  value: CarAdvisorPriority
  title: string
}> = [
  { value: 'costo', title: 'Que salga poco tenerlo' },
  { value: 'repuestos', title: 'Repuestos baratos y fáciles' },
  { value: 'reventa', title: 'Que no pierda valor' },
  { value: 'seguridad', title: 'Seguridad' },
  { value: 'espacio', title: 'Espacio' },
  { value: 'nuevo', title: 'Lo más nuevo posible' },
]

export const CAR_ADVISOR_KM_STEPS = [5_000, 10_000, 15_000, 20_000, 30_000, 45_000] as const
export const CAR_ADVISOR_DEFAULT_KM = 12_000
const MAX_PRIORITIES = 3
const MAX_RESULTS = 8
/** Una prioridad elegida pesa esto contra 1 de lo demás. */
const PRIORITY_WEIGHT = 3
/**
 * El tamaño típico de cada carrocería, de 0 a 1. Sólo ordena el espacio cuando la ficha no dice
 * baúl, largo ni plazas; no se publica en ningún lado.
 */
const BODY_SPACE: Record<PublicCarBodyType, number> = {
  coupe: 0.1,
  cabriolet: 0.1,
  hatchback: 0.25,
  sedan: 0.5,
  pickup: 0.6,
  suv: 0.65,
  rural: 0.7,
  monovolumen: 0.9,
  furgon: 0.9,
}
/** En una pick-up o un furgón el largo es la caja: no dice nada del lugar para pasajeros. */
const CARGO_BODIES: readonly PublicCarBodyType[] = ['pickup', 'furgon']
/** Un auto que usa menos que esto del presupuesto no es lo que busca quien lo dijo. */
const MIN_BUDGET_USE = 0.4
/** Carrocerías donde más de cinco plazas es un error de la ficha, no un dato. */
const FIVE_SEAT_BODIES: readonly PublicCarBodyType[] = ['hatchback', 'sedan', 'coupe', 'cabriolet']
/** Arriba de esto, el baúl de un auto chico está medido con los asientos rebatidos. */
const MAX_SMALL_TRUNK_L = 600

/**
 * Lo que la ficha dice y no puede ser: un hatchback de 7 plazas, o un baúl de 985 litros en un auto
 * chico (es la cifra con los asientos rebatidos). Se trata como que la ficha no lo dice.
 */
function sensibleModel(model: PublicCarAdvisorModel): PublicCarAdvisorModel {
  const small = !!model.body && FIVE_SEAT_BODIES.includes(model.body)
  const seats = model.seats
  const badSeats = seats !== null && (seats < 2 || (seats > 5 && small))
  const badTrunk = model.trunkL !== null && small && model.trunkL > MAX_SMALL_TRUNK_L
  return badSeats || badTrunk
    ? { ...model, seats: badSeats ? null : seats, trunkL: badTrunk ? null : model.trunkL }
    : model
}

export interface CarAdvisorQuery {
  /** Presupuesto de compra en dólares. */
  budget: number | null
  use: CarAdvisorUse
  kmYear: number
  people: number
  transmission: PublicCarTransmission | ''
  fuels: PublicCarFuel[]
  bodies: PublicCarBodyType[]
  priorities: CarAdvisorPriority[]
  /** Lo máximo que la persona puede gastar por mes en tener el auto, en pesos. */
  monthlyMax: number | null
}

const first = (value: unknown): string => {
  const raw = Array.isArray(value) ? value.join(',') : value
  return typeof raw === 'string' ? raw.trim().slice(0, 200) : ''
}

function whole(value: unknown, min: number, max: number): number | null {
  const raw = first(value)
    .replace(/u\$s|us\$|usd|\$/gi, '')
    .replace(/[.,\s]/g, '')
  if (!/^\d+$/.test(raw)) return null
  const parsed = Number(raw)
  return parsed >= min && parsed <= max ? parsed : null
}

function listOf<T extends string>(value: unknown, allowed: readonly T[], max = 20): T[] {
  const picked: T[] = []
  for (const item of first(value).split(',')) {
    const candidate = item.trim() as T
    if (allowed.includes(candidate) && !picked.includes(candidate)) picked.push(candidate)
  }
  return picked.slice(0, max)
}

const ADVISOR_FUELS = CAR_FUELS.filter(fuel => fuel !== 'gnc')

/** El formulario de la página, armado desde la URL: así un enlace con respuestas deja todo completo. */
export interface CarAdvisorDraft {
  presupuesto: string
  uso: CarAdvisorUse
  km: number
  personas: number
  caja: string
  combustible: string[]
  carroceria: string[]
  prioridad: string[]
  gastoMes: string
}

export function carAdvisorDraft(query: CarAdvisorQuery): CarAdvisorDraft {
  return {
    presupuesto: query.budget === null ? '' : String(query.budget),
    uso: query.use,
    km: query.kmYear,
    personas: query.people,
    caja: query.transmission,
    combustible: [...query.fuels],
    carroceria: [...query.bodies],
    prioridad: [...query.priorities],
    gastoMes: query.monthlyMax === null ? '' : String(query.monthlyMax),
  }
}

export function normalizeCarAdvisorQuery(input: Record<string, unknown>): CarAdvisorQuery {
  const use = CAR_ADVISOR_USES.find(item => item.value === first(input.uso))?.value ?? 'mixto'
  const transmission = first(input.caja)
  return {
    budget: whole(input.presupuesto, 1_000, 500_000),
    use,
    kmYear: whole(input.km, 1_000, 100_000) ?? CAR_ADVISOR_DEFAULT_KM,
    people: whole(input.personas, 1, 9) ?? 2,
    transmission: transmission === 'manual' || transmission === 'automatica' ? transmission : '',
    fuels: listOf(input.combustible, ADVISOR_FUELS),
    bodies: listOf(input.carroceria, CAR_BODY_TYPES),
    priorities: listOf(
      input.prioridad,
      CAR_ADVISOR_PRIORITIES.map(item => item.value),
      MAX_PRIORITIES
    ),
    monthlyMax: whole(input.gastoMes, 1_000, 1_000_000),
  }
}

/** La consulta como va en la URL: sólo lo que difiere de lo que se asume sin preguntar. */
export function carAdvisorQueryParams(query: CarAdvisorQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.budget !== null) params.presupuesto = String(query.budget)
  if (query.use !== 'mixto') params.uso = query.use
  if (query.kmYear !== CAR_ADVISOR_DEFAULT_KM) params.km = String(query.kmYear)
  if (query.people !== 2) params.personas = String(query.people)
  if (query.transmission) params.caja = query.transmission
  if (query.fuels.length) params.combustible = query.fuels.join(',')
  if (query.bodies.length) params.carroceria = query.bodies.join(',')
  if (query.priorities.length) params.prioridad = query.priorities.join(',')
  if (query.monthlyMax !== null) params.gastoMes = String(query.monthlyMax)
  return params
}

export interface CarAdvisorCosts {
  fuelUyu: number
  patenteUyu: number
  soaUyu: number
  maintenanceUyu: number
  depreciationUyu: number
  /** Todo, depreciación incluida: lo que cuesta de verdad tener el auto un año. */
  annualUyu: number
  /** Lo que sale del bolsillo por mes: combustible, patente, SOA y mantenimiento. */
  monthlyCashUyu: number
  /** L/100 km, o kWh/100 km en un eléctrico. */
  consumption: number | null
  consumptionEstimated: boolean
  /** La caída anual no es la del modelo sino la típica del mercado. */
  depreciationFromMarket: boolean
  /** Ni el modelo ni el mercado tienen curva: la depreciación es "sin dato", no cero. */
  depreciationKnown: boolean
}

export type CarAdvisorScoreKey = CarAdvisorPriority | 'uso'

export interface CarAdvisorResult {
  marketSlug: string
  brand: string
  model: string
  fuel: PublicCarFuel
  transmission: PublicCarTransmission
  year: number
  price: { p25: number; median: number; p75: number }
  n: number
  kmMedian: number | null
  adverts: number
  stretch: { year: number; p25: number } | null
  costs: CarAdvisorCosts
  parts: PublicCarAdvisorParts | null
  /**
   * El relevamiento tiene piezas suficientes para afirmar algo. Un modelo leído sin ninguna pieza
   * con precio suele ser un nombre que el buscador no reconoce, no un modelo sin repuestos.
   */
  partsMeasured: boolean
  annualDrop: number | null
  safety: {
    /**
     * Los ensayos de Latin NCAP del modelo, los más cercanos al año primero. No dicen a qué años de
     * modelo aplican, así que se muestran y no puntúan (utils/latinNcap.ts).
     */
    ncap: LatinNcapEntry[]
    esc: PublicCarAdvisorShare | null
    airbags: PublicCarAdvisorShare | null
    abs: PublicCarAdvisorShare | null
    isofix: PublicCarAdvisorShare | null
  }
  space: {
    seats: number | null
    trunkL: number | null
    lengthMm: number | null
    body: PublicCarBodyType | null
    fourByFour: PublicCarAdvisorShare | null
  }
  score: number
  scores: Record<CarAdvisorScoreKey, number>
  reasons: string[]
  tradeoffs: string[]
  overMonthly: boolean
  /** Los filtros del directorio (/autos-usados-uruguay) que muestran estos autos. */
  listingsQuery: Record<string, string>
}

export interface CarAdvisorResponse {
  results: CarAdvisorResult[]
  /** Variantes que pasaron todos los filtros. */
  considered: number
  excluded: Array<{ reason: CarAdvisorExclusion; count: number }>
  /** Si nada entra en el presupuesto: desde cuánto empieza a haber algo, con los mismos filtros. */
  minimumBudget: number | null
}

export interface CarAdvisorFuelPrices {
  super95: number
  gasoil50s: number
}

interface Candidate {
  model: PublicCarAdvisorModel
  variant: PublicCarAdvisorVariant
  row: PublicCarAdvisorVariant['years'][number]
  stretch: { year: number; p25: number } | null
  costs: CarAdvisorCosts
}

const median = (values: readonly number[]): number | null => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/** Min-max al grupo; sin dato o sin diferencias, el punto medio. */
function normalizer(values: ReadonlyArray<number | null>, higherIsBetter: boolean) {
  const known = values.filter((value): value is number => value !== null && Number.isFinite(value))
  const min = Math.min(...known)
  const max = Math.max(...known)
  return (value: number | null): number => {
    if (value === null || !Number.isFinite(value) || !known.length || max === min) return 0.5
    const scaled = (value - min) / (max - min)
    return higherIsBetter ? scaled : 1 - scaled
  }
}

const mean = (values: number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length

const pct = (value: number): string => `${Math.round(value * 100)} %`
const grouped = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const uyu = (value: number): string => `$ ${grouped(value)}`
const decimal = (value: number): string => value.toFixed(1).replace('.', ',')

function bodyAllowed(
  model: PublicCarAdvisorModel,
  query: CarAdvisorQuery
): CarAdvisorExclusion | null {
  if (query.bodies.length && (!model.body || !query.bodies.includes(model.body)))
    return 'carroceria'
  if (query.use === 'carga' && !['pickup', 'furgon', 'rural'].includes(model.body ?? ''))
    return 'uso'
  if (query.use === 'campo' && !['pickup', 'suv'].includes(model.body ?? '')) return 'uso'
  return null
}

function costsOf(
  model: PublicCarAdvisorModel,
  variant: PublicCarAdvisorVariant,
  priceUsd: number,
  year: number,
  query: CarAdvisorQuery,
  context: {
    usdUyu: number
    typicalDrop: number | null
    prices: CarAdvisorFuelPrices
    fuelFallback: Map<PublicCarFuel, number>
  }
): CarAdvisorCosts {
  let consumption = variant.litersPer100Km
  let consumptionEstimated = false
  let fuelUyu: number
  if (variant.fuel === 'electrico') {
    consumption = CAR_ADVISOR_FIGURES.evKwhPer100Km.value
    consumptionEstimated = true
    fuelUyu = (consumption * query.kmYear * CAR_ADVISOR_FIGURES.kwhUyu.value) / 100
  } else {
    if (consumption === null) {
      consumption =
        context.fuelFallback.get(variant.fuel) ??
        TRANSPORT_MODE_ASSUMPTIONS.auto.consumptionPer100Km.value
      consumptionEstimated = true
    }
    const perLiter = variant.fuel === 'diesel' ? context.prices.gasoil50s : context.prices.super95
    fuelUyu = (consumption * query.kmYear * perLiter) / 100
  }
  const patenteUyu = estimatePatenteUyu(priceUsd, variant.fuel, year)
  const soaUyu = CAR_ADVISOR_FIGURES.soaUyu.value
  const maintenanceUyu =
    CAR_ADVISOR_FIGURES.maintenanceFixedUyu.value +
    CAR_ADVISOR_FIGURES.maintenancePerKmUyu.value * query.kmYear * (model.parts?.index ?? 1)
  const drop = model.annualDrop ?? context.typicalDrop
  const depreciationUyu = drop === null ? 0 : drop * priceUsd * context.usdUyu
  const cash = fuelUyu + patenteUyu + soaUyu + maintenanceUyu
  return {
    fuelUyu,
    patenteUyu,
    soaUyu,
    maintenanceUyu,
    depreciationUyu,
    annualUyu: cash + depreciationUyu,
    monthlyCashUyu: cash / 12,
    consumption,
    consumptionEstimated,
    depreciationFromMarket: model.annualDrop === null && drop !== null,
    depreciationKnown: drop !== null,
  }
}

/** Lo mismo que PART_INDEX_MIN_PARTS de classes/autos/repuestos.ts: debajo, no hay nada que afirmar. */
const PARTS_MIN_MEASURED = 3
const partsMeasured = (parts: PublicCarAdvisorParts | null): parts is PublicCarAdvisorParts =>
  !!parts && parts.parts.length >= PARTS_MIN_MEASURED

const shareValue = (share: PublicCarAdvisorShare | null): number | null =>
  share && share.n >= 5 ? share.share : null

function safetyRaw(candidate: Candidate): number | null {
  const equipment = [candidate.model.esc, candidate.model.airbags, candidate.model.abs]
    .map(shareValue)
    .filter((value): value is number => value !== null)
  return equipment.length ? mean(equipment) : null
}

function explain(
  candidate: Candidate,
  query: CarAdvisorQuery,
  group: Candidate[],
  typicalDrop: number | null
): { reasons: string[]; tradeoffs: string[] } {
  const { model, row, costs } = candidate
  const newest = candidate.variant.years[0]?.year === row.year
  const reasons: string[] = [
    newest
      ? `El más nuevo a la venta es un ${row.year}: la mitad de sus ${row.n} avisos se pide hasta ${formatCarUsd(row.median)}.`
      : `Con ${formatCarUsd(query.budget ?? row.median)} llegás a un ${row.year}: la mitad de los ${row.n} avisos de ese año se pide hasta ${formatCarUsd(row.median)}.`,
  ]
  const tradeoffs: string[] = []

  const cash = group.map(item => item.costs.monthlyCashUyu).sort((a, b) => a - b)
  const third = cash[Math.floor(cash.length / 3)] ?? 0
  const top = cash[Math.floor((cash.length * 2) / 3)] ?? Infinity
  if (group.length >= 3 && costs.monthlyCashUyu <= third)
    reasons.push(
      `Tenerlo sale ${uyu(costs.monthlyCashUyu)} por mes con ${grouped(query.kmYear)} km al año, de lo más bajo de tus opciones.`
    )
  else if (group.length >= 3 && costs.monthlyCashUyu > top)
    tradeoffs.push(
      `Es de los más caros de mantener entre tus opciones: ${uyu(costs.monthlyCashUyu)} por mes.`
    )

  const parts = partsMeasured(model.parts) ? model.parts : null
  if (parts?.index != null && parts.index <= 0.9)
    reasons.push(
      `Repuestos ${pct(1 - parts.index)} más baratos que el modelo típico, con ${parts.offers} avisos de repuestos en Mercado Libre.`
    )
  else if (parts?.index != null && parts.index >= 1.15)
    tradeoffs.push(`Repuestos ${pct(parts.index - 1)} más caros que el modelo típico.`)
  if (parts && parts.offers < 15)
    tradeoffs.push(`Pocos avisos de repuestos en Mercado Libre (${parts.offers}): preguntá antes.`)

  if (model.annualDrop !== null && typicalDrop !== null) {
    if (model.annualDrop <= typicalDrop * 0.85)
      reasons.push(
        `Pierde ${pct(model.annualDrop)} de valor por año, menos que el ${pct(typicalDrop)} del auto típico.`
      )
    else if (model.annualDrop >= typicalDrop * 1.25)
      tradeoffs.push(
        `Pierde ${pct(model.annualDrop)} de valor por año; el auto típico, ${pct(typicalDrop)}.`
      )
  }

  const esc = shareValue(model.esc)
  if (esc !== null && esc >= 0.8)
    reasons.push(`${pct(esc)} de las fichas de este modelo declara control de estabilidad.`)
  else if (esc !== null && esc <= 0.2)
    tradeoffs.push(`Sólo ${pct(esc)} de las fichas declara control de estabilidad.`)

  if (costs.consumption !== null && !costs.consumptionEstimated && costs.consumption <= 6.5)
    reasons.push(`Consume unos ${decimal(costs.consumption)} L/100 km.`)

  if (model.adverts >= 150)
    reasons.push(`Hay ${model.adverts} avisos: fácil de encontrar y de revender.`)
  else if (model.adverts < 25)
    tradeoffs.push(`Pocos avisos (${model.adverts}): menos para elegir y más lento para revender.`)

  if (model.seats === null && query.people > 4)
    tradeoffs.push(`Ninguna ficha dice cuántas plazas tiene: confirmá que entren ${query.people}.`)
  if (model.declaredRiskShare >= 0.08)
    tradeoffs.push(
      `${pct(model.declaredRiskShare)} de sus avisos declara choque, deuda o papeles: revisá bien cada uno.`
    )

  return { reasons: reasons.slice(0, 4), tradeoffs: tradeoffs.slice(0, 3) }
}

export function adviseCars(
  snapshot: PublicCarAdvisorSnapshot,
  query: CarAdvisorQuery,
  prices: CarAdvisorFuelPrices
): CarAdvisorResponse {
  const excluded = new Map<CarAdvisorExclusion, number>()
  const exclude = (reason: CarAdvisorExclusion) =>
    excluded.set(reason, (excluded.get(reason) ?? 0) + 1)
  const empty = { results: [], considered: 0, excluded: [], minimumBudget: null }
  if (query.budget === null) return empty
  const budget = query.budget

  const fuelFallback = new Map<PublicCarFuel, number>()
  for (const fuel of ADVISOR_FUELS) {
    const value = median(
      snapshot.data.models.flatMap(model =>
        model.variants
          .filter(variant => variant.fuel === fuel && variant.litersPer100Km !== null)
          .map(variant => variant.litersPer100Km!)
      )
    )
    if (value !== null) fuelFallback.set(fuel, Math.round(value * 10) / 10)
  }
  const context = {
    usdUyu: snapshot.usdUyu,
    typicalDrop: snapshot.data.typicalDrop,
    prices,
    fuelFallback,
  }

  const candidates: Candidate[] = []
  let cheapestOutOfBudget: number | null = null
  for (const model of snapshot.data.models.map(sensibleModel)) {
    for (const variant of model.variants) {
      if (query.transmission && variant.transmission !== query.transmission) {
        exclude('caja')
        continue
      }
      if (query.fuels.length && !query.fuels.includes(variant.fuel)) {
        exclude('combustible')
        continue
      }
      const bodyReason = bodyAllowed(model, query)
      if (bodyReason) {
        exclude(bodyReason)
        continue
      }
      if (model.seats !== null && model.seats < query.people) {
        exclude('plazas')
        continue
      }
      const index = variant.years.findIndex(year => year.median <= budget)
      if (index === -1) {
        exclude('presupuesto')
        const cheapest = Math.min(...variant.years.map(year => year.median))
        cheapestOutOfBudget =
          cheapestOutOfBudget === null ? cheapest : Math.min(cheapestOutOfBudget, cheapest)
        continue
      }
      const row = variant.years[index]!
      const newer = index > 0 ? variant.years[index - 1]! : null
      candidates.push({
        model,
        variant,
        row,
        stretch: newer && newer.p25 <= budget ? { year: newer.year, p25: newer.p25 } : null,
        costs: costsOf(model, variant, row.median, row.year, query, context),
      })
    }
  }
  // Quien dice "tengo US$ 20.000" no busca un auto de 6.000: un modelo cuyo año más nuevo usa menos
  // del 40 % del presupuesto queda afuera, salvo que casi nada llegue a ese rango.
  const inRange = candidates.filter(item => item.row.median >= budget * MIN_BUDGET_USE)
  if (inRange.length >= 3 && inRange.length < candidates.length) {
    excluded.set('debajo', candidates.length - inRange.length)
    candidates.splice(0, candidates.length, ...inRange)
  }

  const budgetUse = normalizer(
    candidates.map(item => item.row.median / budget),
    true
  )
  const years = normalizer(
    candidates.map(item => item.row.year),
    true
  )
  const kms = normalizer(
    candidates.map(item => item.row.kmMedian),
    false
  )
  const cash = normalizer(
    candidates.map(item => item.costs.monthlyCashUyu),
    false
  )
  const drops = normalizer(
    candidates.map(item => item.model.annualDrop ?? context.typicalDrop),
    false
  )
  const liquidity = normalizer(
    candidates.map(item => Math.log(item.model.adverts)),
    true
  )
  const partsIndex = normalizer(
    candidates.map(item => (partsMeasured(item.model.parts) ? item.model.parts.index : null)),
    false
  )
  const partsOffers = normalizer(
    candidates.map(item =>
      partsMeasured(item.model.parts) ? Math.log(1 + item.model.parts.offers) : null
    ),
    true
  )
  const safety = normalizer(candidates.map(safetyRaw), true)
  const trunk = normalizer(
    candidates.map(item => item.model.trunkL),
    true
  )
  const seats = normalizer(
    candidates.map(item => item.model.seats),
    true
  )
  const longer = normalizer(
    candidates.map(item => item.model.lengthMm),
    true
  )
  const shorter = normalizer(
    candidates.map(item => item.model.lengthMm),
    false
  )
  const power = normalizer(
    candidates.map(item => item.model.powerHp),
    true
  )
  // En ruta pesa lo que cuesta cada kilómetro, no los litros: un eléctrico mide su consumo en kWh.
  const fuelCost = normalizer(
    candidates.map(item => item.costs.fuelUyu),
    false
  )
  const fourByFour = normalizer(
    candidates.map(item => item.model.fourByFour?.share ?? null),
    true
  )

  const weights: Record<CarAdvisorScoreKey, number> = {
    nuevo: 1,
    costo: 1,
    reventa: 1,
    repuestos: 1,
    seguridad: 1,
    espacio: 1,
    uso: query.use === 'mixto' ? 1 : 2,
  }
  for (const priority of query.priorities) weights[priority] = PRIORITY_WEIGHT

  const scored = candidates.map(candidate => {
    const { model, row } = candidate
    const scores: Record<CarAdvisorScoreKey, number> = {
      nuevo: 0.5 * years(row.year) + 0.2 * kms(row.kmMedian) + 0.3 * budgetUse(row.median / budget),
      costo: cash(candidate.costs.monthlyCashUyu),
      reventa:
        0.7 * drops(model.annualDrop ?? context.typicalDrop) +
        0.3 * liquidity(Math.log(model.adverts)),
      repuestos: partsMeasured(model.parts)
        ? 0.7 * partsIndex(model.parts.index) + 0.3 * partsOffers(Math.log(1 + model.parts.offers))
        : 0.5,
      seguridad: safety(safetyRaw(candidate)),
      espacio: (() => {
        // El largo es el dato más confiable de la ficha; el baúl lo cargan unos con los asientos
        // rebatidos y otros no. Lo que la ficha no dice lo aproxima la carrocería, sólo para ordenar.
        const prior = model.body ? BODY_SPACE[model.body] : 0.5
        const part = (value: number | null, score: (value: number | null) => number) =>
          value === null ? prior : score(value)
        return (
          0.2 * part(model.trunkL, trunk) +
          0.6 * part(CARGO_BODIES.includes(model.body ?? 'sedan') ? null : model.lengthMm, longer) +
          0.2 * part(model.seats, seats)
        )
      })(),
      uso:
        query.use === 'ciudad'
          ? shorter(model.lengthMm)
          : query.use === 'ruta'
            ? 0.5 * power(model.powerHp) + 0.5 * fuelCost(candidate.costs.fuelUyu)
            : query.use === 'campo'
              ? fourByFour(model.fourByFour?.share ?? null)
              : query.use === 'carga'
                ? 0.5 * trunk(model.trunkL) + 0.5 * power(model.powerHp)
                : 0.5,
    }
    let total = 0
    let weight = 0
    for (const key of Object.keys(weights) as CarAdvisorScoreKey[]) {
      total += weights[key] * scores[key]
      weight += weights[key]
    }
    return { candidate, scores, score: Math.round((total / weight) * 1000) / 1000 }
  })

  // Una variante por modelo: la mejor. Dos Onix en la lista no son dos opciones.
  const best = new Map<string, (typeof scored)[number]>()
  for (const item of scored) {
    const current = best.get(item.candidate.model.marketSlug)
    if (!current || item.score > current.score) best.set(item.candidate.model.marketSlug, item)
  }
  const group = [...best.values()].map(item => item.candidate)

  const results: CarAdvisorResult[] = [...best.values()]
    .map(({ candidate, scores, score }) => {
      const { model, variant, row, costs } = candidate
      const overMonthly = query.monthlyMax !== null && costs.monthlyCashUyu > query.monthlyMax
      const { reasons, tradeoffs } = explain(candidate, query, group, context.typicalDrop)
      if (overMonthly && query.monthlyMax !== null)
        tradeoffs.unshift(
          `Se pasa de tu gasto de ${uyu(query.monthlyMax)} por mes: ronda ${uyu(costs.monthlyCashUyu)}.`
        )
      return {
        marketSlug: model.marketSlug,
        brand: model.brand,
        model: model.model,
        fuel: variant.fuel,
        transmission: variant.transmission,
        year: row.year,
        price: { p25: row.p25, median: row.median, p75: row.p75 },
        n: row.n,
        kmMedian: row.kmMedian,
        adverts: model.adverts,
        stretch: candidate.stretch,
        costs,
        parts: model.parts,
        partsMeasured: partsMeasured(model.parts),
        annualDrop: model.annualDrop,
        safety: {
          ncap: latinNcapResults(model.marketSlug, 4, row.year),
          esc: model.esc,
          airbags: model.airbags,
          abs: model.abs,
          isofix: model.isofix,
        },
        space: {
          seats: model.seats,
          trunkL: model.trunkL,
          lengthMm: model.lengthMm,
          body: model.body,
          fourByFour: model.fourByFour,
        },
        score,
        scores,
        reasons,
        tradeoffs: tradeoffs.slice(0, 3),
        overMonthly,
        listingsQuery: {
          brand: model.brandSlug,
          model: model.marketSlug,
          yearMin: String(row.year),
          yearMax: String(candidate.stretch?.year ?? row.year),
          priceMax: String(budget),
          fuel: variant.fuel,
          transmission: variant.transmission,
          noRisk: '1',
        },
      }
    })
    .sort(
      (a, b) =>
        Number(a.overMonthly) - Number(b.overMonthly) ||
        b.score - a.score ||
        a.marketSlug.localeCompare(b.marketSlug)
    )
    .slice(0, MAX_RESULTS)

  return {
    results,
    considered: candidates.length,
    excluded: [...excluded.entries()].map(([reason, count]) => ({ reason, count })),
    minimumBudget:
      !results.length && cheapestOutOfBudget !== null
        ? Math.ceil(cheapestOutOfBudget / 500) * 500
        : null,
  }
}

/** Lo que devuelve /api/cars/advisor. */
export interface CarAdvisorApiResponse extends CarAdvisorResponse {
  generatedAt: string
  usdUyu: number
  models: number
  typicalDrop: number | null
  partsBaseline: PublicCarPartPrice[]
  fuel: { asOf: string | null; from: string; super95: number; gasoil50s: number }
  query: CarAdvisorQuery
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/**
 * El documento que deja el job tiene la forma que el puntaje espera. Se mira modelo por modelo: un
 * modelo mal formado tiraría un 500 en la página en vez del aviso de "se está actualizando".
 */
export function validCarAdvisorSnapshot(raw: unknown): raw is PublicCarAdvisorSnapshot {
  const snapshot = raw as PublicCarAdvisorSnapshot | null
  if (!snapshot || snapshot.version !== 1 || !isNumber(snapshot.usdUyu)) return false
  const models = snapshot.data?.models
  if (!Array.isArray(models) || !models.length || !Array.isArray(snapshot.data.partsBaseline))
    return false
  return models.every(
    model =>
      typeof model?.marketSlug === 'string' &&
      isNumber(model.adverts) &&
      Array.isArray(model.variants) &&
      model.variants.every(
        variant =>
          typeof variant?.fuel === 'string' &&
          Array.isArray(variant.years) &&
          variant.years.every(
            year => isNumber(year?.year) && isNumber(year.median) && isNumber(year.p25)
          )
      )
  )
}
