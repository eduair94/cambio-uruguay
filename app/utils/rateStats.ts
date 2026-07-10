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

/**
 * The largest single-day move a currency plausibly makes. A jump beyond this is
 * a scraper artefact — a decimal shift, a stale mirror, a units change — not a
 * market move, and must never be published as a record on a finance page.
 */
const MAX_PLAUSIBLE_DAILY_MOVE = 0.15

/**
 * Drop points a record must never be computed from: non-finite, non-positive,
 * and outliers more than {@link MAX_PLAUSIBLE_DAILY_MOVE} from the previous
 * KEPT point (so a run of bad points cannot validate itself).
 *
 * This is the first of two guards. The second is freshness: a casa whose scraper
 * is stale or silent should not show records at all.
 */
export function sanitizeSeries(series: SeriesPoint[]): SeriesPoint[] {
  const out: SeriesPoint[] = []
  for (const p of series) {
    if (!Number.isFinite(p.value) || p.value <= 0) continue
    const prev = out[out.length - 1]
    if (prev && Math.abs(p.value - prev.value) / prev.value > MAX_PLAUSIBLE_DAILY_MOVE) continue
    out.push(p)
  }
  return out
}

export interface Streak {
  direction: 'up' | 'down' | 'flat'
  /** Number of consecutive MOVES in that direction, not a count of points. */
  days: number
}

/**
 * The run of consecutive same-direction moves ending at the last point.
 *
 * `[40, 41, 42]` is two rises, so the copy reads "subió 2 días seguidos". An
 * unchanged final value ends any streak — the market did not move.
 */
export function computeStreak(series: SeriesPoint[]): Streak {
  const pts = series.filter(p => Number.isFinite(p.value))
  if (pts.length < 2) return { direction: 'flat', days: 0 }

  const last = pts[pts.length - 1]!.value
  const prev = pts[pts.length - 2]!.value
  if (last === prev) return { direction: 'flat', days: 0 }

  const direction: Streak['direction'] = last > prev ? 'up' : 'down'
  let days = 0
  for (let i = pts.length - 1; i > 0; i--) {
    const delta = pts[i]!.value - pts[i - 1]!.value
    if (delta === 0) break
    if (delta > 0 !== (direction === 'up')) break
    days++
  }
  return { direction, days }
}

export interface BiggestMove {
  /** Date of the point the move landed on. */
  date: string
  from: number
  to: number
  delta: number
  /** Percent change, rounded to 2dp. */
  pct: number
}

/** The largest absolute day-over-day change in the series, or null if too short. */
export function biggestMove(series: SeriesPoint[]): BiggestMove | null {
  const pts = series.filter(p => Number.isFinite(p.value))
  if (pts.length < 2) return null

  let best: BiggestMove | null = null
  for (let i = 1; i < pts.length; i++) {
    const from = pts[i - 1]!.value
    const to = pts[i]!.value
    const delta = to - from
    if (!best || Math.abs(delta) > Math.abs(best.delta)) {
      best = {
        date: pts[i]!.date,
        from,
        to,
        delta: round(delta, 4),
        pct: from === 0 ? 0 : round((delta / from) * 100, 2),
      }
    }
  }
  return best
}

/** Whole days between the series maximum and `now`, or null for an empty series. */
export function daysSinceHigh(series: SeriesPoint[], now: Date = new Date()): number | null {
  const pts = series.filter(p => Number.isFinite(p.value))
  if (pts.length === 0) return null

  let max = pts[0]!
  for (const p of pts) if (p.value > max.value) max = p

  const ms = now.getTime() - new Date(max.date).getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
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
