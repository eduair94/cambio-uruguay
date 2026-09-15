import type { SearchFacets, SearchQuery } from '../../utils/charruadevs'

/**
 * El `$match` del buscador de /mercado-it-uruguay. Siempre excluye lo borrado hoy en Reddit y lo
 * que no habla del mercado (sin postura no hay sentimiento que filtrar).
 *
 * Sin collation a propósito: `$text` usa su propio índice (español, sin tildes ni mayúsculas) y
 * una collation en la consulta anularía los índices comunes (ver memoria collation-anula-el-indice).
 */
export function buildSearchMatch(
  q: SearchQuery,
  opts: { ignoreStance?: boolean } = {}
): Record<string, unknown> {
  const match: Record<string, unknown> = { rel: true, gone: false }
  if (q.q) match.$text = { $search: q.q, $language: 'spanish' }
  // `ignoreStance` es para las facetas de tono: con el filtro "sólo negativos" puesto, el tono de la
  // búsqueda daría 100 % negativo todos los años, que es verdad y no dice nada.
  match.stance = q.stance.length && !opts.ignoreStance ? { $in: q.stance } : { $ne: null }
  if (q.kind) match.kind = q.kind
  if (q.theme) match.themes = q.theme
  if (q.ai) match.ai = q.ai
  if (q.event) match.event = q.event
  if (q.from != null || q.to != null) {
    const range: Record<string, Date> = {}
    if (q.from != null) range.$gte = new Date(Date.UTC(q.from, 0, 1))
    if (q.to != null) range.$lt = new Date(Date.UTC(q.to + 1, 0, 1))
    match.createdAt = range
  }
  return match
}

export type SearchSortSpec = Record<string, 1 | -1 | { $meta: 'textScore' }>

export function buildSearchSort(q: SearchQuery): SearchSortSpec {
  if (q.sort === 'votes') return { score: -1, createdAt: -1 }
  if (q.sort === 'relevance' && q.q) return { ts: { $meta: 'textScore' }, createdAt: -1 }
  return { createdAt: -1 }
}

export interface FacetRaw {
  total?: Array<{ n: number }>
  stance?: Array<{ _id: number | null; n: number }>
  byYear?: Array<{ _id: { y: number; s: number }; n: number }>
}

/** El `$facet` crudo → conteo total, reparto por postura y tono por año de ESTA búsqueda. */
export function shapeFacets(raw: FacetRaw | undefined): SearchFacets & { total: number } {
  const stance: Record<string, number> = { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 }
  for (const s of raw?.stance ?? []) {
    const k = String(s._id)
    if (s._id != null && k in stance) stance[k] = s.n
  }
  const years = new Map<number, { y: number; neg: number; neu: number; pos: number }>()
  for (const r of raw?.byYear ?? []) {
    const row = years.get(r._id.y) ?? { y: r._id.y, neg: 0, neu: 0, pos: 0 }
    if (r._id.s < 0) row.neg += r.n
    else if (r._id.s > 0) row.pos += r.n
    else row.neu += r.n
    years.set(r._id.y, row)
  }
  return {
    total: raw?.total?.[0]?.n ?? 0,
    stance,
    byYear: [...years.values()].sort((a, b) => a.y - b.y),
  }
}
