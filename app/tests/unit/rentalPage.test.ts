import { describe, expect, it } from 'vitest'
import type { RentalOffer, RentalPublicProperty } from '../../utils/rentals'
import {
  buildRentalPage,
  rentalPageConflicts,
  rentalPageMarket,
  rentalPagePeerStages,
  rentalPageReprice,
  rentalPageEvidenceStages,
  rentalPageSitemapUrls,
  rentalPageSitemapStages,
} from '../../server/utils/rentalPage'

function offer(overrides: Partial<RentalOffer> = {}): RentalOffer {
  return {
    source: 'infocasas',
    listingId: 'one',
    title: 'Apartamento de 1 dormitorio en Cordón',
    url: 'https://www.infocasas.com.uy/one',
    image: 'https://images.example.com/one.jpg',
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
function property(overrides: Partial<RentalPublicProperty> = {}): RentalPublicProperty {
  const identity = overrides.key ?? 'pilot'
  const price = overrides.price ?? overrides.priceUyu ?? 44000
  const first = offer({ listingId: `${identity}-one`, price, priceUyu: price })
  return {
    key: 'pilot',
    title: first.title,
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
    offers: [
      first,
      offer({
        source: 'mercadolibre',
        listingId: `${identity}-two`,
        price,
        priceUyu: price,
        url: 'https://www.mercadolibre.com.uy/two',
        commonExpenses: null,
      }),
    ],
    matchingOffer: first,
    sources: ['infocasas', 'mercadolibre'],
    freshAt: '2026-09-01',
    firstSeen: '2026-09-01',
    lastSeen: '2026-09-05',
    ...overrides,
  }
}
const peers = () =>
  Array.from({ length: 10 }, (_, index) =>
    property({ key: `peer-${index}`, priceUyu: (index + 1) * 10000 })
  )

describe('public rental page evidence', () => {
  it('reconverts all rents with the same rate and reselects the actual cheapest offer', () => {
    const original = property({
      offers: [
        offer({
          source: 'infocasas',
          price: 600,
          currency: 'USD',
          priceUyu: 24000,
          commonExpenses: 1000,
          commonExpensesCurrency: 'UYU',
        }),
        offer({ source: 'mercadolibre', listingId: 'peso', price: 24500, priceUyu: 24500 }),
      ],
    })
    const current = rentalPageReprice(original, 41)
    expect(current.offers[0]?.priceUyu).toBe(24600)
    expect(current.matchingOffer?.listingId).toBe('peso')
    expect(current.priceUyu).toBe(24500)
    expect(original.offers[0]?.priceUyu).toBe(24000)
    expect(rentalPageReprice(original, 0).offers[0]?.priceUyu).toBe(0)
  })
  it('does not count shared advert identities as distinct comparable properties', () => {
    const candidates = peers()
    candidates[9] = { ...candidates[9]!, offers: candidates[8]!.offers }
    expect(rentalPageMarket(property(), candidates)).toMatchObject({
      status: 'insufficient',
      sampleSize: 8,
    })
    expect(buildRentalPage(property(), [], 40, true).seo.reasons).toContain('ambiguous_identity')
    expect(buildRentalPage(property(), peers(), 40, true).market).toMatchObject({
      status: 'not_comparable',
      medianRentUyu: null,
      sampleSize: 0,
    })
    expect(rentalPageSitemapUrls([property()], 40, new Set(['pilot']))).toEqual([])
  })
  it('uses one rent per OTHER property, exact scope, and transparent interpolated quartiles', () => {
    const others = peers()
    const result = rentalPageMarket(property(), [
      property(),
      ...others,
      others[0]!,
      property({ key: 'wrong-bedroom', bedrooms: 2 }),
      property({ key: 'wrong-place', neighborhood: 'Pocitos' }),
    ])
    expect(result).toMatchObject({
      status: 'available',
      minimumSample: 10,
      sampleSize: 10,
      medianRentUyu: 55000,
      p25RentUyu: 32500,
      p75RentUyu: 77500,
      differencePercent: -20,
    })
  })
  it('does not publish an estimate from nine peers or unknown bedrooms', () => {
    expect(rentalPageMarket(property(), peers().slice(0, 9))).toMatchObject({
      status: 'insufficient',
      sampleSize: 9,
      medianRentUyu: null,
      differencePercent: null,
    })
    expect(rentalPageMarket(property({ bedrooms: null }), peers())).toMatchObject({
      status: 'not_comparable',
      scope: null,
      sampleSize: 0,
    })
  })
  it('matches accent and case variants but does not collapse n and ñ', () => {
    expect(
      rentalPageMarket(
        property(),
        peers().map(peer => ({ ...peer, neighborhood: 'CORDON' }))
      )
    ).toMatchObject({ sampleSize: 10 })
    expect(
      rentalPageMarket(
        property({ neighborhood: 'Peñarol' }),
        peers().map(peer => ({ ...peer, neighborhood: 'Penarol' }))
      )
    ).toMatchObject({ sampleSize: 0 })
  })
  it('excludes explicit conflicting bedroom/type and seasonal records from market evidence', () => {
    expect(
      rentalPageConflicts(property({ bedrooms: 0, title: 'Alquiler de un dormitorio' }))
    ).toContain('conflicting_bedrooms')
    expect(rentalPageConflicts(property({ title: 'Alquiler local Ciudad Vieja' }))).toContain(
      'conflicting_type'
    )
    expect(
      rentalPageConflicts(
        property({
          offers: [
            offer({ title: 'Alquiler apartamento - 601' }),
            offer({ title: 'Alquiler apartamento - 801' }),
          ],
        })
      )
    ).toContain('conflicting_unit')
    expect(rentalPageConflicts(property({ title: 'Apartamento de 2 dormitorios' }))).toContain(
      'conflicting_bedrooms'
    )
    expect(rentalPageConflicts(property({ title: 'Alquiler casa en Cordón' }))).toContain(
      'conflicting_type'
    )
    expect(rentalPageConflicts(property({ title: 'Alquiler invernal apartamento' }))).toContain(
      'temporary_rental'
    )
    expect(
      rentalPageConflicts(property({ title: 'Apartamento con jardín de invierno' }))
    ).not.toContain('temporary_rental')
    const candidates = peers()
    candidates[0] = property({ key: 'uncertain', title: '2 dormitorios' })
    expect(rentalPageMarket(property(), candidates)).toMatchObject({
      status: 'insufficient',
      sampleSize: 9,
    })
  })
  it('flags explicit counts in the source description without correcting or benchmarking them', () => {
    const current = property({
      offers: [
        offer({
          details: {
            description:
              'Cuenta con tres dormitorios y dos baños. La cocina tiene salida al patio.',
            images: [],
            builtArea: null,
            totalArea: null,
            landArea: null,
            terraceArea: null,
            amenities: [],
            guaranteeText: '',
          },
        }),
      ],
    })
    const page = buildRentalPage(current, peers(), 40)
    expect(page.seo.reasons).toEqual(
      expect.arrayContaining(['conflicting_bedrooms', 'conflicting_bathrooms'])
    )
    expect(page.seo.indexable).toBe(false)
    expect(page.market.status).toBe('not_comparable')
    expect(page.market.medianRentUyu).toBeNull()
    expect(
      buildRentalPage(current, [], 40, false, rentalPageMarket(property(), peers())).market.status
    ).toBe('not_comparable')
    expect(page.property.bedrooms).toBe(1)
    expect(page.property.bathrooms).toBe(1)
    expect(rentalPageSitemapUrls([current], 40)).toEqual([])
    expect(
      rentalPageConflicts({
        ...current,
        offers: [
          offer({
            details: {
              ...current.offers[0]!.details!,
              description:
                'Un dormitorio y un baño. Zona de interés turístico. El edificio incluye oficinas. Referencia - 1000',
            },
          }),
        ],
      })
    ).toEqual([])
  })
  it('indexes useful dossiers by current evidence instead of a fixed historic allowlist', () => {
    expect(buildRentalPage(property(), peers(), 40).seo).toEqual({
      indexable: true,
      reasons: [],
      contentUpdatedAt: null,
    })
    const page = buildRentalPage(property({ key: 'another-property' }), peers(), 40)
    expect(page.seo.indexable).toBe(true)
    expect(page.seo.reasons).toEqual([])
    expect(page.similar).toHaveLength(6)
    expect(page.canonicalPath).toBe('/alquileres/another-property')
    expect(page.similar[0]?.priceUyu).toBe(40000)
  })
  it('withdraws eligibility when cost/photo/source evidence disappears without treating unknown as zero', () => {
    const unknown = property({
      offers: [
        offer({ commonExpenses: null }),
        offer({ source: 'mercadolibre', listingId: 'two', commonExpenses: null }),
      ],
    })
    expect(buildRentalPage(unknown, peers(), 40).seo.reasons).toContain(
      'missing_known_monthly_cost'
    )
    expect(buildRentalPage(property({ offers: [offer()] }), [], 40).seo.indexable).toBe(true)
    expect(
      buildRentalPage(property({ offers: [offer({ image: 'javascript:alert(1)' })] }), peers(), 40)
        .seo.reasons
    ).toContain('missing_photo')
  })
  it('requires a source-backed dossier without rewarding uncertain multi-portal joins', () => {
    const single = property({ offers: [offer()], sources: ['infocasas'] })
    expect(buildRentalPage(single, [], 40).seo.indexable).toBe(true)
    expect(rentalPageSitemapUrls([single], 40)).toEqual([
      { loc: '/alquileres/pilot', images: [{ loc: 'https://images.example.com/one.jpg' }] },
    ])
    expect(
      buildRentalPage({ ...single, address: single.title }, peers(), 40).seo.reasons
    ).toContain('missing_address_or_source_description')
    expect(buildRentalPage({ ...single, area: null }, peers(), 40).seo.reasons).toContain(
      'insufficient_specific_attributes'
    )
    const hiddenAddress = {
      ...single,
      address: '',
      offers: [
        offer({
          details: {
            description:
              'El apartamento cuenta con un dormitorio independiente, living comedor con salida a terraza y cocina integrada. El edificio dispone de ascensor y un espacio de lavandería de uso común.',
            images: [],
            builtArea: 45,
            totalArea: 50,
            landArea: null,
            terraceArea: 5,
            amenities: [],
            guaranteeText: '',
          },
        }),
      ],
    }
    expect(buildRentalPage(hiddenAddress, [], 40).seo.indexable).toBe(true)
    expect(rentalPageSitemapUrls([hiddenAddress], 40)).toEqual([
      { loc: '/alquileres/pilot', images: [{ loc: 'https://images.example.com/one.jpg' }] },
    ])
  })
  it('uses exact property specs in the DB query and projects only public fields', () => {
    const evidenceProjection = rentalPageEvidenceStages(property())!.at(-1)! as {
      $project: Record<string, number>
    }
    expect(evidenceProjection.$project).toMatchObject({
      _id: 0,
      'offers.price': 1,
      'offers.currency': 1,
    })
    for (const field of ['offers.image', 'offers.url', 'offers.sellerName', 'address'])
      expect(evidenceProjection.$project[field]).toBeUndefined()
    const stages = rentalPagePeerStages(property())!
    expect(stages[0]).toMatchObject({
      $match: {
        key: { $ne: 'pilot' },
        department: 'Montevideo',
        neighborhood: { $in: ['Cordón'] },
        propertyType: 'apartamento',
        bedrooms: 1,
      },
    })
    expect(stages.at(-1)).toMatchObject({
      $project: { _id: 0, 'offers.url': 1, 'matchingOffer.price': 1 },
    })
    expect(rentalPagePeerStages(property({ neighborhood: '' }))).toBeNull()
  })
  it('sitemap emits qualified Spanish URLs with real gallery images and never invents lastmod', () => {
    expect(
      rentalPageSitemapUrls(
        [
          property(),
          property({ key: 'not-reviewed' }),
          property({ key: 'pilot', title: '2 dormitorios' }),
        ],
        40
      )
    ).toEqual([
      { loc: '/alquileres/pilot', images: [{ loc: 'https://images.example.com/one.jpg' }] },
      { loc: '/alquileres/not-reviewed', images: [{ loc: 'https://images.example.com/one.jpg' }] },
    ])
    const stages = rentalPageSitemapStages()
    expect(stages[0]).toMatchObject({
      $match: { propertyType: { $in: ['apartamento', 'casa'] } },
    })
    expect((stages[0] as { $match: Record<string, unknown> }).$match.key).toBeUndefined()
  })
  it('uses the attributed gallery for photo eligibility and rejects unlinked or unsafe images', () => {
    const row = property({
      offers: [
        offer({
          image: null,
          details: {
            description: '',
            images: [
              'https://images.example.com/gallery.jpg',
              'javascript:bad',
              'https://images.example.com/gallery.jpg',
            ],
            builtArea: null,
            totalArea: null,
            landArea: null,
            terraceArea: null,
            amenities: [],
            guaranteeText: '',
          },
        }),
      ],
    })
    expect(buildRentalPage(row, [], 40).seo.indexable).toBe(true)
    expect(rentalPageSitemapUrls([row], 40)[0]?.images).toEqual([
      { loc: 'https://images.example.com/gallery.jpg' },
    ])
    expect(
      rentalPageSitemapUrls([{ ...row, offers: [offer({ url: 'javascript:bad' })] }], 40)
    ).toEqual([])
  })
})
