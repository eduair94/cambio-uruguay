// Geometry for the two small charts of the /asistente-ia chat: the market as a strip of dots (one
// per board, the best one called out) and a rate's history as a line. Pure, so the arithmetic is
// tested without a DOM; the components only draw what this returns.

import type { RateHouse, SeriesPoint } from './chatResults'

export interface StripDot {
  name: string
  value: number
  /** 0–100: where it sits on the strip. */
  x: number
  best: boolean
  excluded: boolean
}

export interface Strip {
  min: number
  max: number
  dots: StripDot[]
  /** Where the market average falls, when known. */
  avgX?: number
}

/**
 * One side of the market (`sell` or `buy`) on a 0–100 axis.
 *
 * The axis spans the boards the site would crown, padded by 4 %, so a stale board far outside the
 * market does not squash every real price into one pixel: it is pinned to the edge instead and
 * drawn hollow, which is what it is.
 */
export function marketStrip(
  houses: readonly RateHouse[],
  side: 'buy' | 'sell',
  bestName?: string,
  avg?: number
): Strip | null {
  const live = houses.filter(h => !h.excluded).map(h => h[side])
  if (live.length < 2) return null
  let min = Math.min(...live)
  let max = Math.max(...live)
  if (max === min) {
    min -= 0.5
    max += 0.5
  }
  const pad = (max - min) * 0.04
  min -= pad
  max += pad
  const at = (value: number) => Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const dots = houses.map(h => ({
    name: h.name,
    value: h[side],
    x: at(h[side]),
    best: !h.excluded && h.name === bestName,
    excluded: h.excluded,
  }))
  // The best dot is drawn last, so no neighbour covers it.
  dots.sort((a, b) => Number(a.best) - Number(b.best))
  return { min, max, dots, avgX: avg !== undefined ? at(avg) : undefined }
}

export interface SeriesGeometry {
  width: number
  height: number
  sell?: { line: string; area: string; first: number; last: number; min: number; max: number }
  /**
   * The band between buy and sell over the days both are known: the spread, drawn to scale. When
   * one side is missing somewhere, `sell.area` (down to the axis) is drawn instead.
   */
  band?: string
  buy?: { line: string; first: number; last: number }
  /** y of the sell's lowest and highest points, for their labels. */
  sellMinY?: number
  sellMaxY?: number
  firstDate: string
  lastDate: string
}

const round = (n: number) => Math.round(n * 10) / 10

/**
 * SVG paths for a rate's history: sell as a line with a soft area under it, buy as a thinner line.
 * Both share one vertical scale, so the gap between them is the spread, drawn to scale.
 */
export function seriesGeometry(
  points: readonly SeriesPoint[],
  width = 320,
  height = 96,
  padY = 8
): SeriesGeometry | null {
  if (points.length < 2) return null
  const values = points.flatMap(p => [p.sell, p.buy]).filter((v): v is number => v !== null)
  if (!values.length) return null
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (hi === lo) {
    lo -= 0.5
    hi += 0.5
  }
  const x = (i: number) => round((i / (points.length - 1)) * width)
  const y = (v: number) => round(padY + (1 - (v - lo) / (hi - lo)) * (height - 2 * padY))
  const path = (side: 'sell' | 'buy') => {
    const pts = points
      .map((p, i) => (p[side] === null ? null : ([x(i), y(p[side]!)] as const)))
      .filter((p): p is readonly [number, number] => p !== null)
    if (pts.length < 2) return null
    return { pts, line: pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px} ${py}`).join(' ') }
  }
  const series = (side: 'sell' | 'buy') =>
    points.map(p => p[side]).filter((v): v is number => v !== null)

  const out: SeriesGeometry = {
    width,
    height,
    firstDate: points[0]!.date,
    lastDate: points[points.length - 1]!.date,
  }
  const sell = path('sell')
  if (sell) {
    const values = series('sell')
    const first = sell.pts[0]!
    const last = sell.pts[sell.pts.length - 1]!
    out.sell = {
      line: sell.line,
      area: `${sell.line} L${last[0]} ${height} L${first[0]} ${height} Z`,
      first: values[0]!,
      last: values[values.length - 1]!,
      min: Math.min(...values),
      max: Math.max(...values),
    }
    out.sellMinY = y(out.sell.min)
    out.sellMaxY = y(out.sell.max)
  }
  if (points.every(p => p.sell !== null && p.buy !== null)) {
    const top = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.sell!)}`)
    const bottom = points.map((p, i) => `L${x(i)} ${y(p.buy!)}`).reverse()
    out.band = `${top.join(' ')} ${bottom.join(' ')} Z`
  }
  const buy = path('buy')
  if (buy) {
    const values = series('buy')
    out.buy = { line: buy.line, first: values[0]!, last: values[values.length - 1]! }
  }
  return out.sell || out.buy ? out : null
}

/** "+0,7 %" / "−1,2 %": the change of a series, signed, for its caption. */
export function changeLabel(first: number, last: number): string {
  if (!first) return ''
  const pct = ((last - first) / first) * 100
  const abs = Math.abs(pct).toLocaleString('es-UY', { maximumFractionDigits: 1 })
  if (abs === '0') return 'sin cambios'
  return `${pct > 0 ? '+' : '−'}${abs} %`
}
