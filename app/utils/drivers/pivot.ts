import type { SeriesPoint } from '../rateStats'
import type { DriverDef } from './config'

export interface DateValueMap {
  date: string
  values: Record<string, number>
}

/** Turn stored per-date driver maps into one date-sorted SeriesPoint[] per driver. */
export function snapshotsToDriverSeries(
  snapshots: DateValueMap[],
  defs: DriverDef[]
): { key: string; points: SeriesPoint[] }[] {
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
  return defs.map(def => {
    const points: SeriesPoint[] = []
    for (const snap of sorted) {
      const value = snap.values[def.key]
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        points.push({ date: snap.date, value })
      }
    }
    return { key: def.key, points }
  })
}
