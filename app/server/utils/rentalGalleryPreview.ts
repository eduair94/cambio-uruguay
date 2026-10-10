import { rentalGalleryPreview } from '../../utils/rentalPresentation'
import type { RentalListItem, RentalOffer, RentalProperty } from '../../utils/rentals'

/**
 * The card carousel's photos for ONE page of results, read after the search has paginated.
 *
 * The search itself never loads `details`: its projection (`rentalPublicPropertyProjection`) is
 * shared with the household search, the budget planner and the alerts, and the household catalogue
 * sat at 48 MB against a 64 MB cap on 2026-10-09. So the photos come from a second, tiny read by
 * the ~24 keys already chosen — nothing else carries a byte more, and the sort buffer neither.
 */
export const rentalGalleryProjection = {
  _id: 0,
  key: 1,
  'offers.listingId': 1,
  'offers.details.images': 1,
} as const

export interface RentalGalleryRow {
  key?: unknown
  offers?: Array<{ listingId?: unknown; details?: { images?: unknown } | null }> | null
}

/**
 * Only the adverts the search already made public lend their photos: a stale offer still sitting in
 * the document is not on the card, so its pictures are not either. Order and dedup are those of
 * `rentalPhotos`, the same as the viewer and the property page.
 */
export function withRentalGalleryPreviews(
  items: RentalProperty[],
  rows: readonly RentalGalleryRow[]
): RentalListItem[] {
  const images = new Map<string, string[]>()
  for (const row of rows) {
    if (typeof row?.key !== 'string' || !Array.isArray(row.offers)) continue
    for (const offer of row.offers) {
      const list = offer?.details?.images
      if (typeof offer?.listingId !== 'string' || !Array.isArray(list)) continue
      images.set(
        `${row.key}\n${offer.listingId}`,
        list.filter((url): url is string => typeof url === 'string')
      )
    }
  }
  return items.map(item => {
    const withImages = (offer: RentalOffer): RentalOffer => {
      const list = images.get(`${item.key}\n${offer.listingId}`)
      if (!list?.length) return offer
      return {
        ...offer,
        details: {
          description: '',
          builtArea: null,
          totalArea: null,
          landArea: null,
          terraceArea: null,
          amenities: [],
          guaranteeText: '',
          ...offer.details,
          images: list,
        },
      }
    }
    const preview = rentalGalleryPreview({
      offers: item.offers.map(withImages),
      matchingOffer: item.matchingOffer ? withImages(item.matchingOffer) : undefined,
    })
    return { ...item, galleryPreview: preview.photos, photoCount: preview.total }
  })
}
