import type { SeriesPoint } from '../../../utils/rateStats'
import { parseArgentinaDatos, type ArgRow } from '../../../utils/drivers/argentinaDatos'

/** Fetch full argentinadatos.com dolar history for a path ('blue' | 'oficial'). [] on failure. */
export async function fetchArgentinaSeries(path: string): Promise<SeriesPoint[]> {
  const url = `https://api.argentinadatos.com/v1/cotizaciones/dolares/${path}`
  try {
    const rows = await $fetch<ArgRow[]>(url)
    return parseArgentinaDatos(rows)
  } catch {
    return []
  }
}
