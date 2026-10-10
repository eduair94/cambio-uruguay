import { describe, expect, it } from 'vitest'
import {
  RENTAL_CARD_PHOTO_PREVIEW,
  RENTAL_PHOTO_LIMIT,
  rentalCardPhotoRefs,
  rentalGalleryPreview,
  rentalPhotos,
} from '../../utils/rentalPresentation'
import { rentalPublicPropertyProjection } from '../../server/utils/rentalDetail'
import {
  rentalGalleryProjection,
  withRentalGalleryPreviews,
} from '../../server/utils/rentalGalleryPreview'
import type { RentalOffer, RentalProperty } from '../../utils/rentals'

const photo = (source: string, n: number) => `https://img.example.com/${source}/${n}.jpg`
const offer = (source: string, listingId: string, extra: Partial<RentalOffer> = {}) =>
  ({
    source,
    listingId,
    title: `Apartamento ${listingId}`,
    url: `https://www.${source}.com/${listingId}`,
    image: photo(source, 0),
    price: 30000,
    currency: 'UYU',
    priceUyu: 30000,
    ...extra,
  }) as RentalOffer
const property = (offers: RentalOffer[], matchingOffer?: RentalOffer) =>
  ({ key: 'pocitos-1', title: 'Apartamento en Pocitos', offers, matchingOffer }) as RentalProperty
const gallery = (source: string, count: number) =>
  Array.from({ length: count }, (_, n) => photo(source, n))

describe('rentalPhotos: one order for the card, the viewer and the property page', () => {
  it('starts with the advert that matches the filters, which is the card cover', () => {
    const ml = offer('mercadolibre', 'MLU-1')
    const ic = offer('infocasas', 'ic-1', {
      details: { images: gallery('infocasas', 3) } as RentalOffer['details'],
    })
    expect(rentalPhotos(property([ml, ic])).map(p => p.url)[0]).toBe(photo('mercadolibre', 0))
    const urls = rentalPhotos(property([ml, ic], ic)).map(p => p.url)
    expect(urls).toEqual([
      photo('infocasas', 0),
      photo('infocasas', 1),
      photo('infocasas', 2),
      photo('mercadolibre', 0),
    ])
  })

  it('keeps every distinct photo up to the limit, dropping repeats and unsafe URLs', () => {
    const big = offer('infocasas', 'ic-2', {
      details: {
        images: [...gallery('infocasas', 70), 'javascript:alert(1)', photo('infocasas', 3)],
      } as RentalOffer['details'],
    })
    expect(rentalPhotos(property([big]))).toHaveLength(RENTAL_PHOTO_LIMIT)
    expect(RENTAL_PHOTO_LIMIT).toBeGreaterThan(24)
  })
})

describe('rentalGalleryPreview: what a search card carries', () => {
  it('sends the first photos and how many there are', () => {
    const ic = offer('infocasas', 'ic-3', {
      details: { images: gallery('infocasas', 15) } as RentalOffer['details'],
    })
    const preview = rentalGalleryPreview(property([ic]))
    expect(preview.photos).toHaveLength(RENTAL_CARD_PHOTO_PREVIEW)
    expect(preview.photos[0]).toEqual({ url: photo('infocasas', 0), listingId: 'ic-3' })
    expect(preview.total).toBe(15)
  })

  it('a cover-only advert is a one-photo carousel', () => {
    expect(rentalGalleryPreview(property([offer('facebook', 'fb-1')]))).toEqual({
      photos: [{ url: photo('facebook', 0), listingId: 'fb-1' }],
      total: 1,
    })
  })
})

describe('withRentalGalleryPreviews: the list reads photos after paginating', () => {
  it('lends photos only from the adverts the search made public, and adds nothing else', () => {
    const item = property([offer('infocasas', 'ic-4')])
    const [result] = withRentalGalleryPreviews(
      [item],
      [
        {
          key: 'pocitos-1',
          offers: [
            { listingId: 'ic-4', details: { images: [...gallery('infocasas', 4), 42] } },
            // Still in the document, no longer on the card: its photos stay out.
            { listingId: 'stale-1', details: { images: [photo('stale', 1)] } },
          ],
        },
      ]
    )
    expect(result!.galleryPreview!.map(p => p.url)).toEqual(gallery('infocasas', 4))
    expect(result!.photoCount).toBe(4)
    // The search card itself still travels without `details`.
    expect(result!.offers[0]!.details).toBeUndefined()
  })

  it('falls back to the cover when the second read has nothing for a key', () => {
    const [result] = withRentalGalleryPreviews([property([offer('mercadolibre', 'MLU-2')])], [])
    expect(result!.galleryPreview).toEqual([{ url: photo('mercadolibre', 0), listingId: 'MLU-2' }])
    expect(result!.photoCount).toBe(1)
  })

  it('credits every preview photo to the advert it came from, for the viewer', () => {
    const ml = offer('mercadolibre', 'MLU-3')
    const ic = offer('infocasas', 'ic-5', {
      details: { images: gallery('infocasas', 2) } as RentalOffer['details'],
    })
    const [item] = withRentalGalleryPreviews(
      [property([ml, ic])],
      [
        {
          key: 'pocitos-1',
          offers: [{ listingId: 'ic-5', details: { images: gallery('infocasas', 2) } }],
        },
      ]
    )
    expect(rentalCardPhotoRefs(item!)).toEqual([
      { url: photo('mercadolibre', 0), sourceName: 'Mercado Libre', sourceUrl: ml.url },
      { url: photo('infocasas', 0), sourceName: 'InfoCasas', sourceUrl: ic.url },
      { url: photo('infocasas', 1), sourceName: 'InfoCasas', sourceUrl: ic.url },
    ])
  })

  it('never widens the projection shared with the household search', () => {
    expect(Object.keys(rentalPublicPropertyProjection)).not.toContain('offers.details.images')
    expect(rentalGalleryProjection).toEqual({
      _id: 0,
      key: 1,
      'offers.listingId': 1,
      'offers.details.images': 1,
    })
  })
})
