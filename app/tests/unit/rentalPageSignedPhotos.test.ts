import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RentalOffer, RentalPublicProperty } from '../../utils/rentals'
import { buildRentalPage, rentalPageSitemapUrls } from '../../server/utils/rentalPage'

// A signed TikTok/Instagram/Facebook photo whose signature ran out leaves the gallery, the JSON-LD
// and the image sitemap (rentalPhotos), but the quality gate asks whether the advert PUBLISHED a
// photo (`keepExpired`): ~18 indexable fichas whose only photo is an expired social cover would
// otherwise go noindex and leave the sitemap with no change in the advert itself.

// x-expires=1793419200 is 2026-10-31 (seconds); the clock below is 2026-11-08.
const EXPIRED_TIKTOK =
  'https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/cover~tplv-photomode-zoomcover.jpeg?dr=14555&x-expires=1793419200&x-signature=abc'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.UTC(2026, 10, 8, 12))
})
afterEach(() => {
  vi.useRealTimers()
})

function offer(overrides: Partial<RentalOffer> = {}): RentalOffer {
  return {
    source: 'tiktok',
    listingId: 'pilot-one',
    title: 'Apartamento de 1 dormitorio en Cordón',
    url: 'https://www.tiktok.com/@inmobiliaria/video/7430000000000000000',
    image: EXPIRED_TIKTOK,
    price: 44000,
    priceUyu: 44000,
    currency: 'UYU',
    commonExpenses: 0,
    commonExpensesCurrency: null,
    sellerName: 'Agencia',
    sellerType: 'inmobiliaria',
    parkingSpaces: null,
    furnished: null,
    publishedAt: null,
    firstSeen: '2026-09-01',
    lastSeen: '2026-09-05',
    ...overrides,
  }
}

function property(offers: RentalOffer[]): RentalPublicProperty {
  return {
    key: 'pilot',
    title: offers[0]!.title,
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    address: 'Chana 1800',
    latitude: -34.9,
    longitude: -56.17,
    bedrooms: 1,
    bathrooms: 1,
    area: 45,
    parkingSpaces: null,
    furnished: null,
    petsAllowed: null,
    guarantees: [],
    price: 44000,
    priceUyu: 44000,
    currency: 'UYU',
    offers,
    matchingOffer: offers[0],
    sources: [...new Set(offers.map(row => row.source))],
    freshAt: '2026-09-01',
    firstSeen: '2026-09-01',
    lastSeen: '2026-09-05',
  }
}

describe('a rental page whose photos are expired signed links', () => {
  it('stays indexable when its only photo is an expired TikTok cover, and lists no image', () => {
    const row = property([offer()])
    expect(buildRentalPage(row, [], 40).seo).toEqual({
      indexable: true,
      reasons: [],
      contentUpdatedAt: null,
    })
    expect(rentalPageSitemapUrls([row], 40)).toEqual([{ loc: '/alquileres/pilot', images: [] }])
  })

  it('lists only the photos that still open next to an expired one', () => {
    const gallery = 'https://cdn2.infocasas.com.uy/repo/img/foto_1.jpg'
    const row = property([
      offer({
        details: {
          description: '',
          images: [EXPIRED_TIKTOK, gallery],
          builtArea: null,
          totalArea: null,
          landArea: null,
          terraceArea: null,
          amenities: [],
          guaranteeText: '',
        },
      }),
    ])
    expect(rentalPageSitemapUrls([row], 40)).toEqual([
      { loc: '/alquileres/pilot', images: [{ loc: gallery }] },
    ])
  })

  it('still withdraws a page whose advert published no photo at all', () => {
    expect(buildRentalPage(property([offer({ image: null })]), [], 40).seo.reasons).toContain(
      'missing_photo'
    )
  })
})
