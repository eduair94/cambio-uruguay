// Data model for `/pizarra` — the zero-friction board.
//
// The page it powers answers "¿a cuánto está el dólar?" in one screen with no
// nav, no cookie banner, no third-party script and no JavaScript requirement,
// the way dolar.uy does — and then shows the whole market underneath, which
// dolar.uy does not.
//
// "Sin restricciones" is literal here: unlike the home page and the converter,
// NOTHING is filtered out. The BCU reference, the interbank/wholesale quotes
// and the conditional ones (eBROU, Prex) are all listed, each labelled for what
// it is, so the page never silently hides a number a reader came looking for.
//
// PURE (no Vue/Nuxt imports) so it is unit-testable in plain Node.

import { offMarketDetector } from './marketOutlier'
import { isPublicRate } from './rateSource'

/** The four currencies the board shows, in display order. */
export const BOARD_CURRENCIES = ['USD', 'EUR', 'BRL', 'ARS'] as const
export type BoardCurrency = (typeof BOARD_CURRENCIES)[number]

/** Minimal row shape: what the processed `/` payload gives us per quote. */
export interface PizarraRow {
  origin: string
  code: string
  type?: string | null
  buy?: number
  sell?: number
  /** Wholesale/reference marker set by the API service. */
  isInterBank?: boolean
  /** Non-empty when the quote needs a condition met (eBROU, Prex account…). */
  condition?: string
  localData?: { name?: string } | null
}

/** One side of the headline board: the market's best price and who offers it. */
export interface BoardSide {
  /** Price, or null when nobody publishes one. */
  value: number | null
  /** Origin id behind the price (for the /casa link). */
  origin: string | null
  /** Display name of that house. */
  name: string | null
}

/** A currency's headline row on the board. */
export interface BoardEntry {
  code: BoardCurrency
  /** Best price at which a house BUYS the currency from you — the highest. */
  buy: BoardSide
  /** Best price at which a house SELLS it to you — the lowest. */
  sell: BoardSide
}

const emptySide = (): BoardSide => ({ value: null, origin: null, name: null })

const houseName = (row: PizarraRow): string => row.localData?.name?.trim() || row.origin

/**
 * Headline board: per currency, the best buy and the best sell in the market.
 *
 * Two things are deliberately excluded even on the "unrestricted" page:
 *
 * - Non-public quotes. A headline advertising the BCU reference or an interbank
 *   price would be a number no reader can actually get.
 * - Off-market quotes. The best buy and the best sell come from DIFFERENT
 *   houses, so one stale board is enough to print an inverted spread — live,
 *   the board read "compra 40,20 / venta 39,55" because a single casa's whole
 *   pizarra sat ~5% low. Both are still listed in the table below, labelled.
 *
 * The full, nothing-hidden view is {@link buildComparison}.
 */
export function buildBoard(rows: readonly PizarraRow[]): BoardEntry[] {
  return BOARD_CURRENCIES.map(code => {
    const entry: BoardEntry = { code, buy: emptySide(), sell: emptySide() }
    const candidates = rows.filter(r => r.code === code && isPublicRate(r))
    const isOffMarket = offMarketDetector(candidates)

    for (const row of candidates) {
      if (isOffMarket(row)) continue
      if (typeof row.buy === 'number' && row.buy > 0) {
        if (entry.buy.value === null || row.buy > entry.buy.value) {
          entry.buy = { value: row.buy, origin: row.origin, name: houseName(row) }
        }
      }
      if (typeof row.sell === 'number' && row.sell > 0) {
        if (entry.sell.value === null || row.sell < entry.sell.value) {
          entry.sell = { value: row.sell, origin: row.origin, name: houseName(row) }
        }
      }
    }
    return entry
  })
}

/** What kind of quote a row is, for the label beside it in the full table. */
export type QuoteKind = 'cash' | 'conditional' | 'wholesale' | 'official'

/** Classify a row so nothing is hidden but nothing is mistaken for cash either. */
export function quoteKind(row: PizarraRow): QuoteKind {
  if (row.origin === 'bcu') return 'official'
  if (row.isInterBank) return 'wholesale'
  if (row.condition) return 'conditional'
  return 'cash'
}

