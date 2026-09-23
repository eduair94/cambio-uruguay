/**
 * Espejo del lector de historial por aviso de la raíz (`classes/pricehistory/normalize.ts`), que la
 * app no puede importar: son dos paquetes, dos builds y dos formatos de módulo. La paridad la
 * verifica `app/tests/unit/priceHistory.test.ts`, que SÍ importa el archivo de la raíz directamente y
 * compara las dos salidas sobre los mismos documentos.
 *
 * Las dos reglas que hay que respetar si se toca esto:
 *  - la moneda nunca se mezcla: un punto en otra moneda corta la serie (`currencySwitched`), no se
 *    convierte ni se promedia;
 *  - un punto sin moneda (los de `pricewatchoffers` anteriores al 2026-09-17) hereda la del aviso.
 */

export type PriceHistoryVertical =
  | 'autos'
  | 'alquiler'
  | 'venta'
  | 'equipar'
  | 'sillas'
  | 'celulares'
  | 'movilidad'

export type PriceHistoryCurrency = 'UYU' | 'USD'

export interface PriceHistoryPoint {
  d: string
  p: number
}

export interface PriceHistoryChange {
  from: number
  to: number
  at: string
}

/** Lo que cruza la red: la serie del aviso y nada más del documento privado que la guarda. */
export interface PriceHistorySeries {
  id: string
  currency: PriceHistoryCurrency
  points: PriceHistoryPoint[]
  firstSeen: string
  lastSeen: string
  changePct: number | null
  lastChange: PriceHistoryChange | null
  currencySwitched: boolean
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

const isCurrency = (value: unknown): value is PriceHistoryCurrency =>
  value === 'UYU' || value === 'USD'

const round2 = (value: number): number => Math.round(value * 100) / 100

interface RawPoint {
  d: string
  p: number
  c: PriceHistoryCurrency | null
}

const rawPoint = (d: unknown, p: unknown, c: unknown): RawPoint | null => {
  const day = typeof d === 'string' ? d.slice(0, 10) : ''
  if (!DAY.test(day)) return null
  if (typeof p !== 'number' || !Number.isFinite(p) || p <= 0) return null
  return { d: day, p, c: isCurrency(c) ? c : null }
}

export function currencyTail(
  points: readonly RawPoint[],
  fallback: PriceHistoryCurrency
): { points: PriceHistoryPoint[]; currency: PriceHistoryCurrency; switched: boolean } {
  if (!points.length) return { points: [], currency: fallback, switched: false }
  const currency = points[points.length - 1]!.c ?? fallback
  let start = 0
  for (let i = points.length - 1; i >= 0; i--) {
    const own = points[i]!.c
    if (own && own !== currency) {
      start = i + 1
      break
    }
  }
  return {
    points: points.slice(start).map(point => ({ d: point.d, p: point.p })),
    currency,
    switched: start > 0,
  }
}

/**
 * La misma guarda de plausibilidad que la raíz (`classes/pricehistory/normalize.ts`): un salto de más
 * de 5× contra la mediana de los demás puntos es un error de carga, no un cambio de precio. Con dos
 * puntos y un salto así no se publica serie: no hay forma de saber cuál de los dos es el bueno.
 */
export const PRICE_HISTORY_MAX_RATIO = 5

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

export function plausiblePoints(points: readonly PriceHistoryPoint[]): PriceHistoryPoint[] | null {
  if (points.length < 2) return [...points]
  if (points.length === 2) {
    const ratio = points[1]!.p / points[0]!.p
    return ratio > PRICE_HISTORY_MAX_RATIO || ratio < 1 / PRICE_HISTORY_MAX_RATIO
      ? null
      : [...points]
  }
  const kept = points.filter((point, index) => {
    const others = points.filter((_, other) => other !== index).map(other => other.p)
    const reference = median(others)
    if (!(reference > 0)) return true
    const ratio = point.p / reference
    return ratio <= PRICE_HISTORY_MAX_RATIO && ratio >= 1 / PRICE_HISTORY_MAX_RATIO
  })
  return kept.length ? kept : null
}

export function summarize(points: readonly PriceHistoryPoint[]): {
  changePct: number | null
  lastChange: PriceHistoryChange | null
} {
  if (points.length < 2) return { changePct: null, lastChange: null }
  const first = points[0]!
  const last = points[points.length - 1]!
  let lastChange: PriceHistoryChange | null = null
  for (let i = points.length - 1; i > 0; i--) {
    const current = points[i]!
    const previous = points[i - 1]!
    if (current.p !== previous.p) {
      lastChange = { from: previous.p, to: current.p, at: current.d }
      break
    }
  }
  return { changePct: round2(((last.p - first.p) / first.p) * 100), lastChange }
}

function build(
  id: string,
  raw: RawPoint[],
  fallback: PriceHistoryCurrency,
  firstSeen: string,
  lastSeen: string
): PriceHistorySeries | null {
  const tail = currencyTail(raw, fallback)
  if (!tail.points.length) return null
  const points = plausiblePoints(tail.points)
  if (!points || !points.length) return null
  return {
    id,
    currency: tail.currency,
    points,
    firstSeen: firstSeen || points[0]!.d,
    lastSeen: lastSeen || points[points.length - 1]!.d,
    currencySwitched: tail.switched,
    ...summarize(points),
  }
}

const day = (value: unknown): string => (typeof value === 'string' ? value.slice(0, 10) : '')

/** `pricewatchoffers`: un punto por día aunque el precio no cambie. */
export function seriesFromPricewatch(doc: Record<string, any>): PriceHistorySeries | null {
  const id = typeof doc?.listingId === 'string' ? doc.listingId : ''
  if (!id) return null
  const raw = (Array.isArray(doc?.history) ? doc.history : [])
    .map((point: any) => rawPoint(point?.d, point?.p, point?.c))
    .filter((point: RawPoint | null): point is RawPoint => point !== null)
  return build(
    id,
    raw,
    isCurrency(doc?.currency) ? doc.currency : 'UYU',
    day(doc?.firstSeen),
    day(doc?.lastSeen)
  )
}

/** `carlistings.priceHistory`: un punto sólo cuando el precio cambia. */
export function seriesFromCarListing(doc: Record<string, any>): PriceHistorySeries | null {
  const id = typeof doc?.key === 'string' ? doc.key : ''
  if (!id) return null
  const raw = (Array.isArray(doc?.priceHistory) ? doc.priceHistory : [])
    .map((point: any) => rawPoint(point?.observedAt, point?.price, point?.currency))
    .filter((point: RawPoint | null): point is RawPoint => point !== null)
  return build(
    id,
    raw,
    isCurrency(doc?.listing?.currency) ? doc.listing.currency : 'USD',
    day(doc?.firstSeen),
    day(doc?.lastSeen)
  )
}

/** `marketpricelogs`: alquiler y venta, un punto sólo al cambiar. */
export function seriesFromMarketLog(doc: Record<string, any>): PriceHistorySeries | null {
  const id = typeof doc?.advertId === 'string' ? doc.advertId : ''
  if (!id) return null
  const raw = (Array.isArray(doc?.points) ? doc.points : [])
    .map((point: any) => rawPoint(point?.d, point?.p, point?.c))
    .filter((point: RawPoint | null): point is RawPoint => point !== null)
  return build(id, raw, raw[raw.length - 1]?.c ?? 'UYU', day(doc?.firstSeen), day(doc?.lastSeen))
}

/** "bajó 12,5 %" / "subió 4 %", con el signo que el lector entiende sin leer el color. */
export function priceChangeLabel(pct: number | null): string | null {
  if (pct === null || !Number.isFinite(pct) || Math.abs(pct) < 0.01) return null
  const value = Math.abs(pct).toLocaleString('es-UY', { maximumFractionDigits: 1 })
  return `${pct < 0 ? 'bajó' : 'subió'} ${value} %`
}

export const PRICE_HISTORY_VERTICAL_LABEL: Record<PriceHistoryVertical, string> = {
  autos: 'Autos usados',
  alquiler: 'Alquileres',
  venta: 'Viviendas en venta',
  equipar: 'Equipar la casa',
  sillas: 'Sillas de escritorio',
  celulares: 'Celulares',
  movilidad: 'Movilidad eléctrica',
}
