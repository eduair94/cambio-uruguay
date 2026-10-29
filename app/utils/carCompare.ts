// El comparador de modelos (/comparar-autos-usados-uruguay): dos o tres modelos lado a lado, con lo
// que se pide por cada año, lo que cuesta tenerlo, cuánto pierde de valor, el espacio, la seguridad y
// los repuestos, y arriba un veredicto que dice en qué gana cada uno.
//
// Sale de la MISMA tabla que el asesor (`caradvisorsnapshots`, classes/autos/advisor.ts) y del mismo
// cálculo de costos (`carOwnershipCosts`): una cifra no puede decir una cosa acá y otra en
// /que-auto-comprar-uruguay o en la ficha de un aviso.
//
// Se parte en dos a propósito. `buildCarCompareResponse` corre en el servidor y deja cada modelo con
// TODOS los años de su variante; `compareCars` resuelve el año o el presupuesto y arma la tabla y el
// veredicto, y corre igual en el servidor (para el HTML) y en el navegador (para que el deslizador de
// presupuesto conteste sin ir a buscar nada). Es pura para que los tests la ejerciten sin Nuxt.
//
// TRES REGLAS QUE EL VEREDICTO NO PUEDE ROMPER:
//  * Una fila declara ganador sólo si la diferencia pasa su umbral de ruido. Dos autos a US$ 200 de
//    distancia están parejos, no "uno más barato".
//  * Lo que falta no gana ni pierde. Un modelo sin curva de depreciación propia usa la típica del
//    mercado para el costo, pero no puede "perder menos valor" que otro: sería un promedio contra
//    una medición (medido el 2026-10-29: 169 de 242 modelos no tienen curva propia).
//  * Latin NCAP se muestra y no puntúa, como en el asesor: un ensayo es de una versión en un momento
//    y casi nunca dice desde qué año vale.
import {
  CAR_ADVISOR_DEFAULT_KM,
  carAdvisorFuelFallback,
  carOwnershipCosts,
  sensibleModel,
  type CarAdvisorCosts,
  type CarAdvisorFuelPrices,
} from './carAdvisor'
import { CAR_ADVISOR_FIGURES, CAR_PART_LABELS, type LatinNcapEntry } from './carAdvisorFigures'
import type { FaqItem } from './faqAnswers'
import {
  CAR_BODY_LABELS,
  CAR_FUEL_LABELS,
  CAR_FUELS,
  CAR_TRANSMISSION_LABELS,
  carMarketSlugValid,
  formatCarKm,
  formatCarUsd,
} from './cars'
import type {
  PublicCarAdvisorModel,
  PublicCarAdvisorParts,
  PublicCarAdvisorShare,
  PublicCarAdvisorSnapshot,
  PublicCarAdvisorVariant,
  PublicCarAdvisorYear,
  PublicCarBodyType,
  PublicCarFuel,
  PublicCarPartPrice,
  PublicCarTransmission,
} from './carsPublic'

export const CAR_COMPARE_PATH = '/comparar-autos-usados-uruguay'
/** Las referencias del mercado dejan 3 o 4; en 390 px entran tres columnas que se leen. */
export const CAR_COMPARE_MAX = 3
/** Un porcentaje de equipamiento se afirma con al menos estas fichas, como en el asesor. */
const SHARE_MIN_SHEETS = 5
/** Lo mismo que PART_INDEX_MIN_PARTS de classes/autos/repuestos.ts: debajo no hay índice. */
const PARTS_MIN_MEASURED = 3
/** Rivales: precio parecido A IGUAL AÑO (es el segmento, no la antigüedad del parque). */
const RIVAL_MAX_GAP = Math.log(1.25)
const RIVAL_MIN_COMMON_YEARS = 3
const BUDGET_MIN = 1_000
const BUDGET_MAX = 500_000
const WINS_MAX = 4
const LOSSES_MAX = 3

export type CarCompareMode = 'anio' | 'plata'

export interface CarComparePick {
  slug: string
  /** La variante que pidió la URL; null = la que más avisos tiene. */
  fuel: PublicCarFuel | null
  transmission: PublicCarTransmission | null
}

export interface CarCompareQuery {
  picks: CarComparePick[]
  /** "Al mismo año": el año pedido; null = el que más avisos tienen todos. */
  year: number | null
  /** "Con la misma plata": el presupuesto en dólares. Si está, manda esta lente. */
  budget: number | null
  kmYear: number
}

export const carCompareMode = (query: Pick<CarCompareQuery, 'budget'>): CarCompareMode =>
  query.budget === null ? 'anio' : 'plata'

const first = (value: unknown): string => {
  const raw = Array.isArray(value) ? value.join(',') : value
  return typeof raw === 'string' ? raw.trim().slice(0, 300) : ''
}

function whole(value: unknown, min: number, max: number): number | null {
  const raw = first(value)
    .replace(/u\$s|us\$|usd|\$/gi, '')
    .replace(/[.,\s]/g, '')
  if (!/^\d+$/.test(raw)) return null
  const parsed = Number(raw)
  return parsed >= min && parsed <= max ? parsed : null
}

const VARIANT_TOKEN = new RegExp(`^(${CAR_FUELS.join('|')})-(manual|automatica)$`)

export const carCompareVariantToken = (
  fuel: PublicCarFuel,
  transmission: PublicCarTransmission
): string => `${fuel}-${transmission}`

export function normalizeCarCompareQuery(input: Record<string, unknown>): CarCompareQuery {
  const picks: CarComparePick[] = []
  for (const token of first(input.modelos).toLowerCase().split(',')) {
    const [slug = '', variant = ''] = token.trim().split('~')
    if (!carMarketSlugValid(slug) || picks.some(pick => pick.slug === slug)) continue
    const match = VARIANT_TOKEN.exec(variant)
    picks.push({
      slug,
      fuel: match ? (match[1] as PublicCarFuel) : null,
      transmission: match ? (match[2] as PublicCarTransmission) : null,
    })
    if (picks.length === CAR_COMPARE_MAX) break
  }
  return {
    picks,
    year: whole(input.anio, 1970, 2100),
    budget: whole(input.presupuesto, BUDGET_MIN, BUDGET_MAX),
    kmYear: whole(input.km, 1_000, 100_000) ?? CAR_ADVISOR_DEFAULT_KM,
  }
}

export const carCompareModelsParam = (picks: readonly CarComparePick[]): string =>
  picks
    .map(pick =>
      pick.fuel && pick.transmission
        ? `${pick.slug}~${carCompareVariantToken(pick.fuel, pick.transmission)}`
        : pick.slug
    )
    .join(',')

/** La consulta como va en la URL: sólo lo que difiere de lo que se asume sin preguntar. */
export function carCompareQueryParams(query: CarCompareQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.picks.length) params.modelos = carCompareModelsParam(query.picks)
  if (query.budget !== null) params.presupuesto = String(query.budget)
  else if (query.year !== null) params.anio = String(query.year)
  if (query.kmYear !== CAR_ADVISOR_DEFAULT_KM) params.km = String(query.kmYear)
  return params
}

// ---------------------------------------------------------------------------------------------
// Las columnas (servidor)
// ---------------------------------------------------------------------------------------------

export interface CarCompareOption {
  slug: string
  brand: string
  model: string
  adverts: number
  body: PublicCarBodyType | null
}

