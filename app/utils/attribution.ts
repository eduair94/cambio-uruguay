import type { SeriesPoint } from './rateStats'

export interface DriverDayMove {
  key: string
  dayMovePct: number
}

/** % change of each driver on `moveDate` vs its previous available point, ranked by magnitude. */
export function attributeMove(
  moveDate: string,
  driverSeries: { key: string; points: SeriesPoint[] }[]
): DriverDayMove[] {
  const out: DriverDayMove[] = []
  for (const d of driverSeries) {
    const idx = d.points.findIndex(p => p.date === moveDate)
    if (idx <= 0) continue // not present, or no prior point
    const cur = d.points[idx]!
    const prev = d.points[idx - 1]!
    if (prev.value <= 0) continue
    out.push({ key: d.key, dayMovePct: ((cur.value - prev.value) / prev.value) * 100 })
  }
  return out.sort((a, b) => Math.abs(b.dayMovePct) - Math.abs(a.dayMovePct))
}

export type Direction = 'up' | 'down' | 'flat'

export interface TodaySummary {
  date: string | null
  pctChange: number
  direction: Direction
  top: { key: string; r: number } | null
}

/** Latest base move + the strongest correlated driver that currently has data (n > 0). */
export function todaySummary(
  base: SeriesPoint[],
  correlations: { key: string; r: number; n: number }[]
): TodaySummary {
  let top: { key: string; r: number } | null = null
  for (const c of correlations) {
    if (c.n > 0 && (top === null || Math.abs(c.r) > Math.abs(top.r))) top = { key: c.key, r: c.r }
  }
  if (base.length < 2) {
    const last = base[base.length - 1]
    return { date: last?.date ?? null, pctChange: 0, direction: 'flat', top }
  }
  const cur = base[base.length - 1]!
  const prev = base[base.length - 2]!
  const pctChange = prev.value > 0 ? ((cur.value - prev.value) / prev.value) * 100 : 0
  const direction: Direction = pctChange > 0 ? 'up' : pctChange < 0 ? 'down' : 'flat'
  return { date: cur.date, pctChange, direction, top }
}
