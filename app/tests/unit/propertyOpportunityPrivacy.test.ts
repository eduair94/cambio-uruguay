import { describe, expect, it, vi } from 'vitest'
vi.mock('../../server/models/PropertyOpportunitySnapshot', () => ({
  PropertyOpportunitySnapshotModel: {},
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
const { publicOpportunityListing } = await import('../../server/utils/propertyOpportunities')

describe('opportunity public facts', () => {
  it('does not expose original private prose, addresses or future unknown nested fields', () => {
    const result = publicOpportunityListing({
      id: 'sale:infocasas:1',
      operation: 'sale',
      source: 'infocasas',
      listingId: 'infocasas:1',
      title: 'Apartamento',
      url: 'https://www.infocasas.com.uy/test/1',
      image: null,
      sellerName: 'Publicador',
      department: 'Montevideo',
      locality: 'Montevideo',
      neighborhood: 'Centro',
      propertyType: 'apartamento',
      bedrooms: 1,
      bathrooms: 1,
      area: { value: 50, basis: 'built', internalAddress: 'Private address' },
      price: { amount: 100000, currency: 'USD', privateContact: 'Private phone' },
      expenses: null,
      comparisonPrice: 100000,
      lastSeen: '2026-09-06',
      publishedAt: null,
      description: 'Private description',
      address: 'Private address',
      identity: { internal: true },
      riskFlags: ['occupied'],
    } as any)
    expect(JSON.stringify(result)).not.toMatch(/Private|identity|riskFlags|description|address/)
    expect(result.price).toEqual({ amount: 100000, currency: 'USD' })
    expect(result.area).toEqual({ value: 50, basis: 'built' })
  })
})
