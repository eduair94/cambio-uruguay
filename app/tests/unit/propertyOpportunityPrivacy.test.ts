import { describe, expect, it, vi } from 'vitest'
vi.mock('../../server/models/PropertyOpportunitySnapshot', () => ({
  PropertyOpportunitySnapshotModel: {},
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
const { publicOpportunityListing, publicOpportunityItem } = await import(
  '../../server/utils/propertyOpportunities'
)

describe('opportunity public facts', () => {
  it('projects new comparison and sensitivity evidence without leaking unknown nested fields', () => {
    const subject = {
      id: 'sale:infocasas:1',
      area: { value: 50, basis: 'built' },
      price: { amount: 100000, currency: 'USD' },
      expenses: null,
    }
    const result = publicOpportunityItem({
      subject,
      analysis: {
        signals: ['price_per_m2'],
        evidenceTier: 'exploratory',
        comparisonScope: 'local_context',
        perAreaMedian: 2400,
        perAreaQ25: 2300,
        perAreaQ75: 2500,
        sensitivity: {
          minimumGapPct: 8,
          minimumPerAreaGapPct: 15,
          omittedSellersN: 4,
          privateAddress: 'Private',
        },
        internalEvidence: 'Private',
      },
      comparables: [
        {
          ...subject,
          differences: {
            areaPercent: 5,
            privateContact: 'Private',
            featureDifferences: [
              {
                feature: 'gym',
                subject: 'unknown',
                comparable: 'gym',
                privateDescription: 'Private',
              },
            ],
          },
        },
      ],
      cautions: [],
    } as any)
    expect(JSON.stringify(result)).not.toContain('Private')
    expect(result.analysis.sensitivity).toEqual({
      minimumGapPct: 8,
      minimumPerAreaGapPct: 15,
      omittedSellersN: 4,
    })
    expect(result.comparables[0].differences.featureDifferences).toEqual([
      { feature: 'gym', subject: 'unknown', comparable: 'gym' },
    ])
    expect(result.analysis.signals).toEqual(['price_per_m2'])
  })
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
