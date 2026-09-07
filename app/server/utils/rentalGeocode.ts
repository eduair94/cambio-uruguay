import {
  normalizeRentalGeocodeQuery,
  RENTAL_GEOCODE_CANDIDATE_LIMIT,
  rentalGeocodeItems,
  rentalGeocodeMatchesScope,
  rentalGeocodeUniqueScope,
  type RentalGeocodeResponse,
} from '../../utils/rentalGeocode'

export class RentalGeocodeError extends Error {
  constructor(readonly statusCode: 400 | 429 | 503) {
    super(
      statusCode === 400
        ? 'Invalid address query'
        : statusCode === 429
          ? 'Address search limit reached'
          : 'Address search temporarily unavailable'
    )
  }
}

const IDE_ENDPOINT = 'https://direcciones.ide.uy/api/v1/geocode/candidates'

/** Fixed official host and path: caller text is encoded only as the q parameter. */
async function fetchIdeCandidates(query: string): Promise<unknown> {
  const url = new URL(IDE_ENDPOINT)
  url.search = new URLSearchParams({
    q: query,
    limit: String(RENTAL_GEOCODE_CANDIDATE_LIMIT),
  }).toString()
  const response = await fetch(url, {
    signal: AbortSignal.timeout(4000),
    redirect: 'error',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'CambioUruguay/1.0 (+https://cambio-uruguay.com)',
    },
  })
  if (!response.ok || !response.body) throw new RentalGeocodeError(503)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > 128 * 1024) throw new RentalGeocodeError(503)
      chunks.push(value)
    }
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
  const raw = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (!Array.isArray(raw)) throw new RentalGeocodeError(503)
  return raw
}

/** Process-local bounds complement explicit submit in the UI; no per-keystroke portal traffic. */
export function createRentalGeocoder(
  fetchCandidates: (query: string) => Promise<unknown> = fetchIdeCandidates,
  now: () => number = Date.now
) {
  const cache = new Map<string, { until: number; value: RentalGeocodeResponse }>()
  const pending = new Map<string, Promise<RentalGeocodeResponse>>()
  const clients = new Map<string, { until: number; count: number }>()
  let globalWindow = { until: 0, count: 0 }
  return async (
    input: Record<string, unknown>,
    clientKey: string
  ): Promise<RentalGeocodeResponse> => {
    const query = normalizeRentalGeocodeQuery(input)
    if (!query) throw new RentalGeocodeError(400)
    const time = now()
    for (const [key, value] of clients) if (value.until <= time) clients.delete(key)
    const client = clients.get(clientKey)
    if (client && client.count >= 10) throw new RentalGeocodeError(429)
    if (!client && clients.size >= 2048) throw new RentalGeocodeError(429)
    clients.set(clientKey, {
      count: (client?.count ?? 0) + 1,
      until: client?.until ?? time + 60_000,
    })

    const key = query.text.toLocaleLowerCase('es')
    const cached = cache.get(key)
    if (cached && cached.until > time) return cached.value
    if (pending.has(key)) return pending.get(key)!
    if (pending.size >= 4) throw new RentalGeocodeError(429)
    if (globalWindow.until <= time) globalWindow = { until: time + 60_000, count: 0 }
    if (globalWindow.count >= 30) throw new RentalGeocodeError(429)
    globalWindow.count++

    const promise = (async (): Promise<RentalGeocodeResponse> => {
      try {
        let items: RentalGeocodeResponse['items'] = []
        if (query.unscopedIntersection) {
          const streets = await fetchCandidates(query.unscopedIntersection.firstStreet)
          if (!Array.isArray(streets)) throw new RentalGeocodeError(503)
          const scope = rentalGeocodeUniqueScope(streets, query)
          if (scope) {
            const raw = await fetchCandidates(scope.text)
            if (!Array.isArray(raw)) throw new RentalGeocodeError(503)
            items = rentalGeocodeItems(
              raw.filter(row => rentalGeocodeMatchesScope(row, scope)),
              query
            )
          }
        } else {
          let raw = await fetchCandidates(query.text)
          if (!Array.isArray(raw)) throw new RentalGeocodeError(503)
          items = rentalGeocodeItems(raw, query)
          if (!items.length && query.fallback) {
            raw = await fetchCandidates(query.fallback)
            if (!Array.isArray(raw)) throw new RentalGeocodeError(503)
            items = rentalGeocodeItems(raw, query)
          }
        }
        const value: RentalGeocodeResponse = { items, source: 'IDE Uruguay' }
        if (cache.size >= 128) cache.delete(cache.keys().next().value!)
        cache.set(key, { value, until: now() + (items.length ? 15 * 60_000 : 60_000) })
        return value
      } catch {
        // A timeout or malformed upstream response must not masquerade as "address not found".
        throw new RentalGeocodeError(503)
      }
    })().finally(() => pending.delete(key))
    pending.set(key, promise)
    return promise
  }
}

export const lookupRentalGeocode = createRentalGeocoder()
