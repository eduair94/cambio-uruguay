// Caché por proceso de la comparativa de las fichas. Las fichas de alquiler las recorren bots con
// navegador de verdad, y cada vista pediría otra vez una agregación de cientos de avisos (~1 s en
// alquiler). Diez minutos de caché y una sola lectura por clave aunque lleguen varias juntas; el
// resultado cambia como mucho una vez por hora, que es lo que tardan las cosechas en moverlo.
import type { PropertyInsight } from '../../utils/propertyInsight'

const TTL_MS = 10 * 60_000
const MAX_ENTRIES = 2_000

const cache = new Map<string, { until: number; value: PropertyInsight | null }>()
const pending = new Map<string, Promise<PropertyInsight | null>>()

export function cachedPropertyInsight(
  id: string,
  load: () => Promise<PropertyInsight | null>
): Promise<PropertyInsight | null> {
  const hit = cache.get(id)
  if (hit && hit.until > Date.now()) return Promise.resolve(hit.value)
  const running = pending.get(id)
  if (running) return running
  const request = load()
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