export interface CarCompareVariantOption {
  fuel: PublicCarFuel
  transmission: PublicCarTransmission
  adverts: number
}

export interface CarCompareColumn {
  slug: string
  brand: string
  model: string
  brandSlug: string
  adverts: number
  sellers: number
  dealerShare: number
  declaredRiskShare: number
  body: PublicCarBodyType | null
  /** Todas las variantes (combustible × caja) con avisos suficientes, la de más avisos primero. */
  variants: CarCompareVariantOption[]
  /** La que se compara: la pedida en la URL o, si no, la de más avisos. */
  variant: PublicCarAdvisorVariant
  specsN: number
  seats: number | null
  trunkL: number | null
  lengthMm: number | null
  powerHp: number | null
  fourByFour: PublicCarAdvisorShare | null
  abs: PublicCarAdvisorShare | null
  airbags: PublicCarAdvisorShare | null
  esc: PublicCarAdvisorShare | null
  isofix: PublicCarAdvisorShare | null
  /** La caída anual medida sobre sus propios avisos; null = no tiene curva propia. */
  annualDrop: number | null
  parts: PublicCarAdvisorParts | null
  /** Ensayos de Latin NCAP del modelo, para mostrar: nunca puntúan. */
  ncap: LatinNcapEntry[]
}

export interface CarCompareFuel extends CarAdvisorFuelPrices {
  asOf: string | null
}

export interface CarCompareResponse {
  generatedAt: string
  usdUyu: number
  typicalDrop: number | null
  fuel: CarCompareFuel
  /** Consumo mediano de cada combustible: el respaldo de una variante sin consumo propio. */
  fuelFallback: Partial<Record<PublicCarFuel, number>>
  partsBaseline: PublicCarPartPrice[]
  columns: CarCompareColumn[]
  /** Modelos que pidió la URL y no están en la tabla (menos de 12 avisos, o un slug que no existe). */
  missing: string[]
  /** La URL no nombró modelos: se muestra la comparación frecuente más grande. */
  example: boolean
  /** Para sumar a la comparación: rivales del primer modelo. */
  rivals: CarCompareOption[]
  /** Comparaciones frecuentes, calculadas: misma carrocería y precio parecido a igual año. */
  popular: CarCompareOption[][]
  /** Todos los modelos que se pueden comparar, para el buscador. */
  options: CarCompareOption[]
}

const optionOf = (model: PublicCarAdvisorModel): CarCompareOption => ({
  slug: model.marketSlug,
  brand: model.brand,
  model: model.model,
  adverts: model.adverts,
  body: model.body,
})

const byAdverts = <T extends { adverts: number }>(a: T, b: T): number => b.adverts - a.adverts

const dominant = (model: PublicCarAdvisorModel): PublicCarAdvisorVariant | null =>
  [...model.variants].sort(byAdverts)[0] ?? null

/** Mediana de |log(precio A / precio B)| entre los años que tienen las dos variantes. */
function variantGap(left: PublicCarAdvisorVariant, right: PublicCarAdvisorVariant): number | null {
  const prices = new Map(right.years.map(row => [row.year, row.median]))
  const gaps = left.years
    .filter(row => prices.has(row.year) && row.median > 0 && prices.get(row.year)! > 0)
    .map(row => Math.abs(Math.log(row.median / prices.get(row.year)!)))
    .sort((x, y) => x - y)
  if (gaps.length < RIVAL_MIN_COMMON_YEARS) return null
  const middle = Math.floor(gaps.length / 2)
  return gaps.length % 2 ? gaps[middle]! : (gaps[middle - 1]! + gaps[middle]!) / 2
}

/**
 * Qué tan lejos están dos modelos en precio a igual año, en la versión donde más cerca están: las
 * más publicadas de cada uno o cualquier combinación de combustible y caja que tengan los dos. Ni
 * una sola vara alcanza: la Hilux más publicada es diésel y la Ranger nafta, y la Hilux y la Amarok
 * comparten nafta manual, donde están lejos, mientras que en diésel están a 13 %.
 * Null si en ninguna comparten tres años.
 */
function priceGap(a: PublicCarAdvisorModel, b: PublicCarAdvisorModel): number | null {
  const pairs: Array<[PublicCarAdvisorVariant | null, PublicCarAdvisorVariant | null]> = [
    [dominant(a), dominant(b)],
    ...a.variants.map(
      left =>
        [
          left,
          b.variants.find(
            right => right.fuel === left.fuel && right.transmission === left.transmission
          ) ?? null,
        ] as [PublicCarAdvisorVariant, PublicCarAdvisorVariant | null]
    ),
  ]
  const gaps = pairs
    .map(([left, right]) => (left && right ? variantGap(left, right) : null))
    .filter((gap): gap is number => gap !== null)
  return gaps.length ? Math.min(...gaps) : null
}

function rivalsOf(
  models: readonly PublicCarAdvisorModel[],
  anchor: PublicCarAdvisorModel,
  exclude: ReadonlySet<string>,
  limit: number
): PublicCarAdvisorModel[] {
  if (!anchor.body) return []
  return models
    .filter(
      other =>
        other.marketSlug !== anchor.marketSlug &&
        !exclude.has(other.marketSlug) &&
        other.body === anchor.body
    )
    .filter(other => {
      const gap = priceGap(anchor, other)
      return gap !== null && gap <= RIVAL_MAX_GAP
    })
    .sort(byAdverts)
    .slice(0, limit)
}

const usable = (snapshot: PublicCarAdvisorSnapshot): PublicCarAdvisorModel[] =>
  snapshot.data.models.filter(model => model.variants.length > 0)

export function carCompareOptions(snapshot: PublicCarAdvisorSnapshot): CarCompareOption[] {
  return usable(snapshot)
    .map(optionOf)
    .sort(
      (a, b) =>
        a.brand.localeCompare(b.brand, 'es') ||
        a.model.localeCompare(b.model, 'es') ||
        a.slug.localeCompare(b.slug)
    )
}

/**
 * Comparaciones frecuentes: cada modelo con más avisos, de mayor a menor, con sus dos rivales más
 * publicados. Los grupos no comparten modelos, así la lista no repite el Onix seis veces.
 */
export function carComparePopular(
  snapshot: PublicCarAdvisorSnapshot,
  limit = 8
): CarCompareOption[][] {
  const models = usable(snapshot)
  const used = new Set<string>()
  const groups: CarCompareOption[][] = []
  for (const anchor of [...models].sort(byAdverts)) {
    if (groups.length >= limit) break
    if (used.has(anchor.marketSlug)) continue
    const rivals = rivalsOf(models, anchor, used, CAR_COMPARE_MAX - 1)
    if (!rivals.length) continue
    const group = [anchor, ...rivals]
    for (const model of group) used.add(model.marketSlug)
    groups.push(group.map(optionOf))
  }
  return groups
}

export function carCompareRivals(
  snapshot: PublicCarAdvisorSnapshot,
  selected: readonly string[],
  limit = 4
): CarCompareOption[] {
  const models = usable(snapshot)
  const anchor = models.find(model => model.marketSlug === selected[0])
  if (!anchor) return []
  return rivalsOf(models, anchor, new Set(selected), limit).map(optionOf)
}

