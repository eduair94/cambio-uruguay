// Shape, validation, merge and share-link (de)serialization of the personal
// watchlist behind `/mi-lista`.
//
// PURE module (no Vue/Nuxt runtime) so the localStorage round-trip, the
// login-merge and the `?l=` deep link are unit-testable in plain Node, and so
// the server PUT handler can reuse exactly the same validation as the client
// — the pattern `cartMerge.ts` established for the import cart.
//
// The watchlist answers three questions the site otherwise makes you re-answer
// on every visit: WHERE you are (so "cerca" means something in Tacuarembó, not
// only in Montevideo), WHICH casas you would actually walk into, and WHICH
// cards you carry. It works with no account: localStorage is the primary store
// and the account only syncs it across devices.

/** How a watched zone is expressed. */
export type WatchZoneMode = 'point' | 'department'

/** Direction the user cares about: the casa buys from them, or sells to them. */
export type WatchDirection = 'buy' | 'sell'

/**
 * The area the list is about.
 *
 * `point` — a latitude/longitude plus a radius. Covers "my neighbourhood"
 * (geolocation + 1–2 km) and "my town" (the centroid of that locality's real
 * branches). There is no barrio dataset in the API and we do not invent one.
 *
 * `department` — the whole department, for someone in the interior who will
 * travel to whichever town has the better price.
 */
export interface WatchZone {
  mode: WatchZoneMode
  /** `point` only. */
  lat?: number
  /** `point` only. */
  lng?: number
  /** `point` only, in km. */
  radiusKm?: number
  /** `department` only — the canonical name as `localData` publishes it. */
  department?: string
  /** Human label for the chip ("Mi ubicación", "Salto", "PAYSANDÚ"). */
  label?: string
}

/** Everything a person configures once and gets back on every visit. */
export interface Watchlist {
  zone: WatchZone | null
  /** Followed `origin` keys. Empty means "every house that reaches my zone". */
  origins: string[]
  /** Followed card ids from `utils/debitCards.ts`. */
  cards: string[]
  /** Followed currency codes, e.g. `['USD', 'BRL']`. Never empty. */
  currencies: string[]
  direction: WatchDirection
  /** Reference purchase amount (USD) for the card-cost comparison. */
  amountUsd: number
}

/** localStorage key (versioned so a schema change can invalidate old lists). */
export const WATCHLIST_STORAGE_KEY = 'cu_watchlist_v1'

/**
 * localStorage key of the last-seen quotes. Device-local on purpose: the board
 * reads "since your last visit", which is a property of this browser, not of
 * the account — syncing it would reset the deltas on every other device.
 */
export const WATCHLIST_SNAPSHOT_KEY = 'cu_watchlist_snapshot_v1'

export const MAX_ORIGINS = 40
export const MAX_CARDS = 12
export const MAX_CURRENCIES = 6
export const MIN_RADIUS_KM = 1
export const MAX_RADIUS_KM = 200
export const MAX_AMOUNT_USD = 100000
/** Longest id we store; anything longer is a payload, not an id. */
const MAX_ID_LEN = 60

export const DEFAULT_WATCHLIST: Watchlist = Object.freeze({
  zone: null,
  origins: [],
  cards: [],
  currencies: ['USD'],
  direction: 'sell',
  amountUsd: 100,
}) as Watchlist

/** A currency code as the API publishes them: 3–4 uppercase letters. */
const CURRENCY_RE = /^[A-Z]{3,4}$/

function num(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Normalise a list of ids: strings only, trimmed, capped in length and count. */
function idList(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const id = item.trim().slice(0, MAX_ID_LEN)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= max) break
  }
  return out
}

