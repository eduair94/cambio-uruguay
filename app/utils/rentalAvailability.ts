import type { RentalSource } from './rentals'

const SOURCES = new Set(['mercadolibre', 'infocasas', 'facebook', 'elpais', 'casasweb'])

export interface RentalAvailabilitySummary {
  count: number
  lastReportedAt: string | null
  status: 'unconfirmed'
}

export type RentalAvailabilityFilter = 'all' | 'hide_multiple' | 'hide_any'

export interface RentalAvailabilityAdvert {
  source: RentalSource
  listingId: string
}

export interface RentalAvailabilityOwnState {
  revision: string | null
  reported: boolean
  expiresAt: string | null
  canReport: boolean
}

export interface RentalAvailabilityMutation {
  revision: string | null
  summary: RentalAvailabilitySummary
  reported: boolean
  expiresAt: string | null
}

export const RENTAL_AVAILABILITY_DAYS = 30

export function normalizeRentalAvailabilityFilter(value: unknown): RentalAvailabilityFilter {
  return value === 'hide_multiple' || value === 'hide_any' ? value : 'all'
}

export function rentalAvailabilityHidden(
  summary: RentalAvailabilitySummary | undefined,
  filter: RentalAvailabilityFilter
): boolean {
  const count = summary?.count || 0
  return filter === 'hide_any' ? count > 0 : filter === 'hide_multiple' && count >= 2
}

/** A portal advert remains the same event when an index group is split or renamed. */
export function rentalAvailabilityAdvertId(source: unknown, listingId: unknown): string | null {
  if (typeof source !== 'string' || !SOURCES.has(source) || typeof listingId !== 'string')
    return null
  const own = listingId.startsWith(`${source}:`) ? listingId.slice(source.length + 1) : listingId
  return /^[\w-]{1,160}$/.test(own) ? `rent:${source}:${own}` : null
}

export function emptyRentalAvailability(): RentalAvailabilitySummary {
  return { count: 0, lastReportedAt: null, status: 'unconfirmed' }
}