export function buildCarCompareColumn(
  model: PublicCarAdvisorModel,
  pick: Pick<CarComparePick, 'fuel' | 'transmission'>,
  ncap: LatinNcapEntry[]
): CarCompareColumn | null {
  const variants = [...model.variants].sort(byAdverts)
  const variant =
    variants.find(item => item.fuel === pick.fuel && item.transmission === pick.transmission) ??
    variants[0]
  if (!variant) return null
  const sensible = sensibleModel(model)
  return {
    slug: model.marketSlug,
    brand: model.brand,
    model: model.model,
    brandSlug: model.brandSlug,
    adverts: model.adverts,
    sellers: model.sellers,
    dealerShare: model.dealerShare,
    declaredRiskShare: model.declaredRiskShare,
    body: model.body,
    variants: variants.map(item => ({
      fuel: item.fuel,
      transmission: item.transmission,
      adverts: item.adverts,
    })),
    variant: { ...variant, years: [...variant.years].sort((a, b) => a.year - b.year) },
    specsN: model.specsN,
    seats: sensible.seats,
    trunkL: sensible.trunkL,
    lengthMm: model.lengthMm,
    powerHp: model.powerHp,
    fourByFour: model.fourByFour,
    abs: model.abs,
    airbags: model.airbags,
    esc: model.esc,
    isofix: model.isofix,
    annualDrop: model.annualDrop,
    parts: model.parts,
    ncap,
  }
}

type VariantKey = Pick<CarComparePick, 'fuel' | 'transmission'>

/**
 * La variante con que arrancan las columnas que la URL no fijó: la misma para todas, si existe.
 * Elegir la más publicada de cada modelo por separado comparaba una Hilux diésel contra una Ranger
 * nafta. Primero manda una variante que la URL ya fijó en otra columna; si no, la combinación con
 * más AÑOS en común (lo que se puede comparar de verdad) y, a igualdad, más avisos en la que menos
 * tiene. "Más avisos en el peor" solo ponía a la Hilux y la Amarok en nafta manual (55 avisos)
 * cuando en diésel automática comparten siete años y en nafta seis. Sin ninguna en común, cada una
 * la suya.
 */
export function sharedVariant(
  models: readonly PublicCarAdvisorModel[],
  preferred: readonly VariantKey[] = []
): VariantKey | null {
  if (!models.length) return null
  const find = (model: PublicCarAdvisorModel, key: VariantKey) =>
    model.variants.find(
      variant => variant.fuel === key.fuel && variant.transmission === key.transmission
    )
  for (const key of preferred) if (models.every(model => find(model, key))) return key
  if (models.length < 2) return null
  const candidates = models[0]!.variants
    .map(variant => ({ fuel: variant.fuel, transmission: variant.transmission }))
    .filter(key => models.every(model => find(model, key)))
    .map(key => {
      const variants = models.map(model => find(model, key)!)
      const years = variants.map(variant => new Set(variant.years.map(row => row.year)))
      return {
        key,
        common: [...years[0]!].filter(year => years.every(set => set.has(year))).length,
        floor: Math.min(...variants.map(variant => variant.adverts)),
      }
    })
    .sort((a, b) => b.common - a.common || b.floor - a.floor)
  return candidates[0]?.key ?? null
}

export interface CarCompareResponseContext {
  fuel: CarCompareFuel
  ncapOf: (slug: string) => LatinNcapEntry[]
}

export function buildCarCompareResponse(
  snapshot: PublicCarAdvisorSnapshot,
  requested: readonly CarComparePick[],
  context: CarCompareResponseContext
): CarCompareResponse {
  const models = new Map(usable(snapshot).map(model => [model.marketSlug, model]))
  const popular = carComparePopular(snapshot)
  const example = requested.length === 0
  const picks: CarComparePick[] = example
    ? (popular[0] ?? []).map(option => ({ slug: option.slug, fuel: null, transmission: null }))
    : [...requested]
  const shared = sharedVariant(
    picks
      .filter(pick => !pick.fuel || !pick.transmission)
      .map(pick => models.get(pick.slug))
      .filter((model): model is PublicCarAdvisorModel => !!model),
    picks.filter(pick => pick.fuel && pick.transmission)
  )
  const columns: CarCompareColumn[] = []
  const missing: string[] = []
  for (const pick of picks) {
    const model = models.get(pick.slug)
    const variant = pick.fuel && pick.transmission ? pick : (shared ?? pick)
    const column = model ? buildCarCompareColumn(model, variant, context.ncapOf(pick.slug)) : null
    if (column) columns.push(column)
    else missing.push(pick.slug)
  }
  return {
    generatedAt: snapshot.generatedAt,
    usdUyu: snapshot.usdUyu,
    typicalDrop: snapshot.data.typicalDrop,
    fuel: context.fuel,
    fuelFallback: Object.fromEntries(carAdvisorFuelFallback(snapshot)),
    partsBaseline: snapshot.data.partsBaseline,
    columns,
    missing,
    example,
    rivals: carCompareRivals(
      snapshot,
      columns.map(column => column.slug)
    ),
    popular,
    options: carCompareOptions(snapshot),
  }
}

// ---------------------------------------------------------------------------------------------
// La comparación (servidor y navegador)
// ---------------------------------------------------------------------------------------------

export type CarComparePointStatus = 'ok' | 'sin-anio' | 'no-alcanza'

export interface CarComparePoint {
  status: CarComparePointStatus
  /** El año que se compara: el pedido, o el que alcanza con el presupuesto. */
  row: PublicCarAdvisorYear | null
  /** "Negociando": el año más nuevo cuyo cuarto más barato entra en el presupuesto. */
  stretch: { year: number; p25: number } | null
  /** Sin presupuesto que alcance: desde dónde arranca el modelo. */
  cheapest: PublicCarAdvisorYear | null
  costs: CarAdvisorCosts | null
  /** La caída que se usó para el costo: la propia o, sin curva, la típica del mercado. */
  drop: number | null
  dropFromMarket: boolean
}

export type CarCompareBetter = 'low' | 'high' | null

export interface CarCompareCell {
  text: string
  sub?: string
  href?: string
  best: boolean
}

export interface CarCompareRow {
  key: string
  label: string
  hint?: string
  better: CarCompareBetter
  cells: CarCompareCell[]
  /** Alguna columna gana con diferencia clara. Sin esto la fila está pareja o no se puede comparar. */
  decided: boolean
}

export interface CarCompareGroup {
  key: string
  title: string
  note?: string
  rows: CarCompareRow[]
}

export interface CarCompareReason {
  key: string
  title: string
  detail: string
}

export interface CarCompareVerdict {
  wins: CarCompareReason[]
  losses: CarCompareReason[]
}

export interface CarCompareYearOption {
  year: number
  /** Qué columnas tienen avisos suficientes de ese año. */
  present: boolean[]
}

export interface CarCompareResult {
  mode: CarCompareMode
  year: number | null
  budget: number | null
  kmYear: number
  years: CarCompareYearOption[]
  budgetRange: { min: number; max: number }
  points: CarComparePoint[]
  groups: CarCompareGroup[]
  verdicts: CarCompareVerdict[]
  /** Cómo se llama cada columna en las frases: el modelo, o marca y modelo si dos se llaman igual. */
  names: string[]
}

export type CarCompareInput = Pick<
  CarCompareResponse,
  'columns' | 'usdUyu' | 'typicalDrop' | 'fuel' | 'fuelFallback'
>

