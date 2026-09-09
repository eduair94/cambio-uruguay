import { describe, expect, it } from 'vitest'
import type { RentalOffer, RentalProperty, RentalSource } from '../../utils/rentals'
import { portalPriceGap, rentalListedFor } from '../../utils/rentalPortals'

const offer = (
  source: RentalSource,
  priceUyu: number,
  extra: Partial<RentalOffer> = {}
): RentalOffer =>
  ({
    source,
    listingId: `${source}:${priceUyu}${extra.publishedAt || ''}${extra.firstSeen || ''}`,
    url: `https://example.test/${source}`,
    title: 'Aviso',
    price: priceUyu,
    currency: 'UYU',
    priceUyu,
    commonExpenses: null,
    commonExpensesCurrency: null,
    sellerName: '',
    sellerType: 'desconocido',
    image: null,
    publishedAt: null,
    petsAllowed: null,
    guarantees: [],
    parkingSpaces: null,
    furnished: null,
    firstSeen: '2026-09-01',
    lastSeen: '2026-09-09',
    ...extra,
  }) as RentalOffer

const property = (offers: RentalOffer[], extra: Partial<RentalProperty> = {}): RentalProperty =>
  ({
    key: 'k',
    title: 'Vivienda',
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    address: '',
    addressKey: '',
    latitude: null,
    longitude: null,
    bedrooms: 1,
    bathrooms: null,
    area: null,
    parkingSpaces: null,
    furnished: null,
    petsAllowed: null,
    guarantees: [],
    priceUyu: offers[0]?.priceUyu ?? 0,
    price: offers[0]?.price ?? 0,
    currency: 'UYU',
    offers,
    sources: [...new Set(offers.map(row => row.source))],
    freshAt: '2026-09-09',
    firstSeen: '2026-09-01',
    lastSeen: '2026-09-09',
    ...extra,
  }) as RentalProperty

describe('portalPriceGap', () => {
  it('reports the cheapest portal and the difference against the next one', () => {
    const gap = portalPriceGap(property([offer('infocasas', 32000), offer('mercadolibre', 29000)]))
    expect(gap).toMatchObject({
      cheapestSource: 'mercadolibre',
      runnerUpSource: 'infocasas',
      cheapestUyu: 29000,
      runnerUpUyu: 32000,
      diffUyu: 3000,
    })
    // The percentage is relative to the dearer price: paying 32.000 is 9,4 % more than 29.000.
    expect(gap?.diffPct).toBeCloseTo(9.375, 3)
  })

  it('returns null when a single portal publishes the home', () => {
    expect(portalPriceGap(property([offer('infocasas', 32000), offer('infocasas', 29000)]))).toBe(
      null
    )
  })

  it('compares the best price of each portal, not the global extremes', () => {
    // Mercado Libre owns both the cheapest AND the dearest advert. The useful comparison is
    // ML's best against InfoCasas' best, not ML against itself.
    const gap = portalPriceGap(
      property([
        offer('mercadolibre', 29000),
        offer('mercadolibre', 41000),
        offer('infocasas', 33000),
      ])
    )
    expect(gap).toMatchObject({
      cheapestSource: 'mercadolibre',
      runnerUpSource: 'infocasas',
      diffUyu: 4000,
    })
  })

  it('ignores adverts without a comparable price in pesos', () => {
    expect(
      portalPriceGap(
        property([offer('infocasas', 32000), offer('mercadolibre', 0), offer('facebook', NaN)])
      )
    ).toBe(null)
  })

  it('stays quiet below the noise thresholds', () => {
    // 150 pesos: under the absolute floor, this is rounding and currency conversion.
    expect(portalPriceGap(property([offer('infocasas', 30150), offer('casasweb', 30000)]))).toBe(
      null
    )
    // 0,5 %: over the peso floor but under the relative one, on an expensive home.
    expect(portalPriceGap(property([offer('infocasas', 100500), offer('casasweb', 100000)]))).toBe(
      null
    )
  })

  it('shows a difference that clears both thresholds', () => {
    expect(
      portalPriceGap(property([offer('infocasas', 30400), offer('casasweb', 30000)]))?.diffUyu
    ).toBe(400)
  })
})

describe('rentalListedFor', () => {
  const now = new Date('2026-09-09T12:00:00Z')

  it('prefers the date the portal published over the date we first read it', () => {
    expect(
      rentalListedFor(
        property([
          offer('infocasas', 30000, { publishedAt: '2026-07-01', firstSeen: '2026-08-20' }),
        ]),
        now
      )
    ).toEqual({ days: 70, basis: 'published', date: '2026-07-01' })
  })

  it('falls back to our own first reading, and says so', () => {
    expect(
      rentalListedFor(property([offer('infocasas', 30000, { firstSeen: '2026-08-01' })]), now)
    ).toEqual({ days: 39, basis: 'observed', date: '2026-08-01' })
  })

  it('takes the oldest advert of the home', () => {
    expect(
      rentalListedFor(
        property([
          offer('infocasas', 30000, { firstSeen: '2026-09-01' }),
          offer('mercadolibre', 30000, { publishedAt: '2026-06-15' }),
        ]),
        now
      )
    ).toMatchObject({ days: 86, basis: 'published' })
  })

  it('says nothing about a recent advert', () => {
    expect(
      rentalListedFor(property([offer('infocasas', 30000, { firstSeen: '2026-09-05' })]), now)
    ).toBe(null)
  })

  it('ignores dates that are unusable or in the future', () => {
    expect(
      rentalListedFor(
        property([offer('infocasas', 30000, { publishedAt: '2027-01-01', firstSeen: 'nope' })], {
          firstSeen: '2026-05-01',
        }),
        now
      )
    ).toMatchObject({ days: 131, basis: 'observed', date: '2026-05-01' })
  })

  it('returns null when the home carries no usable date at all', () => {
    expect(
      rentalListedFor(
        property([offer('infocasas', 30000, { firstSeen: '' })], { firstSeen: '' }),
        now
      )
    ).toBe(null)
  })
})