/** A single line of the unrestricted comparison table. */
export interface ComparisonRow {
  origin: string
  name: string
  code: string
  type: string
  kind: QuoteKind
  buy: number | null
  sell: number | null
  /** True when this is the market's best buy for its currency (cash only). */
  bestBuy: boolean
  /** True when this is the market's best sell for its currency (cash only). */
  bestSell: boolean
}

/** The full market for one currency, best-first, nothing filtered out. */
export interface ComparisonGroup {
  code: string
  rows: ComparisonRow[]
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null

/**
 * Every quote in the market, grouped by currency and sorted cheapest-sell
 * first, with the wholesale/official/conditional ones kept and labelled.
 *
 * `bestBuy`/`bestSell` are computed over publicly-obtainable quotes only, so
 * the green "best" marker can never land on a price nobody can transact at —
 * the row is still shown, just not crowned.
 */
export function buildComparison(rows: readonly PizarraRow[]): ComparisonGroup[] {
  const byCode = new Map<string, ComparisonRow[]>()

  for (const row of rows) {
    const buy = num(row.buy)
    const sell = num(row.sell)
    if (buy === null && sell === null) continue
    const list = byCode.get(row.code) ?? []
    list.push({
      origin: row.origin,
      name: houseName(row),
      code: row.code,
      type: row.type ?? '',
      kind: quoteKind(row),
      buy,
      sell,
      bestBuy: false,
      bestSell: false,
    })
    byCode.set(row.code, list)
  }

  const groups: ComparisonGroup[] = []
  for (const [code, list] of byCode) {
    const obtainable = list.filter(r => r.kind === 'cash' || r.kind === 'conditional')
    const bestBuy = Math.max(...obtainable.map(r => r.buy ?? -Infinity))
    const bestSell = Math.min(...obtainable.map(r => r.sell ?? Infinity))
    for (const r of list) {
      if (r.kind === 'wholesale' || r.kind === 'official') continue
      if (r.buy !== null && r.buy === bestBuy) r.bestBuy = true
      if (r.sell !== null && r.sell === bestSell) r.bestSell = true
    }
    // Cheapest sell first; rows without a sell price sink, ties break by name
    // so the order is stable across renders.
    list.sort(
      (a, b) => (a.sell ?? Infinity) - (b.sell ?? Infinity) || a.name.localeCompare(b.name, 'es')
    )
    groups.push({ code, rows: list })
  }

  // Board currencies first, in board order; anything else after, alphabetically.
  const rank = (code: string) => {
    const i = (BOARD_CURRENCIES as readonly string[]).indexOf(code)
    return i === -1 ? BOARD_CURRENCIES.length : i
  }
  groups.sort((a, b) => rank(a.code) - rank(b.code) || a.code.localeCompare(b.code))
  return groups
}

/** Upper bound on the calculator amount — keeps a hostile `?c=` harmless. */
export const MAX_AMOUNT = 1_000_000_000

/**
 * Read the calculator amount out of `?c=`, the way dolar.uy does.
 *
 * Accepts both `1234.5` and the Uruguayan `1234,5`. Anything unparseable,
 * negative or absurd falls back to 1, so the page always renders a board
 * instead of `NaN` — it has to survive being linked to with junk in the query.
 */
export function parseAmount(raw: unknown): number {
  const text = Array.isArray(raw) ? raw[0] : raw
  if (typeof text !== 'string' && typeof text !== 'number') return 1
  const normalized = String(text).trim().replace(/\s/g, '').replace(',', '.')
  if (!normalized) return 1
  const n = Number(normalized)
  if (!Number.isFinite(n) || n <= 0) return 1
  return Math.min(n, MAX_AMOUNT)
}

/** Multiply a board by the calculator amount (dolar.uy's `?c=` behaviour). */
export function scaleBoard(board: readonly BoardEntry[], amount: number): BoardEntry[] {
  return board.map(entry => ({
    ...entry,
    buy: { ...entry.buy, value: entry.buy.value === null ? null : entry.buy.value * amount },
    sell: { ...entry.sell, value: entry.sell.value === null ? null : entry.sell.value * amount },
  }))
}
