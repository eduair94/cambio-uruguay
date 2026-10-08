import { RentalListingModel } from '../../models/RentalListing'
import { connectDb } from '../../utils/db'
import { loadRentalAvailabilityIndex } from '../../utils/rentalAvailability'
import { rentalSavedChangeKeys, type RentalSavedCurrent } from '../../../utils/rentalSavedChanges'
import {
  RENTAL_COLLATION,
  RENTAL_STALE_DAYS,
  normalizeRentalQuery,
  rentalPublicStages,
} from '../../../utils/rentals'

/**
 * Today's public adverts of the properties saved in a browser (`?keys=a,b,c`, at most 60), so the
 * saved list can say "bajó $ 2.000 desde que la guardaste" or "ya no aparece". The same public
 * stages as the directory —current adverts only, reported-rented adverts out— on the unique key
 * index: a key that comes back with nothing is not on the market the directory shows. Only what the
 * comparison needs leaves: source, url, price and currency of each advert.
 */
export default defineEventHandler(async (event): Promise<{ items: RentalSavedCurrent[] }> => {
  const keys = rentalSavedChangeKeys(String(getQuery(event).keys ?? '').split(','))
  if (!keys.length) return { items: [] }
  try {
    await connectDb()
    const availability = await loadRentalAvailabilityIndex()
    const excluded = availability.excludedAdvertIds(normalizeRentalQuery({}).availability)
    const items = await RentalListingModel.aggregate<RentalSavedCurrent>([
      ...rentalPublicStages({ key: { $in: keys } }, RENTAL_STALE_DAYS, excluded),
      {
        $project: {
          _id: 0,
          key: 1,
          'offers.source': 1,
          'offers.url': 1,
          'offers.price': 1,
          'offers.currency': 1,
        },
      },
    ]).collation(RENTAL_COLLATION)
    setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=300')
    return { items }
  } catch (error) {
    console.error('[api/rentals/guardadas] failed', error)
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Saved rentals are temporarily unavailable',
      cause: error,
    })
  }
})
