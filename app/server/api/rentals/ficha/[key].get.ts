import { RentalListingModel } from '../../../models/RentalListing'
import { RentalMetaModel } from '../../../models/RentalMeta'
import { connectDb } from '../../../utils/db'
import { rentalDetailStages } from '../../../utils/rentalDetail'
import {
  buildRentalPage,
  rentalPageEvidenceStages,
  rentalPageIdentityStages,
  rentalPageMarket,
  rentalPageReprice,
  rentalPageSimilarKeys,
  rentalPageSimilarStages,
  type RentalPageEvidence,
  RENTAL_PAGE_STALE_DAYS,
} from '../../../utils/rentalPage'
import {
  RENTAL_COLLATION,
  normalizeRentalQuery,
  type RentalPublicProperty,
} from '../../../../utils/rentals'
import type { RentalPageResponse } from '../../../../utils/rentalPage'

/** A canonical SSR page deliberately ignores list/map query parameters. */
export default defineEventHandler(async (event): Promise<RentalPageResponse> => {
  const key = String(getRouterParam(event, 'key') ?? '').trim()
  if (!key || key.length > 512) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Rental property is not available' })
  }
  let page: RentalPageResponse | undefined
  try {
    await connectDb()
    const meta = await RentalMetaModel.findOne({ key: 'uy-rentals' }).select({ usdUyu: 1 }).lean()
    const usdUyu = Number(meta?.usdUyu) || 0
    const rows = await RentalListingModel.aggregate<RentalPublicProperty>(
      rentalDetailStages(key, normalizeRentalQuery({}), RENTAL_PAGE_STALE_DAYS, usdUyu)
    ).collation(RENTAL_COLLATION)
    const property = rows[0]
    if (property) {
      const stages = rentalPageEvidenceStages(property)
      const [peers, otherOwners] = await Promise.all([
        stages
          ? RentalListingModel.aggregate<RentalPageEvidence>(stages).collation(RENTAL_COLLATION)
          : Promise.resolve([]),
        RentalListingModel.aggregate<{ key: string }>(rentalPageIdentityStages(property)).collation(
          RENTAL_COLLATION
        ),
      ])
      const priced = rentalPageReprice(property, usdUyu)
      const evidence = peers.map(peer => rentalPageReprice(peer, usdUyu))
      const market = rentalPageMarket(priced, evidence)
      const similarKeys = rentalPageSimilarKeys(priced, evidence)
      const similar = similarKeys.length
        ? await RentalListingModel.aggregate<RentalPublicProperty>(
            rentalPageSimilarStages(similarKeys)
          ).collation(RENTAL_COLLATION)
        : []
      page = buildRentalPage(property, similar, usdUyu, otherOwners.length > 0, market)
    }
  } catch (error) {
    console.error('[api/rentals/ficha] failed', error)
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 503, statusMessage: 'Rental page is temporarily unavailable' })
  }
  if (!page) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Rental property is not available' })
  }
  setResponseHeader(event, 'cache-control', 'public, max-age=30, s-maxage=60')
  return page
})
