// Contrato público del seguimiento de precios (alquileres, viviendas en venta, autos usados).
// Espejo de classes/marketseries/types.ts — la app no importa la raíz; tests/unit/marketSeries.test.ts
// compara las constantes leyendo esos archivos como texto. Escribe el job `currency-market-series`
// (docs/app/MARKET_SERIES.md).
import type { FaqItem } from './faqAnswers'
import { formatCurrency } from './format'

export const MARKET_VERTICALS = ['alquiler', 'venta', 'autos'] as const
export type MarketVertical = (typeof MARKET_VERTICALS)[number]
export type MarketCurrency = 'UYU' | 'USD'
export type MarketTypeBucket = 'apartamento' | 'casa' | 'todas'
export type MarketBedrooms = 'any' | '0' | '1' | '2' | '3' | '4plus'
export type MarketWindow = 7 | 30 | 90

export const MARKET_SAMPLE_MINIMUM = 8
export const MARKET_PAIR_MINIMUM = 8
export const MARKET_WINDOWS = [7, 30, 90] as const
export const MARKET_SERIES_KEY_PATTERN =
  /^(?:(?:alquiler|venta)\|(?:UYU|USD)\|(?:apartamento|casa|todas)\|(?:any|[0-3]|4plus)\|(?:uy|d:[a-z0-9-]{1,80}|b:[a-z0-9-]{1,80}:[a-z0-9-]{1,80})|autos\|USD\|(?:all|m:[a-z0-9-]{1,80}(?:\|y:\d{4})?))$/

export interface MarketPairStats {
  n: number
  chg: number | null
  down: number
  up: number
  same: number
  outliers: number
}
export interface MarketSeriesPoint {
  d: string
  n: number
  p25: number | null
  med: number | null
  p75: number | null
  m2: { n: number; med: number | null } | null
  w7: MarketPairStats | null
  w30: MarketPairStats | null
  w90: MarketPairStats | null
}
export interface MarketCohortDims {
  vertical: MarketVertical
  currency: MarketCurrency
  scope: 'uy' | 'department' | 'neighborhood' | 'all' | 'model' | 'year'
  propertyType: MarketTypeBucket | null
  bedrooms: MarketBedrooms | null
  departmentSlug: string | null
  neighborhoodSlug: string | null
  marketSlug: string | null
  year: number | null
}
export interface MarketSeriesDoc {
  key: string
  vertical: MarketVertical
  dims: MarketCohortDims
  labels: {
    department: string | null
    neighborhood: string | null
    brand: string | null
    model: string | null
  }
  label: string
  latest: MarketSeriesPoint
  updatedAt: string
  points: MarketSeriesPoint[]
}
export interface MarketIndexScope {
  token: string
  scope: 'uy' | 'department' | 'neighborhood'
  department: string | null
  neighborhood: string | null
  label: string
  n: Partial<Record<MarketCurrency, number>>
}
export interface MarketIndexModel {
  slug: string
  brand: string
  model: string
  n: number
  med: number | null
  w30: number | null
}
export interface MarketMover {
  key: string
  label: string
  currency: MarketCurrency
  window: MarketWindow
  chg: number
  pairs: number
  down: number
  up: number
}
export interface MarketSeriesIndex {
  key: string
  vertical: MarketVertical
  day: string
  generatedAt: string
  dataAsOf: string
  trackingSince: string
  observations: number
  cohorts: number
  excluded: Record<string, number>
  scopes: MarketIndexScope[]
  models: MarketIndexModel[]
  movers: { window: MarketWindow | null; down: MarketMover[]; up: MarketMover[] }
}
export interface MarketSibling {
  key: string
  dims: MarketCohortDims
  latest: MarketSeriesPoint
  updatedAt: string
}
export interface MarketSeriesResponse {
  series: MarketSeriesDoc | null
  siblings: MarketSibling[]
}

export const MARKET_TYPE_LABELS: Record<MarketTypeBucket, string> = {
  todas: 'Casas y apartamentos',
  apartamento: 'Apartamentos',
  casa: 'Casas',
}
export const MARKET_BEDROOM_LABELS: Record<MarketBedrooms, string> = {
  any: 'Todos',
  '0': 'Monoambiente',
  '1': '1 dormitorio',
  '2': '2 dormitorios',
  '3': '3 dormitorios',
  '4plus': '4 o más',
}

/** Display order. Never `Object.keys` of the label maps: JS lists "0".."3" before "any". */
export const MARKET_TYPE_ORDER: readonly MarketTypeBucket[] = ['todas', 'apartamento', 'casa']
export const MARKET_BEDROOM_ORDER: readonly MarketBedrooms[] = ['any', '0', '1', '2', '3', '4plus']

export const housingSeriesKey = (
  vertical: 'alquiler' | 'venta',
  currency: MarketCurrency,
  type: MarketTypeBucket,
  bedrooms: MarketBedrooms,
  scope: string
): string => `${vertical}|${currency}|${type}|${bedrooms}|${scope}`

export const carSeriesKey = (slug: string | null, year?: number | null): string =>
  !slug ? 'autos|USD|all' : year ? `autos|USD|m:${slug}|y:${year}` : `autos|USD|m:${slug}`

