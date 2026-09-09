import { Agent } from 'undici'
import { resolveRentalGeocodePoints } from './rentalGeocodePoints'
import {
  normalizeRentalGeocodeQuery,
  RENTAL_GEOCODE_CANDIDATE_LIMIT,
  rentalGeocodeItems,
  rentalGeocodeRefinements,
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
const transientNetworkCodes = [
  'ECONNRESET',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
] as const
const networkCodes = [
  ...transientNetworkCodes,
  'ECONNREFUSED',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'ENOTFOUND',
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_TLS_CERT_ALTNAME_INVALID',
] as const
type NetworkCode = (typeof networkCodes)[number]
export interface RentalGeocodeFailureReport {
  stage: RentalGeocodeStage
  failure: RentalGeocodeFailureKind
  elapsedMs: number
  httpStatus?: number
  networkCodes?: NetworkCode[]
}

export class RentalGeocodeError extends Error {
  constructor(
    readonly statusCode: 400 | 429 | 503,
    readonly failure: RentalGeocodeFailureKind = 'internal',
    readonly httpStatus?: number,
    readonly networkCodes?: NetworkCode[]
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
// IDE publishes AAAA records, but the serving host has no IPv6 route. Keep this policy
// local to IDE; otherwise Node's family fallback can abandon a viable IPv4 connection.
const ideDispatcher = new Agent({
  connections: 4,
  pipelining: 1,
  connect: { family: 4 },
  autoSelectFamily: false,
  keepAliveTimeout: 4000,
  keepAliveMaxTimeout: 10000,
})

class IdeNetworkError extends RentalGeocodeError {
  constructor(
    codes: NetworkCode[],
    readonly retryable: boolean
  ) {
    super(503, 'network', undefined, codes)
  }
}

/** Read only bounded native code fields; never retain messages, causes, URLs or stacks. */
function transportError(error: unknown, signal: AbortSignal): RentalGeocodeError {
  if (signal.aborted) return new RentalGeocodeError(503, 'timeout')
  const pending: unknown[] = [error]
  const seen = new Set<object>()
  const codes = new Set<NetworkCode>()
  let unknownCode = false
  while (pending.length && seen.size < 16) {
    const item = pending.shift()
    if (!item || typeof item !== 'object' || seen.has(item)) continue
    seen.add(item)
    try {
      const row = item as { code?: unknown; cause?: unknown; errors?: unknown }
      if (row.code !== undefined) {
        if (typeof row.code === 'string' && networkCodes.includes(row.code as NetworkCode))
          codes.add(row.code as NetworkCode)
        else unknownCode = true
      }
      if (row.cause) pending.push(row.cause)
      if (Array.isArray(row.errors)) {
        if (row.errors.length > 8) unknownCode = true
        pending.push(...row.errors.slice(0, 8))
      }
    } catch {
      unknownCode = true
    }
  }
  const retryable =
    !unknownCode &&
    !pending.length &&
    codes.size > 0 &&
    [...codes].every(code => (transientNetworkCodes as readonly string[]).includes(code))
  return new IdeNetworkError([...codes].slice(0, 4), retryable)
}

async function fetchIdeAttempt(url: URL, signal: AbortSignal): Promise<unknown> {
  let response: Response
  try {
    const options = {
      dispatcher: ideDispatcher,
      signal,
      redirect: 'error' as const,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CambioUruguay/1.0 (+https://cambio-uruguay.com)',
      },
    }
    response = await fetch(url, options)
  } catch (error) {
    throw transportError(error, signal)
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined)
    throw new RentalGeocodeError(503, 'upstream_http', response.status)
  }
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
    throw transportError(error, signal)
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

/**
 * IDE ordena por su propio ranking y pone las localidades primero: pidiendo cinco
 * candidatos, "sarandi 690" traia una sola fila util y "18 de julio 1234" dos, y
 * el resto eran localidades que el filtro descarta. Se piden quince y filtramos
 * nosotros; el tope de respuesta sigue siendo el mismo.
 */
const IDE_FETCH_LIMIT = 15

/** Fixed official host; one transient retry shares the original eight-second deadline. */
async function fetchIdeCandidates(query: string): Promise<unknown> {
  const url = new URL(IDE_ENDPOINT)
  url.search = new URLSearchParams({
    q: query,
    limit: String(IDE_FETCH_LIMIT),
  }).toString()
  const signal = AbortSignal.timeout(8000)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetchIdeAttempt(url, signal)
    } catch (error) {
      if (attempt || signal.aborted || !(error instanceof IdeNetworkError) || !error.retryable)
        throw error
    }
  }
  throw new RentalGeocodeError(503)
}

/**
 * IDE dejó de publicar coordenadas en las filas de calle, portal y esquina: todas
 * vuelven en 0,0 y el validador de puntos —con razón— las descarta, así que toda
 * dirección con número daba cero resultados. Este paso las ubica sin cambiar
 * quién decide qué direcciones existen. Ver `rentalGeocodePoints.ts`.
 */
async function withResolvedPoints(raw: unknown): Promise<unknown> {
  if (!Array.isArray(raw)) return raw
  const rows = raw.slice(0, 50)
  const pending: Array<{
    index: number
    address: string
    street: string | null
    portal: number | null
    locality: string | null
    department: string | null
  }> = []
  rows.forEach((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return
    const row = value as Record<string, unknown>
    if (row.state !== 1 || row.stateMsg !== '') return
    if (!['CALLEyPORTAL', 'ESQUINA'].includes(String(row.type))) return
    if (typeof row.lat === 'number' && typeof row.lng === 'number' && (row.lat || row.lng)) return
    if (typeof row.address !== 'string' || !row.address.trim()) return
    const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null)
    pending.push({
      index,
      address: row.address,
      street: text(row.nomVia),
      portal:
        typeof row.portalNumber === 'number' &&
        Number.isInteger(row.portalNumber) &&
        row.portalNumber > 0
          ? row.portalNumber
          : null,
      locality: text(row.localidad),
      department: text(row.departamento),
    })
  })
  if (!pending.length) return rows
  const points = await resolveRentalGeocodePoints(pending)
  const resolved = [...rows]
  pending.forEach((row, position) => {
    const point = points[position]
    if (!point) return
    resolved[row.index] = { ...(rows[row.index] as Record<string, unknown>), ...point }
  })
  return resolved
}

