// Los datos en vivo del post del dólar de los lunes (`/feeds/linkedin.xml`) y de los tuits de
// cotizaciones (`/feeds/x.xml`).
//
// Tres lecturas al backend en paralelo: las cotizaciones, los nombres de cada casa y el reporte de
// pizarras quietas. Si falla el reporte de pizarras quietas no hay post en vivo (ver
// `summarizeUsd`): sin esa guarda, la "más barata" puede ser un precio que nadie actualiza hace
// meses, y esto sale publicado bajo el nombre de una persona.
import { summarizeUsd, type LinkedinRateRow, type UsdSnapshot } from '../../utils/linkedinPosts'

interface FrozenReport {
  quotes?: Array<{ origin?: string; code?: string; type?: string | null }>
}

export interface RateInputs {
  rows: LinkedinRateRow[]
  names: Record<string, { name?: string }>
  /** `origen|MONEDA|tipo` de cada pizarra quieta, de todas las monedas. */
  frozenKeys: Set<string>
}

/** Las cotizaciones de todas las monedas con los nombres y las pizarras quietas, o `null`. */
export async function fetchRateInputs(): Promise<RateInputs | null> {
  const apiBase = (useRuntimeConfig().public as { apiBase?: string }).apiBase
  if (!apiBase) return null
  const opts = { baseURL: apiBase, timeout: 8000 }

  const [rows, names, frozen] = await Promise.all([
    $fetch<LinkedinRateRow[]>('/', opts).catch(() => null),
    $fetch<Record<string, { name?: string }>>('/localData', opts).catch(() => ({})),
    $fetch<FrozenReport>('/frozen-quotes', opts).catch(() => null),
  ])
  if (!Array.isArray(rows) || !frozen || !Array.isArray(frozen.quotes)) return null

  const frozenKeys = new Set(
    frozen.quotes
      .filter(q => q?.origin && q?.code)
      .map(q => `${q.origin}|${q.code}|${q.type || ''}`)
  )
  return { rows, names: names ?? {}, frozenKeys }
}

export async function fetchUsdSnapshot(now: Date): Promise<UsdSnapshot | null> {
  const inputs = await fetchRateInputs()
  return inputs ? summarizeUsd(inputs.rows, inputs.names, inputs.frozenKeys, now) : null
}
