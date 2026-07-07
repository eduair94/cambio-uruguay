import type { SeriesPoint } from '../rateStats'

export interface ArgRow {
  fecha?: string
  compra?: number
  venta?: number
}

/** Parse argentinadatos.com dolar history into a {date,value} series (default: venta/sell). */
export function parseArgentinaDatos(
  rows: ArgRow[] | undefined,
  kind: 'venta' | 'compra' = 'venta'
): SeriesPoint[] {
  if (!Array.isArray(rows)) return []
  const out: SeriesPoint[] = []
  for (const row of rows) {
    if (!row || !row.fecha) continue
    const value = kind === 'venta' ? row.venta : row.compra
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue
    out.push({ date: row.fecha, value })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
