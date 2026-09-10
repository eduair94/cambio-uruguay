import { publicRentalAdvertisers, rentalDetailStages } from '../../../utils/rentalDetail'
import { RentalListingModel } from '../../../models/RentalListing'
import { RentalMetaModel } from '../../../models/RentalMeta'
import { connectDb } from '../../../utils/db'

import {
  annotateRentalAvailability,
  loadRentalAvailabilityIndex,
} from '../../../utils/rentalAvailability'
import {
  RENTAL_COLLATION,
  RENTAL_STALE_DAYS,
  normalizeRentalQuery,
  type RentalPropertyDetailResponse,
  type RentalPublicProperty,
} from '../../../../utils/rentals'

const STALE_DAYS = RENTAL_STALE_DAYS

/** One requested property, never the full records behind thousands of map points. */
export default defineEventHandler(async (event): Promise<RentalPropertyDetailResponse> => {
  const key = String(getRouterParam(event, 'key') ?? '').trim()
  if (!key || key.length > 512) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Rental property is not available' })
  }
  const query = normalizeRentalQuery(getQuery(event) as Record<string, unknown>)
  let property: RentalPublicProperty | undefined
  let usdUyu = 0
  try {
    await connectDb()
    const availability = await loadRentalAvailabilityIndex()
    const meta = await RentalMetaModel.findOne({ key: 'uy-rentals' }).select({ usdUyu: 1 }).lean()
    usdUyu = Number(meta?.usdUyu) || 0
    const rows = await RentalListingModel.aggregate<RentalPublicProperty>(
      rentalDetailStages(
        key,
        query,
        STALE_DAYS,
        usdUyu,
        availability.excludedAdvertIds(query.availability)
      )
    ).collation(RENTAL_COLLATION)
    property = rows[0]
      ? annotateRentalAvailability(publicRentalAdvertisers(rows[0]), availability)
      : undefined
  } catch (error) {
    console.error('[api/rentals/propiedad] failed', error)
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Rental detail is temporarily unavailable',
      // The public JSON stays generic; the report keeps what actually failed.
      cause: error,
    })
  }
  if (!property) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Rental property is not available' })
  }
  setResponseHeader(event, 'cache-control', 'public, max-age=30, s-maxage=60')
  return { property, usdUyu }
})
