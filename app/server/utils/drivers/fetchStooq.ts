import type { SeriesPoint } from '../../../utils/rateStats'
import { parseStooqCsv } from '../../../utils/drivers/stooqCsv'

/**
 * Fetch a stooq daily close series. `fromYmd` = 'YYYY-MM-DD' lower bound.
 * Returns [] on any failure so one bad source never breaks the batch.
 */
export async function fetchStooqSeries(symbol: string, fromYmd?: string): Promise<SeriesPoint[]> {
  const d1 = fromYmd ? fromYmd.replace(/-/g, '') : undefined
  const query = new URLSearchParams({ s: symbol, i: 'd' })
  if (d1) query.set('d1', d1)
  const url = `https://stooq.com/q/d/l/?${query.toString()}`
  try {
    const csv = await $fetch<string>(url, {
      responseType: 'text',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      },
    })
    return typeof csv === 'string' ? parseStooqCsv(csv) : []
  } catch {
    return []
  }
}
