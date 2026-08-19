// Static Bankos catalogs (banks + cards) and shared types, extracted from the Bankos app
// (com.anonymous.bankos v1.1.8). Pure data, no secrets — safe to import on the client for the
// card selector. The live/fallback data plumbing lives in server/utils/bankos.ts.

export interface BankosBank {
  id: string
  name: string
  color: string
  unique?: string
}

export interface BankosCard {
  id: string
  name: string
  bankId: string
  type: 'credit' | 'debit'
}

/** The 10 issuers Bankos supports (id, display name, brand colour). */
export const BANKOS_BANKS: BankosBank[] = [
  { id: 'itau', name: 'Itaú', color: '#EC7000' },
  { id: 'bbva', name: 'BBVA', color: '#1973B8' },
  { id: 'santander', name: 'Santander', color: '#EC0000' },
  { id: 'scotiabank', name: 'Scotiabank', color: '#EC111A' },
  { id: 'brou', name: 'BROU', color: '#005ca7' },
  { id: 'oca', name: 'OCA', color: '#006ed2' },
  { id: 'clubelpais', name: 'Club El País', color: '#a0d9f7', unique: 'Tarjeta' },
  { id: 'mercadopago', name: 'Mercado Pago', color: '#00aff0', unique: 'QR' },
  { id: 'prex', name: 'Prex', color: '#5c19ae', unique: 'Tarjeta' },
  { id: 'anda', name: 'ANDA', color: '#4464dd', unique: 'Crédito' },
]

/** The 16 selectable cards (bank × credit/debit), as the app lists them. */
export const BANKOS_CARDS: BankosCard[] = [
  { id: 'itau_debit', name: 'Itaú Débito', bankId: 'itau', type: 'debit' },
  { id: 'itau_credit', name: 'Itaú Crédito', bankId: 'itau', type: 'credit' },
  { id: 'bbva_debit', name: 'BBVA Débito', bankId: 'bbva', type: 'debit' },
  { id: 'bbva_credit', name: 'BBVA Crédito', bankId: 'bbva', type: 'credit' },
  { id: 'santander_debit', name: 'Santander Débito', bankId: 'santander', type: 'debit' },
  { id: 'santander_credit', name: 'Santander Crédito', bankId: 'santander', type: 'credit' },
  { id: 'scotiabank_debit', name: 'Scotiabank Débito', bankId: 'scotiabank', type: 'debit' },
  { id: 'scotiabank_credit', name: 'Scotiabank Crédito', bankId: 'scotiabank', type: 'credit' },
  { id: 'brou_debit', name: 'BROU Débito', bankId: 'brou', type: 'debit' },
  { id: 'brou_credit', name: 'BROU Crédito', bankId: 'brou', type: 'credit' },
  { id: 'oca_debit', name: 'OCA Débito', bankId: 'oca', type: 'debit' },
  { id: 'oca_credit', name: 'OCA Crédito', bankId: 'oca', type: 'credit' },
  { id: 'clubelpais_debit', name: 'Tarjeta Club El País', bankId: 'clubelpais', type: 'debit' },
  { id: 'mercadopago_debit', name: 'Mercado Pago', bankId: 'mercadopago', type: 'debit' },
  { id: 'prex_debit', name: 'Tarjeta Prex', bankId: 'prex', type: 'debit' },
  { id: 'anda_credit', name: 'ANDA Crédito', bankId: 'anda', type: 'credit' },
]

export const BANKOS_BANK_BY_ID: Record<string, BankosBank> = Object.fromEntries(
  BANKOS_BANKS.map(b => [b.id, b])
)
export const BANKOS_CARD_BY_ID: Record<string, BankosCard> = Object.fromEntries(
  BANKOS_CARDS.map(c => [c.id, c])
)

/** One store on the map: a brand location, plus which of the chosen banks discount it. */
export interface BankosDiscountBank {
  bankId: string
  bankName: string
  color: string
  creditDescription: string | null
  debitDescription: string | null
  hasCredit: boolean
  hasDebit: boolean
  /**
   * Weekdays the benefit applies on, ISO-8601: 1 = lunes … 7 = domingo. `null` = every day.
   *
   * The numbering is not documented anywhere — it was verified against the discount text of every
   * row that names its days: 190/190 agreed ("los miércoles, sábados y domingos" → [3,6,7],
   * "de lunes a jueves" → [1,2,3,4]), 0 mismatches. See tests/unit/bankosDays.test.ts.
   */
  availableDays: number[] | null
}
export interface BankosItem {
  locationId: string
  brandId: string
  brandName: string
  categories: string[]
  /** Extra search terms the source carries for some brands (≈375 of them). */
  keywords: string[]
  rating: number
  lat: number
  lng: number
  banks: BankosDiscountBank[]
  /**
   * Issuers that ALSO discount this brand but whose cards you did not select — i.e. the card you
   * would have wanted here. Empty when your selection already covers every issuer for the brand.
   */
  otherBanks: { bankId: string; bankName: string; color: string }[]
}

