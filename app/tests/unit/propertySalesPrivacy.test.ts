import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  publicPropertySaleListing,
  publicPropertySaleSummary,
  publicPropertySalesMeta,
  propertySaleSummaryProjection,
  propertySaleDetailProjection,
} from '../../server/utils/propertySalesPublic'
import type { PropertySaleListing, PropertySalesMeta } from '../../utils/propertySales'

const fixture = (): PropertySaleListing => ({
  key: 'infocasas-123',
  id: 'sale:infocasas:123',
  operation: 'sale',
  source: 'infocasas',
  listingId: '123',
  url: 'https://www.infocasas.com.uy/apartamento/123',
  title: 'Apartamento en venta',
  description: 'Descripción pública saneada.',
  image: 'https://cdn.infocasas.com.uy/photo.jpg',
  images: ['https://cdn.infocasas.com.uy/photo.jpg'],
  sellerName: 'Inmobiliaria publicada',
  department: 'Montevideo',
  locality: 'Montevideo',
  neighborhood: 'Cordón',
  propertyType: 'apartamento',
  bedrooms: 2,
  bathrooms: 1,
  parkingSpaces: null,
  price: { amount: 100000, currency: 'USD' },
  expenses: null,
  areas: { built: 60, total: null, land: null, terrace: null, reported: null },
  amenities: ['Ascensor'],
  furnished: null,
  geo: { lat: -34.9, lng: -56.1, precision: 'approximate' },
  conditions: [],
  lastSeen: '2026-09-06T08:00:00.000Z',
  firstSeen: null,
  publishedAt: null,
})
describe('public sale catalogue boundaries', () => {
  it('rejects malformed prices instead of fabricating a zero-price home', () => {
    expect(() =>
      publicPropertySaleSummary({ ...fixture(), price: { amount: Infinity, currency: 'USD' } })
    ).toThrow('Invalid public sale price')
    expect(() =>
      publicPropertySaleSummary({ ...fixture(), price: { amount: 0, currency: 'USD' } })
    ).toThrow('Invalid public sale price')
  })
  it('projects allowlists at the top level and at every nested object', () => {
    const row = fixture() as any
    row.identity = { address: 'private', version: 1 }
    row.phone = 'private'
    row.raw = { token: 'private' }
    row.price.private = 'private'
    row.areas.private = 'private'
    row.geo.private = 'private'
    row.conditions = ['project', 'private', 'project']
    const full = publicPropertySaleListing(row)
    expect(JSON.stringify(full)).not.toContain('private')
    expect(full.conditions).toEqual(['project'])
    expect(full.firstSeen).toBeNull()
    expect(full.lastSeen).toBe(row.lastSeen)
    const summary = publicPropertySaleSummary(row)
    expect(summary).not.toHaveProperty('description')
    expect(summary).not.toHaveProperty('images')
    expect(summary).not.toHaveProperty('amenities')
    expect(propertySaleSummaryProjection).not.toHaveProperty('identity')
    expect(propertySaleDetailProjection).not.toHaveProperty('raw')
    expect(propertySaleSummaryProjection).toHaveProperty('price.amount')
    expect(propertySaleSummaryProjection).not.toHaveProperty('price')
  })
  it('preserves each source identity instead of relabeling or merging same numeric IDs', () => {
    const first = publicPropertySaleSummary(fixture())
    const second = publicPropertySaleSummary({
      ...fixture(),
      key: 'casasweb-123',
      id: 'sale:casasweb:123',
      source: 'casasweb',
      listingId: 'casasweb:123',
      url: 'https://casasweb.com/VENTA_APARTAMENTO_123',
    })
    expect(second.source).toBe('casasweb')
    expect(second.key).not.toBe(first.key)
    expect(second.id).not.toBe(first.id)
  })
  it('rejects script URLs, credentials and invalid numeric or geo fallbacks', () => {
    const row = fixture()
    row.image = 'javascript:alert(1)'
    row.images = [
      'https://user:secret@example.com/p.jpg',
      'javascript:alert(1)',
      'https://cdn.infocasas.com.uy/photo.jpg',
      'https://cdn.infocasas.com.uy/photo.jpg',
    ]
    row.geo = { lat: 0, lng: 0, precision: 'exact' }
    row.areas.built = Infinity
    const full = publicPropertySaleListing(row)
    expect(full.image).toBeNull()
    expect(full.images).toEqual(['https://cdn.infocasas.com.uy/photo.jpg'])
    expect(full.geo).toBeNull()
    expect(full.areas.built).toBeNull()
    expect(full.parkingSpaces).toBeNull()
    expect(full.expenses).toBeNull()
  })
  it('does not publish private meta additions or claim exhaustive coverage', () => {
    const meta = publicPropertySalesMeta({
      key: 'uy-sales',
      generatedAt: '2026-09-06',
      lastSourceReadAt: '2026-09-05',
      usdUyu: 40,
      total: 2,
      token: 'secret',
      sourceCoverage: 'complete',
      sources: [
        { key: 'infocasas', listings: 1, lastSeen: '2026-09-05', complete: true, token: 'secret' },
        { key: 'casasweb', listings: 1, lastSeen: '2026-09-04', complete: false },
      ],
    } as unknown as PropertySalesMeta)
    expect(JSON.stringify(meta)).not.toContain('secret')
    expect(meta?.sourceCoverage).toBe('partial')
    expect(meta?.sources.every(row => row.complete === false)).toBe(true)
    expect(meta?.sources.map(row => row.key)).toEqual(['infocasas', 'casasweb'])
  })
  it('uses dedicated public collections, leaving private sales analysis documents inaccessible', () => {
    const model = readFileSync(
      new URL('../../server/models/PropertySaleCatalog.ts', import.meta.url),
      'utf8'
    )
    expect(model).toContain("'propertysalecatalog'")
    expect(model).toContain("'propertysalecatalogmetas'")
    expect(model).not.toContain("'propertysalelistings'")
    const api = readFileSync(
      new URL('../../server/api/property-sales/index.get.ts', import.meta.url),
      'utf8'
    )
    expect(api).toContain('propertySaleSummaryProjection')
    expect(api).not.toContain('PropertyOpportunity')
  })
})
