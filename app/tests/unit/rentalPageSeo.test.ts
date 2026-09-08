import { describe, expect, it } from 'vitest'
import { rentalPageSchema } from '../../utils/rentalPageSeo'
import type { RentalOffer, RentalPublicProperty } from '../../utils/rentals'

const offer = {
  source: 'infocasas',
  listingId: '123',
  title: 'Apartamento de un dormitorio en Cordón',
  url: 'https://www.infocasas.com.uy/123',
  image: 'https://images.infocasas.com.uy/123.jpg',
  price: 24000,
  currency: 'UYU',
  commonExpenses: 2500,
  commonExpensesCurrency: 'UYU',
  lastSeen: '2026-09-08',
  details: { images: ['https://images.infocasas.com.uy/123-2.jpg'], builtArea: 42 },
} as RentalOffer
const property = {
  key: 'cordon-123',
  title: offer.title,
  propertyType: 'apartamento',
  department: 'Montevideo',
  neighborhood: 'Cordón',
  address: 'Chana 1800',
  bedrooms: 1,
  bathrooms: 1,
  area: 60,
  offers: [offer],
} as RentalPublicProperty
const canonical = 'https://cambio-uruguay.com/alquileres/cordon-123'
function schema(overrides: Partial<Parameters<typeof rentalPageSchema>[0]> = {}) {
  return rentalPageSchema({
    property,
    canonical,
    locale: 'es',
    title: property.title,
    description: 'Revisá costos, fotos y condiciones.',
    uncertain: false,
    breadcrumbs: [
      { name: 'Alquileres', url: 'https://cambio-uruguay.com/alquileres-uruguay' },
      { name: property.title, url: canonical },
    ],
    photoCaption: (title, n) => `${title} · Foto ${n}`,
    photoCredit: source => `Foto publicada en ${source}`,
    ...overrides,
  })
}
// Read the public JSON representation just as a crawler does.
const graph = (options: Parameters<typeof schema>[0] = {}) =>
  JSON.parse(JSON.stringify(schema(options)))['@graph'] as Record<string, any>[]

describe('individual rental structured data', () => {
  it('connects the page, dwelling, original monthly offer and attributed real photos', () => {
    const nodes = graph()
    const page = nodes.find(node => node['@type'] === 'RealEstateListing')!
    const home = nodes.find(node => node['@type'] === 'Apartment')!
    const photos = nodes.filter(node => node['@type'] === 'ImageObject')
    expect(page.mainEntity).toEqual({ '@id': home['@id'] })
    expect(home.mainEntityOfPage).toEqual({ '@id': page['@id'] })
    expect(page.primaryImageOfPage).toEqual({ '@id': photos[0]!['@id'] })
    expect(home.image).toEqual(page.image)
    expect(photos).toHaveLength(2)
    expect(photos[0]).toMatchObject({
      contentUrl: offer.image,
      url: offer.image,
      isBasedOn: offer.url,
      creditText: 'Foto publicada en infocasas',
    })
    expect(page.offers[0]).toMatchObject({
      url: offer.url,
      price: 24000,
      priceCurrency: 'UYU',
      itemOffered: { '@id': home['@id'] },
      priceSpecification: { referenceQuantity: { value: 1, unitCode: 'MON' } },
    })
    expect(home.floorSize).toEqual({ '@type': 'QuantitativeValue', value: 42, unitCode: 'MTK' })
  })

  it('does not turn read dates, reports, expenses or source attribution into unsupported claims', () => {
    const json = JSON.stringify(schema())
    for (const forbidden of [
      'dateModified',
      'datePublished',
      'availability',
      'InStock',
      'owner',
      'license',
      'copyright',
      '2500',
      'geo',
    ]) {
      expect(json).not.toContain(forbidden)
    }
  })

  it('does not publish one property or rent offer when source identity/details are uncertain', () => {
    const nodes = graph({ uncertain: true })
    expect(nodes.map(node => node['@type'])).toEqual([
      'BreadcrumbList',
      'WebPage',
      'ImageObject',
      'ImageObject',
    ])
    const page = nodes.find(node => node['@type'] === 'WebPage')!
    expect(page).not.toHaveProperty('offers')
    expect(page).not.toHaveProperty('mainEntity')
    expect(page.primaryImageOfPage).toBeTruthy()
  })

  it('does not mislabel total/land area or contradictory built areas as dwelling floor space', () => {
    const noBuilt = { ...offer, details: { ...offer.details!, builtArea: null } }
    const conflicting = { ...offer, details: { ...offer.details!, builtArea: 55 } }
    for (const offers of [[noBuilt], [offer, conflicting]]) {
      const home = graph({ property: { ...property, offers } }).find(
        node => node['@type'] === 'Apartment'
      )!
      expect(home).not.toHaveProperty('floorSize')
    }
  })

  it('keeps genuine studios while omitting unknown, invalid and nonresidential room counts', () => {
    expect(
      graph({ property: { ...property, bedrooms: 0 } }).find(node => node['@type'] === 'Apartment')
    ).toMatchObject({ numberOfBedrooms: 0 })
    for (const bedrooms of [null, -1, NaN]) {
      expect(
        graph({ property: { ...property, bedrooms } }).find(node => node['@type'] === 'Apartment')
      ).not.toHaveProperty('numberOfBedrooms')
    }
    expect(
      graph({ property: { ...property, propertyType: 'oficina' } }).find(
        node => node['@type'] === 'Place'
      )
    ).not.toHaveProperty('numberOfBedrooms')
  })

  it('deduplicates visible photos, rejects unsafe sources and does not fabricate a missing image', () => {
    expect(
      graph({ property: { ...property, offers: [offer, offer] } }).filter(
        node => node['@type'] === 'ImageObject'
      )
    ).toHaveLength(2)
    const withoutPhoto = { ...offer, image: 'javascript:alert(1)', details: undefined }
    const unsafeSource = { ...offer, url: 'https://user:secret@infocasas.com.uy/123' }
    const nodes = graph({ property: { ...property, offers: [withoutPhoto, unsafeSource] } })
    expect(nodes.filter(node => node['@type'] === 'ImageObject')).toHaveLength(0)
    const page = nodes.find(node => node['@type'] === 'RealEstateListing')!
    expect(page).not.toHaveProperty('primaryImageOfPage')
    expect(page.offers).toHaveLength(1)
  })

  it('uses localized page identity and excludes a headline masquerading as a street', () => {
    const url = canonical.replace('/alquileres/', '/en/alquileres/')
    const nodes = graph({
      canonical: url,
      locale: 'en',
      property: { ...property, address: property.title },
    })
    expect(nodes.find(node => node['@type'] === 'RealEstateListing')).toMatchObject({
      url,
      inLanguage: 'en',
    })
    expect(nodes.find(node => node['@type'] === 'Apartment')?.address).not.toHaveProperty(
      'streetAddress'
    )
    expect(nodes.find(node => node['@type'] === 'Apartment')?.['@id']).toBe(`${url}#property`)
  })
})
