// The directory's reference point ("Más cerca de…"), kept OUT of the address bar.
//
// It used to travel in the URL as refLat/refLng/refLabel, and everything on the page that reads
// the page URL got it: GA4's page_location, the Google tag's `dl` and the `url` of every AdSense ad
// request. Measured 2026-11-08: one load of a directory URL with a point put it in 4 requests to
// Google, and GA4 had 14 page views of /alquileres-uruguay with refLat in 28 days. The label is
// what the visitor typed or picked (up to 160 characters, often their own address), the site's own
// rule is "never the reference address" (docs/app/RENTAL_FEEDBACK.md), and AdSense policy forbids
// passing personal data to Google, URLs included. A URL fragment is no way out either: the ad
// requests send the fragment too.
//
// So the point is session state. Each history entry the directory creates carries its own point in
// `history.state`, so Back/Forward and a reload replay what that entry showed, as they did when it
// was in the URL; and the tab remembers the last point shown (sessionStorage) for entries the
// directory did not create (a menu link, the way back from a listing). It is never shared nor kept
// past the session: a copied link, a bookmark and a search saved in the page have no point. The
// site's own API still receives it as query parameters (`rentalQueryToParams` keeps them by
// default), which is a first-party request, not the page URL.
import { normalizeRentalReferenceLabel, parseRentalReferencePoint } from './rentalDistance'

/** sessionStorage key for the point this tab last showed. */
export const RENTAL_REFERENCE_STORAGE_KEY = 'cu-rental-ref'
/** Key inside `history.state` for the point of one history entry. */
export const RENTAL_REFERENCE_HISTORY_KEY = 'cuRentalRef'
/** The query keys that used to carry the point in the address bar. */
export const RENTAL_REFERENCE_QUERY_KEYS: readonly string[] = Object.freeze([
  'refLat',
  'refLng',
  'refLabel',
])

// A type alias and not an interface: it goes into `history.state`, and only an alias is assignable
// to vue-router's index-signature `HistoryState` without a cast.
export type RentalReference = {
  lat: number
  lng: number
  /** The confirmed suggestion's text; '' for a point picked on the map. Display only. */
  label: string
}

/** The point named by query-style keys (a route query, saved params, a RentalQuery), validated. */
export function rentalReferenceFromQuery(
  input: Record<string, unknown> | null | undefined
): RentalReference | null {
  if (!input || typeof input !== 'object') return null
  const point = parseRentalReferencePoint({ refLat: input.refLat, refLng: input.refLng })
  return point ? { ...point, label: normalizeRentalReferenceLabel(input.refLabel) } : null
}

/** A point as this module stores it ({lat, lng, label}, numbers); anything else is not one. */
export function rentalReferenceFromValue(value: unknown): RentalReference | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const { lat, lng, label } = value as Record<string, unknown>
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  const point = parseRentalReferencePoint({ refLat: lat, refLng: lng })
  return point ? { ...point, label: normalizeRentalReferenceLabel(label) } : null
}

/**
 * The keys that put the point back into `normalizeRentalQuery`, so the page reads ONE query (filters
 * from the URL, point from session state). Nothing without a point; the label is always included
 * with one, so a stale label can never pair with a different point.
 */
export function rentalReferenceQuery(reference: RentalReference | null): Record<string, string> {
  return reference
    ? { refLat: String(reference.lat), refLng: String(reference.lng), refLabel: reference.label }
    : {}
}

/** Whether a route query still has any of the point's keys: an old shared link or bookmark. */
export function hasRentalReferenceQuery(query: Record<string, unknown>): boolean {
  return RENTAL_REFERENCE_QUERY_KEYS.some(key => Object.hasOwn(query, key))
}

/** The same query without the point's keys; every other key and value is kept as it was. */
export function withoutRentalReferenceQuery<V>(query: Record<string, V>): Record<string, V> {
  return Object.fromEntries(
    Object.entries(query).filter(([key]) => !RENTAL_REFERENCE_QUERY_KEYS.includes(key))
  )
}

/** Serialised directory params → what may go in the address bar, and the point they carried. */
export function splitRentalReference(params: Record<string, string>): {
  params: Record<string, string>
  reference: RentalReference | null
} {
  return {
    params: withoutRentalReferenceQuery(params),
    reference: rentalReferenceFromQuery(params),
  }
}

export function sameRentalReference(
  a: RentalReference | null | undefined,
  b: RentalReference | null | undefined
): boolean {
  if (!a || !b) return !a && !b
  return a.lat === b.lat && a.lng === b.lng && a.label === b.label
}

/** The `history.state` fragment of an entry: its point, or an explicit "no point here". */
export function rentalReferenceHistoryState(
  reference: RentalReference | null
): Record<string, RentalReference | null> {
  return {
    [RENTAL_REFERENCE_HISTORY_KEY]: reference
      ? { lat: reference.lat, lng: reference.lng, label: reference.label }
      : null,
  }
}

/**
 * What a history entry says about the point: the point; `null` when the entry has none on purpose
 * (it was removed there); `undefined` when the entry says nothing (the directory did not create it,
 * or the value is not a point), and then the tab's remembered point applies.
 */
export function rentalReferenceFromHistoryState(
  state: unknown
): RentalReference | null | undefined {
  if (!state || typeof state !== 'object' || !Object.hasOwn(state, RENTAL_REFERENCE_HISTORY_KEY))
    return undefined
  const value = (state as Record<string, unknown>)[RENTAL_REFERENCE_HISTORY_KEY]
  if (value === null) return null
  return rentalReferenceFromValue(value) ?? undefined
}

/** The tab's remembered point; null when there is none, storage is blocked or the value is bad. */
export function readStoredRentalReference(
  storage: Pick<Storage, 'getItem'> | null | undefined
): RentalReference | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(RENTAL_REFERENCE_STORAGE_KEY)
    return raw ? rentalReferenceFromValue(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

/** Remembers the point for this tab (or forgets it on null). False when storage refuses. */
export function writeStoredRentalReference(
  storage: Pick<Storage, 'setItem' | 'removeItem'> | null | undefined,
  reference: RentalReference | null
): boolean {
  if (!storage) return false
  try {
    if (reference)
      storage.setItem(
        RENTAL_REFERENCE_STORAGE_KEY,
        JSON.stringify({ lat: reference.lat, lng: reference.lng, label: reference.label })
      )
    else storage.removeItem(RENTAL_REFERENCE_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