const grouped = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
// Espacios duros entre la cifra y su unidad: "$ ⏎ 11.693" o "L/100 ⏎ km" se leían en dos renglones.
const NB = ' '
const uyu = (value: number): string => `$${NB}${grouped(value)}`
const usd = (value: number): string => formatCarUsd(value).replace(' ', NB)
const pct = (value: number, digits = 0): string =>
  `${(value * 100).toFixed(digits).replace('.', ',')}${NB}%`
const decimal = (value: number, digits = 1): string => value.toFixed(digits).replace('.', ',')
const roundTo = (value: number, step: number): number => Math.round(value / step) * step

export const carCompareVariantLabel = (
  variant: Pick<CarCompareVariantOption, 'fuel' | 'transmission'>
): string =>
  `${CAR_FUEL_LABELS[variant.fuel]} · ${CAR_TRANSMISSION_LABELS[variant.transmission].toLowerCase()}`

/** El año que más avisos tienen TODOS (el mínimo entre columnas); a igualdad, el más nuevo. */
export function carCompareDefaultYear(columns: readonly CarCompareColumn[]): number | null {
  const counts = columns.map(column => new Map(column.variant.years.map(row => [row.year, row.n])))
  const all = [...new Set(columns.flatMap(column => column.variant.years.map(row => row.year)))]
  if (!all.length) return null
  const common = all.filter(year => counts.every(count => count.has(year)))
  const pool = common.length ? common : all
  const score = (year: number): number =>
    common.length
      ? Math.min(...counts.map(count => count.get(year)!))
      : counts.reduce((sum, count) => sum + (count.get(year) ?? 0), 0)
  return pool.sort((a, b) => score(b) - score(a) || b - a)[0]!
}

export function carCompareYears(columns: readonly CarCompareColumn[]): CarCompareYearOption[] {
  const all = [...new Set(columns.flatMap(column => column.variant.years.map(row => row.year)))]
  return all
    .sort((a, b) => b - a)
    .map(year => ({
      year,
      present: columns.map(column => column.variant.years.some(row => row.year === year)),
    }))
}

/** El tramo del deslizador: del cuarto más barato del modelo más barato a la mediana más cara. */
export function carCompareBudgetRange(columns: readonly CarCompareColumn[]): {
  min: number
  max: number
} {
  const rows = columns.flatMap(column => column.variant.years)
  if (!rows.length) return { min: 5_000, max: 30_000 }
  const min = Math.max(BUDGET_MIN, Math.floor(Math.min(...rows.map(row => row.p25)) / 500) * 500)
  const max = Math.min(BUDGET_MAX, Math.ceil(Math.max(...rows.map(row => row.median)) / 500) * 500)
  return { min, max: Math.max(max, min + 500) }
}

/** El presupuesto con que arranca la lente "con la misma plata": lo que se pide hoy por el año comparado. */
export function carCompareSuggestedBudget(input: CarCompareInput, year: number | null): number {
  const prices = input.columns
    .map(column => column.variant.years.find(row => row.year === year)?.median)
    .filter((value): value is number => typeof value === 'number')
  const range = carCompareBudgetRange(input.columns)
  if (!prices.length) return roundTo((range.min + range.max) / 2, 500)
  const mean = prices.reduce((sum, value) => sum + value, 0) / prices.length
  return Math.min(range.max, Math.max(range.min, roundTo(mean, 500)))
}

function pointOf(
  column: CarCompareColumn,
  mode: CarCompareMode,
  year: number | null,
  budget: number | null,
  kmYear: number,
  input: CarCompareInput
): CarComparePoint {
  const years = column.variant.years
  let row: PublicCarAdvisorYear | null = null
  let stretch: CarComparePoint['stretch'] = null
  let cheapest: PublicCarAdvisorYear | null = null
  let status: CarComparePointStatus = 'ok'
  if (mode === 'plata' && budget !== null) {
    const newestFirst = [...years].sort((a, b) => b.year - a.year)
    row = newestFirst.find(item => item.median <= budget) ?? null
    if (row) {
      const reach = newestFirst.find(item => item.year > row!.year && item.p25 <= budget)
      stretch = reach ? { year: reach.year, p25: reach.p25 } : null
    } else {
      status = 'no-alcanza'
      cheapest = [...years].sort((a, b) => a.median - b.median || b.year - a.year)[0] ?? null
    }
  } else {
    row = years.find(item => item.year === year) ?? null
    if (!row) status = 'sin-anio'
  }
  const drop = column.annualDrop ?? input.typicalDrop
  if (!row) return { status, row, stretch, cheapest, costs: null, drop, dropFromMarket: false }
  const costs = carOwnershipCosts(
    {
      fuel: column.variant.fuel,
      litersPer100Km: column.variant.litersPer100Km,
      partsIndex: column.parts?.index ?? null,
      annualDrop: column.annualDrop,
      priceUsd: row.median,
      year: row.year,
      kmYear,
    },
    {
      usdUyu: input.usdUyu,
      typicalDrop: input.typicalDrop,
      prices: { super95: input.fuel.super95, gasoil50s: input.fuel.gasoil50s },
      fuelFallback: new Map(
        Object.entries(input.fuelFallback).filter(
          (entry): entry is [PublicCarFuel, number] => typeof entry[1] === 'number'
        )
      ),
    }
  )
  return {
    status,
    row,
    stretch,
    cheapest,
    costs,
    drop,
    dropFromMarket: column.annualDrop === null && drop !== null,
  }
}

interface Tolerance {
  abs?: number
  rel?: number
}

export interface CarCompareOutcome {
  /** beats[i][j]: la columna i le gana a la j por más que el ruido de la fila. */
  beats: boolean[][]
  /** Nadie le gana y ella le gana a alguna: es la que la tabla marca como mejor. */
  best: boolean[]
}

/**
 * Quién le gana a quién, PAR A PAR. Medirlo contra "el mejor" fabricaba victorias: con 101, 90 y
 * 82 cv y un ruido de 12 %, el de 90 quedaba "a la par del mejor" y por eso le ganaba al de 82,
 * aunque entre ellos hay 8 cv, menos que el ruido (salió leyendo la comparación Onix-Gol-208).
 */
export function carCompareOutcome(
  values: ReadonlyArray<number | null>,
  better: CarCompareBetter,
  tolerance: Tolerance = {}
): CarCompareOutcome {
  const known = values.map(value => value !== null && Number.isFinite(value))
  const beats = values.map((mine, i) =>
    values.map((theirs, j) => {
      if (!better || i === j || !known[i] || !known[j]) return false
      const a = mine as number
      const b = theirs as number
      const margin = better === 'low' ? b - a : a - b
      const allowed = Math.max(
        tolerance.abs ?? 0,
        (tolerance.rel ?? 0) * Math.max(Math.abs(a), Math.abs(b))
      )
      return margin > allowed + 1e-9
    })
  )
  const best = values.map(
    (_, i) => known[i]! && !beats.some(row => row[i]) && beats[i]!.some(Boolean)
  )
  return { beats, best }
}

export const carCompareBest = (
  values: ReadonlyArray<number | null>,
  better: CarCompareBetter,
  tolerance: Tolerance = {}
): boolean[] => carCompareOutcome(values, better, tolerance).best

