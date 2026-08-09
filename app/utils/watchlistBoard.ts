// Turns a person's watchlist plus today's market into their board.
//
// PURE module (no Vue/Nuxt runtime) so every rule below is unit-tested in plain
// Node — in particular the reach rule, which is the one that decides whether
// someone in Rivera sees anything at all.
//
// Reach follows the CHANNEL of the quote, not the branch list:
//   - `online`     (eBROU, bank TRANSFERENCIA, Prex/OCA) works from anywhere in
//                  the country, so it is never filtered by distance.
//   - `presencial` (a counter you walk up to) needs a branch inside the zone.
// Filtering everything by distance would hide exactly the providers that serve
// the interior best. See `utils/exchangeChannel.ts` for the channel rules this
// module reuses rather than restates.

import { sameDepartment, departmentsInclude } from './departments'
import {
  channelForRate,
  operationForRate,
  requiresAccount,
  type ExchangeChannel,
  type OperationKind,
} from './exchangeChannel'
import { haversineKm, type LatLng } from './nearbyRates'
import { isPublicRate } from './rateSource'
import { estimateIntlCost, getDebitCard, type DebitCard, type IntlCostResult } from './debitCards'
import type { Watchlist, WatchZone } from './watchlist'

/** The branch fields the board needs — a structural subset of `MapBranch`. */
export interface WatchBranch {
  origin: string
  dept: string
  locality: string
  lat: number
  lng: number
  name?: string
  address?: string
  mapUrl?: string
}

/** The rate fields the board needs — a structural subset of `ExchangeRate`. */
export interface WatchRateRow {
  origin: string
  code: string
  type?: string | null
  buy?: number | null
  sell?: number | null
  name?: string
}

/** One locality of a department, with how many branches sit in it. */
export interface LocalityOption {
  locality: string
  count: number
}

/** One selectable house in the picker, already resolved against the user's zone. */
export interface OriginOption {
  origin: string
  name: string
  /** Reachable from anywhere in the country (app / transfer), so distance is moot. */
  national: boolean
  distanceKm: number | null
}

/** One quote on the user's board. */
export interface BoardRow {
  /** Stable identity of the quote: origin + type + currency. */
  key: string
  origin: string
  code: string
  type: string
  buy: number | null
  sell: number | null
  /** The price for the direction the user picked — what `best` and drift use. */
  price: number
  channel: ExchangeChannel
  operation: OperationKind
  requiresAccount: boolean
  /** Distance to the nearest branch in km, or null for a nationwide quote. */
  distanceKm: number | null
  /** The nearest branch behind a counter quote, when we have one mapped. */
  branch: WatchBranch | null
  /** Best price for this currency among the rows on this board. */
  best: boolean
  /** Price seen on the previous visit, or null the first time. */
  prev: number | null
  /** Move since the previous visit, in %, or null the first time. */
  deltaPct: number | null
}

export interface BoardInput {
  branches: readonly WatchBranch[]
  rates: readonly WatchRateRow[]
  watchlist: Watchlist
  /**
   * Departments each origin publishes in `localData`. Used as the fallback in
   * department mode for a house whose branches are not geocoded yet — without
   * it those houses would vanish from the very departments they serve.
   */
  departmentsByOrigin?: Readonly<Record<string, readonly string[]>>
}

/** Last-seen price per {@link BoardRow.key}. */
export type WatchSnapshot = Record<string, number>

// ─────────────────────────────────────────────────────────────────────────────
// Zone helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Localities of one department with their branch counts, busiest first. Feeds
 * the "mi ciudad" selector, so the options are always places that really have
 * somewhere to change money.
 */
