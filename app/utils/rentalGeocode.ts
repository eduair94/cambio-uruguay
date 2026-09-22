import { parseRentalReferencePoint } from './rentalDistance'

/**
 * Address lookup for the rental "cerca de" and household-destination fields, backed by the
 * site's Google Maps proxy (see server/utils/rentalGeocode.ts). Google knows streets, numbers,
 * intersections, neighbourhoods and places by name ("Facultad de Ingeniería", "Tres Cruces"),
 * which the official IDE service it replaced did not, and answers in about 0.3 s.
 */
export interface RentalGeocodeItem {
  label: string
  lat: number
  lng: number
  suggested?: true
}
export interface RentalGeocodeResponse {
  items: RentalGeocodeItem[]
  source: 'Google Maps'
  /**
   * A street without a number, offered to keep typing: a point in the middle of an avenue is not a
   * reference anybody means. Contains no coordinates.
   */
  refinements?: Array<{ label: string; query: string }>
}
export interface RentalGeocodeQuery {
  text: string
  autocomplete?: true
  department?: string
}

export const RENTAL_GEOCODE_CANDIDATE_LIMIT = 5

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()

/** Queries remain plain text; autocomplete is an explicit mode, never a geocoder URL input. */
export function normalizeRentalGeocodeQuery(
  input: Record<string, unknown>
): RentalGeocodeQuery | null {
  if (typeof input.q !== 'string' || input.q.length > 180) return null
  if (input.department !== undefined && typeof input.department !== 'string') return null
  if (input.autocomplete !== undefined && input.autocomplete !== '1') return null
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
  const suffix = department && !fold(address).includes(fold(department)) ? `, ${department}` : ''
  return {
    text: address + suffix,
    ...(input.autocomplete === '1' ? { autocomplete: true as const } : {}),
    ...(department ? { department } : {}),
  }
}

/**
 * Google's Uruguayan labels carry noise: "Montevideo Departamento de Montevideo, Uruguay",
 * "11100 Montevideo, Departamento de Montevideo". Keep the address and one mention of each place.
 */
export function rentalGeocodeLabel(value: string): string {
  const label = value
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/,?\s*Uruguay$/i, '')
    .replace(/\b\d{5}\s/g, '')
  const marker = 'departamento de '
  const parts: string[] = []
  for (const raw of label.split(',')) {
    const part = raw.trim()
    const at = part.toLowerCase().indexOf(marker)
    // "Montevideo Departamento de Montevideo" → "Montevideo"; "Barros Blancos Departamento de
    // Canelones" → "Barros Blancos", "Canelones"; ", Departamento de Montevideo" → "Montevideo".
    const pieces =
      at < 0 ? [part] : [part.slice(0, at).trim(), part.slice(at + marker.length).trim()]
    for (const piece of pieces)
      if (piece && !parts.some(seen => fold(seen) === fold(piece))) parts.push(piece)
  }
  return parts.join(', ')
}

export interface GooglePrediction {
  description?: string
  place_id?: string
  types?: string[]
}

/** Types that name a precise place; a bare `route` does not. */
const PRECISE = [
  'street_address',
  'premise',
  'subpremise',
  'establishment',
  'point_of_interest',
  'intersection',
  'neighborhood',
  'sublocality',
  'locality',
  'transit_station',
]

export function splitRentalPredictions(predictions: unknown): {
  points: Array<{ label: string; placeId: string }>
  streets: NonNullable<RentalGeocodeResponse['refinements']>
} {
  const points: Array<{ label: string; placeId: string }> = []
  const streets: NonNullable<RentalGeocodeResponse['refinements']> = []
  if (!Array.isArray(predictions)) return { points, streets }
  for (const value of predictions.slice(0, 10)) {
    const p = value as GooglePrediction
    if (typeof p?.description !== 'string' || typeof p.place_id !== 'string' || !p.place_id)
      continue
    const label = rentalGeocodeLabel(p.description)
    if (!label || label.length > 240 || /[\p{Cc}\p{Cf}<>]/u.test(label)) continue
    const types = Array.isArray(p.types) ? p.types : []
    const streetOnly = types.includes('route') && !types.some(type => PRECISE.includes(type))
    if (streetOnly) {
      if (streets.length < 3 && !streets.some(s => fold(s.label) === fold(label)))
        streets.push({ label, query: label })
    } else if (points.length < RENTAL_GEOCODE_CANDIDATE_LIMIT)
      points.push({ label, placeId: p.place_id })
  }
  return { points, streets }
}

export interface GoogleResult {
  formatted_address?: string
  name?: string
  geometry?: { location?: { lat?: number; lng?: number } }
}

/** A result is kept only as a real point inside Uruguay, with a clean label. */
export function rentalGeocodeItem(result: unknown, label?: string): RentalGeocodeItem | null {
  const r = result as GoogleResult
  const location = r?.geometry?.location
  const point = parseRentalReferencePoint({ refLat: location?.lat, refLng: location?.lng })
  if (!point) return null
  const own =
    label ??
    (r.name && r.formatted_address && !fold(r.formatted_address).startsWith(fold(r.name))
      ? `${r.name}, ${r.formatted_address}`
      : (r.formatted_address ?? r.name ?? ''))
  const clean = rentalGeocodeLabel(own)
  if (!clean || clean.length > 240 || /[\p{Cc}\p{Cf}<>]/u.test(clean)) return null
  return { label: clean, ...point }
}

export function rentalGeocodeItems(results: unknown): RentalGeocodeItem[] {
  if (!Array.isArray(results)) return []
  const items: RentalGeocodeItem[] = []
  const seen = new Set<string>()
  for (const result of results.slice(0, 10)) {
    const item = rentalGeocodeItem(result)
    if (!item) continue
    const key = `${item.lat},${item.lng}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push(item)
    if (items.length === RENTAL_GEOCODE_CANDIDATE_LIMIT) break
  }
  return items
}