interface VerdictSpec {
  /** Ganar: "Más barato al mismo año". */
  win: string
  /** Perder: "Más caro al mismo año". */
  loss: string
  /** La frase con los números, propia contra las demás ya formateadas. */
  detail?: (own: string, others: string) => string
}

interface RowSpec {
  key: string
  label: string
  hint?: string
  better: CarCompareBetter
  tolerance?: Tolerance
  /** Lo que se compara; null = esa columna no entra en la comparación de esta fila. */
  values: Array<number | null>
  cells: Array<Omit<CarCompareCell, 'best'>>
  verdict?: VerdictSpec
}

const EMPTY: Omit<CarCompareCell, 'best'> = { text: '—' }

function shareCell(share: PublicCarAdvisorShare | null): {
  value: number | null
  cell: Omit<CarCompareCell, 'best'>
} {
  if (!share || share.n < SHARE_MIN_SHEETS)
    return { value: null, cell: { text: 'sin dato', sub: 'pocas fichas lo dicen' } }
  return {
    value: share.share,
    cell: { text: pct(share.share), sub: `de ${grouped(share.n)} fichas` },
  }
}

const partsMeasured = (parts: PublicCarAdvisorParts | null): parts is PublicCarAdvisorParts =>
  !!parts && parts.parts.length >= PARTS_MIN_MEASURED && parts.index !== null

function partsIndexText(index: number): string {
  if (Math.abs(index - 1) < 0.05) return 'como el típico'
  return index < 1
    ? `${Math.round((1 - index) * 100)} % menos que el típico`
    : `${Math.round((index - 1) * 100)} % más que el típico`
}

function ncapText(entry: LatinNcapEntry): string {
  return entry.protocol === '2020+'
    ? `${entry.stars} de 5 estrellas`
    : `${entry.adultStars} adulto · ${entry.childStars} niño`
}

/** El ensayo más cercano al año comparado (y a igual distancia, el más reciente). */
export function carCompareNcap(
  entries: readonly LatinNcapEntry[],
  year: number | null
): LatinNcapEntry | null {
  return (
    [...entries].sort((a, b) =>
      year === null
        ? b.testYear - a.testYear
        : Math.abs(a.testYear - year) - Math.abs(b.testYear - year) || b.testYear - a.testYear
    )[0] ?? null
  )
}

function compareNames(columns: readonly CarCompareColumn[]): string[] {
  return columns.map(column =>
    columns.filter(other => other.model === column.model).length > 1
      ? `${column.brand} ${column.model}`
      : column.model
  )
}

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

