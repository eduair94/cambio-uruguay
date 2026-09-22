// Los últimos cambios de UNA casa en UNA moneda, para el bloque «Últimos cambios de
// <casa> en <moneda>» de /historico/<casa>/<moneda>.
//
// Es un proxy aparte de `/api/rate-changes` a propósito. Aquel lo consulta
// /ultimos-cambios cada 15 segundos como tablero "en vivo" y por eso no se cachea;
// este lo pide el render de servidor de la familia con más impresiones del sitio, una
// vez por casa y moneda, y el ledger sólo cambia cuando corre el sync (cada 5 min).
// Cachearlo 5 minutos por (origen, moneda, tipo, límite) es exactamente esa cadencia.
//
// Y nunca rompe la página: si el backend no contesta, devuelve la lista vacía y el
// bloque se oculta entero. Una lista de cambios que falta es mucho menos grave que un
// histórico que no carga.

interface RateChange {
  origin: string
  houseName: string
  code: string
  type: string
  name: string
  previousBuy: number
  previousSell: number
  buy: number
  sell: number
  buyChanged: boolean
  sellChanged: boolean
  observedAt: string
}

export interface RecentRateChangesResponse {
  asOf: string
  changes: RateChange[]
}

const EMPTY: RecentRateChangesResponse = { asOf: '', changes: [] }

/** The filters this route accepts, already validated; `null` when the request is not one to serve. */
export function recentChangesFilter(input: Record<string, unknown> | null | undefined): {
  origin: string
  code: string
  type: string | undefined
  limit: number
} | null {
  const query = input ?? {}
  const origin = String(query.origin ?? '')
    .trim()
    .toLowerCase()
  const code = String(query.code ?? '')
    .trim()
    .toUpperCase()
  // Un origen es un id de scraper (`brou`, `cambio_18`) y una moneda un código ISO o
  // una unidad local (`USD`, `UI`); cualquier otra cosa no llega al backend.
  if (!/^[a-z0-9_-]{1,40}$/.test(origin) || !/^[A-Z]{2,8}$/.test(code)) return null
  const rawType = query.type
  const type =
    rawType === undefined || rawType === null || rawType === ''
      ? undefined
      : String(rawType).trim().toUpperCase().slice(0, 24)
  const parsed = Number(query.limit)
  const limit = Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), 20) : 8
  return { origin, code, type, limit }
}

export function recentChangesKey(query: Record<string, unknown>): string {
  const filter = recentChangesFilter(query)
  if (!filter) return 'invalid'
  return `${filter.origin}:${filter.code}:${filter.type ?? '*'}:${filter.limit}`
}

export default defineCachedEventHandler(
  async (event): Promise<RecentRateChangesResponse> => {
    const filter = recentChangesFilter(getQuery(event) as Record<string, unknown>)
    if (!filter) return EMPTY
    const config = useRuntimeConfig()
    const base = config.apiBaseServer || config.public.apiBase
    try {
      const res = await $fetch<RecentRateChangesResponse>(`${base}/changes`, {
        query: {
          origin: filter.origin,
          code: filter.code,
          type: filter.type,
          limit: filter.limit,
        },
        timeout: 5000,
      })
      const changes = Array.isArray(res?.changes) ? res.changes.slice(0, filter.limit) : []
      return { asOf: String(res?.asOf ?? ''), changes }
    } catch (err) {
      console.error('[/api/rate-changes-recent] backend fetch failed:', err)
      return EMPTY
    }
  },
  {
    maxAge: 60 * 5,
    name: 'rate-changes-recent',
    getKey: event => recentChangesKey(getQuery(event) as Record<string, unknown>),
  }
)
