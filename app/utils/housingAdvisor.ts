// El asesor de vivienda (/donde-vivir-uruguay): del hogar de la persona a una lista corta de BARRIOS
// donde lo que necesita entra en su plata, para alquilar, para comprar o para comparar.
//
// No mide nada: junta tres agregados que el sitio ya calcula todos los días —las zonas de alquiler
// (`propertyzonesnapshots`), las series de venta por barrio (`marketseries`) y el lugar de cada barrio
// entre los demás en denuncias, luz, agua, reclamos y servicios (`zone-scores`)— y los ordena según
// lo que la persona marcó. Es pura para que los tests la ejerciten sin Nuxt; la unión con la base
// vive en server/utils/housingAdvisor.ts.
//
// DECISIONES QUE LA PÁGINA TIENE QUE PODER EXPLICAR:
//  * El alquiler que "alcanza" es el que acepta una garantía (40 % del ingreso en Contaduría y ANDA),
//    no una regla de bolsillo: es el filtro real que deja gente afuera. Si la persona pone su propio
//    tope, manda el suyo, y ese incluye gastos comunes.
//  * Comprar tiene dos techos y manda el menor: lo que cubre el ahorro (anticipo + gastos de compra) y
//    lo que permite la cuota tope del prestamista sobre el ingreso.
//  * Cómo es el barrio se usa como percentil entre TODOS los barrios medidos (`betterThan`), no
//    renormalizado entre los candidatos: "menos denuncias que el 70 %" tiene que ser verdad afuera.
//  * Lo que falta vale el punto medio y se dice en una nota, nunca como un defecto del barrio.
import {
  HOUSING_BUY_ENTRY,
  HOUSING_CREDIT_PROFILES,
  HOUSING_GUARANTEE_CAPS,
  HOUSING_RENT_ENTRY,
  housingInstallment,
  type HousingCreditId,
  type HousingCreditProfile,
} from './housingAdvisorFigures'
import { RENTAL_ZONE_DEPARTMENTS } from './rentalZones'
import type { RentalZone } from './rentalZoneTypes'

export type HousingOperation = 'alquilar' | 'comprar' | 'comparar'
export type HousingPropertyType = 'apartamento' | 'casa'
export type HousingCredit = HousingCreditId | 'contado'
export type HousingPriority =
  | 'precio'
  | 'metros'
  | 'seguridad'
  | 'servicios'
  | 'luz'
  | 'reclamos'
  | 'inversion'
export type HousingScoreAttribute =
  | 'denuncias'
  | 'luz'
  | 'agua'
  | 'saneamiento'
  | 'limpieza'
  | 'alumbrado'
  | 'servicios'
export type HousingExclusion = 'sin_datos' | 'presupuesto'

export const HOUSING_OPERATIONS: ReadonlyArray<{ value: HousingOperation; title: string }> = [
  { value: 'comparar', title: 'No sé: comparar' },
  { value: 'alquilar', title: 'Alquilar' },
  { value: 'comprar', title: 'Comprar' },
]

export const HOUSING_PRIORITIES: ReadonlyArray<{ value: HousingPriority; title: string }> = [
  { value: 'precio', title: 'Que sea barato' },
  { value: 'metros', title: 'Más metros por la plata' },
  { value: 'seguridad', title: 'Menos denuncias' },
  { value: 'servicios', title: 'Servicios cerca' },
  { value: 'luz', title: 'Menos cortes de luz y agua' },
  { value: 'reclamos', title: 'Calles, limpieza y alumbrado' },
  { value: 'inversion', title: 'Que rinda como inversión' },
]

export const HOUSING_CREDITS: ReadonlyArray<{ value: HousingCredit; title: string }> = [
  { value: 'bhu', title: 'Crédito del BHU (90 %)' },
  { value: 'banco', title: 'Crédito de un banco privado (80 %)' },
  { value: 'contado', title: 'Al contado' },
]

const MAX_PRIORITIES = 3
const MAX_RESULTS = 8
const PRIORITY_WEIGHT = 3
/** Con menos avisos que esto la mediana se publica, pero se avisa que es menos firme. */
const THIN_SAMPLE = 15

