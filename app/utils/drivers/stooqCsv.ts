import type { SeriesPoint } from '../rateStats'

/** Parse a stooq daily CSV (`Date,Open,High,Low,Close,Volume`) into a close series. */
export function parseStooqCsv(csv: string): SeriesPoint[] {
  const out: SeriesPoint[] = []
  for (const line of csv.split(/\r?\n/)) {
    const cols = line.split(',')
    if (cols.length < 5) continue
    const date = cols[0]!.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue // skips header + junk
    const value = Number(cols[4])
    if (!Number.isFinite(value) || value <= 0) continue
    out.push({ date, value })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
