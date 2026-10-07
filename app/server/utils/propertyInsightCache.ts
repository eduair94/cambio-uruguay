// Caché por proceso de la comparativa de las fichas. Las fichas de alquiler las recorren bots con
// navegador de verdad, y cada vista pediría otra vez una agregación de cientos de avisos (~1 s en
// alquiler). Diez minutos de caché y una sola lectura por clave aunque lleguen varias juntas; el
// resultado cambia como mucho una vez por hora, que es lo que tardan las cosechas en moverlo.
import type { PropertyInsight } from '../../utils/propertyInsight'

const TTL_MS = 10 * 60_000
const MAX_ENTRIES = 2_000

const cache = new Map<string, { until: number; value: PropertyInsight | null }>()
const pending = new Map<string, Promise<PropertyInsight | null>>()

/**
 * Fallas que dicen "el servidor no pudo a tiempo", no "la consulta está mal": `MaxTimeMSExpired`
 * (código 50) y la red con Mongo. Sentry CAMBIO-URUGUAY-BACKEND-C (2026-10-07 14:20 UTC): la
 * agregación de vecinos tardó 9,2 s con 4 yields contra su tope de 4 s mientras el mongod local
 * estaba trabado (inserciones por `_id` en otra base tardaron 1,2 s en ese mismo segundo); la misma
 * consulta un minuto después volvió en 171–213 ms. Un solo reintento contesta ese caso; uno que
 * siga fallando sale como 503 y se reporta igual.
 */
const TRANSIENT_MONGO_CODES: ReadonlySet<number> = new Set([50])
const TRANSIENT_MONGO_NAMES: ReadonlySet<string> = new Set([
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
])

export function transientMongoFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { name?: unknown; code?: unknown }
  const name = String(candidate.name ?? '')
  if (TRANSIENT_MONGO_NAMES.has(name)) return true
  return (
    name.startsWith('Mongo') &&
    typeof candidate.code === 'number' &&
    TRANSIENT_MONGO_CODES.has(candidate.code)
  )
}

export function cachedPropertyInsight(
  id: string,
  load: () => Promise<PropertyInsight | null>
): Promise<PropertyInsight | null> {
  const hit = cache.get(id)
  if (hit && hit.until > Date.now()) return Promise.resolve(hit.value)
  const running = pending.get(id)
  if (running) return running
  // Una sola vez y sólo ante una falla transitoria: un error de la consulta misma no mejora
  // repitiéndola, y la clave sigue con una única lectura en curso aunque lleguen varias juntas.
  const request = load()
    .catch(error => {
      if (!transientMongoFailure(error)) throw error
      return load()
    })
    .then(value => {
      if (cache.size >= MAX_ENTRIES) cache.clear()
      cache.set(id, { until: Date.now() + TTL_MS, value })
      return value
    })
    .finally(() => pending.delete(id))
  pending.set(id, request)
  return request
}

/** Sólo para tests. */
export function resetPropertyInsightCache(): void {
  cache.clear()
  pending.clear()
}
