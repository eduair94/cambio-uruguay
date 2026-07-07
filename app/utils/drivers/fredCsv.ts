import type { SeriesPoint } from '../rateStats'

/** Parse a FRED `fredgraph.csv` (`observation_date,<SERIES_ID>`) into a {date,value} series.
 *  FRED marks missing observations with an empty value field — those rows are dropped. */
export function parseFredCsv(csv: string): SeriesPoint[] {
  const out: SeriesPoint[] = []
  for (const line of csv.split(/\r?\n/)) {
    const cols = line.split(',')
    if (cols.length < 2) continue
    const date = cols[0]!.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue // skips header + junk
    const raw = cols[1]!.trim()
    if (raw === '') continue // FRED missing-data marker
    const value = Number(raw)
    if (!Number.isFinite(value) || value <= 0) continue
    out.push({ date, value })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