const joinList = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`

function rowsToGroup(
  key: string,
  title: string,
  specs: RowSpec[],
  note?: string
): {
  group: CarCompareGroup
  specs: RowSpec[]
  rows: CarCompareRow[]
  outcomes: CarCompareOutcome[]
} {
  const outcomes = specs.map(spec => carCompareOutcome(spec.values, spec.better, spec.tolerance))
  const rows = specs.map((spec, index) => ({
    key: spec.key,
    label: spec.label,
    hint: spec.hint,
    better: spec.better,
    cells: spec.cells.map((cell, column) => ({ ...cell, best: outcomes[index]!.best[column]! })),
    decided: outcomes[index]!.best.some(Boolean),
  }))
  return { group: { key, title, note, rows }, specs, rows, outcomes }
}

const VERDICT_ORDER: Record<CarCompareMode, readonly string[]> = {
  anio: [
    'precio',
    'mensual',
    'caida',
    'consumo',
    'indice',
    'km',
    'potencia',
    'baul',
    'plazas',
    'esc',
    'airbags',
    'isofix',
    'abs',
    '4x4',
    'avisos',
  ],
  plata: [
    'anio',
    'mensual',
    'caida',
    'consumo',
    'indice',
    'km',
    'potencia',
    'baul',
    'plazas',
    'esc',
    'airbags',
    'isofix',
    'abs',
    '4x4',
    'avisos',
  ],
}

export function compareCars(input: CarCompareInput, query: CarCompareQuery): CarCompareResult {
  const { columns } = input
  const mode = carCompareMode(query)
  const years = carCompareYears(columns)
  const year =
    mode === 'anio'
      ? query.year !== null && years.some(option => option.year === query.year)
        ? query.year
        : carCompareDefaultYear(columns)
      : null
  const budget = mode === 'plata' ? query.budget : null
  const points = columns.map(column => pointOf(column, mode, year, budget, query.kmYear, input))
  const names = compareNames(columns)
  const each = <T>(fn: (column: CarCompareColumn, point: CarComparePoint) => T): T[] =>
    columns.map((column, index) => fn(column, points[index]!))
  const none = (): Array<number | null> => columns.map(() => null)
  const fromRow = (fn: (row: PublicCarAdvisorYear) => number | null): Array<number | null> =>
    points.map(point => (point.row ? fn(point.row) : null))

  const built: Array<ReturnType<typeof rowsToGroup>> = []

  // -- Precio ------------------------------------------------------------------------------------
  const missingCell = (point: CarComparePoint): Omit<CarCompareCell, 'best'> =>
    point.status === 'no-alcanza' && point.cheapest
      ? {
          text: 'No alcanza',
          sub: `arranca en ${usd(point.cheapest.median)} (${point.cheapest.year})`,
        }
      : { text: 'Sin avisos', sub: year !== null ? `no hay suficientes de ${year}` : undefined }
  const kmRow: RowSpec = {
    key: 'km',
    label: 'Kilómetros típicos',
    hint: 'La mediana de lo que declaran los avisos de ese año.',
    better: 'low',
    tolerance: { rel: 0.15 },
    values: fromRow(row => row.kmMedian),
    cells: each((_, point) =>
      point.row
        ? { text: point.row.kmMedian === null ? 'sin dato' : formatCarKm(point.row.kmMedian) }
        : EMPTY
    ),
    verdict: {
      win: 'Menos kilómetros',
      loss: 'Más kilómetros',
      detail: (own, others) => `${own} típicos en los avisos, contra ${others}.`,
    },
  }
  if (mode === 'anio') {
    built.push(
      rowsToGroup(`precio`, year !== null ? `Lo que se pide por un ${year}` : 'Precio', [
        {
          key: 'precio',
          label: 'Precio pedido',
          hint: 'La mediana de los avisos de ese año, y entre qué valores está la mitad del medio.',
          better: 'low',
          tolerance: { rel: 0.05 },
          values: fromRow(row => row.median),
          cells: each((_, point) =>
            point.row
              ? {
                  text: usd(point.row.median),
                  sub: `${usd(point.row.p25)} a ${usd(point.row.p75)}`,
                }
              : missingCell(point)
          ),
          verdict: {
            win: 'Más barato al mismo año',
            loss: 'Más caro al mismo año',
            detail: (own, others) => `${own} por un ${year}, contra ${others}.`,
          },
        },
        {
          key: 'avisos-anio',
          label: 'Avisos de ese año',
          better: null,
          values: none(),
          cells: each((_, point) => (point.row ? { text: grouped(point.row.n) } : EMPTY)),
        },
        kmRow,
      ])
    )
  } else {
    built.push(
      rowsToGroup('precio', budget !== null ? `Lo que comprás con ${usd(budget)}` : 'Precio', [
        {
          key: 'anio',
          label: 'Año al que llegás',
          hint: 'El más nuevo cuya mediana entra en el presupuesto.',
          better: 'high',
          values: fromRow(row => row.year),
          cells: each((_, point) =>
            point.row
              ? {
                  text: String(point.row.year),
                  sub: `mediana ${usd(point.row.median)} · ${point.row.n} avisos`,
                }
              : missingCell(point)
          ),
          verdict: {
            win: 'Llegás a un auto más nuevo',
            loss: 'Llegás a un año más viejo',
            detail: (own, others) =>
              `Con ${usd(budget ?? 0)} la mitad de los ${own} entra; de los otros, ${others}.`,
          },
        },
        {
          key: 'negociando',
          label: 'Negociando',
          hint: 'Un año más nuevo cuyo cuarto más barato también entra.',
          better: null,
          values: none(),
          cells: each((_, point) =>
            !point.row
              ? EMPTY
              : point.stretch
                ? {
                    text: String(point.stretch.year),
                    sub: `desde ${usd(point.stretch.p25)}`,
                  }
                : { text: 'No', sub: 'el año siguiente no entra' }
          ),
        },
        kmRow,
      ])
    )
  }

  // -- Tenerlo -----------------------------------------------------------------------------------
  const costRow = (
    key: string,
    label: string,
    pick: (costs: CarAdvisorCosts) => number,
    tolerance: Tolerance,
    extra: Partial<RowSpec> = {},
    sub?: (costs: CarAdvisorCosts, point: CarComparePoint, column: CarCompareColumn) => string
  ): RowSpec => ({
    key,
    label,
    better: 'low',
    tolerance,
    values: each((_, point) => (point.costs ? pick(point.costs) : null)),
    cells: each((column, point) =>
      point.costs ? { text: uyu(pick(point.costs)), sub: sub?.(point.costs, point, column) } : EMPTY
    ),
    ...extra,
  })
  const consumptionText = (costs: CarAdvisorCosts, column: CarCompareColumn): string => {
    if (costs.consumption === null) return 'sin dato'
    const unit = column.variant.fuel === 'electrico' ? `kWh/100${NB}km` : `L/100${NB}km`
    return `${costs.consumptionEstimated ? '≈ ' : ''}${decimal(costs.consumption)}${NB}${unit}`
  }
  const anyMarketDrop = points.some(point => point.dropFromMarket)
  const tenerlo = [
    costRow(
      'mensual',
      'Por mes, de tu bolsillo',
      costs => costs.monthlyCashUyu,
      { rel: 0.08 },
      {
        hint: 'Combustible, patente, seguro obligatorio y mantenimiento. No incluye lo que pierde de valor.',
        verdict: {
          win: 'Sale menos tenerlo',
          loss: 'Sale más tenerlo',
          detail: (own, others) =>
            `${own} por mes entre combustible, patente, seguro y mantenimiento, contra ${others}.`,
        },
      }
    ),
    costRow(
      'combustible',
      'Combustible por año',
      costs => costs.fuelUyu,
      { rel: 0.08 },
      {},
      (costs, _, column) => consumptionText(costs, column)
    ),
    costRow(
      'patente',
      'Patente por año',
      costs => costs.patenteUyu,
      { rel: 0.1 },
      { hint: 'Estimada con el Texto Ordenado del SUCIVE 2026 sobre el precio pedido.' }
    ),
    costRow('mantenimiento', 'Mantenimiento por año', costs => costs.maintenanceUyu, {
      rel: 0.08,
    }),
    {
      ...costRow(
        'depreciacion',
        'Lo que pierde de valor por año',
        costs => costs.depreciationUyu,
        { rel: 0.1 },
        {},
        (_, point) =>
          point.dropFromMarket
            ? 'con la caída típica del mercado'
            : point.drop !== null
              ? `${pct(point.drop, 1)} por año`
              : 'sin dato'
      ),
      // Una caída típica no compite contra una medida: la columna se muestra y no entra.
      values: each((_, point) =>
        point.costs && !point.dropFromMarket && point.costs.depreciationKnown
          ? point.costs.depreciationUyu
          : null
      ),
    },
    costRow(
      'total',
      'Total por año',
      costs => costs.annualUyu,
      { rel: 0.08 },
      {
        hint: anyMarketDrop
          ? 'Todo lo anterior. Donde dice "caída típica", la depreciación es la del mercado y no la del modelo.'
          : 'Todo lo anterior, lo que pierde de valor incluido.',
      }
    ),
  ]
  built.push(
    rowsToGroup(
      'tenerlo',
      `Lo que cuesta tenerlo, con ${grouped(query.kmYear)} km por año`,
      tenerlo,
      `El seguro obligatorio (${uyu(CAR_ADVISOR_FIGURES.soaUyu.value)} al año) es igual para todos y está sumado en el mes y en el total.`
    )
  )

  // -- Valor -------------------------------------------------------------------------------------
  built.push(
    rowsToGroup('valor', 'Cuánto valor pierde', [
      {
        key: 'caida',
        label: 'Caída de precio por año',
        hint: 'Medida sobre sus propios avisos: cuánto menos se pide por cada año más de antigüedad.',
        better: 'low',
        tolerance: { abs: 0.015 },
        values: columns.map(column => column.annualDrop),
        cells: columns.map(column =>
          column.annualDrop !== null
            ? { text: pct(column.annualDrop, 1), sub: 'medida en sus avisos' }
            : {
                text: 'Sin curva propia',
                sub:
                  input.typicalDrop !== null
                    ? `se usa la del mercado, ${pct(input.typicalDrop, 1)}`
                    : undefined,
              }
        ),
        verdict: {
          win: 'Pierde menos valor',
          loss: 'Pierde más valor',
          detail: (own, others) => `${own} por año, contra ${others}.`,
        },
      },
      {
        key: 'valor3',
        label: 'Lo que valdría en 3 años',
        hint: 'El precio comparado con la caída de cada año aplicada tres veces.',
        better: null,
        values: none(),
        cells: each((_, point) => {
          if (!point.row || point.drop === null) return EMPTY
          const later = roundTo(point.row.median * (1 - point.drop) ** 3, 100)
          return {
            text: `≈ ${usd(later)}`,
            sub: `pierde ≈ ${usd(roundTo(point.row.median - later, 100))}`,
          }
        }),
      },
    ])
  )

  // -- Motor y consumo ---------------------------------------------------------------------------
  built.push(
    rowsToGroup('motor', 'Motor y consumo', [
      {
        key: 'variante',
        label: 'Combustible y caja',
        better: null,
        values: none(),
        cells: columns.map(column => ({
          text: carCompareVariantLabel(column.variant),
          sub: `${grouped(column.variant.adverts)} avisos`,
        })),
      },
      {
        key: 'consumo',
        label: 'Consumo',
        hint: 'L cada 100 km: menos es mejor. Lo declarado en los avisos o, si no lo dicen, lo del modelo.',
        better: 'low',
        tolerance: { abs: 0.4 },
        values: columns.map(column =>
          column.variant.fuel === 'electrico' ? null : column.variant.litersPer100Km
        ),
        cells: columns.map(column => {
          if (column.variant.fuel === 'electrico')
            return {
              text: `≈ ${decimal(CAR_ADVISOR_FIGURES.evKwhPer100Km.value)}${NB}kWh/100${NB}km`,
              sub: 'eléctrico: supuesto del sitio',
            }
          const own = column.variant.litersPer100Km
          if (own !== null)
            return {
              text: `${decimal(own)}${NB}L/100${NB}km`,
              sub:
                column.variant.consumptionDeclaredShare !== null
                  ? `lo declara el ${pct(column.variant.consumptionDeclaredShare)} de los avisos`
                  : undefined,
            }
          const fallback = input.fuelFallback[column.variant.fuel]
          return fallback !== undefined
            ? { text: `≈ ${decimal(fallback)}${NB}L/100${NB}km`, sub: 'mediana de su combustible' }
            : { text: 'sin dato' }
        }),
        verdict: {
          win: 'Gasta menos combustible',
          loss: 'Gasta más combustible',
          detail: (own, others) => `${own}, contra ${others}.`,
        },
      },
      {
        key: 'potencia',
        label: 'Potencia',
        hint: 'La mediana de las fichas técnicas del modelo.',
        better: 'high',
        tolerance: { rel: 0.12 },
        values: columns.map(column => column.powerHp),
        cells: columns.map(column =>
          column.powerHp !== null
            ? { text: `${grouped(column.powerHp)}${NB}cv` }
            : { text: 'sin dato' }
        ),
        verdict: {
          win: 'Más potencia',
          loss: 'Menos potencia',
          detail: (own, others) => `${own}, contra ${others}.`,
        },
      },
    ])
  )

  // -- Espacio -----------------------------------------------------------------------------------
  const espacio: RowSpec[] = [
    {
      key: 'carroceria',
      label: 'Carrocería',
      better: null,
      values: none(),
      cells: columns.map(column => ({
        text: column.body ? CAR_BODY_LABELS[column.body] : 'sin dato',
      })),
    },
    {
      key: 'plazas',
      label: 'Plazas',
      better: 'high',
      values: columns.map(column => column.seats),
      cells: columns.map(column => ({
        text: column.seats !== null ? String(column.seats) : 'sin dato',
      })),
      verdict: {
        win: 'Más plazas',
        loss: 'Menos plazas',
        detail: (own, others) => `${own}, contra ${others}.`,
      },
    },
    {
      // Se muestra y no se compara: las fichas lo miden a veces con los asientos rebatidos y a veces
      // con cifras imposibles (el 208 salía con 152 litros, la mitad del real). Una cifra mayor que
      // la que admite la carrocería ya se descarta en `sensibleModel`; una menor no se puede
      // distinguir de un auto chico de verdad, así que no decide nada.
      key: 'baul',
      label: 'Baúl',
      hint: 'Lo que dicen las fichas técnicas. No se compara: muchas lo miden distinto.',
      better: null,
      values: none(),
      cells: columns.map(column => ({
        text: column.trunkL !== null ? `${grouped(column.trunkL)}${NB}litros` : 'sin dato',
      })),
    },
    {
      key: 'largo',
      label: 'Largo',
      hint: 'Más largo no es mejor ni peor: es más lugar y más difícil de estacionar.',
      better: null,
      values: none(),
      cells: columns.map(column => ({
        text: column.lengthMm !== null ? `${decimal(column.lengthMm / 1000, 2)} m` : 'sin dato',
      })),
    },
  ]
  if (columns.some(column => (column.fourByFour?.share ?? 0) >= 0.1)) {
    const cells = columns.map(column => shareCell(column.fourByFour))
    espacio.push({
      key: '4x4',
      label: 'Con 4x4',
      hint: 'Qué parte de las fichas técnicas del modelo dice 4x4.',
      better: 'high',
      tolerance: { abs: 0.2 },
      values: cells.map(item => item.value),
      cells: cells.map(item => item.cell),
      verdict: {
        win: 'Más versiones 4x4',
        loss: 'Menos versiones 4x4',
        detail: (own, others) => `${own} de las fichas, contra ${others}.`,
      },
    })
  }
  built.push(rowsToGroup('espacio', 'Espacio', espacio))

  // -- Seguridad ---------------------------------------------------------------------------------
  const equipment = (
    key: string,
    label: string,
    pickShare: (column: CarCompareColumn) => PublicCarAdvisorShare | null,
    win: string,
    loss: string
  ): RowSpec => {
    const cells = columns.map(column => shareCell(pickShare(column)))
    return {
      key,
      label,
      better: 'high',
      tolerance: { abs: 0.15 },
      values: cells.map(item => item.value),
      cells: cells.map(item => item.cell),
      verdict: {
        win,
        loss,
        detail: (own, others) => `Lo dice el ${own} de las fichas, contra ${others}.`,
      },
    }
  }
  const ncapYear = mode === 'anio' ? year : null
  built.push(
    rowsToGroup(
      'seguridad',
      'Seguridad',
      [
        equipment(
          'esc',
          'Control de estabilidad',
          column => column.esc,
          'Más con control de estabilidad',
          'Menos con control de estabilidad'
        ),
        equipment(
          'airbags',
          'Airbags frontales',
          column => column.airbags,
          'Más con airbags',
          'Menos con airbags'
        ),
        equipment('abs', 'ABS', column => column.abs, 'Más con ABS', 'Menos con ABS'),
        equipment(
          'isofix',
          'ISOFIX',
          column => column.isofix,
          'Más con ISOFIX',
          'Menos con ISOFIX'
        ),
        {
          key: 'ncap',
          label: 'Latin NCAP',
          hint: 'El ensayo más cercano al año comparado. Se muestra y no se compara.',
          better: null,
          values: none(),
          cells: each((column, point) => {
            const carYear = point.row?.year ?? ncapYear
            const entry = carCompareNcap(column.ncap, carYear)
            if (!entry) return { text: 'Sin ensayo', sub: 'sin ensayo no es cero estrellas' }
            // Un ensayo de 2025 para un auto de 2016 puede ser de otra generación: se dice.
            const far = carYear !== null && Math.abs(entry.testYear - carYear) >= 4
            return {
              text: ncapText(entry),
              sub: far
                ? `ensayo ${entry.testYear}, lejos del ${carYear}`
                : `ensayo ${entry.testYear}`,
              href: entry.url,
            }
          }),
        },
      ],
      'Los porcentajes son de las fichas técnicas que mencionan cada elemento: lo no mencionado no cuenta como "no tiene".'
    )
  )

  // -- Repuestos ---------------------------------------------------------------------------------
  const partKeys = (Object.keys(CAR_PART_LABELS) as Array<keyof typeof CAR_PART_LABELS>).filter(
    key => columns.some(column => column.parts?.parts.some(part => part.key === key))
  )
  built.push(
    rowsToGroup(
      'repuestos',
      'Repuestos',
      [
        {
          key: 'indice',
          label: 'Índice de repuestos',
          hint: 'Seis piezas comunes contra la mediana de todos los modelos.',
          better: 'low',
          tolerance: { abs: 0.08 },
          values: columns.map(column => (partsMeasured(column.parts) ? column.parts.index : null)),
          cells: columns.map(column =>
            partsMeasured(column.parts)
              ? {
                  text: partsIndexText(column.parts.index!),
                  sub: `${column.parts.parts.length} piezas, ${grouped(column.parts.offers)} ofertas`,
                }
              : { text: 'Sin relevar', sub: 'no es lo mismo que caros' }
          ),
          verdict: {
            win: 'Repuestos más baratos',
            loss: 'Repuestos más caros',
            detail: (own, others) => `${own}, contra ${others}.`,
          },
        },
        ...partKeys.map(key => {
          const prices = columns.map(
            column => column.parts?.parts.find(part => part.key === key)?.median ?? null
          )
          return {
            key: `pieza-${key}`,
            label: CAR_PART_LABELS[key],
            better: 'low' as const,
            tolerance: { rel: 0.1 },
            values: prices,
            cells: prices.map(price => (price !== null ? { text: uyu(price) } : { text: '—' })),
          }
        }),
      ],
      'Medianas de avisos de repuestos en Mercado Libre Uruguay que nombran el modelo, en pesos.'
    )
  )

  // -- Mercado -----------------------------------------------------------------------------------
  built.push(
    rowsToGroup('mercado', 'El mercado de cada uno', [
      {
        key: 'avisos',
        label: 'Avisos vigentes',
        hint: 'De todas las versiones del modelo. Más avisos es más para elegir y negociar.',
        better: 'high',
        tolerance: { rel: 0.5 },
        values: columns.map(column => column.adverts),
        cells: columns.map(column => ({
          text: grouped(column.adverts),
          sub: `${grouped(column.sellers)} vendedores`,
        })),
        verdict: {
          win: 'Más para elegir',
          loss: 'Menos para elegir',
          detail: (own, others) => `${own} avisos vigentes, contra ${others}.`,
        },
      },
      {
        key: 'automotora',
        label: 'Publicados por automotoras',
        better: null,
        values: none(),
        cells: columns.map(column => ({ text: pct(column.dealerShare) })),
      },
      {
        key: 'riesgo',
        label: 'Declaran deuda, choque o papeles',
        hint: 'Lo que el vendedor escribe en el aviso. Esos avisos no entran en los precios de arriba.',
        better: null,
        values: none(),
        cells: columns.map(column => ({ text: pct(column.declaredRiskShare, 1) })),
      },
    ])
  )

  // -- Veredicto ---------------------------------------------------------------------------------
  const verdicts: CarCompareVerdict[] = columns.map(() => ({ wins: [], losses: [] }))
  const order = VERDICT_ORDER[mode]
  for (const { specs, rows, outcomes } of built) {
    specs.forEach((spec, specIndex) => {
      const row = rows[specIndex]!
      const { beats } = outcomes[specIndex]!
      if (!spec.verdict || !row.decided) return
      const verdict = spec.verdict
      const known = spec.values.map(value => value !== null && Number.isFinite(value))
      const describe = (other: number) => `${row.cells[other]!.text} (${names[other]})`
      row.cells.forEach((cell, index) => {
        if (!known[index]) return
        const others = row.cells
          .map((_, other) => other)
          .filter(other => other !== index && known[other])
        const beaten = others.filter(other => beats[index]![other])
        const beatenBy = others.filter(other => beats[other]![index])
        if (cell.best) {
          // Los que quedan dentro del ruido se nombran: "más barato" sin decir que el tercero está
          // a US$ 200 sería una victoria que no se ganó.
          const even = others.filter(other => !beats[index]![other] && !beats[other]![index])
          const detail = capital(verdict.detail?.(cell.text, joinList(beaten.map(describe))) ?? '')
          verdicts[index]!.wins.push({
            key: spec.key,
            title: verdict.win,
            detail: even.length
              ? `${detail} Parejo con ${joinList(even.map(other => `${names[other]} (${row.cells[other]!.text})`))}.`
              : detail,
          })
        } else if (beatenBy.length) {
          verdicts[index]!.losses.push({
            key: spec.key,
            title: verdict.loss,
            detail: capital(`${cell.text}, contra ${joinList(beatenBy.map(describe))}.`),
          })
        }
      })
    })
  }
  const rank = (reason: CarCompareReason): number => {
    const position = order.indexOf(reason.key)
    return position === -1 ? order.length : position
  }
  for (const verdict of verdicts) {
    verdict.wins = verdict.wins.sort((a, b) => rank(a) - rank(b)).slice(0, WINS_MAX)
    verdict.losses = verdict.losses.sort((a, b) => rank(a) - rank(b)).slice(0, LOSSES_MAX)
  }

  return {
    mode,
    year,
    budget,
    kmYear: query.kmYear,
    years,
    budgetRange: carCompareBudgetRange(columns),
    points,
    groups: built.map(item => item.group),
    verdicts,
    names,
  }
}

/** Los filtros del directorio (/autos-usados-uruguay) que muestran los autos de una columna. */
export function carCompareListingsQuery(
  column: CarCompareColumn,
  point: CarComparePoint,
  budget: number | null
): Record<string, string> {
  const query: Record<string, string> = {
    brand: column.brandSlug,
    model: column.slug,
    fuel: column.variant.fuel,
    transmission: column.variant.transmission,
    noRisk: '1',
  }
  if (point.row) {
    query.yearMin = String(point.row.year)
    query.yearMax = String(point.stretch?.year ?? point.row.year)
  }
  if (budget !== null) query.priceMax = String(budget)
  return query
}

export const CAR_COMPARE_FAQ: readonly FaqItem[] = Object.freeze([
  {
    id: 'comparar-autos-precios',
    question: '¿Los precios son de venta?',
    answer:
      'No: son lo que piden los avisos vigentes de Mercado Libre, Facebook Marketplace y las webs de automotoras, agrupados por modelo, año, combustible y caja. Se muestra la mediana de cada año con tres avisos o más, y los avisos que declaran deuda, choque o problemas de papeles quedan afuera. El precio al que se cierra la venta no se publica en ningún lado.',
  },
  {
    id: 'comparar-autos-falta-modelo',
    question: '¿Por qué no aparece mi modelo?',
    answer:
      'El comparador usa los modelos con 12 avisos vigentes o más y alguna combinación de combustible y caja con 6 o más: con menos, un año suelto lo decide un solo aviso. Un modelo que hoy no llega puede aparecer mañana, porque la tabla se rehace con cada lectura del directorio.',
  },
  {
    id: 'comparar-autos-quien-gana',
    question: '¿Cómo se decide en qué gana cada uno?',
    answer:
      'Uno le gana a otro sólo si la diferencia entre los dos pasa un margen de ruido: 5 % en el precio, 8 % en el costo por mes, 0,4 litros cada 100 km en el consumo, un punto y medio en la caída anual, 8 puntos en el índice de repuestos y 12 % en la potencia. Lo que queda dentro del margen se dice parejo y no cuenta, y un dato que falta no gana ni pierde.',
  },
  {
    id: 'comparar-autos-costo',
    question: '¿Qué incluye el costo de tenerlo?',
    answer:
      'Combustible (el consumo de esa versión por tus kilómetros y el precio vigente de ANCAP), la patente estimada con el Texto Ordenado del SUCIVE 2026 sobre el precio pedido, el seguro obligatorio y el mantenimiento escalado por el índice de repuestos del modelo. Lo que pierde de valor se suma aparte en el total por año, porque no sale del bolsillo cada mes.',
  },
  {
    id: 'comparar-autos-ncap',
    question: '¿Por qué las estrellas de Latin NCAP no deciden?',
    answer:
      'Porque un ensayo califica una versión, con sus airbags, en un momento, y casi nunca dice desde qué año de modelo vale: el mismo modelo puede tener cero estrellas en una generación y cinco en la siguiente. Se muestra el ensayo más cercano al año comparado, con el enlace al resultado oficial, y no suma ni resta.',
  },
])
