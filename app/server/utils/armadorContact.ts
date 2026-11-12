// "Ver teléfono" de un armador con ficha en Google Maps: se consulta Place Details EN VIVO al
// tocar el botón y no se guarda nada (las políticas de Places no permiten archivar esos campos;
// ver docs/app/MOVING_SERVICES.md, mismo proxy y mismo criterio). Sólo place ids que el directorio
// publica hoy: un visitante no puede usar esta ruta para consultar cualquier negocio.
// Límites por proceso (como movingReviews): 10 por IP por minuto, 60 en total.

export const ARMADOR_CONTACT_FIELDS =
  'name,formatted_phone_number,international_phone_number,website,url'
const PLACE_ID = /^[\w-]{10,200}$/

export interface ArmadorContactBody {
  ok: boolean
  phone: string | null
  internationalPhone: string | null
  website: string | null
  mapsUrl: string | null
  error?: 'invalid_request' | 'not_found' | 'not_configured' | 'rate_limited' | 'upstream'
}

type Fetcher = (
  url: string,
  options: { params: Record<string, string>; timeout: number }
) => Promise<unknown>

const empty = (error: ArmadorContactBody['error']): ArmadorContactBody => ({
  ok: false,
  phone: null,
  internationalPhone: null,
  website: null,
  mapsUrl: null,
  error,
})
const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null
const httpUrl = (value: unknown): string | null => {
  const raw = text(value)
  return raw && /^https?:\/\//i.test(raw) ? raw : null
}

export function createArmadorContactService(options: {
  fetcher: Fetcher
  allowed: (placeId: string) => Promise<boolean>
  now?: () => number
  perIp?: number
  global?: number
}) {
  const now = options.now ?? Date.now
  const perIp = options.perIp ?? 10
  const globalMax = options.global ?? 60
  const hits = new Map<string, { count: number; resetAt: number }>()
  let globalHits = { count: 0, resetAt: 0 }

  const take = (ip: string): boolean => {
    const time = now()
    if (globalHits.resetAt <= time) globalHits = { count: 0, resetAt: time + 60_000 }
    const hit = hits.get(ip)
    const current = !hit || hit.resetAt <= time ? { count: 0, resetAt: time + 60_000 } : hit
    if (current.count >= perIp || globalHits.count >= globalMax) return false
    current.count++
    globalHits.count++
    if (hits.size > 2_000) hits.clear()
    hits.set(ip, current)
    return true
  }

  return {
    async read(input: {
      placeId: string
      ip: string
      gmapsBase: string
    }): Promise<{ status: number; body: ArmadorContactBody }> {
      if (!PLACE_ID.test(input.placeId)) return { status: 400, body: empty('invalid_request') }
      if (!input.gmapsBase) return { status: 503, body: empty('not_configured') }
      if (!(await options.allowed(input.placeId))) return { status: 404, body: empty('not_found') }
      if (!take(input.ip)) return { status: 429, body: empty('rate_limited') }
      let data: { status?: unknown; result?: Record<string, unknown> } | null = null
      try {
        const url = `${input.gmapsBase.replace(/\/+$/, '')}/placeDetails`
        data = (await options.fetcher(url, {
          params: { place_id: input.placeId, fields: ARMADOR_CONTACT_FIELDS, language: 'es' },
          timeout: 15_000,
        })) as typeof data
      } catch {
        data = null
      }
      if (!data || data.status !== 'OK' || !data.result)
        return { status: 502, body: empty('upstream') }
      return {
        status: 200,
        body: {
          ok: true,
          phone: text(data.result.formatted_phone_number),
          internationalPhone: text(data.result.international_phone_number),
          website: httpUrl(data.result.website),
          mapsUrl: httpUrl(data.result.url),
        },
      }
    },
  }
}