/** ISO weekday (1 = lunes … 7 = domingo) → label. */
export const BANKOS_DAY_LABELS: Record<number, string> = {
  1: 'lunes',
  2: 'martes',
  3: 'miércoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sábados',
  7: 'domingos',
}

/** Today's ISO weekday (1 = lunes … 7 = domingo) in Montevideo. */
export function isoWeekdayToday(now: Date = new Date()): number {
  // getDay(): 0 = Sunday … 6 = Saturday → ISO 1 = Monday … 7 = Sunday.
  const d = now.getDay()
  return d === 0 ? 7 : d
}

/** Does this bank's benefit apply on `day`? A null/empty `availableDays` means every day. */
export function appliesOnDay(
  bank: Pick<BankosDiscountBank, 'availableDays'>,
  day: number
): boolean {
  const days = bank.availableDays
  if (!days || !days.length) return true
  return days.includes(day)
}

/** "solo miércoles, sábados y domingos" — human label for a day restriction, or '' when daily. */
export function dayRestrictionLabel(days: number[] | null | undefined): string {
  if (!days || !days.length || days.length === 7) return ''
  const names = [...new Set(days)].sort((a, b) => a - b).map(d => BANKOS_DAY_LABELS[d] ?? String(d))
  if (names.length === 1) return `solo ${names[0]}`
  return `solo ${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

export interface BankosDiscountsResponse {
  source: 'live' | 'snapshot' | 'cache'
  generatedAt: string | null
  banks: string[]
  brandsCount: number
  locationsCount: number
  items: BankosItem[]
}

/** Distinct bankIds behind a set of selected card ids. */
export function bankIdsForCards(cardIds: string[]): string[] {
  const out = new Set<string>()
  for (const id of cardIds) {
    const card = BANKOS_CARD_BY_ID[id]
    if (card) out.add(card.bankId)
  }
  return [...out]
}

/** localStorage key for the anonymous card selection. */
export const BANKOS_CARDS_STORAGE_KEY = 'bankos_cards_v1'

/** Keep only known card ids, deduped, in catalog order — used on read from any source. */
export function sanitizeCardIds(input: unknown): string[] {
  const ids = new Set(
    (Array.isArray(input) ? input : []).filter(
      (id): id is string => typeof id === 'string' && id in BANKOS_CARD_BY_ID
    )
  )
  return BANKOS_CARDS.filter(c => ids.has(c.id)).map(c => c.id)
}

/** Union of two card-id lists (both sanitized), so login never loses a selection. */
export function mergeCardIds(a: unknown, b: unknown): string[] {
  return sanitizeCardIds([...sanitizeCardIds(a), ...sanitizeCardIds(b)])
}

/** localStorage key for the anonymous favourites. */
export const BANKOS_FAVORITES_STORAGE_KEY = 'bankos_favorites_v1'
/** Bound the stored list: favourites are a shortlist, not a second copy of the catalog. */
export const BANKOS_MAX_FAVORITES = 300

/**
 * Keep plausible Bankos locationIds only, deduped and capped.
 *
 * Unlike cards there is no fixed catalog to validate against (locationIds come from the live
 * feed), so this validates SHAPE: a non-empty, reasonably short string.
 */
export function sanitizeFavoriteIds(input: unknown): string[] {
  const seen = new Set<string>()
  for (const id of Array.isArray(input) ? input : []) {
    if (typeof id !== 'string') continue
    const trimmed = id.trim()
    if (!trimmed || trimmed.length > 120) continue
    seen.add(trimmed)
    if (seen.size >= BANKOS_MAX_FAVORITES) break
  }
  return [...seen]
}

/** Union of two favourite lists, so logging in never drops what you starred while logged out. */
export function mergeFavoriteIds(a: unknown, b: unknown): string[] {
  return sanitizeFavoriteIds([...sanitizeFavoriteIds(a), ...sanitizeFavoriteIds(b)])
}
