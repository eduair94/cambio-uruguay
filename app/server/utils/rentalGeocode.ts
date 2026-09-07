import {
  normalizeRentalGeocodeQuery,
  RENTAL_GEOCODE_CANDIDATE_LIMIT,
  rentalGeocodeItems,
  rentalGeocodeMatchesScope,
  rentalGeocodeUniqueScope,
  type RentalGeocodeResponse,
} from '../../utils/rentalGeocode'

const failureKinds = [
  'timeout',
  'network',
  'upstream_http',
  'invalid_response',
  'oversized_response',
  'internal',
] as const
type RentalGeocodeFailureKind = (typeof failureKinds)[number]
type RentalGeocodeStage = 'street' | 'intersection' | 'query' | 'fallback'
export interface RentalGeocodeFailureReport {
  stage: RentalGeocodeStage
  failure: RentalGeocodeFailureKind
  elapsedMs: number
  httpStatus?: number
}

export class RentalGeocodeError extends Error {
  constructor(
    readonly statusCode: 400 | 429 | 503,
    readonly failure: RentalGeocodeFailureKind = 'internal',
    readonly httpStatus?: number
  ) {
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
  // Leave headroom for provider latency while keeping a finite deadline per request;
  // a search still makes at most two requests and never retries an upstream failure.
  const signal = AbortSignal.timeout(8000)
  let response: Response
  try {
    response = await fetch(url, {
      signal,
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CambioUruguay/1.0 (+https://cambio-uruguay.com)',
      },
    })
  } catch {
    throw new RentalGeocodeError(503, signal.aborted ? 'timeout' : 'network')
  }
  if (!response.ok) throw new RentalGeocodeError(503, 'upstream_http', response.status)
  if (!response.body) throw new RentalGeocodeError(503, 'invalid_response')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > 128 * 1024) throw new RentalGeocodeError(503, 'oversized_response')
      chunks.push(value)
    }
  } catch (error) {
    if (error instanceof RentalGeocodeError) throw error
    throw new RentalGeocodeError(503, signal.aborted ? 'timeout' : 'network')
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
  const body = Buffer.concat(chunks).toString('utf8')
  let raw: unknown
  try {
    raw = JSON.parse(body)
  } catch {
    throw new RentalGeocodeError(503, 'invalid_response')
  }
  if (!Array.isArray(raw)) throw new RentalGeocodeError(503, 'invalid_response')
  return raw
}

/** Process-local bounds complement explicit submit in the UI; no per-keystroke portal traffic. */
export function createRentalGeocoder(
  fetchCandidates: (query: string) => Promise<unknown> = fetchIdeCandidates,
  now: () => number = Date.now,
  reportFailure: (report: RentalGeocodeFailureReport) => void = report =>
    console.warn('[rentals.geocode]', report)
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
      let stage: RentalGeocodeStage = query.unscopedIntersection ? 'street' : 'query'
      try {
        let items: RentalGeocodeResponse['items'] = []
        if (query.unscopedIntersection) {
          const streets = await fetchCandidates(query.unscopedIntersection.firstStreet)
          if (!Array.isArray(streets)) throw new RentalGeocodeError(503, 'invalid_response')
          const scope = rentalGeocodeUniqueScope(streets, query)
          if (scope) {
            stage = 'intersection'
            const raw = await fetchCandidates(scope.text)
            if (!Array.isArray(raw)) throw new RentalGeocodeError(503, 'invalid_response')
            items = rentalGeocodeItems(
              raw.filter(row => rentalGeocodeMatchesScope(row, scope)),
              query
            )
          }
        } else {
          let raw = await fetchCandidates(query.text)
          if (!Array.isArray(raw)) throw new RentalGeocodeError(503, 'invalid_response')
          items = rentalGeocodeItems(raw, query)
          if (!items.length && query.fallback) {
            stage = 'fallback'
            raw = await fetchCandidates(query.fallback)
            if (!Array.isArray(raw)) throw new RentalGeocodeError(503, 'invalid_response')
            items = rentalGeocodeItems(raw, query)
          }
        }
        const value: RentalGeocodeResponse = { items, source: 'IDE Uruguay' }
        if (cache.size >= 128) cache.delete(cache.keys().next().value!)
        cache.set(key, { value, until: now() + (items.length ? 15 * 60_000 : 60_000) })
        return value
      } catch (error) {
        const known = error instanceof RentalGeocodeError ? error : null
        const failure = known && failureKinds.includes(known.failure) ? known.failure : 'internal'
        const httpStatus = known?.httpStatus
        // Build a fresh allowlisted object. Never report input, URL, client, message or stack.
        const diagnostic: RentalGeocodeFailureReport = {
          stage,
          failure,
          elapsedMs: Math.max(0, Math.round(now() - time)),
          ...(failure === 'upstream_http' &&
          typeof httpStatus === 'number' &&
          Number.isInteger(httpStatus) &&
          httpStatus >= 100 &&
          httpStatus <= 599
            ? { httpStatus }
            : {}),
        }
        try {
          reportFailure(diagnostic)
        } catch {
          // Diagnostic failures must not change the public error or trigger another request.
        }
        // A timeout or malformed upstream response must not masquerade as "address not found".
        throw new RentalGeocodeError(503)
      }
    })().finally(() => pending.delete(key))
    pending.set(key, promise)
    return promise
  }
}

export const lookupRentalGeocode = createRentalGeocoder()
