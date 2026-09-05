import {
  normalizeRentalQuery,
  rentalQueryToParams,
  RENTAL_GUARANTEE_PUBLISHED,
  RENTAL_SOURCE_LABEL,
  totalMonthlyUyu,
  type RentalCurrency,
  type RentalGuarantee,
  type RentalPublicProperty,
  type RentalQuery,
  type RentalSource,
} from './rentals'

// Device-local snapshots: these do not claim a listing is still available or create alerts.
export const RENTAL_SAVED_STORAGE_ID = 'cu_rentals_saved_v1'
export const RENTAL_SAVED_SEARCH_LIMIT = 12
export const RENTAL_SAVED_FAVORITE_LIMIT = 60
export const RENTAL_SAVED_OFFER_LIMIT = 8
const MAX_STORED_LENGTH = 750_000

export interface RentalSavedSearch {
  id: string
  label: string
  params: Record<string, string>
  savedAt: string
}

export interface RentalSavedOffer {
  source: RentalSource
  url: string
  price: number
  currency: RentalCurrency
  priceUyu: number
  commonExpenses: number | null
  commonExpensesCurrency: RentalCurrency | null
}

export interface RentalSavedFavorite {
  key: string
  title: string
  department: string
  neighborhood: string
  bedrooms: number | null
  bathrooms: number | null
  area: number | null
  parkingSpaces: number | null
  furnished: true | null
  petsAllowed: true | null
  guarantees: RentalGuarantee[]
  price: number
  currency: RentalCurrency
  priceUyu: number
  /** Lowest known total from one saved offer, using the exchange rate at the time of saving. */
  monthlyTotalUyu: number | null
  usdUyu: number
  image: string | null
  offers: RentalSavedOffer[]
  savedAt: string
}

export interface RentalSavedState {
  version: 1
  searches: RentalSavedSearch[]
  favorites: RentalSavedFavorite[]
}

export interface RentalSavedStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function emptyRentalSaved(): RentalSavedState {
  return { version: 1, searches: [], favorites: [] }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function finiteNumber(value: unknown, min = 0, max = 100_000_000): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null
}

function currency(value: unknown): RentalCurrency | null {
  return value === 'UYU' || value === 'USD' ? value : null
}

function date(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 40) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

/** Reject executable URLs and credentials, including when browser storage has been edited. */
export function rentalSavedSafeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2_048) return null
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}

function savedParams(input: unknown): Record<string, string> | null {
  if (!record(input)) return null
  const query = normalizeRentalQuery(input)
  // Reopening a search starts at its first results. Normalisation also discards unknown params.
  const params = rentalQueryToParams({ ...query, page: 1 })
  return Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)))
}

function searchId(params: Record<string, string>): string {
  // Canonical full query rather than a hash: different searches cannot collide.
  return `search:${new URLSearchParams(params).toString() || 'all'}`
}

function parseSearch(input: unknown): RentalSavedSearch | null {
  if (!record(input)) return null
  const label = text(input.label, 80)
  const params = savedParams(input.params)
  const savedAt = date(input.savedAt)
  if (!label || !params || !savedAt) return null
  return { id: searchId(params), label, params, savedAt }
}

function parseOffer(input: unknown): RentalSavedOffer | null {
  if (!record(input)) return null
  const source = text(input.source, 30) as RentalSource
  const url = rentalSavedSafeUrl(input.url)
  const price = finiteNumber(input.price, 0.01)
  const priceUyu = finiteNumber(input.priceUyu, 0.01)
  const unit = currency(input.currency)
  if (!Object.hasOwn(RENTAL_SOURCE_LABEL, source) || !url || !price || !priceUyu || !unit)
    return null
  return {
    source,
    url,
    price,
    currency: unit,
    priceUyu,
    commonExpenses: finiteNumber(input.commonExpenses),
    commonExpensesCurrency: currency(input.commonExpensesCurrency),
  }
}

function parseFavorite(input: unknown): RentalSavedFavorite | null {
  if (!record(input)) return null
  const key = text(input.key, 200)
  const title = text(input.title, 240)
  const savedAt = date(input.savedAt)
  if (!key || !title || !savedAt || !Array.isArray(input.offers)) return null
  const urls = new Set<string>()
  const offers: RentalSavedOffer[] = []
  for (const entry of input.offers.slice(0, RENTAL_SAVED_OFFER_LIMIT * 2)) {
    const offer = parseOffer(entry)
    if (!offer || urls.has(offer.url)) continue
    urls.add(offer.url)
    offers.push(offer)
    if (offers.length === RENTAL_SAVED_OFFER_LIMIT) break
  }
  if (!offers.length) return null
  const cheapest = offers.reduce((best, offer) => (offer.priceUyu < best.priceUyu ? offer : best))
  const usdUyu = finiteNumber(input.usdUyu, 0, 10_000) ?? 0
  const totals = offers
    .map(offer => totalMonthlyUyu(offer, usdUyu))
    .filter((total): total is number => total !== null && Number.isFinite(total))
  const guarantees = Array.isArray(input.guarantees) ? input.guarantees : []
  return {
    key,
    title,
    department: text(input.department, 80),
    neighborhood: text(input.neighborhood, 100),
    bedrooms: finiteNumber(input.bedrooms, 0, 30),
    bathrooms: finiteNumber(input.bathrooms, 0, 30),
    area: finiteNumber(input.area, 0.01, 1_000_000),
    parkingSpaces: finiteNumber(input.parkingSpaces, 0, 50),
    furnished: input.furnished === true ? true : null,
    petsAllowed: input.petsAllowed === true ? true : null,
    guarantees: RENTAL_GUARANTEE_PUBLISHED.filter(value => guarantees.includes(value)),
    price: cheapest.price,
    currency: cheapest.currency,
    priceUyu: cheapest.priceUyu,
    monthlyTotalUyu: totals.length ? Math.min(...totals) : null,
    usdUyu,
    image: rentalSavedSafeUrl(input.image),
    offers,
    savedAt,
  }
}

