import type { SeriesPoint } from './rateStats'

interface RawPoint {
  date?: string
  buy?: number
  sell?: number
}

/** Normalize evolution points into a clean, date-sorted {date,value} series. */
export function toSeries(
  points: RawPoint[] | undefined,
  kind: 'sell' | 'buy' | 'mid' = 'sell'
): SeriesPoint[] {
  if (!Array.isArray(points)) return []
  const out: SeriesPoint[] = []
  for (const p of points) {
    if (!p || !p.date) continue
    const buy = typeof p.buy === 'number' ? p.buy : null
    const sell = typeof p.sell === 'number' ? p.sell : null
    let value: number | null = null
    if (kind === 'sell') value = sell ?? buy
    else if (kind === 'buy') value = buy ?? sell
    else value = buy !== null && sell !== null ? (buy + sell) / 2 : (sell ?? buy)
    if (value === null || !Number.isFinite(value) || value <= 0) continue
    out.push({ date: p.date, value })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