export const isMarketSeriesKey = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 240 && MARKET_SERIES_KEY_PATTERN.test(value)

/** The 18 type x bedrooms cohorts of the same market, currency and place. */
export function housingSiblingKeys(key: string): string[] {
  const [vertical, currency, , , scope] = key.split('|')
  if ((vertical !== 'alquiler' && vertical !== 'venta') || !scope) return []
  return MARKET_TYPE_ORDER.flatMap(type =>
    MARKET_BEDROOM_ORDER.map(bed =>
      housingSeriesKey(vertical, currency as MarketCurrency, type, bed, scope)
    )
  )
}

export function carModelOfKey(key: string): string | null {
  return /^autos\|USD\|m:([a-z0-9-]{1,80})(?:\|y:\d{4})?$/.exec(key)?.[1] ?? null
}

export const marketMoney = (value: number | null | undefined, currency: MarketCurrency): string =>
  typeof value === 'number' ? formatCurrency(value, currency, 0) : '—'

export const marketCount = (value: number | null | undefined): string =>
  typeof value === 'number' ? value.toLocaleString('es-UY') : '—'

export function marketPct(value: number | null | undefined, digits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const rounded = Math.round(value * 100 * 10 ** digits) / 10 ** digits
  const body = Math.abs(rounded).toLocaleString('es-UY', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return `${rounded > 0 ? '+' : rounded < 0 ? '-' : ''}${body} %`
}

/** "8/9/2026", straight from the string: no time zone can move the day. */
export const marketDay = (day: string): string =>
  `${Number(day.slice(8, 10))}/${Number(day.slice(5, 7))}/${day.slice(0, 4)}`

const shiftDay = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10)

export type MarketWindowState =
  | { kind: 'waiting'; from: string }
  | { kind: 'thin'; n: number }
  | { kind: 'ok'; stats: MarketPairStats & { chg: number } }

/** Why a "misma oferta" card has no number yet: too early, or too few adverts to say. */
export function marketWindowState(
  stats: MarketPairStats | null,
  window: number,
  trackingSince: string,
  today: string
): MarketWindowState {
  const from = shiftDay(trackingSince, window)
  if (today < from) return { kind: 'waiting', from }
  if (!stats || stats.chg === null) return { kind: 'thin', n: stats?.n ?? 0 }
  return { kind: 'ok', stats: stats as MarketPairStats & { chg: number } }
}

export function marketChart(points: readonly MarketSeriesPoint[]): {
  labels: string[]
  med: (number | null)[]
  p25: (number | null)[]
  p75: (number | null)[]
} {
  return {
    labels: points.map(point => `${Number(point.d.slice(8, 10))}/${Number(point.d.slice(5, 7))}`),
    med: points.map(point => point.med),
    p25: points.map(point => point.p25),
    p75: points.map(point => point.p75),
  }
}

const NOUN: Record<MarketVertical, string> = {
  alquiler: 'alquileres',
  venta: 'viviendas en venta',
  autos: 'autos usados',
}

export function marketSeriesFaq(
  vertical: MarketVertical,
  trackingSince?: string | null
): FaqItem[] {
  const unit = vertical === 'alquiler' ? 'vivienda' : 'aviso'
  const since = trackingSince ? `el ${marketDay(trackingSince)}` : 'en septiembre de 2026'
  return [
    {
      id: `evolucion-${vertical}-mediana`,
      question: '¿Por qué la mediana no alcanza para saber si los precios bajaron?',
      answer:
        'Porque cambia qué avisos hay publicados. Si esta semana entraron avisos baratos o se fueron los caros, la mediana baja aunque nadie haya bajado nada. Por eso mostramos aparte la variación de la misma oferta: el mismo aviso contra su propio precio de hace 7, 30 o 90 días.',
    },
    {
      id: `evolucion-${vertical}-misma-oferta`,
      question: '¿Qué es la variación de la misma oferta?',
      answer: `Tomamos los avisos que siguen publicados y que ya seguíamos hace 7, 30 o 90 días, y comparamos su precio de hoy con el de entonces. Publicamos el promedio geométrico de esas razones y cuántos bajaron, subieron o quedaron igual. Un aviso que en ese lapso se duplica o se parte a la mitad lo tratamos como un error de carga y no cuenta. Hacen falta al menos ${MARKET_PAIR_MINIMUM} avisos para publicar el número.`,
    },
    {
      id: `evolucion-${vertical}-desde-cuando`,
      question: '¿Desde cuándo hay datos?',
      answer: `La serie empezó ${since} y no la reconstruimos hacia atrás: no guardábamos los precios viejos, y rellenar el pasado con el precio de hoy dibujaría una línea plana que nunca existió. La variación de 7 días aparece a la semana, la de 30 días al mes y la de 90 días a los tres meses.`,
    },
    {
      id: `evolucion-${vertical}-que-es`,
      question: '¿Son los precios a los que se cierra el trato?',
      answer: `No. Son precios pedidos en ${NOUN[vertical]} publicados en internet, una observación por ${unit}. El precio al que se cierra un trato puede ser otro y no se publica en ningún lado. Nunca mezclamos pesos con dólares: cada moneda es su propia serie.`,
    },
  ]
}