/** Process-local bounds complement the UI debounce, selection and stale-response guards. */
export function createRentalGeocoder(
  fetchCandidates: (query: string) => Promise<unknown> = query =>
    fetchIdeCandidates(query).then(withResolvedPoints),
  now: () => number = Date.now,
  reportFailure: (report: RentalGeocodeFailureReport) => void = report =>
    console.warn('[rentals.geocode]', report)
) {
  const cache = new Map<string, { until: number; value: RentalGeocodeResponse }>()
  const pending = new Map<string, Promise<RentalGeocodeResponse>>()
  const streets = new Map<string, { until: number; value: unknown[] }>()
  const pendingStreets = new Map<string, Promise<unknown[]>>()
  const clients = new Map<string, { until: number; count: number }>()
  let globalWindow = { until: 0, count: 0 }
  async function fetchStreet(text: string): Promise<unknown[]> {
    const key = text.toLocaleLowerCase('es')
    const cached = streets.get(key)
    if (cached && cached.until > now()) return cached.value
    if (pendingStreets.has(key)) return pendingStreets.get(key)!
    const promise = fetchCandidates(text)
      .then(raw => {
        if (!Array.isArray(raw)) throw new RentalGeocodeError(503, 'invalid_response')
        // Preserve truncation and unresolved rows for conservative scope checks, while caching
        // only native street metadata: neither coordinates nor arbitrary source fields.
        const value = raw.slice(0, RENTAL_GEOCODE_CANDIDATE_LIMIT).map(row => {
          if (!row || typeof row !== 'object' || Array.isArray(row)) return null
          return Object.fromEntries(
            [
              'type',
              'nomVia',
              'idCalle',
              'idLocalidad',
              'idDepartamento',
              'localidad',
              'departamento',
              'state',
              'stateMsg',
            ].map(field => {
              const value = row[field]
              return [
                field,
                typeof value === 'string'
                  ? value.slice(0, 500)
                  : typeof value === 'number' && Number.isFinite(value)
                    ? value
                    : undefined,
              ]
            })
          )
        })
        if (streets.size >= 128) streets.delete(streets.keys().next().value!)
        streets.set(key, { value, until: now() + (value.length ? 15 * 60_000 : 60_000) })
        return value
      })
      .finally(() => pendingStreets.delete(key))
    pendingStreets.set(key, promise)
    return promise
  }
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

    const key = `${query.autocomplete ? `autocomplete:${query.department || ''}` : 'submit'}:${query.text.toLocaleLowerCase('es')}`
    const cached = cache.get(key)
    if (cached && cached.until > time) return cached.value
    if (pending.has(key)) return pending.get(key)!
    if (pending.size >= 4) throw new RentalGeocodeError(429)
    if (globalWindow.until <= time) globalWindow = { until: time + 60_000, count: 0 }
    if (globalWindow.count >= 60) throw new RentalGeocodeError(429)
    globalWindow.count++

    const promise = (async (): Promise<RentalGeocodeResponse> => {
      let stage: RentalGeocodeStage = query.unscopedIntersection ? 'street' : 'query'
      try {
        let items: RentalGeocodeResponse['items'] = []
        let refinements: NonNullable<RentalGeocodeResponse['refinements']> = []
        if (query.unscopedIntersection) {
          const streetRows = await fetchStreet(query.unscopedIntersection.firstStreet)
          const scope = rentalGeocodeUniqueScope(streetRows, query)
          if (scope) {
            stage = 'intersection'
            const raw = await fetchCandidates(scope.text)
            if (!Array.isArray(raw)) throw new RentalGeocodeError(503, 'invalid_response')
            items = rentalGeocodeItems(
              raw.filter(row => rentalGeocodeMatchesScope(row, scope)),
              query
            )
            if (scope.suggested) items = items.map(item => ({ ...item, suggested: true }))
          }
        } else {
          let raw = await fetchCandidates(query.text)
          if (!Array.isArray(raw)) throw new RentalGeocodeError(503, 'invalid_response')
          items = rentalGeocodeItems(raw, query)
          refinements = rentalGeocodeRefinements(raw, query)
          if (!items.length && query.fallback) {
            stage = 'fallback'
            raw = await fetchCandidates(query.fallback)
            if (!Array.isArray(raw)) throw new RentalGeocodeError(503, 'invalid_response')
            items = rentalGeocodeItems(raw, query)
          }
        }
        const value: RentalGeocodeResponse = {
          items,
          source: 'IDE Uruguay',
          ...(refinements.length ? { refinements } : {}),
        }
        if (cache.size >= 128) cache.delete(cache.keys().next().value!)
        cache.set(key, {
          value,
          until: now() + (items.length || refinements.length ? 15 * 60_000 : 60_000),
        })
        return value
      } catch (error) {
        const known = error instanceof RentalGeocodeError ? error : null
        const failure = known && failureKinds.includes(known.failure) ? known.failure : 'internal'
        const httpStatus = known?.httpStatus
        const safeCodes =
          failure === 'network' && Array.isArray(known?.networkCodes)
            ? [...new Set(known.networkCodes.filter(code => networkCodes.includes(code)))].slice(
                0,
                4
              )
            : []
        // Build a fresh allowlisted object. Never report input, URL, client, message or stack.
        const diagnostic: RentalGeocodeFailureReport = {
          stage,
          failure,
          elapsedMs: Math.max(0, Math.round(now() - time)),
          ...(safeCodes.length ? { networkCodes: safeCodes } : {}),
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
