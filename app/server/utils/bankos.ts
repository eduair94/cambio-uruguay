// Server-only Bankos data layer: fetch the live discount map, cache it in memory, and fall back to
// the backend-written snapshot (`bankossnapshots`) when the live API is down. Credentials are the
// ones baked into the public app bundle (overridable by env); they are not user secrets.
import crypto from 'node:crypto'
import { connectDb } from './db'
import { BankosSnapshotModel, type BankosSnapshotDoc } from '../models/BankosSnapshot'
import { BANKOS_BANK_BY_ID, BANKOS_CARDS, type BankosItem } from '../../utils/bankos'

const BASE = process.env.NUXT_BANKOS_API_BASE || 'https://bankos-backend.onrender.com/api'
const API_KEY = process.env.NUXT_BANKOS_API_KEY || '119524fa7c27f24fc6ac040a319fbe7f'
const SECRET = process.env.NUXT_BANKOS_APP_SECRET || '2eb73b9633fbd9ef2ae77f2e426c712f'
/**
 * The upstream wants the WHOLE card object, not just its bankId.
 *
 * Measured against the live API: `{bankId:'clubelpais'}` returns 0 brands, while the full card
 * `{id:'clubelpais_debit', name, bankId, type:'debit'}` returns 173 (Mercado Pago 10, Prex 3).
 * Sending bare ids silently dropped three issuers from the map and reported them as "no discounts".
 */
const ALL_CARDS_PAYLOAD = BANKOS_CARDS.map(c => ({
  id: c.id,
  name: c.name,
  bankId: c.bankId,
  type: c.type,
}))

type RawData = BankosSnapshotDoc['data']

export interface RawCatalog {
  data: RawData
  /** Where the underlying data came from this fetch. */
  baseSource: 'live' | 'snapshot'
  generatedAt: string | null
}

const TTL_MS = 30 * 60 * 1000 // one live pull serves everyone for 30 min (payload is ~1.9 MB)
let cache: { catalog: RawCatalog; ts: number } | null = null

