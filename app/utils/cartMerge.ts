// Pure cart (de)serialization + merge helpers for the import-cart store.
//
// Kept framework-agnostic (no Vue/Nuxt runtime) so the localStorage round-trip
// and the login-merge can be unit-tested in plain Node. The Pinia store
// (`stores/importCart.ts`) wires these to localStorage + the account API.
import type { CartItem, CartSettings } from './importCart'

/** A persisted cart: the items plus a (partial) settings object. */
export interface StoredCart {
  items: CartItem[]
  settings: Partial<CartSettings>
}

/** localStorage key (versioned so a schema change can invalidate old carts). */
export const CART_STORAGE_KEY = 'cu_import_cart_v1'

/** Sensible defaults applied by the UI when a setting is absent. */
export const DEFAULT_CART_SETTINGS: CartSettings = {
  regime: 'courier',
  origin: 'usa',
  useFranchise: true,
  franchiseAvailableUsd: 800,
  arancelPct: 0,
  tasaConsularPct: 5,
  imesiPct: 0,
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Accept only http(s) URLs (capped), else undefined — never javascript:/data:. */
function safeHttpUrl(v: unknown): string | undefined {
  return typeof v === 'string' && /^https?:\/\//i.test(v) ? v.slice(0, 2000) : undefined
}

/**
 * Validate + normalize one raw cart item, or return null to drop it. Shared by
 * the client (localStorage / login-merge) and the server PUT handler so stored
 * items are constrained identically everywhere.
 */
export function sanitizeCartItem(raw: unknown): CartItem | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '')
    .trim()
    .slice(0, 100)
  const name = String(o.name ?? '').trim()
  const priceUsd = Math.max(num(o.priceUsd), 0)
  if (!id || !name || priceUsd <= 0) return null
  return {
    id,
    name: name.slice(0, 200),
    url: safeHttpUrl(o.url),
    imageUrl: safeHttpUrl(o.imageUrl),
    priceUsd,
    qty: Math.min(Math.max(Math.round(num(o.qty) || 1), 1), 999),
    weightKg: o.weightKg != null ? Math.max(num(o.weightKg), 0) : undefined,
    categoryId:
      String(o.categoryId ?? 'general')
        .trim()
        .slice(0, 60) || 'general',
  }
}

const NUMERIC_SETTING_KEYS = [
  'franchiseAvailableUsd',
  'shippingUsd',
  'arancelPct',
  'tasaConsularPct',
  'imesiPct',
] as const

/** Whitelist + coerce the known cart settings keys; drop everything else. */
export function sanitizeCartSettings(raw: unknown): Partial<CartSettings> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const out: Partial<CartSettings> = {}
  if (o.regime === 'courier' || o.regime === 'general') out.regime = o.regime
  if (o.origin === 'usa' || o.origin === 'other') out.origin = o.origin
  if (typeof o.useFranchise === 'boolean') out.useFranchise = o.useFranchise
  for (const key of NUMERIC_SETTING_KEYS) {
    const n = Number(o[key])
    if (Number.isFinite(n) && n >= 0) out[key] = n
  }
  return out
}

/** Parse an unknown (e.g. JSON.parse'd localStorage / API) into a safe StoredCart. */
export function sanitizeStoredCart(raw: unknown): StoredCart {
  if (!raw || typeof raw !== 'object') return { items: [], settings: {} }
  const o = raw as Record<string, unknown>
  const items = Array.isArray(o.items)
    ? o.items.map(sanitizeCartItem).filter((i): i is CartItem => !!i)
    : []
  return { items, settings: sanitizeCartSettings(o.settings) }
}

/**
 * Merge a local (anonymous) cart into the account cart on login. Items are
 * unioned by id with the account winning on conflict (account order first, then
 * local-only items appended). Settings come from the account when it already has
 * items, otherwise from the local cart (a fresh account adopts what the user just
 * configured while logged out).
 */
export function mergeCarts(local: StoredCart, remote: StoredCart): StoredCart {
  const byId = new Map<string, CartItem>()
  for (const item of remote.items) byId.set(item.id, item)
  for (const item of local.items) if (!byId.has(item.id)) byId.set(item.id, item)
  return {
    items: [...byId.values()],
    settings: remote.items.length ? remote.settings : local.settings,
  }
}
