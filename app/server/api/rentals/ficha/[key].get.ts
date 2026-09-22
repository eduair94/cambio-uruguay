import { publicRentalAdvertisers, rentalDetailStages } from '../../../utils/rentalDetail'
import { RentalListingModel } from '../../../models/RentalListing'
import { RentalMetaModel } from '../../../models/RentalMeta'
import { connectDb } from '../../../utils/db'
import { marketHistory, rentalAdvertId } from '../../../utils/priceHistory'
import { loadRentalIndexAllowlist } from '../../../utils/rentalIndexAllowlist'
import { withRentalIndexHygiene } from '../../../../utils/rentalIndexHygiene'

import {
  annotateRentalAvailability,
  loadRentalAvailabilityIndex,
} from '../../../utils/rentalAvailability'
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
  rentalValidKey,
  type RentalPublicProperty,
} from '../../../../utils/rentals'
import type { RentalPageResponse } from '../../../../utils/rentalPage'

/** A canonical SSR page deliberately ignores list/map query parameters. */
export default defineEventHandler(async (event): Promise<RentalPageResponse> => {
  const key = String(getRouterParam(event, 'key') ?? '').trim()
  // La forma de una key se conoce (`rentalValidKey`): `null`, mayúsculas o 513 letras no abren Mongo.
  if (!rentalValidKey(key)) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Rental property is not available' })
  }
  let page: RentalPageResponse | undefined
  try {
    await connectDb()
    const availability = await loadRentalAvailabilityIndex()
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
      // Higiene del índice (docs/app/RENTALS.md): una ficha con más de 8 semanas de vida y sin
      // demanda medida en Search Console baja a `noindex, follow`. Es la MISMA función que aplica
      // el sitemap, así la página y el sitemap nunca se contradicen; sin lista, o con una lista
      // vencida, no cambia nada.
      page = withRentalIndexHygiene(page, await loadRentalIndexAllowlist())
      page.property = annotateRentalAvailability(
        publicRentalAdvertisers(page.property),
        availability
      )
      page.similar = page.similar.map(row =>
        annotateRentalAvailability(publicRentalAdvertisers(row), availability)
      )
      // Cada AVISO de esta vivienda lleva su propia variación: una vivienda publicada en tres
      // portales son tres precios pedidos distintos, y una sola línea para la propiedad sería un
      // número que nadie publicó. Opcional: si la lectura falla, la ficha sale igual.
      try {
        const advertIds = page.property.offers
          .map(offer => rentalAdvertId(offer.source, offer.listingId))
          .filter((id): id is string => id !== null)
        const history = await marketHistory('alquiler', advertIds)
        const withHistory = <T extends { source: string; listingId: string }>(offer: T): T => {
          const id = rentalAdvertId(offer.source, offer.listingId)
          return id && history.has(id) ? { ...offer, priceHistory: history.get(id)! } : offer
        }
        page.property.offers = page.property.offers.map(withHistory)
        // `matchingOffer` es OTRO objeto, no una referencia a la fila de `offers`, y es el que la
        // ficha muestra por defecto: sin esto la página traía la serie en el payload y no la dibujaba
        // nunca (medido en producción el 2026-09-22).
        if (page.property.matchingOffer) page.property.matchingOffer = withHistory(page.property.matchingOffer)
      } catch (error) {
        console.error('[api/rentals/ficha] price history failed', error)
      }
    }
  } catch (error) {
    console.error('[api/rentals/ficha] failed', error)
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Rental page is temporarily unavailable',
      // The public JSON stays generic; the report keeps what actually failed.
      cause: error,
    })
  }
  if (!page) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Rental property is not available' })
  }
  setResponseHeader(event, 'cache-control', 'public, max-age=30, s-maxage=60')
  return page
})