function signHeaders(path: string): Record<string, string> {
  const nonce = crypto.randomUUID()
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(nonce + path)
    .digest('hex')
  return {
    'X-API-Key': API_KEY,
    'X-Nonce': nonce,
    'X-Signature': signature,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

async function fetchLive(timeoutMs = 12_000): Promise<RawCatalog> {
  const path = '/markers-and-brands'
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: signHeaders(path),
      body: JSON.stringify({ cards: ALL_CARDS_PAYLOAD }),
      signal: ac.signal,
    })
    if (!res.ok) throw new Error(`Bankos live HTTP ${res.status}`)
    const json: any = await res.json()
    const data = json?.data as RawData
    if (!data?.locations || Object.keys(data.locations).length < 100) {
      throw new Error('Bankos live returned a thin payload')
    }
    return { data, baseSource: 'live', generatedAt: new Date().toISOString() }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchSnapshot(): Promise<RawCatalog> {
  await connectDb()
  const doc = await BankosSnapshotModel.findOne({ key: 'latest' }).lean()
  if (!doc?.data?.locations) throw new Error('Bankos: no snapshot available for fallback')
  return {
    data: doc.data as RawData,
    baseSource: 'snapshot',
    generatedAt: doc.generatedAt ? new Date(doc.generatedAt).toISOString() : null,
  }
}

/**
 * The whole-country catalog (all banks), memoised for {@link TTL_MS}. Live first; on any live
 * failure (Render cold-start, timeout, outage) it serves the backend snapshot instead.
 */
export async function getRawCatalog(): Promise<{
  catalog: RawCatalog
  source: 'live' | 'snapshot' | 'cache'
}> {
  if (cache && Date.now() - cache.ts < TTL_MS) {
    return { catalog: cache.catalog, source: 'cache' }
  }
  try {
    const catalog = await fetchLive()
    cache = { catalog, ts: Date.now() }
    return { catalog, source: 'live' }
  } catch (liveErr) {
    try {
      const catalog = await fetchSnapshot()
      // Cache the snapshot too, but briefly, so we retry live sooner than 30 min.
      cache = { catalog, ts: Date.now() - (TTL_MS - 5 * 60 * 1000) }
      return { catalog, source: 'snapshot' }
    } catch (snapErr) {
      throw new Error(
        `Bankos unavailable: live failed (${(liveErr as Error).message}) and no snapshot (${(snapErr as Error).message})`
      )
    }
  }
}

/** Flatten the raw catalog into per-store items for the given banks (deduped by store). */
export function flattenForBanks(data: RawData, bankIds: string[]): BankosItem[] {
  const perBrand = new Map<string, BankosItem['banks']>()
  // Which issuers discount each brand but are NOT among the chosen cards. Bankos answers
  // "Obtén descuento con:" on a miss; we answer it on every store, so the reader always sees the
  // card that would have paid off — without having to search the brand first.
  const selected = new Set(bankIds)
  const othersByBrand = new Map<string, BankosItem['otherBanks']>()
  for (const [bankId, brandMap] of Object.entries(data.bankBrands ?? {})) {
    if (selected.has(bankId)) continue
    const bank = BANKOS_BANK_BY_ID[bankId]
    if (!bank) continue
    for (const brandId of Object.keys(brandMap ?? {})) {
      if (!othersByBrand.has(brandId)) othersByBrand.set(brandId, [])
      othersByBrand.get(brandId)!.push({ bankId, bankName: bank.name, color: bank.color })
    }
  }
  for (const bankId of bankIds) {
    const brandMap = data.bankBrands?.[bankId]
    if (!brandMap) continue
    const bank = BANKOS_BANK_BY_ID[bankId]
    if (!bank) continue
    for (const [brandId, disc] of Object.entries(brandMap)) {
      if (!perBrand.has(brandId)) perBrand.set(brandId, [])
      perBrand.get(brandId)!.push({
        bankId,
        bankName: bank.name,
        color: bank.color,
        creditDescription: disc.creditDescription ?? null,
        debitDescription: disc.debitDescription ?? null,
        hasCredit: !!disc.hasCredit,
        hasDebit: !!disc.hasDebit,
        // ISO weekdays the benefit applies on (1 = lunes .. 7 = domingo); null = every day.
        availableDays: Array.isArray(disc.availableDays)
          ? (disc.availableDays as number[]).filter(n => Number.isInteger(n) && n >= 1 && n <= 7)
          : null,
      })
    }
  }

  const items: BankosItem[] = []
  for (const [brandId, banks] of perBrand) {
    const brand = data.brands?.[brandId]
    const brandName = brand?.name || brandId
    const categories = brand?.categories || []
    const keywords = brand?.keywords || []
    for (const locId of data.brandLocations?.[brandId] || []) {
      const loc = data.locations?.[locId]
      const coords = loc?.location?.coordinates
      if (!coords || coords.length !== 2) continue
      items.push({
        locationId: locId,
        brandId,
        brandName,
        categories,
        keywords,
        otherBanks: othersByBrand.get(brandId) ?? [],
        rating: loc?.rating ?? brand?.avgRating ?? 0,
        lng: coords[0],
        lat: coords[1],
        banks,
      })
    }
  }
  return items
}

/**
 * Igual que {@link flattenForBanks}, pero filtrando por la TARJETA y no por el emisor.
 *
 * EL BUG QUE ARREGLA. La pantalla deja elegir "BROU Débito", pero la consulta viajaba con el
 * emisor pelado (`banks=brou`) y el emisor descuenta con las dos. Medido contra la API viva el
 * 2026-09-02: BROU devuelve 1.224 locales y sólo 193 publican beneficio con débito. Es decir que
 * quien elegía su tarjeta de débito veía 1.031 comercios donde su tarjeta NO sirve — 84 % de
 * ruido, y en la única pantalla del sitio cuya pregunta es "¿me sirve mi tarjeta acá?".
 *
 * Un local entra sólo si alguna de las tarjetas elegidas tiene beneficio ahí, y cada emisor viaja
 * con `matchedKinds`, que es con cuál de los medios de pago del visitante aplica: sin eso la ficha
 * seguiría mostrando el texto de crédito a alguien que sólo tiene la de débito.
 */
export function flattenForCards(data: RawData, cardIds: string[]): BankosItem[] {
  const wanted = new Map<string, Set<'credit' | 'debit'>>()
  for (const card of BANKOS_CARDS) {
    if (!cardIds.includes(card.id)) continue
    const set = wanted.get(card.bankId) ?? new Set<'credit' | 'debit'>()
    set.add(card.type)
    wanted.set(card.bankId, set)
  }
  if (!wanted.size) return []

  const items = flattenForBanks(data, [...wanted.keys()])
  const out: BankosItem[] = []
  for (const item of items) {
    const banks: BankosItem['banks'] = []
    for (const bank of item.banks) {
      const kinds = wanted.get(bank.bankId)
      if (!kinds) continue
      const matched: Array<'credit' | 'debit'> = []
      if (kinds.has('credit') && bank.hasCredit && bank.creditDescription) matched.push('credit')
      if (kinds.has('debit') && bank.hasDebit && bank.debitDescription) matched.push('debit')
      if (!matched.length) continue
      banks.push({ ...bank, matchedKinds: matched })
    }
    if (banks.length) out.push({ ...item, banks })
  }
  return out
}

/** Marcas alcanzables con las tarjetas elegidas, contadas sobre el resultado ya filtrado. */
export function brandCountForCards(data: RawData, cardIds: string[]): number {
  return new Set(flattenForCards(data, cardIds).map(i => i.brandId)).size
}

export function brandCountForBanks(data: RawData, bankIds: string[]): number {
  const set = new Set<string>()
  for (const bankId of bankIds) {
    const bm = data.bankBrands?.[bankId]
    if (bm) for (const b of Object.keys(bm)) set.add(b)
  }
  return set.size
}
