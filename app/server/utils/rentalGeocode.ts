import {
  normalizeRentalGeocodeQuery,
  rentalGeocodeItem,
  rentalGeocodeItems,
  splitRentalPredictions,
  type RentalGeocodeResponse,
} from '../../utils/rentalGeocode'

/**
 * Address lookup behind /api/rentals/geocode, on the site's Google Maps proxy (no key, public).
 *
 * It replaced IDE Uruguay + Photon: IDE had stopped returning coordinates for streets and
 * crossings (a second provider had to locate every row), did not know places by name, and in bad
 * moments took 25–50 s per lookup. Google answers streets with numbers, crossings, neighbourhoods
 * and places ("Facultad de Ingeniería", "Tres Cruces") in about 0.3 s.
 *
 * - Typing (autocomplete=1): Places Autocomplete restricted to Uruguay; every prediction that names
 *   a precise place gets its coordinates from Geocoding by place_id (in parallel); a bare street
 *   becomes a refinement to keep typing the number.
 * - Submitted text: Geocoding, then Places Text Search for names Geocoding does not resolve.
 */
export const GEOCODER_URL = 'https://google-maps-proxy.checkleaked.cc'
const TIMEOUT_MS = 6000
const MAX_BODY = 256 * 1024
/** Bias toward Montevideo (where most searches are) without excluding the rest of the country. */
const BIAS = { location: '-34.9011,-56.1645', radius: '250000' }

const failureKinds = [
  'timeout',
  'network',
  'upstream_http',
  'invalid_response',
  'oversized_response',
  'internal',
] as const
type RentalGeocodeFailureKind = (typeof failureKinds)[number]
type RentalGeocodeStage = 'autocomplete' | 'details' | 'query' | 'fallback'
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

export type GeocoderFetch = (path: string, params: Record<string, string>) => Promise<unknown>

/** One bounded GET to the proxy. Never keeps the address, URL or raw error. */
export const fetchGoogle: GeocoderFetch = async (path, params) => {
  const url = new URL(path, GEOCODER_URL)
  url.search = new URLSearchParams(params).toString()
  const signal = AbortSignal.timeout(TIMEOUT_MS)
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
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined)
    throw new RentalGeocodeError(503, 'upstream_http', response.status)
  }
  const text = await response.text().catch(() => {
    throw new RentalGeocodeError(503, signal.aborted ? 'timeout' : 'network')
  })
  if (text.length > MAX_BODY) throw new RentalGeocodeError(503, 'oversized_response')
  try {
    return JSON.parse(text)
  } catch {
    throw new RentalGeocodeError(503, 'invalid_response')
  }
}

/** Google statuses that are an answer (possibly empty); anything else is a failure, not "no match". */
function googleArray(raw: unknown, key: 'predictions' | 'results'): unknown[] {
  const body = raw as { status?: unknown } & Record<string, unknown>
  if (!body || typeof body !== 'object') throw new RentalGeocodeError(503, 'invalid_response')
  if (body.status === 'ZERO_RESULTS') return []
  if (body.status !== 'OK' || !Array.isArray(body[key]))
    throw new RentalGeocodeError(503, 'invalid_response')
  return body[key] as unknown[]
}

async function autocomplete(
  fetchJson: GeocoderFetch,
  text: string,
  setStage: (stage: RentalGeocodeStage) => void
): Promise<Omit<RentalGeocodeResponse, 'source'>> {
  setStage('autocomplete')
  const predictions = googleArray(
    await fetchJson('/placeAutocomplete', {
      input: text,
      components: 'country:uy',
      language: 'es',
      ...BIAS,
    }),
    'predictions'
  )
  const { points, streets } = splitRentalPredictions(predictions)
  setStage('details')
  const settled = await Promise.allSettled(
    points.map(async point => {
      const results = googleArray(
        await fetchJson('/geocode', { place_id: point.placeId, language: 'es' }),
        'results'
      )
      return rentalGeocodeItem(results[0], point.label)
    })
  )
  // Every lookup failing is an outage, not an empty answer.
  if (points.length && settled.every(s => s.status === 'rejected'))
    throw (settled[0] as PromiseRejectedResult).reason
  const seen = new Set<string>()
  const items = settled
    .map(s => (s.status === 'fulfilled' ? s.value : null))
    .filter((item): item is NonNullable<typeof item> => {
      if (!item) return false
      const key = `${item.lat},${item.lng}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  if (items.length || streets.length)
    return { items, ...(streets.length ? { refinements: streets } : {}) }
  // A full address Google does not predict can still geocode.
  return { items: await submit(fetchJson, text, setStage) }
}

async function submit(
  fetchJson: GeocoderFetch,
  text: string,
  setStage: (stage: RentalGeocodeStage) => void
) {
  setStage('query')
  const items = rentalGeocodeItems(
    googleArray(
      await fetchJson('/geocode', {
        address: text,
        components: 'country:UY',
        language: 'es',
        region: 'uy',
      }),
      'results'
    )
  )
  if (items.length) return items
  setStage('fallback')
  return rentalGeocodeItems(
    googleArray(
      await fetchJson('/textSearch', { query: `${text}, Uruguay`, region: 'uy', language: 'es' }),
      'results'
    )
  )
}

/** Process-local bounds complement the UI debounce, selection and stale-response guards. */
export function createRentalGeocoder(
  fetchJson: GeocoderFetch = fetchGoogle,
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
    if (client && client.count >= 60) throw new RentalGeocodeError(429)
    if (!client && clients.size >= 2048) throw new RentalGeocodeError(429)
    clients.set(clientKey, {
      count: (client?.count ?? 0) + 1,
      until: client?.until ?? time + 60_000,
    })

    const key = `${query.autocomplete ? 'autocomplete' : 'submit'}:${query.text.toLocaleLowerCase('es')}`
    const cached = cache.get(key)
    if (cached && cached.until > time) return cached.value
    if (pending.has(key)) return pending.get(key)!
    if (pending.size >= 8) throw new RentalGeocodeError(429)
    if (globalWindow.until <= time) globalWindow = { until: time + 60_000, count: 0 }
    if (globalWindow.count >= 120) throw new RentalGeocodeError(429)
    globalWindow.count++

    const promise = (async (): Promise<RentalGeocodeResponse> => {
      let stage: RentalGeocodeStage = query.autocomplete ? 'autocomplete' : 'query'
      const setStage = (next: RentalGeocodeStage) => (stage = next)
      try {
        const found = query.autocomplete
          ? await autocomplete(fetchJson, query.text, setStage)
          : { items: await submit(fetchJson, query.text, setStage) }
        const value: RentalGeocodeResponse = { ...found, source: 'Google Maps' }
        if (cache.size >= 128) cache.delete(cache.keys().next().value!)
        cache.set(key, {
          value,
          until: now() + (value.items.length || value.refinements?.length ? 15 * 60_000 : 60_000),
        })
        return value
      } catch (error) {
        const known = error instanceof RentalGeocodeError ? error : null
        const failure = known && failureKinds.includes(known.failure) ? known.failure : 'internal'
        const httpStatus = known?.httpStatus
        // A fresh allowlisted object. Never report input, URL, client, message or stack.
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
