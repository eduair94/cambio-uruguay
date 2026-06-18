import { round } from './calculators'

export interface SeriesPoint {
  date: string
  value: number
}

export interface Momentum {
  latest: number | null
  prev: number | null
  changePct: number
  direction: 'up' | 'down' | 'flat'
  sparkline: number[]
}

/** Latest vs previous point, plus a trailing sparkline of the last `sparkN`. */
export function computeMomentum(series: SeriesPoint[], sparkN = 7): Momentum {
  const vals = series.map(p => p.value).filter(v => Number.isFinite(v))
  if (vals.length === 0) {
    return { latest: null, prev: null, changePct: 0, direction: 'flat', sparkline: [] }
  }
  const latest = vals[vals.length - 1]!
  const prev = vals.length > 1 ? vals[vals.length - 2]! : null
  let changePct = 0
  let direction: Momentum['direction'] = 'flat'
  if (prev !== null && prev !== 0) {
    changePct = round(((latest - prev) / prev) * 100, 2)
    direction = latest > prev ? 'up' : latest < prev ? 'down' : 'flat'
  }
  return { latest, prev, changePct, direction, sparkline: vals.slice(-sparkN) }
}

export interface Records {
  max: { value: number; date: string } | null
  min: { value: number; date: string } | null
  yearAgo: number | null
  monthlyAvg: number | null
}

/** Max/min over the series, mean, and the value closest to one year before `now`. */
export function computeRecords(series: SeriesPoint[], now: Date = new Date()): Records {
  const pts = series.filter(p => Number.isFinite(p.value))
  if (pts.length === 0) return { max: null, min: null, yearAgo: null, monthlyAvg: null }

  let max = pts[0]!
  let min = pts[0]!
  let sum = 0
  for (const p of pts) {
    if (p.value > max.value) max = p
    if (p.value < min.value) min = p
    sum += p.value
  }

  const target = new Date(now)
  target.setFullYear(target.getFullYear() - 1)
  const targetMs = target.getTime()
  let yearAgo: number | null = null
  let bestDelta = Infinity
  for (const p of pts) {
    const d = Math.abs(new Date(p.date).getTime() - targetMs)
    // within ~30 days of one year ago
    if (d < bestDelta && d <= 31 * 24 * 3600 * 1000) {
      bestDelta = d
      yearAgo = p.value
    }
  }

  return {
    max: { value: max.value, date: max.date },
    min: { value: min.value, date: min.date },
    yearAgo,
    monthlyAvg: round(sum / pts.length, 2),
  }
}

/** Pesos saved buying `amount` (USD-equivalent) at `best` vs `avg` sell price. */
export function computeSavings(
  amount: number,
  best: number,
  avg: number
): { savings: number; pct: number } {
  if (!(amount > 0) || !(best > 0) || !(avg > 0) || avg <= best) return { savings: 0, pct: 0 }
  const units = amount / best // units of foreign currency the amount buys at best
  const savings = round(units * (avg - best))
  const pct = round(((avg - best) / avg) * 100, 4)
  return { savings, pct }
}
