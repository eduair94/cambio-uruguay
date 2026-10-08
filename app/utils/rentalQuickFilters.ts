import type { RentalQuery } from './rentals'

/**
 * Filter shortcuts above the results of /alquileres-uruguay: the filters a renter reaches for most,
 * one tap away. On the phone the panel is long, and the newest ones ("bajó de precio", "nuevos esta
 * semana") lived at its bottom. Only the ones that are OFF are offered: an applied filter already
 * shows as a removable chip, and offering it twice would read as two different things.
 */
export const RENTAL_QUICK_FILTERS = Object.freeze([
  'priceDropped',
  'sinceDays',
  'pets',
  'parking',
  'owner',
] as const)

export type RentalQuickFilter = (typeof RENTAL_QUICK_FILTERS)[number]

export function rentalQuickFilters(query: RentalQuery): RentalQuickFilter[] {
  const on: Record<RentalQuickFilter, boolean> = {
    priceDropped: Boolean(query.priceDropped),
    sinceDays: Boolean(query.sinceDays),
    pets: query.pets,
    parking: query.parking,
    owner: query.owner,
  }
  return RENTAL_QUICK_FILTERS.filter(key => !on[key])
}

/** What the shortcut turns on: the same field (and so the same URL) the filter panel writes. */
export function rentalQuickPatch(key: RentalQuickFilter): Partial<RentalQuery> {
  if (key === 'sinceDays') return { sinceDays: 7 }
  return { [key]: true }
}
