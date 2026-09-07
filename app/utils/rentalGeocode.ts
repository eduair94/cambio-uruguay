import { parseRentalReferencePoint } from './rentalDistance'

export interface RentalGeocodeItem {
  label: string
  lat: number
  lng: number
  suggested?: true
}
export interface RentalGeocodeResponse {
  items: RentalGeocodeItem[]
  source: 'IDE Uruguay'
}
export interface RentalGeocodeQuery {
  text: string
  intersection: boolean
  fallback: string | null
  /** Resolve the first street's own scope before looking up an otherwise unscoped crossing. */
  unscopedIntersection?: { firstStreet: string; secondStreet: string }
}

export const RENTAL_GEOCODE_CANDIDATE_LIMIT = 5

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()

/** Explicit submissions only. Both parameters are text, never arrays or geocoder URL inputs. */
export function normalizeRentalGeocodeQuery(
  input: Record<string, unknown>
): RentalGeocodeQuery | null {
  if (typeof input.q !== 'string' || input.q.length > 180) return null
  if (input.department !== undefined && typeof input.department !== 'string') return null
  const address = input.q.normalize('NFC').trim().replace(/\s+/g, ' ')
  const department = String(input.department ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
  if (
    address.length < 4 ||
    department.length > 40 ||
    /[\p{Cc}\p{Cf}<>[\]{}]/u.test(address + department)
  )
    return null
  const suffix = department && !fold(address).endsWith(fold(department)) ? `, ${department}` : ''
  const text = address + suffix
  const [street, ...location] = address.split(',')
  const explicit = /\b(?:esquina|esq\.?)\s+/i.test(street!)
  // "Treinta y Tres" is one street (and a department), not an intersection.
  const protectedStreet = street!.replace(/\btreinta\s+y\s+tres\b/gi, match =>
    match.replace(/\s+y\s+/i, '\u0000')
  )
  const segments = protectedStreet.split(/\s+y\s+/i)
  const natural =
    !explicit && segments.length === 2 && segments.every(part => part.trim().length >= 2)
  const fallback = natural
    ? [segments.map(part => part.replace(/\0/g, ' y ')).join(' esquina '), ...location].join(',') +
      suffix
    : null
  const crossing = (fallback ?? text).split(',')[0]!.split(/\s+esq(?:uina)?\.?\s+/i)
  const unscoped =
    (explicit || natural) &&
    !department &&
    !location.some(part => part.trim()) &&
    crossing.length === 2 &&
    crossing.every(part => part.trim().length >= 2)
  return {
    text,
    intersection: explicit || natural,
    fallback,
    ...(unscoped
      ? {
          unscopedIntersection: {
            firstStreet: crossing[0]!.trim(),
            secondStreet: crossing[1]!.trim(),
          },
        }
      : {}),
  }
}

interface RentalGeocodeScope {
  text: string
  streetId: number
  localityId: number
  departmentId: number
  firstStreet: string
  secondStreet: string
  suggested?: true
}

const name = (value: string) => fold(value.trim().replace(/\s+/g, ' '))
/** A provider-supplied name may suggest one adjacent letter swap, never invented spelling. */
function hasSingleLetterTransposition(entered: string, native: string): boolean {
  if (entered.length !== native.length || (entered.match(/\p{L}/gu)?.length ?? 0) < 6) return false
  let at = 0
  while (at < entered.length && entered[at] === native[at]) at++
  return (
    at + 1 < entered.length &&
    /\p{L}/u.test(entered[at]!) &&
    /\p{L}/u.test(entered[at + 1]!) &&
    entered[at] === native[at + 1] &&
    entered[at + 1] === native[at] &&
    entered.slice(at + 2) === native.slice(at + 2)
  )
}
const nativeId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const scopeText = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.trim().length >= 2 &&
  value.length <= 100 &&
  !/[\p{Cc}\p{Cf}<>,]/u.test(value)

/** A truncated or ambiguous street search cannot choose a city for the user. No point is used. */
export function rentalGeocodeUniqueScope(
  raw: unknown,
  query: RentalGeocodeQuery
): RentalGeocodeScope | null {
  const streets = query.unscopedIntersection
  if (
    !streets ||
    !Array.isArray(raw) ||
    !raw.length ||
    raw.length >= RENTAL_GEOCODE_CANDIDATE_LIMIT
  )
    return null
  const rows = raw.filter(
    (row): row is Record<string, unknown> & { nomVia: string } =>
      row &&
      typeof row === 'object' &&
      !Array.isArray(row) &&
      row.type === 'CALLE' &&
      scopeText(row.nomVia)
  )
  const entered = name(streets.firstStreet)
  const exact = rows.filter(row => name(row.nomVia) === entered)
  const suggested = !exact.length
  const selected = exact.length
    ? exact
    : rows.filter(row => hasSingleLetterTransposition(entered, name(row.nomVia)))
  const candidates = new Map<string, RentalGeocodeScope>()
  for (const row of selected) {
    // An unresolved matching row cannot be ignored to pick a different native street or city.
    if (
      row.state !== 1 ||
      row.stateMsg !== '' ||
      !nativeId(row.idCalle) ||
      !nativeId(row.idLocalidad) ||
      !nativeId(row.idDepartamento) ||
      !scopeText(row.localidad) ||
      !scopeText(row.departamento)
    )
      return null
    const key = `${row.idCalle}:${row.idLocalidad}:${row.idDepartamento}:${name(row.localidad)}:${name(row.departamento)}:${name(row.nomVia)}`
    candidates.set(key, {
      text: `${row.nomVia.trim()} esquina ${streets.secondStreet}, ${row.localidad.trim()}, ${row.departamento.trim()}`,
      streetId: row.idCalle,
      localityId: row.idLocalidad,
      departmentId: row.idDepartamento,
      firstStreet: row.nomVia.trim(),
      secondStreet: streets.secondStreet,
      ...(suggested ? { suggested: true as const } : {}),
    })
  }
  return candidates.size === 1 ? [...candidates.values()][0]! : null
}

/** The second response must prove an actual crossing in the exact native scope discovered above. */
export function rentalGeocodeMatchesScope(value: unknown, scope: RentalGeocodeScope): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  if (
    row.type !== 'ESQUINA' ||
    row.idLocalidad !== scope.localityId ||
    row.idDepartamento !== scope.departmentId ||
    !nativeId(row.idCalle) ||
    !nativeId(row.idCalleEsq) ||
    row.idCalle === row.idCalleEsq ||
    ![row.idCalle, row.idCalleEsq].includes(scope.streetId) ||
    typeof row.address !== 'string'
  )
    return false
  const parts = row.address
    .split(',')[0]!
    .split(/\s+esq(?:uina)?\.?\s+/i)
    .map(name)
  const firstIndex = row.idCalle === scope.streetId ? 0 : 1
  return (
    parts.length === 2 &&
    parts[firstIndex] === name(scope.firstStreet) &&
    parts[1 - firstIndex] === name(scope.secondStreet)
  )
}

/** IDE's stateMsg documents approximations/centroids. Never publish one as an exact crossing. */
export function rentalGeocodeItems(raw: unknown, query: RentalGeocodeQuery): RentalGeocodeItem[] {
  if (!Array.isArray(raw)) return []
  const items: RentalGeocodeItem[] = []
  const seen = new Set<string>()
  for (const value of raw.slice(0, 50)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const row = value as Record<string, unknown>
    if (row.state !== 1 || row.stateMsg !== '') continue
    const allowed = query.intersection ? ['ESQUINA'] : ['ESQUINA', 'CALLEyPORTAL', 'POI']
    if (!allowed.includes(String(row.type))) continue
    if (typeof row.lat !== 'number' || typeof row.lng !== 'number') continue
    const point = parseRentalReferencePoint({ refLat: row.lat, refLng: row.lng })
    if (!point || typeof row.address !== 'string') continue
    const label = row.address.trim().replace(/\s+/g, ' ')
    if (!label || label.length > 240 || /[\p{Cc}\p{Cf}<>]/u.test(label)) continue
    const key = `${point.lat},${point.lng}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ label, ...point })
    if (items.length === 5) break
  }
  return items
}
