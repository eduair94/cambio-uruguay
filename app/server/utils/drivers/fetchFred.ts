import type { SeriesPoint } from '../../../utils/rateStats'
import { parseFredCsv } from '../../../utils/drivers/fredCsv'

/** Fetch a FRED series as a {date,value} series via the key-free fredgraph.csv endpoint.
 *  Returns [] on any failure so one bad source never breaks the batch. */
export async function fetchFredSeries(seriesId: string): Promise<SeriesPoint[]> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`
  try {
    const csv = await $fetch<string>(url, { responseType: 'text' })
    return typeof csv === 'string' ? parseFredCsv(csv) : []
  } catch {
    return []
  }
}
