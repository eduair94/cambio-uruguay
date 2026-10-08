import type { RentalSavedFavorite } from './rentalSaved'
import { rentalValidKey, type RentalCurrency, type RentalSource } from './rentals'

/**
 * What became of a saved property since it was saved. The saved list is a snapshot in this browser
 * ("el precio puede cambiar: confirmalo en el aviso"), and the person tracking four apartments had
 * to open each one to learn that two had dropped and one was gone. `/api/rentals/guardadas` returns
 * the public adverts of the saved keys today; this compares them.
 */
export const RENTAL_SAVED_CHANGE_KEYS_LIMIT = 60

export interface RentalSavedCurrentOffer {
  source: RentalSource
  url: string
  price: number
  currency: RentalCurrency
}

export interface RentalSavedCurrent {
  key: string
  offers: RentalSavedCurrentOffer[]
}

export type RentalSavedChange =
  | { status: 'gone' }
  | { status: 'same' }
  | { status: 'unknown' }
  | { status: 'down' | 'up'; from: number; to: number; currency: RentalCurrency }

/**
 * Advert by advert: the SAME url, in the SAME currency — never the headline of one advert against
 * another's, which reads a cheaper second portal as a drop. The saved headline advert decides when
 * it is still published; otherwise the first saved advert that is. A property the public directory
 * no longer returns is gone; one whose saved adverts all left but that kept another is unknown.
 */
export function rentalSavedChange(
  favorite: Pick<RentalSavedFavorite, 'price' | 'currency' | 'offers'>,
  current: RentalSavedCurrent | undefined
): RentalSavedChange {
  if (!current) return { status: 'gone' }
  const pairs = favorite.offers.flatMap(saved => {
    const now = current.offers.find(
      offer => offer.url === saved.url && offer.currency === saved.currency
    )
    return now ? [{ saved, now }] : []
  })
  if (!pairs.length) return { status: 'unknown' }
  const pair =
    pairs.find(
      ({ saved }) => saved.price === favorite.price && saved.currency === favorite.currency
    ) ?? pairs[0]!
  if (pair.now.price === pair.saved.price) return { status: 'same' }
  return {
    status: pair.now.price < pair.saved.price ? 'down' : 'up',
    from: pair.saved.price,
    to: pair.now.price,
    currency: pair.saved.currency,
  }
}

/** The keys worth asking about, valid and unique, at most the saved-list limit. */
export function rentalSavedChangeKeys(keys: readonly unknown[]): string[] {
  return [...new Set(keys.filter(rentalValidKey))].slice(0, RENTAL_SAVED_CHANGE_KEYS_LIMIT)
}
