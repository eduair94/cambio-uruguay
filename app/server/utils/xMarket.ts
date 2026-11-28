// Las lecturas al backend de los turnos de `/feeds/x.xml` que no son el dólar de la mañana: el
// movimiento del BROU en el día (cierre) y su serie diaria (la semana). Ninguna inventa nada: si el
// backend no contesta o contesta algo raro, devuelven `null` y el turno no se publica.
import type { BrouDayPoint } from '../../utils/xPosts'

interface IntradaySeries {
  origin?: string
  type?: string | null
  openSell?: number
  lastSell?: number
  openSource?: string
}

interface IntradayResponse {
  isToday?: boolean
  series?: IntradaySeries[]
}

const apiOpts = () => {
  const apiBase = (useRuntimeConfig().public as { apiBase?: string }).apiBase
  return apiBase ? { baseURL: apiBase, timeout: 8000 } : null
}

/**
 * La venta del dólar del BROU (pizarra común, no eBROU) al empezar el día y ahora, de
 * `GET /intraday`. `null` sin datos de hoy o si el día no tiene base propia (`flat`): sin una
 * apertura medida, "subió" o "bajó" no significa nada.
 */
export async function fetchBrouDay(): Promise<{ open: number; last: number } | null> {
  const opts = apiOpts()
  if (!opts) return null
  const res = await $fetch<IntradayResponse>('/intraday', {
    ...opts,
    query: { code: 'USD', origins: 'brou' },
  }).catch(() => null)
  if (!res?.isToday || !Array.isArray(res.series)) return null
  const s = res.series.find(x => x.origin === 'brou' && !x.type)
  if (!s || s.openSource === 'flat') return null
  const open = Number(s.openSell)
  const last = Number(s.lastSell)
  return open > 0 && last > 0 ? { open, last } : null
}

/** La serie diaria del BROU de los últimos seis meses (`GET /evolution/brou/USD`). */
export async function fetchBrouEvolution(): Promise<BrouDayPoint[] | null> {
  const opts = apiOpts()
  if (!opts) return null
  const res = await $fetch<{ evolution?: BrouDayPoint[] }>('/evolution/brou/USD', opts).catch(
    () => null
  )
  return Array.isArray(res?.evolution) ? res.evolution : null
}