export interface HousingAdvisorQuery {
  operation: HousingOperation
  department: string
  type: HousingPropertyType
  /** 0 a 4; 4 quiere decir 4 o más. */
  bedrooms: number
  /** Ingreso nominal del hogar, en pesos por mes. */
  income: number | null
  /** Tope propio de alquiler + gastos comunes, en pesos. */
  rentMax: number | null
  /** Ahorro disponible para comprar, en dólares. */
  savings: number | null
  credit: HousingCredit
  /** Plazo del crédito en años; null = el máximo del prestamista. */
  years: number | null
  priorities: HousingPriority[]
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

export function foldZoneName(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/["'“”]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const PRIORITY_VALUES = HOUSING_PRIORITIES.map(item => item.value)

export function normalizeHousingAdvisorQuery(input: Record<string, unknown>): HousingAdvisorQuery {
  const operation = HOUSING_OPERATIONS.find(item => item.value === first(input.operacion))?.value
  const department =
    RENTAL_ZONE_DEPARTMENTS.find(
      item => foldZoneName(item) === foldZoneName(first(input.departamento))
    ) ?? 'Montevideo'
  const credit = HOUSING_CREDITS.find(item => item.value === first(input.credito))?.value
  const priorities: HousingPriority[] = []
  for (const item of first(input.prioridad).split(',')) {
    const value = item.trim() as HousingPriority
    if (PRIORITY_VALUES.includes(value) && !priorities.includes(value)) priorities.push(value)
  }
  return {
    operation: operation ?? 'comparar',
    department,
    type: first(input.tipo) === 'casa' ? 'casa' : 'apartamento',
    bedrooms: whole(input.dormitorios, 0, 4) ?? 2,
    income: whole(input.ingreso, 1_000, 10_000_000),
    rentMax: whole(input.alquilerMax, 1_000, 10_000_000),
    savings: whole(input.ahorro, 100, 50_000_000),
    credit: credit ?? 'bhu',
    years: whole(input.plazo, 5, 30),
    priorities: priorities.slice(0, MAX_PRIORITIES),
  }
}

/** La consulta como va en la URL: sólo lo que difiere de lo que se asume sin preguntar. */
export function housingAdvisorQueryParams(query: HousingAdvisorQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.operation !== 'comparar') params.operacion = query.operation
  if (query.department !== 'Montevideo') params.departamento = query.department
  if (query.type !== 'apartamento') params.tipo = query.type
  if (query.bedrooms !== 2) params.dormitorios = String(query.bedrooms)
  if (query.income !== null) params.ingreso = String(query.income)
  if (query.rentMax !== null) params.alquilerMax = String(query.rentMax)
  if (query.savings !== null) params.ahorro = String(query.savings)
  if (query.credit !== 'bhu') params.credito = query.credit
  if (query.years !== null) params.plazo = String(query.years)
  if (query.priorities.length) params.prioridad = query.priorities.join(',')
  return params
}

/** El formulario de la página, armado desde la URL. */
export interface HousingAdvisorDraft {
  operacion: HousingOperation
  departamento: string
  tipo: HousingPropertyType
  dormitorios: number
  ingreso: string
  alquilerMax: string
  ahorro: string
  credito: HousingCredit
  plazo: string
  prioridad: string[]
}

export function housingAdvisorDraft(query: HousingAdvisorQuery): HousingAdvisorDraft {
  return {
    operacion: query.operation,
    departamento: query.department,
    tipo: query.type,
    dormitorios: query.bedrooms,
    ingreso: query.income === null ? '' : String(query.income),
    alquilerMax: query.rentMax === null ? '' : String(query.rentMax),
    ahorro: query.savings === null ? '' : String(query.savings),
    credito: query.credit,
    plazo: query.years === null ? '' : String(query.years),
    prioridad: [...query.priorities],
  }
}

// ---------------------------------------------------------------------------------------------
// Lo que alcanza
// ---------------------------------------------------------------------------------------------

export interface HousingBudget {
  /** Pesos por mes; null si no hay ingreso ni tope propio. */
  rentMax: number | null
  /** "alquiler": el tope de la garantía, que se compara contra el alquiler; "total": el propio. */
  rentBasis: 'alquiler' | 'total'
  rentMaxMapfre: number | null
  /** Dólares; 0 sin ahorro, null si no se puede calcular. */
  buyMax: number | null
  buyMaxBySavings: number | null
  buyMaxByIncome: number | null
  profile: HousingCreditProfile | null
  years: number
  entryRate: number
}

const ENTRY_HIGH = HOUSING_BUY_ENTRY.itp + HOUSING_BUY_ENTRY.deedHigh + HOUSING_BUY_ENTRY.commission
const ENTRY_LOW = HOUSING_BUY_ENTRY.itp + HOUSING_BUY_ENTRY.deedLow + HOUSING_BUY_ENTRY.commission

export function housingBudget(query: HousingAdvisorQuery, usdUyu: number): HousingBudget {
  const profile = query.credit === 'contado' ? null : HOUSING_CREDIT_PROFILES[query.credit]
  const years = profile ? Math.min(query.years ?? profile.maxYears, profile.maxYears) : 0
  const rentMax =
    query.rentMax ?? (query.income !== null ? query.income * HOUSING_GUARANTEE_CAPS.anda : null)
  const savings = query.savings ?? 0

  let buyMaxBySavings: number | null
  let buyMaxByIncome: number | null = null
  if (!profile) {
    buyMaxBySavings = savings / (1 + ENTRY_HIGH)
  } else {
    buyMaxBySavings = savings / (1 - profile.financing + ENTRY_HIGH)
    if (query.income !== null && usdUyu > 0) {
      // La cuota tope sobre el ingreso define el préstamo máximo; el precio es ese préstamo sobre
      // la parte que el prestamista financia.
      const unitInstallment = housingInstallment(1, profile.tea, years)
      const maxLoanUyu = (profile.installmentCap * query.income) / unitInstallment
      buyMaxByIncome = maxLoanUyu / profile.financing / usdUyu
    }
  }
  const bounds = [buyMaxBySavings, buyMaxByIncome].filter(
    (value): value is number => value !== null
  )
  return {
    rentMax,
    rentBasis: query.rentMax !== null ? 'total' : 'alquiler',
    rentMaxMapfre: query.income !== null ? query.income * HOUSING_GUARANTEE_CAPS.mapfre : null,
    buyMax: bounds.length ? Math.min(...bounds) : null,
    buyMaxBySavings,
    buyMaxByIncome,
    profile,
    years,
    entryRate: ENTRY_HIGH,
  }
}

// ---------------------------------------------------------------------------------------------
// La unión de los tres agregados
// ---------------------------------------------------------------------------------------------

export interface HousingZoneRent {
  n: number
  p25: number | null
  median: number
  p75: number | null
  /** Alquiler + gastos comunes. */
  monthlyMedian: number | null
  monthlyP25: number | null
  expensesMedian: number | null
  m2Median: number | null
}

export interface HousingZoneSale {
  n: number
  p25: number | null
  median: number
  p75: number | null
  /** Dólares por m² construido. */
  m2Median: number | null
}

export interface HousingScore {
  /** Qué parte de los demás barrios medidos está peor. */
  betterThan: number
  value: number
  zones: number
}

export interface HousingZone {
  id: string
  name: string
  department: string
  rent: HousingZoneRent | null
  sale: HousingZoneSale | null
  scores: Partial<Record<HousingScoreAttribute, HousingScore>>
  /** El barrio oficial (INE/UTE) cuyo contexto se usa. */
  official: string | null
}

export interface HousingScoresInput {
  zones: Record<
    string,
    {
      name: string
      department: string
      rows: Array<{ attribute: string; value: number; betterThan: number; zones: number }>
    }
  >
  resolver: Record<string, Record<string, string>>
}

export interface HousingSaleCohort {
  labels: { neighborhood: string | null }
  latest: {
    n: number
    p25: number | null
    med: number | null
    p75: number | null
    m2: { n: number; med: number | null } | null
  }
}

const SCORE_ATTRIBUTES: readonly HousingScoreAttribute[] = [
  'denuncias',
  'luz',
  'agua',
  'saneamiento',
  'limpieza',
  'alumbrado',
  'servicios',
]

function scoresFor(
  official: string | null,
  folded: string,
  scores: HousingScoresInput | null
): { official: string | null; scores: HousingZone['scores'] } {
  if (!scores) return { official: null, scores: {} }
  let id = official && scores.zones[official] ? official : null
  if (!id)
    for (const map of Object.values(scores.resolver ?? {})) {
      const found = map?.[folded]
      if (found && scores.zones[found]) {
        id = found
        break
      }
    }
  if (!id) return { official: null, scores: {} }
  const zone = scores.zones[id]!
  const out: HousingZone['scores'] = {}
  for (const row of zone.rows)
    if ((SCORE_ATTRIBUTES as readonly string[]).includes(row.attribute))
      out[row.attribute as HousingScoreAttribute] = {
        betterThan: row.betterThan,
        value: row.value,
        zones: row.zones,
      }
  return { official: zone.name, scores: out }
}

export function joinHousingZones(
  rentZones: readonly RentalZone[],
  saleCohorts: readonly HousingSaleCohort[],
  scores: HousingScoresInput | null,
  department: string
): HousingZone[] {
  const byId = new Map<string, HousingZone & { officialId: string | null }>()
  for (const zone of rentZones) {
    const rent = zone.prices.rent
    if (rent.median === null) continue
    const id = foldZoneName(zone.ref.neighborhood)
    if (!id) continue
    byId.set(id, {
      id,
      name: zone.ref.neighborhood,
      department,
      rent: {
        n: rent.count,
        p25: rent.p25,
        median: rent.median,
        p75: rent.p75,
        monthlyMedian: zone.prices.monthlyTotal.median,
        monthlyP25: zone.prices.monthlyTotal.p25,
        expensesMedian: zone.prices.commonExpenses.median,
        m2Median: zone.prices.builtSquareMeter.median,
      },
      sale: null,
      scores: {},
      official: null,
      officialId: zone.utilities?.official?.id ?? null,
    })
  }
  for (const cohort of saleCohorts) {
    const name = cohort.labels.neighborhood
    const latest = cohort.latest
    if (!name || latest.med === null) continue
    const id = foldZoneName(name)
    const sale: HousingZoneSale = {
      n: latest.n,
      p25: latest.p25,
      median: latest.med,
      p75: latest.p75,
      m2Median: latest.m2?.med ?? null,
    }
    const existing = byId.get(id)
    if (existing) existing.sale = sale
    else
      byId.set(id, {
        id,
        name,
        department,
        rent: null,
        sale,
        scores: {},
        official: null,
        officialId: null,
      })
  }
  return [...byId.values()].map(({ officialId, ...zone }) => ({
    ...zone,
    ...scoresFor(officialId, zone.id, scores),
  }))
}

// ---------------------------------------------------------------------------------------------
// La recomendación
// ---------------------------------------------------------------------------------------------

export type HousingScoreKey = HousingPriority

export interface HousingBuyCosts {
  /** Dólares. */
  price: number
  downPayment: number
  entryLow: number
  entryHigh: number
  /** Anticipo + gastos de compra en el extremo alto. */
  cashNeeded: number
  loanUyu: number
  installmentUyu: number
  /** Cuota + gastos comunes medianos del barrio. */
  monthlyUyu: number
}

export interface HousingRentVsBuy {
  /** Cuántos años de alquiler vale la vivienda. */
  yearsOfRent: number
  /** Alquiler de un año sobre el precio: la rentabilidad bruta de comprar para alquilar. */
  grossYield: number
  buyMonthly: number
  rentMonthly: number
}

export interface HousingAdvisorResult {
  id: string
  name: string
  department: string
  official: string | null
  rent: HousingZoneRent | null
  sale: HousingZoneSale | null
  rentFits: boolean | null
  rentStretch: boolean
  saleFits: boolean | null
  saleStretch: boolean
  /** Alquiler (o alquiler + gastos comunes) sobre el ingreso. */
  rentShareOfIncome: number | null
  rentEntryUyu: number | null
  buy: HousingBuyCosts | null
  rentVsBuy: HousingRentVsBuy | null
  context: Partial<Record<HousingScoreAttribute, HousingScore>>
  score: number
  scores: Record<HousingScoreKey, number>
  reasons: string[]
  tradeoffs: string[]
  notes: string[]
  rentalsQuery: Record<string, string> | null
  salesQuery: Record<string, string> | null
}

export interface HousingAdvisorResponse {
  budget: HousingBudget
  results: HousingAdvisorResult[]
  considered: number
  excluded: Array<{ reason: HousingExclusion; count: number }>
  /** Si nada entra: desde cuánto empieza a haber, en cada modo. */
  minimum: { rent: number | null; sale: number | null } | null
}

const pct = (value: number): string => `${Math.round(value * 100)} %`
const grouped = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const uyu = (value: number): string => `$ ${grouped(value)}`
const usd = (value: number): string => `US$ ${grouped(value)}`

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

const mean = (values: number[]): number | null =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
const betterThan = (zone: HousingZone, ...attributes: HousingScoreAttribute[]): number | null =>
  mean(
    attributes
      .map(attribute => zone.scores[attribute]?.betterThan)
      .filter((value): value is number => typeof value === 'number')
  )

const bedroomsLabel = (bedrooms: number): string =>
  bedrooms === 0
    ? 'monoambiente'
    : bedrooms >= 4
      ? '4 dormitorios o más'
      : `${bedrooms} dormitorio${bedrooms === 1 ? '' : 's'}`

interface Candidate {
  zone: HousingZone
  rentValue: number | null
  rentFits: boolean | null
  rentStretch: boolean
  saleFits: boolean | null
  saleStretch: boolean
  buy: HousingBuyCosts | null
  rentVsBuy: HousingRentVsBuy | null
}

function buyCosts(
  zone: HousingZone,
  budget: HousingBudget,
  usdUyu: number
): HousingBuyCosts | null {
  if (!zone.sale) return null
  const price = zone.sale.median
  const financing = budget.profile?.financing ?? 0
  const loanUyu = financing * price * usdUyu
  const installmentUyu = budget.profile
    ? housingInstallment(loanUyu, budget.profile.tea, budget.years)
    : 0
  const downPayment = (1 - financing) * price
  return {
    price,
    downPayment,
    entryLow: ENTRY_LOW * price,
    entryHigh: ENTRY_HIGH * price,
    cashNeeded: downPayment + ENTRY_HIGH * price,
    loanUyu,
    installmentUyu,
    monthlyUyu: installmentUyu + (zone.rent?.expensesMedian ?? 0),
  }
}

function explain(
  candidate: Candidate,
  query: HousingAdvisorQuery,
  budget: HousingBudget,
  group: Candidate[]
): { reasons: string[]; tradeoffs: string[]; notes: string[] } {
  const { zone } = candidate
  const reasons: string[] = []
  const tradeoffs: string[] = []
  const notes: string[] = []
  const what = `${query.type === 'casa' ? 'una casa' : 'un apartamento'} de ${bedroomsLabel(query.bedrooms)}`

  if (zone.rent && query.operation !== 'comprar') {
    const withExpenses =
      zone.rent.monthlyMedian !== null
        ? ` (${uyu(zone.rent.monthlyMedian)} con gastos comunes)`
        : ''
    const share =
      query.income !== null ? `: ${pct(zone.rent.median / query.income)} de tu ingreso` : ''
    reasons.push(
      `Alquilar ${what} sale ${uyu(zone.rent.median)} de mediana${withExpenses}${share}.`
    )
  }
  if (zone.sale && candidate.buy && query.operation !== 'alquilar') {
    const loan = budget.profile
      ? ` Con el ${budget.profile.label} ponés ${usd(candidate.buy.cashNeeded)} de entrada y la cuota ronda ${uyu(candidate.buy.installmentUyu)}.`
      : ` Al contado necesitás ${usd(candidate.buy.cashNeeded)} con los gastos de compra.`
    reasons.push(`La mitad de ${what} se pide hasta ${usd(zone.sale.median)}.${loan}`)
  }

  const safety = zone.scores.denuncias?.betterThan
  if (safety !== undefined && safety >= 0.65)
    reasons.push(`Menos denuncias que el ${pct(safety)} de los barrios medidos.`)
  else if (safety !== undefined && safety <= 0.35)
    tradeoffs.push(`Más denuncias que el ${pct(1 - safety)} de los barrios medidos.`)
  const services = zone.scores.servicios?.betterThan
  if (services !== undefined && services >= 0.7)
    reasons.push(`Más servicios cerca que el ${pct(services)} de los barrios medidos.`)
  const power = zone.scores.luz?.betterThan
  if (power !== undefined && power <= 0.3)
    tradeoffs.push(`Más cortes de luz que el ${pct(1 - power)} de los barrios medidos.`)
  else if (power !== undefined && power >= 0.75)
    reasons.push(`Menos cortes de luz que el ${pct(power)} de los barrios medidos.`)

  if (candidate.rentVsBuy && query.operation !== 'alquilar') {
    const yields = group
      .map(item => item.rentVsBuy?.grossYield)
      .filter((value): value is number => typeof value === 'number')
      .sort((a, b) => a - b)
    const top = yields[Math.floor((yields.length * 2) / 3)]
    if (yields.length >= 3 && top !== undefined && candidate.rentVsBuy.grossYield >= top)
      reasons.push(
        `Rinde ${pct(candidate.rentVsBuy.grossYield)} bruto por año: la vivienda vale ${Math.round(candidate.rentVsBuy.yearsOfRent)} años de alquiler.`
      )
  }

  if (candidate.rentStretch && query.operation !== 'comprar')
    tradeoffs.push(
      `El alquiler mediano se pasa de tu tope; la cuarta parte más barata entra (desde ${uyu(
        (budget.rentBasis === 'total' ? zone.rent?.monthlyP25 : zone.rent?.p25) ?? 0
      )}).`
    )
  if (candidate.saleStretch && query.operation !== 'alquilar')
    tradeoffs.push(
      `La mediana de venta se pasa de lo que alcanza; la cuarta parte más barata entra (desde ${usd(zone.sale?.p25 ?? 0)}).`
    )
  if (
    zone.rent &&
    query.operation !== 'comprar' &&
    budget.rentMaxMapfre !== null &&
    budget.rentBasis === 'alquiler' &&
    zone.rent.median > budget.rentMaxMapfre
  )
    tradeoffs.push(
      `Con una garantía de Mapfre no alcanza: el alquiler pasa del 30 % de tu ingreso (${uyu(budget.rentMaxMapfre)}).`
    )
  const thin = Math.min(
    ...[
      query.operation !== 'comprar' ? zone.rent?.n : undefined,
      query.operation !== 'alquilar' ? zone.sale?.n : undefined,
    ].filter((value): value is number => typeof value === 'number')
  )
  if (Number.isFinite(thin) && thin < THIN_SAMPLE)
    tradeoffs.push(`Pocos avisos (${thin}): el precio es menos firme.`)

  if (!Object.keys(zone.scores).length)
    notes.push('No tenemos denuncias, cortes ni reclamos medidos para este barrio.')
  if (query.operation === 'comparar' && (!zone.rent || !zone.sale))
    notes.push(
      zone.rent
        ? 'No hay avisos de venta suficientes para comparar con comprar.'
        : 'No hay avisos de alquiler suficientes para comparar con alquilar.'
    )
  return { reasons: reasons.slice(0, 4), tradeoffs: tradeoffs.slice(0, 3), notes }
}

export function adviseHousing(
  zones: readonly HousingZone[],
  query: HousingAdvisorQuery,
  context: { usdUyu: number }
): HousingAdvisorResponse {
  const budget = housingBudget(query, context.usdUyu)
  const excluded = new Map<HousingExclusion, number>()
  const exclude = (reason: HousingExclusion) =>
    excluded.set(reason, (excluded.get(reason) ?? 0) + 1)
  const wantsRent = query.operation !== 'comprar'
  const wantsSale = query.operation !== 'alquilar'

  const candidates: Candidate[] = []
  let cheapestRent: number | null = null
  let cheapestSale: number | null = null
  for (const zone of zones) {
    const hasRent = !!zone.rent
    const hasSale = !!zone.sale
    if (
      (query.operation === 'alquilar' && !hasRent) ||
      (query.operation === 'comprar' && !hasSale) ||
      (!hasRent && !hasSale)
    ) {
      exclude('sin_datos')
      continue
    }
    const rentValue = zone.rent
      ? budget.rentBasis === 'total'
        ? (zone.rent.monthlyMedian ?? zone.rent.median)
        : zone.rent.median
      : null
    const rentLow = zone.rent
      ? budget.rentBasis === 'total'
        ? (zone.rent.monthlyP25 ?? zone.rent.p25)
        : zone.rent.p25
      : null
    const rentFits =
      wantsRent && rentValue !== null && budget.rentMax !== null
        ? rentValue <= budget.rentMax
        : null
    const rentStretch =
      rentFits === false && rentLow !== null && budget.rentMax !== null && rentLow <= budget.rentMax
    const saleFits =
      wantsSale && zone.sale && budget.buyMax !== null ? zone.sale.median <= budget.buyMax : null
    const saleStretch =
      saleFits === false &&
      zone.sale?.p25 !== null &&
      zone.sale?.p25 !== undefined &&
      budget.buyMax !== null &&
      zone.sale.p25 <= budget.buyMax

    // Sin tope conocido no se filtra: se ordena por lo que la persona marcó.
    const rentOk = !wantsRent || !zone.rent || rentFits === null || rentFits || rentStretch
    const saleOk = !wantsSale || !zone.sale || saleFits === null || saleFits || saleStretch
    const fits =
      query.operation === 'alquilar'
        ? rentOk
        : query.operation === 'comprar'
          ? saleOk
          : (zone.rent && rentOk) || (zone.sale && saleOk)
    if (!fits) {
      exclude('presupuesto')
      if (rentValue !== null)
        cheapestRent = cheapestRent === null ? rentValue : Math.min(cheapestRent, rentValue)
      if (zone.sale)
        cheapestSale =
          cheapestSale === null ? zone.sale.median : Math.min(cheapestSale, zone.sale.median)
      continue
    }
    const buy = buyCosts(zone, budget, context.usdUyu)
    const rentMonthly = zone.rent
      ? (zone.rent.monthlyMedian ?? zone.rent.median + (zone.rent.expensesMedian ?? 0))
      : null
    candidates.push({
      zone,
      rentValue,
      rentFits,
      rentStretch,
      saleFits,
      saleStretch,
      buy,
      rentVsBuy:
        zone.rent && zone.sale && buy && rentMonthly !== null
          ? {
              yearsOfRent: (zone.sale.median * context.usdUyu) / (zone.rent.median * 12),
              grossYield: (zone.rent.median * 12) / (zone.sale.median * context.usdUyu),
              buyMonthly: buy.monthlyUyu,
              rentMonthly,
            }
          : null,
    })
  }

  const rentPrice = normalizer(
    candidates.map(item => item.rentValue),
    false
  )
  const salePrice = normalizer(
    candidates.map(item => item.zone.sale?.median ?? null),
    false
  )
  const rentM2 = normalizer(
    candidates.map(item => item.zone.rent?.m2Median ?? null),
    false
  )
  const saleM2 = normalizer(
    candidates.map(item => item.zone.sale?.m2Median ?? null),
    false
  )
  const yieldScore = normalizer(
    candidates.map(item => item.rentVsBuy?.grossYield ?? null),
    true
  )
  const byMode = (rent: number, sale: number, candidate: Candidate): number => {
    const parts = [
      wantsRent && candidate.zone.rent ? rent : null,
      wantsSale && candidate.zone.sale ? sale : null,
    ].filter((value): value is number => value !== null)
    return mean(parts) ?? 0.5
  }
  const weights: Record<HousingScoreKey, number> = {
    precio: 1,
    metros: 1,
    seguridad: 1,
    servicios: 1,
    luz: 1,
    reclamos: 1,
    // Para quien alquila la rentabilidad no dice nada, salvo que la haya pedido.
    inversion: wantsSale ? 1 : 0,
  }
  for (const priority of query.priorities) weights[priority] = PRIORITY_WEIGHT

  const scored = candidates.map(candidate => {
    const { zone } = candidate
    const scores: Record<HousingScoreKey, number> = {
      precio: byMode(
        rentPrice(candidate.rentValue),
        salePrice(zone.sale?.median ?? null),
        candidate
      ),
      metros: byMode(
        rentM2(zone.rent?.m2Median ?? null),
        saleM2(zone.sale?.m2Median ?? null),
        candidate
      ),
      seguridad: betterThan(zone, 'denuncias') ?? 0.5,
      servicios: betterThan(zone, 'servicios') ?? 0.5,
      luz: betterThan(zone, 'luz', 'agua') ?? 0.5,
      reclamos: betterThan(zone, 'saneamiento', 'limpieza', 'alumbrado') ?? 0.5,
      inversion: yieldScore(candidate.rentVsBuy?.grossYield ?? null),
    }
    let total = 0
    let weight = 0
    for (const key of Object.keys(weights) as HousingScoreKey[]) {
      total += weights[key] * scores[key]
      weight += weights[key]
    }
    return { candidate, scores, score: Math.round((total / weight) * 1000) / 1000 }
  })

  const stretched = (candidate: Candidate): boolean =>
    (query.operation === 'alquilar' && candidate.rentStretch) ||
    (query.operation === 'comprar' && candidate.saleStretch) ||
    (query.operation === 'comparar' &&
      !(candidate.rentFits || candidate.saleFits) &&
      (candidate.rentStretch || candidate.saleStretch))

  const group = candidates
  const results: HousingAdvisorResult[] = scored
    .sort(
      (a, b) =>
        Number(stretched(a.candidate)) - Number(stretched(b.candidate)) ||
        b.score - a.score ||
        a.candidate.zone.name.localeCompare(b.candidate.zone.name)
    )
    .slice(0, MAX_RESULTS)
    .map(({ candidate, scores, score }) => {
      const { zone } = candidate
      const { reasons, tradeoffs, notes } = explain(candidate, query, budget, group)
      const bedrooms = String(query.bedrooms)
      return {
        id: zone.id,
        name: zone.name,
        department: zone.department,
        official: zone.official,
        rent: zone.rent,
        sale: zone.sale,
        rentFits: candidate.rentFits,
        rentStretch: candidate.rentStretch,
        saleFits: candidate.saleFits,
        saleStretch: candidate.saleStretch,
        rentShareOfIncome:
          candidate.rentValue !== null && query.income !== null
            ? candidate.rentValue / query.income
            : null,
        rentEntryUyu: zone.rent
          ? zone.rent.median * (1 + HOUSING_RENT_ENTRY.commissionMonths)
          : null,
        buy: candidate.buy,
        rentVsBuy: candidate.rentVsBuy,
        context: zone.scores,
        score,
        scores,
        reasons,
        tradeoffs,
        notes,
        rentalsQuery: zone.rent
          ? {
              department: zone.department,
              neighborhood: zone.name,
              type: query.type,
              bedrooms,
              ...(query.bedrooms < 4 ? { bedroomsExact: '1' } : {}),
              ...(budget.rentMax !== null
                ? budget.rentBasis === 'total'
                  ? { monthlyMax: String(Math.round(budget.rentMax)) }
                  : { priceMax: String(Math.round(budget.rentMax)) }
                : {}),
              currency: 'UYU',
            }
          : null,
        salesQuery: zone.sale
          ? {
              department: zone.department,
              neighborhood: zone.name,
              type: query.type,
              ...(query.bedrooms < 4 ? { bedrooms } : {}),
              ...(budget.buyMax !== null && budget.buyMax > 0
                ? { maxPrice: String(Math.round(budget.buyMax)) }
                : {}),
              currency: 'USD',
            }
          : null,
      }
    })

  return {
    budget,
    results,
    considered: candidates.length,
    excluded: [...excluded.entries()].map(([reason, count]) => ({ reason, count })),
    minimum: results.length
      ? null
      : {
          rent: wantsRent && cheapestRent !== null ? Math.ceil(cheapestRent / 1_000) * 1_000 : null,
          sale: wantsSale && cheapestSale !== null ? Math.ceil(cheapestSale / 5_000) * 5_000 : null,
        },
  }
}