export function localitiesForDepartment(
  branches: readonly WatchBranch[],
  department: string
): LocalityOption[] {
  const counts = new Map<string, number>()
  for (const b of branches) {
    if (!sameDepartment(b.dept ?? '', department)) continue
    const locality = (b.locality ?? '').trim()
    if (!locality) continue
    counts.set(locality, (counts.get(locality) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([locality, count]) => ({ locality, count }))
    .sort((a, b) => b.count - a.count || a.locality.localeCompare(b.locality, 'es'))
}

function centroid(points: readonly LatLng[]): LatLng | null {
  if (!points.length) return null
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length
  return { lat, lng }
}

/**
 * Centre of a locality, derived from the branches actually mapped there. We
 * never ship hand-written town coordinates: if the data does not place it, the
 * user geolocates instead.
 */
export function localityCenter(
  branches: readonly WatchBranch[],
  department: string,
  locality: string
): LatLng | null {
  const target = locality.trim().toLowerCase()
  return centroid(
    branches
      .filter(b => sameDepartment(b.dept ?? '', department))
      .filter(b => (b.locality ?? '').trim().toLowerCase() === target)
      .map(b => ({ lat: b.lat, lng: b.lng }))
  )
}

/** Centre of a zone: the point itself, or the centroid of a department's branches. */
export function zoneCenter(
  branches: readonly WatchBranch[],
  zone: WatchZone | null
): LatLng | null {
  if (!zone) return null
  if (zone.mode === 'point') {
    return typeof zone.lat === 'number' && typeof zone.lng === 'number'
      ? { lat: zone.lat, lng: zone.lng }
      : null
  }
  return centroid(
    branches
      .filter(b => sameDepartment(b.dept ?? '', zone.department ?? ''))
      .map(b => ({ lat: b.lat, lng: b.lng }))
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Board
// ─────────────────────────────────────────────────────────────────────────────

function branchesOf(branches: readonly WatchBranch[], origin: string): WatchBranch[] {
  return branches.filter(
    b => b.origin === origin && Number.isFinite(b.lat) && Number.isFinite(b.lng)
  )
}

/** Nearest branch of an origin to a point, or null when it has none mapped. */
function nearestBranch(
  branches: readonly WatchBranch[],
  origin: string,
  center: LatLng
): { branch: WatchBranch; distanceKm: number } | null {
  let best: { branch: WatchBranch; distanceKm: number } | null = null
  for (const b of branchesOf(branches, origin)) {
    const distanceKm = haversineKm(center, { lat: b.lat, lng: b.lng })
    if (!best || distanceKm < best.distanceKm) best = { branch: b, distanceKm }
  }
  return best
}

/**
 * Build the board: today's quotes the user can actually take, in their zone,
 * limited to what they follow, sorted best-first per currency.
 */
export function buildWatchlistBoard(input: BoardInput): BoardRow[] {
  const { branches, rates, watchlist } = input
  const followed = new Set(watchlist.origins)
  const currencies = new Set(watchlist.currencies)
  const direction = watchlist.direction
  const zone = watchlist.zone
  const center = zoneCenter(branches, zone)
  const radiusKm = zone?.mode === 'point' ? (zone.radiusKm ?? 5) : Infinity

  const rows: BoardRow[] = []
  for (const r of rates) {
    if (!r?.origin || !r.code) continue
    if (!currencies.has(r.code)) continue
    if (followed.size && !followed.has(r.origin)) continue
    // Never board a price nobody can transact at (BCU reference, interbank).
    if (!isPublicRate(r)) continue

    const type = r.type ?? ''
    const buy = typeof r.buy === 'number' && r.buy > 0 ? r.buy : null
    const sell = typeof r.sell === 'number' && r.sell > 0 ? r.sell : null
    const price = direction === 'buy' ? buy : sell
    if (price === null) continue

    const channel = channelForRate(r.origin, type)

    let distanceKm: number | null = null
    let branch: WatchBranch | null = null
    if (channel === 'presencial' && zone) {
      if (zone.mode === 'department') {
        const hasBranchHere = branchesOf(branches, r.origin).some(b =>
          sameDepartment(b.dept ?? '', zone.department ?? '')
        )
        const publishesHere = departmentsInclude(
          input.departmentsByOrigin?.[r.origin],
          zone.department ?? ''
        )
        if (!hasBranchHere && !publishesHere) continue
        if (center) {
          const near = nearestBranch(branches, r.origin, center)
          if (near) {
            distanceKm = near.distanceKm
            branch = near.branch
          }
        }
      } else if (center) {
        const near = nearestBranch(branches, r.origin, center)
        if (!near || near.distanceKm > radiusKm) continue
        distanceKm = near.distanceKm
        branch = near.branch
      }
    }

    rows.push({
      key: `${r.origin}|${type}|${r.code}`,
      origin: r.origin,
      code: r.code,
      type,
      buy,
      sell,
      price,
      channel,
      operation: operationForRate(r.origin, type),
      requiresAccount: requiresAccount(r.origin, type),
      distanceKm,
      branch,
      best: false,
      prev: null,
      deltaPct: null,
    })
  }

  // One `best` per currency: the highest buy when the user is selling foreign
  // currency, the lowest sell when they are buying it.
  for (const code of new Set(rows.map(r => r.code))) {
    const ofCode = rows.filter(r => r.code === code)
    const bestPrice =
      direction === 'buy'
        ? Math.max(...ofCode.map(r => r.price))
        : Math.min(...ofCode.map(r => r.price))
    const winner = ofCode.find(r => r.price === bestPrice)
    if (winner) winner.best = true
  }

  return rows.sort(
    (a, b) =>
      a.code.localeCompare(b.code) ||
      (direction === 'buy' ? b.price - a.price : a.price - b.price) ||
      (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
  )
}

/** Freeze today's prices so the next visit can show what moved. */
export function takeSnapshot(rows: readonly BoardRow[]): WatchSnapshot {
  const snap: WatchSnapshot = {}
  for (const r of rows) snap[r.key] = r.price
  return snap
}

/** Attach the previous price and the move since then to each row. */
export function applyDrift(rows: readonly BoardRow[], snapshot: WatchSnapshot): BoardRow[] {
  return rows.map(r => {
    const prev = snapshot?.[r.key]
    if (typeof prev !== 'number' || !(prev > 0)) return { ...r, prev: null, deltaPct: null }
    return { ...r, prev, deltaPct: (r.price / prev - 1) * 100 }
  })
}

/** A snapshot as persisted: the prices plus when they were frozen. */
export interface StoredSnapshot {
  at: number
  prices: WatchSnapshot
}

/**
 * How long a snapshot stays the reference for "desde tu última visita".
 *
 * Overwriting on every page load would make the deltas always read ~0 — a
 * reload two minutes later would erase the morning's move. Six hours keeps the
 * comparison meaningful within a day while still moving forward on its own.
 */
export const SNAPSHOT_TTL_MS = 6 * 60 * 60 * 1000

/** Parse a persisted snapshot, dropping entries that are not usable prices. */
export function sanitizeStoredSnapshot(raw: unknown): StoredSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const at = Number(o.at)
  if (!Number.isFinite(at)) return null
  const prices: WatchSnapshot = {}
  const rawPrices = o.prices
  if (rawPrices && typeof rawPrices === 'object' && !Array.isArray(rawPrices)) {
    for (const [key, value] of Object.entries(rawPrices as Record<string, unknown>)) {
      const n = Number(value)
      if (Number.isFinite(n) && n > 0) prices[key] = n
    }
  }
  return { at, prices }
}

/** True when today's prices should replace the stored reference. */
export function shouldRefreshSnapshot(stored: StoredSnapshot | null, now: number): boolean {
  if (!stored) return true
  const age = now - stored.at
  // A negative age means the clock moved (travel, manual change): re-baseline
  // rather than report deltas against a future snapshot.
  return age < 0 || age > SNAPSHOT_TTL_MS
}

// ─────────────────────────────────────────────────────────────────────────────
// Cards
// ─────────────────────────────────────────────────────────────────────────────

/** What one of the user's cards would cost for the reference purchase. */
export interface CardCost {
  card: DebitCard
  cost: IntlCostResult
  /** The issuer publishes no commission figure — the total is a floor, not a quote. */
  unknownFee: boolean
}

/**
 * Cost of the same USD purchase on each card the user carries, cheapest first.
 *
 * Returns nothing when there is no selling rate to convert with: an invented
 * rate would produce a confident, wrong number.
 */
export function rankCardCosts(
  cardIds: readonly string[],
  amountUsd: number,
  fxVenta: number,
  fxMid?: number
): CardCost[] {
  if (!(fxVenta > 0) || !(amountUsd > 0)) return []
  return cardIds
    .map(id => getDebitCard(id))
    .filter((c): c is DebitCard => !!c)
    .map(card => ({
      card,
      cost: estimateIntlCost({ purchaseUsd: amountUsd, card, fxVenta, fxMid }),
      unknownFee: card.comisionExteriorPct === null,
    }))
    .sort((a, b) => a.cost.totalPesos - b.cost.totalPesos || a.card.name.localeCompare(b.card.name))
}