/** Validate a raw zone, or return null when it cannot be used to filter anything. */
export function sanitizeZone(raw: unknown): WatchZone | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const label = typeof o.label === 'string' ? o.label.trim().slice(0, 80) : ''

  if (o.mode === 'point') {
    const lat = num(o.lat)
    const lng = num(o.lng)
    // A point zone without coordinates would silently match everything.
    if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
    const radius = num(o.radiusKm)
    const zone: WatchZone = {
      mode: 'point',
      lat,
      lng,
      radiusKm: radius === null ? 5 : clamp(radius, MIN_RADIUS_KM, MAX_RADIUS_KM),
    }
    if (label) zone.label = label
    return zone
  }

  if (o.mode === 'department') {
    const department = typeof o.department === 'string' ? o.department.trim().slice(0, 60) : ''
    if (!department) return null
    // Coordinates and radius mean nothing here; drop them rather than store
    // stale numbers that a later reader could mistake for the zone centre.
    return { mode: 'department', department, label: label || department }
  }

  return null
}

/**
 * Validate + normalise an unknown payload (localStorage, share link or request
 * body) into a usable {@link Watchlist}. Never throws; unknown fields are
 * dropped and out-of-range numbers clamped.
 */
export function sanitizeWatchlist(raw: unknown): Watchlist {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_WATCHLIST }
  const o = raw as Record<string, unknown>

  const currencies = (Array.isArray(o.currencies) ? o.currencies : [])
    .filter((c): c is string => typeof c === 'string')
    .map(c => c.trim().toUpperCase())
    .filter(c => CURRENCY_RE.test(c))
  const uniqueCurrencies = [...new Set(currencies)].slice(0, MAX_CURRENCIES)

  const amount = num(o.amountUsd)

  return {
    zone: sanitizeZone(o.zone),
    origins: idList(o.origins, MAX_ORIGINS),
    cards: idList(o.cards, MAX_CARDS),
    currencies: uniqueCurrencies.length ? uniqueCurrencies : [...DEFAULT_WATCHLIST.currencies],
    direction: o.direction === 'buy' || o.direction === 'sell' ? o.direction : DEFAULT_WATCHLIST.direction,
    amountUsd:
      amount === null || amount <= 0 ? DEFAULT_WATCHLIST.amountUsd : clamp(amount, 1, MAX_AMOUNT_USD),
  }
}

/** True once the user has told us anything at all — drives the wizard vs board view. */
export function isConfigured(w: Watchlist): boolean {
  return !!w.zone || w.origins.length > 0 || w.cards.length > 0
}

/**
 * Merge the anonymous local list into the account list on login.
 *
 * Ids are unioned with the account's order first, then local-only extras — so
 * nothing the user picked while logged out is lost. The zone and the scalar
 * settings come from the account when it has a zone; a fresh account adopts
 * whatever the user just configured anonymously. Same contract as `mergeCarts`.
 */
export function mergeWatchlists(local: unknown, remote: unknown): Watchlist {
  const a = sanitizeWatchlist(local)
  const b = sanitizeWatchlist(remote)
  const union = (first: string[], second: string[], max: number) =>
    [...new Set([...first, ...second])].slice(0, max)
  const accountLeads = b.zone !== null
  return {
    zone: b.zone ?? a.zone,
    origins: union(b.origins, a.origins, MAX_ORIGINS),
    cards: union(b.cards, a.cards, MAX_CARDS),
    currencies: union(b.currencies, a.currencies, MAX_CURRENCIES),
    direction: accountLeads ? b.direction : a.direction,
    amountUsd: accountLeads ? b.amountUsd : a.amountUsd,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Share link — `?l=<token>`
// ─────────────────────────────────────────────────────────────────────────────

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(token: string): string {
  const binary = atob(token.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Encode a list into a URL-safe token for sharing (`/mi-lista?l=…`). */
export function encodeWatchlist(w: Watchlist): string {
  return toBase64Url(JSON.stringify(sanitizeWatchlist(w)))
}

/**
 * Decode a `?l=` token back into a list. Returns `null` for anything that is
 * not a well-formed token — a bad link must never clobber the local list.
 * What survives is sanitized, so a crafted token cannot inject an oversized
 * payload into localStorage.
 */
export function decodeWatchlist(token: string): Watchlist | null {
  if (!token || typeof token !== 'string') return null
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(token))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return sanitizeWatchlist(parsed)
  } catch {
    return null
  }
}
