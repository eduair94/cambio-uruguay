import type { RentalAlertKind, RentalAlertMoney } from '../../utils/rentalAlerts'
import type { RentalAlertEventDoc } from '../models/RentalAlertEvent'
import { RentalAlertEventModel } from '../models/RentalAlertEvent'
import { RentalAlertPriceModel, type RentalAlertPriceDoc } from '../models/RentalAlertPrice'

/** A cut smaller than this is noise (rounding, a fee moved into the price). */
export const RENTAL_ALERT_DROP_MIN = 0.01
/** A fall bigger than this is far likelier a misread amount or currency than a real price cut. */
export const RENTAL_ALERT_DROP_MAX = 0.5
/** The mirror of DROP_MAX: a price this many times the floor restarts the advert's history. */
export const RENTAL_ALERT_RESET_RATIO = 2

export interface RentalAlertSeenPrice {
  amount: number
  currency: 'UYU' | 'USD'
  low: number
}

/**
 * One observation of an advert's price. Drops are measured against the LOWEST price seen, not the
 * previous one: an advert that goes up 10 % and back down 10 % did not get cheaper.
 */
export function rentalAlertPriceStep(
  seen: RentalAlertSeenPrice | null,
  current: RentalAlertMoney
): { next: RentalAlertSeenPrice; drop: RentalAlertMoney | null; changed: boolean } {
  const fresh = { amount: current.amount, currency: current.currency, low: current.amount }
  if (!seen || seen.currency !== current.currency) return { next: fresh, drop: null, changed: true }
  if (seen.amount === current.amount) return { next: seen, drop: null, changed: false }
  // More than double the floor: either the floor was a misread (a lost digit) or this is one.
  // Starting over silently keeps a misread from disabling drops for the advert forever.
  if (current.amount > seen.low * RENTAL_ALERT_RESET_RATIO)
    return { next: fresh, drop: null, changed: true }
  const isDrop =
    current.amount < seen.low * (1 - RENTAL_ALERT_DROP_MIN) &&
    current.amount >= seen.low * (1 - RENTAL_ALERT_DROP_MAX)
  return {
    next: { ...fresh, low: Math.min(seen.low, current.amount) },
    drop: isDrop ? { amount: seen.amount, currency: seen.currency } : null,
    changed: true,
  }
}

const SEPARATOR = '~drop~'
export function rentalAlertDropId(
  base: string,
  price: RentalAlertMoney,
  previous: RentalAlertMoney
): string {
  return `${base}${SEPARATOR}${price.currency}~${price.amount}~${previous.amount}`
}

export function parseRentalAlertDropId(
  id: string
): { base: string; price: RentalAlertMoney; previous: RentalAlertMoney } | null {
  const at = id.indexOf(SEPARATOR)
  if (at <= 0) return null
  const [currency, amount, previous, ...rest] = id.slice(at + SEPARATOR.length).split('~')
  const numbers = [Number(amount), Number(previous)]
  if (
    rest.length ||
    (currency !== 'UYU' && currency !== 'USD') ||
    numbers.some(value => !Number.isFinite(value) || value <= 0)
  )
    return null
  return {
    base: id.slice(0, at),
    price: { amount: numbers[0]!, currency },
    previous: { amount: numbers[1]!, currency },
  }
}

export const isRentalAlertDropId = (id: string): boolean => id.includes(SEPARATOR)

type PriceWrite = {
  updateOne: {
    filter: { _id: string }
    update: { $set: Omit<RentalAlertPriceDoc, '_id'> }
    upsert: true
  }
}

/**
 * Compare one batch of observed prices with the ledger. Returns the drop events that are not in
 * the event ledger yet and the price writes; the caller writes the events FIRST, so a crash between
 * the two re-detects the drop instead of losing it.
 */
export async function planRentalAlertPrices(
  kind: RentalAlertKind,
  ids: string[],
  prices: ReadonlyMap<string, RentalAlertMoney>,
  frontier: Date,
  baseline: boolean
): Promise<{ events: RentalAlertEventDoc[]; writes: PriceWrite[] }> {
  const observed = ids.filter(id => prices.has(id))
  if (!observed.length) return { events: [], writes: [] }
  const stored = new Map(
    (
      (await RentalAlertPriceModel.find({ _id: { $in: observed.map(id => `${kind}:${id}`) } })
        .select({ _id: 1, amount: 1, currency: 1, low: 1 })
        .lean()) as RentalAlertPriceDoc[]
    ).map(row => [row._id, row])
  )
  const events: RentalAlertEventDoc[] = []
  const writes: PriceWrite[] = []
  for (const id of observed) {
    const key = `${kind}:${id}`
    const current = prices.get(id)!
    const step = rentalAlertPriceStep(stored.get(key) ?? null, current)
    if (step.changed)
      writes.push({
        updateOne: {
          filter: { _id: key },
          update: { $set: { ...step.next, seenAt: frontier } },
          upsert: true,
        },
      })
    if (step.drop) {
      const candidateId = rentalAlertDropId(id, current, step.drop)
      events.push({
        _id: `${kind}:${candidateId}`,
        kind,
        candidateId,
        discoveredAt: frontier,
        baseline,
      })
    }
  }
  if (events.length) {
    const known = new Set(
      (
        await RentalAlertEventModel.find({ _id: { $in: events.map(event => event._id) } })
          .select({ _id: 1 })
          .lean()
      ).map(row => row._id)
    )
    return { events: events.filter(event => !known.has(event._id)), writes }
  }
  return { events, writes }
}

export async function writeRentalAlertPrices(writes: PriceWrite[]): Promise<void> {
  if (writes.length) await RentalAlertPriceModel.bulkWrite(writes, { ordered: false })
}
