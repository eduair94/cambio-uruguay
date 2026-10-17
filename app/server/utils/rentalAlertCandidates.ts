/**
 * The one place the engine asks "what is in this catalogue" and "which of these ids does this
 * search still match", for every saved-search kind. Price-drop ids resolve to their advert and are
 * sent only while the advert still has the dropped price.
 */
import { isListingAlertKind, kindSupportsPriceDrops } from '../../utils/listingAlerts'
import {
  rentalAlertFiltersCurrent,
  type RentalAlertCandidate,
  type RentalAlertFilters,
  type RentalAlertKind,
} from '../../utils/rentalAlerts'
import { matchListingAlertCandidates, readListingAlertInventory } from './listingAlertSources'
import {
  matchRentalAlertCandidates,
  readRentalAlertInventory,
  type RentalAlertInventory,
} from './rentalAlertMatching'
import { isRentalAlertDropId, parseRentalAlertDropId } from './rentalAlertPrices'

export function readAlertInventory(
  kind: RentalAlertKind,
  now = Date.now(),
  guard: () => Promise<void> = async () => {}
): Promise<RentalAlertInventory> {
  return isListingAlertKind(kind)
    ? readListingAlertInventory(kind, guard)
    : readRentalAlertInventory(kind, now, guard)
}

/** Subscriptions stored before drops existed have no field: they never consented to them. */
export function alertWantsPriceDrops(alert: {
  kind: RentalAlertKind
  priceDrops?: boolean
}): boolean {
  return alert.priceDrops === true && kindSupportsPriceDrops(alert.kind)
}

/** Mongoose `minimize` dropped the empty filters of unfiltered alerts created before the fix. */
export function alertWithStoredFilters<T extends { filters?: RentalAlertFilters | null }>(
  alert: T
): T & { filters: RentalAlertFilters } {
  return { ...alert, filters: alert.filters ?? {} }
}

export function alertFiltersCurrent(alert: { kind: RentalAlertKind; filters: unknown }): boolean {
  return rentalAlertFiltersCurrent(alert.kind, alert.filters)
}

/** New adverts always; a drop only with consent, and only if found after consent was given. */
export function alertEventWanted(
  alert: { kind: RentalAlertKind; priceDrops?: boolean; priceDropsFrom?: Date | null },
  event: { candidateId: string; discoveredAt: Date }
): boolean {
  if (!isRentalAlertDropId(event.candidateId)) return true
  if (!alertWantsPriceDrops(alert)) return false
  return (
    !alert.priceDropsFrom ||
    new Date(event.discoveredAt).getTime() > new Date(alert.priceDropsFrom).getTime()
  )
}

export async function matchAlertCandidates(
  kind: RentalAlertKind,
  filters: RentalAlertFilters,
  ids: string[],
  options: { priceDrops: boolean; now?: number }
): Promise<RentalAlertCandidate[]> {
  const now = options.now ?? Date.now()
  const wantDrops = options.priceDrops && kindSupportsPriceDrops(kind)
  const drops = new Map<string, NonNullable<ReturnType<typeof parseRentalAlertDropId>>>()
  const bases = new Set<string>()
  for (const id of ids) {
    if (!isRentalAlertDropId(id)) {
      bases.add(id)
      continue
    }
    const drop = wantDrops ? parseRentalAlertDropId(id) : null
    if (!drop) continue
    drops.set(id, drop)
    bases.add(drop.base)
  }
  if (!bases.size) return []
  const matched = isListingAlertKind(kind)
    ? await matchListingAlertCandidates(kind, filters, [...bases], now)
    : await matchRentalAlertCandidates(kind, filters, [...bases], now)
  const byId = new Map(matched.map(candidate => [candidate.id, candidate]))
  const result: RentalAlertCandidate[] = []
  for (const id of ids) {
    const drop = drops.get(id)
    if (!drop) {
      const current = isRentalAlertDropId(id) ? undefined : byId.get(id)
      if (current) result.push(current)
      continue
    }
    const current = byId.get(drop.base)
    // A later change (up, or another drop with its own event) means this event no longer describes it.
    if (
      current &&
      current.price.amount === drop.price.amount &&
      current.price.currency === drop.price.currency
    )
      result.push({ ...current, id, previousPrice: drop.previous })
  }
  return result
}

/** One card per property (rentals group offers) or advert; a drop wins over the plain "new". */
export function groupAlertCandidates(candidates: RentalAlertCandidate[]): RentalAlertCandidate[] {
  const groups = new Map<string, RentalAlertCandidate>()
  for (const candidate of candidates) {
    const group = candidate.propertyKey || candidate.id
    const existing = groups.get(group)
    if (!existing || (candidate.previousPrice && !existing.previousPrice))
      groups.set(group, candidate)
  }
  return [...groups.values()]
}
