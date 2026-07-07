import type { SeriesPoint } from './rateStats'

export interface Correlation {
  key: string
  r: number
  n: number
}

export interface Move {
  date: string
  pctChange: number
  direction: 'up' | 'down'
}

/** Daily log-returns of a date-sorted series, each keyed by the later date. */
export function logReturns(series: SeriesPoint[]): SeriesPoint[] {
  const out: SeriesPoint[] = []
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1]
    const cur = series[i]
    if (!prev || !cur) continue
    if (prev.value <= 0 || cur.value <= 0) continue
    const r = Math.log(cur.value / prev.value)
    if (!Number.isFinite(r)) continue
    out.push({ date: cur.date, value: r })
  }
  return out
}

/** Inner-join two series on the shared calendar-day key (YYYY-MM-DD), preserving the
 *  order of `a`. Series may carry ISO datetimes or plain day strings — both are sliced
 *  to the day so the join never silently misses on a format mismatch. */
export function alignByDate(a: SeriesPoint[], b: SeriesPoint[]): { a: number[]; b: number[] } {
  const dayKey = (d: string) => d.slice(0, 10)
  const bMap = new Map(b.map(p => [dayKey(p.date), p.value]))
  const xs: number[] = []
  const ys: number[] = []
  for (const p of a) {
    const y = bMap.get(dayKey(p.date))
    if (y === undefined) continue
    xs.push(p.value)
    ys.push(y)
  }
  return { a: xs, b: ys }
}

/** Pearson correlation. Returns 0 for <2 points or zero variance. */
export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return 0
  let sx = 0
  let sy = 0
  for (let i = 0; i < n; i++) {
    sx += xs[i]!
    sy += ys[i]!
  }
  const mx = sx / n
  const my = sy / n
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    const a = xs[i]! - mx
    const b = ys[i]! - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  const den = Math.sqrt(dx * dy)
  if (den === 0) return 0
  return num / den
}

/** Correlate each driver's returns against the base series' returns; rank by |r| desc. */
export function rankDrivers(
  base: SeriesPoint[],
  drivers: { key: string; points: SeriesPoint[] }[]
): Correlation[] {
  const baseR = logReturns(base)
  return drivers
    .map(d => {
      const { a, b } = alignByDate(baseR, logReturns(d.points))
      return { key: d.key, r: pearson(a, b), n: a.length }
    })
    .sort((x, y) => Math.abs(y.r) - Math.abs(x.r))
}

/** Days whose |% change vs the previous point| exceeds thresholdPct (default 1). */
export function detectMoves(series: SeriesPoint[], thresholdPct = 1): Move[] {
  const out: Move[] = []
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1]
    const cur = series[i]
    if (!prev || !cur || prev.value <= 0) continue
    const pct = ((cur.value - prev.value) / prev.value) * 100
    if (Math.abs(pct) <= thresholdPct) continue
    out.push({ date: cur.date, pctChange: pct, direction: pct >= 0 ? 'up' : 'down' })
  }
  return out
}
