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
}
export interface BankosItem {
  locationId: string
  brandId: string
  brandName: string
  categories: string[]
  rating: number
  lat: number
  lng: number
  banks: BankosDiscountBank[]
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