function normalizeState(input: unknown): RentalSavedState {
  const state = emptyRentalSaved()
  if (!record(input) || input.version !== 1) return state
  const searchIds = new Set<string>()
  const favoriteKeys = new Set<string>()
  if (Array.isArray(input.searches)) {
    for (const raw of input.searches.slice(0, RENTAL_SAVED_SEARCH_LIMIT * 2)) {
      const search = parseSearch(raw)
      if (!search || searchIds.has(search.id)) continue
      searchIds.add(search.id)
      state.searches.push(search)
      if (state.searches.length === RENTAL_SAVED_SEARCH_LIMIT) break
    }
  }
  if (Array.isArray(input.favorites)) {
    for (const raw of input.favorites.slice(0, RENTAL_SAVED_FAVORITE_LIMIT * 2)) {
      const favorite = parseFavorite(raw)
      if (!favorite || favoriteKeys.has(favorite.key)) continue
      favoriteKeys.add(favorite.key)
      state.favorites.push(favorite)
      if (state.favorites.length === RENTAL_SAVED_FAVORITE_LIMIT) break
    }
  }
  return state
}

/** Corrupt, obsolete and excessively large storage never prevents the directory from opening. */
export function parseRentalSaved(raw: string | null | undefined): RentalSavedState {
  if (typeof raw !== 'string' || raw.length > MAX_STORED_LENGTH) return emptyRentalSaved()
  try {
    return normalizeState(JSON.parse(raw))
  } catch {
    return emptyRentalSaved()
  }
}

function browserStorage(): RentalSavedStorage | undefined {
  try {
    return (globalThis as { localStorage?: RentalSavedStorage }).localStorage
  } catch {
    return undefined
  }
}

export function readRentalSaved(storage = browserStorage()): RentalSavedState {
  try {
    return parseRentalSaved(storage?.getItem(RENTAL_SAVED_STORAGE_ID))
  } catch {
    return emptyRentalSaved()
  }
}

/** False lets the UI explain that changes cannot be persisted in this browser. */
export function writeRentalSaved(state: RentalSavedState, storage = browserStorage()): boolean {
  if (!storage) return false
  try {
    const raw = JSON.stringify(normalizeState(state))
    if (raw.length > MAX_STORED_LENGTH) return false
    storage.setItem(RENTAL_SAVED_STORAGE_ID, raw)
    return true
  } catch {
    return false
  }
}

export function saveRentalSearch(
  state: RentalSavedState,
  label: string,
  query: RentalQuery,
  now = new Date().toISOString()
): RentalSavedState {
  const search = parseSearch({ label, params: rentalQueryToParams(query), savedAt: now })
  if (!search) return state
  return {
    ...state,
    searches: [search, ...state.searches.filter(item => item.id !== search.id)].slice(
      0,
      RENTAL_SAVED_SEARCH_LIMIT
    ),
  }
}

export function removeRentalSearch(state: RentalSavedState, id: string): RentalSavedState {
  return { ...state, searches: state.searches.filter(item => item.id !== id) }
}

export function createRentalFavorite(
  property: RentalPublicProperty,
  usdUyu: number,
  now = new Date().toISOString()
): RentalSavedFavorite | null {
  return parseFavorite({
    ...property,
    image: property.offers.find(offer => rentalSavedSafeUrl(offer.image))?.image ?? null,
    usdUyu,
    savedAt: now,
  })
}

export function toggleRentalFavorite(
  state: RentalSavedState,
  property: RentalPublicProperty,
  usdUyu: number,
  now = new Date().toISOString()
): RentalSavedState {
  if (state.favorites.some(item => item.key === property.key))
    return removeRentalFavorite(state, property.key)
  const favorite = createRentalFavorite(property, usdUyu, now)
  if (!favorite) return state
  return {
    ...state,
    favorites: [favorite, ...state.favorites].slice(0, RENTAL_SAVED_FAVORITE_LIMIT),
  }
}

export function removeRentalFavorite(state: RentalSavedState, key: string): RentalSavedState {
  return { ...state, favorites: state.favorites.filter(item => item.key !== key) }
}
