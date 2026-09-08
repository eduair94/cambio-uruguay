import { describe, expect, it } from 'vitest'
import {
  projectRentalAnalysisProperty,
  rentalAnalysisProjection,
  type RentalAnalysisRawProperty,
} from '../../server/utils/rentalAnalysis'
import { analyzeRentalMarket, estimateRentalPrice } from '../../utils/rentalAnalysis'

const now = new Date('2026-09-07T12:00:00Z')
function property(changes: Record<string, unknown> = {}): RentalAnalysisRawProperty {
  return {
    key: 'property-1',
    offers: [
      {
        source: 'infocasas',
        listingId: '123',
        title: 'Alquiler mensual apartamento en Cordón',
        url: 'https://www.infocasas.com.uy/apartamento/123',
        price: 20000,
        currency: 'UYU',
        commonExpenses: 3000,
        commonExpensesCurrency: 'UYU',
        lastSeen: '2026-09-07',
        parkingSpaces: null,
        sellerType: 'inmobiliaria',
        identity: {
          version: 1,
          propertyType: 'apartamento',
          department: 'Montevideo',
          neighborhood: 'Cordón',
          bedrooms: 1,
          bathrooms: 1,
          description: 'Alquiler mensual de vivienda.',
          address: 'PRIVATE-ADDRESS',
          privateContact: 'PRIVATE-CONTACT',
        },
        details: { description: 'Alquiler mensual de vivienda.', builtArea: 40, totalArea: 48 },
        agency: {
          version: 1,
          key: 'infocasas:1234',
          name: 'Agencia QA',
          profileUrl: 'https://www.infocasas.com.uy/inmobiliarias/1234-qa',
          observedAt: now.toISOString(),
        },
        publicContact: { privateSecret: 'PRIVATE-SECRET' },
        ...changes,
      },
    ],
    department: 'WRONG-MERGED-DEPARTMENT',
    bedrooms: 9,
    area: 300,
  } as unknown as RentalAnalysisRawProperty
}

describe('rental analysis own-advert evidence and privacy', () => {
  it('uses only own-source physical facts and removes original evidence before caching', () => {
    const rows = projectRentalAnalysisProperty(property(), now)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      department: 'Montevideo',
      bedrooms: 1,
      area: 40,
      areaBasis: 'built',
      areas: { built: 40, total: 48 },
      advertiserKey: 'infocasas:1234',
      commonExpenses: 3000,
    })
    expect(JSON.stringify(rows)).not.toMatch(
      /PRIVATE|identity|description|publicContact|WRONG-MERGED/
    )
    expect(projectRentalAnalysisProperty(property({ identity: undefined }), now)).toEqual([])
  })

  it('does not read raw contact, address, gallery or whole identity Mixed objects', () => {
    const paths = Object.keys(rentalAnalysisProjection)
    expect(paths).not.toContain('offers')
    expect(paths).not.toContain('offers.identity')
    expect(paths.join(' ')).not.toMatch(
      /address|latitude|longitude|Contact|channels|images|sellerName/
    )
    expect(paths).toContain('offers.identity.bedrooms')
  })

  it('keeps missing, portal-default zero, explicit zero and mixed-currency GC distinct', () => {
    const expense = (changes: Record<string, unknown>) =>
      projectRentalAnalysisProperty(property(changes), now)[0]?.commonExpenses
    expect(expense({ commonExpenses: null })).toBeNull()
    expect(expense({ commonExpenses: 0 })).toBeNull()
    expect(expense({ commonExpensesCurrency: 'USD' })).toBeNull()
    const base = property().offers[0]!.identity!
    expect(
      expense({
        commonExpenses: 0,
        identity: { ...base, description: 'Alquiler mensual sin gastos comunes.' },
      })
    ).toBe(0)
    expect(
      expense({
        commonExpenses: 3000,
        identity: { ...base, description: 'Alquiler mensual sin gastos comunes.' },
      })
    ).toBeNull()
  })

  it('does not promote a general area or a house plot into comparable dwelling surface', () => {
    const base = property().offers[0]!.identity!
    expect(
      projectRentalAnalysisProperty(
        property({
          identity: { ...base, area: 50 },
          details: undefined,
        }),
        now
      )[0]
    ).toMatchObject({ area: null, areaBasis: null })
    expect(
      projectRentalAnalysisProperty(
        property({
          identity: { ...base, propertyType: 'casa' },
          details: { totalArea: 300 },
        }),
        now
      )[0]
    ).toMatchObject({ area: null, areaBasis: null })
    expect(
      projectRentalAnalysisProperty(
        property({
          details: { builtArea: 95, totalArea: 45 },
        }),
        now
      )[0]
    ).toMatchObject({ area: null, areaBasis: null })
  })

  it('requires current native agency evidence, never a name or particular classification', () => {
    expect(
      projectRentalAnalysisProperty(property({ agency: null, sellerName: 'Unique agency' }), now)[0]
        ?.advertiserKey
    ).toBeNull()
    expect(
      projectRentalAnalysisProperty(property({ sellerType: 'particular' }), now)[0]?.advertiserKey
    ).toBeNull()
    const original = property().offers[0]!.agency!
    expect(
      projectRentalAnalysisProperty(
        property({ agency: { ...original, observedAt: '2020-01-01T00:00:00Z' } }),
        now
      )[0]?.advertiserKey
    ).toBeNull()
  })

  it('uses the explicitly requested total area even when the same offer also has built area', () => {
    const listings = Array.from({ length: 8 }, (_, index) => ({
      ...projectRentalAnalysisProperty(property(), now)[0]!,
      propertyKey: `p${index}`,
      advertId: `rent:infocasas:${index}`,
      advertiserKey: `infocasas:${Math.floor(index / 2)}`,
    }))
    const catalogue = { listings, generatedAt: now.toISOString(), catalogueProperties: 8 }
    const summary = analyzeRentalMarket(catalogue, {}, now).summary
    expect(summary.count).toBe(8)
    expect(summary.rent?.count).toBe(8)
    expect(summary.perM2.built).toMatchObject({ count: 8, median: 500 })
    expect(summary.perM2.total).toMatchObject({ count: 8, median: 416.67 })
    const estimate = estimateRentalPrice(
      catalogue,
      {
        department: 'Montevideo',
        neighborhood: 'Cordón',
        currency: 'UYU',
        type: 'apartamento',
        bedrooms: 1,
        bathrooms: 1,
        area: 48,
        areaBasis: 'total',
        parkingSpaces: null,
        askingPrice: null,
      },
      now
    )
    expect(estimate.status).toBe('supported')
    expect(estimate.sampleCount).toBe(8)
    expect(estimate.comparables.every(row => row.area === 48 && row.areaBasis === 'total')).toBe(
      true
    )
    expect(JSON.stringify(estimate)).not.toContain('"areas"')
  })

  it('rejects temporary, stale, future and invalid portal URLs without canonical fallbacks', () => {
    for (const changes of [
      { lastSeen: '2026-08-01' },
      { lastSeen: '2026-09-08' },
      { url: 'https://evil.test/contact' },
      { title: 'Alquiler temporario por noche' },
    ])
      expect(projectRentalAnalysisProperty(property(changes), now)).toEqual([])
  })

  it('never returns advertiser identity or private cached inputs in either public response', () => {
    const listings = Array.from({ length: 8 }, (_, index) => {
      const row = projectRentalAnalysisProperty(property(), now)[0]!
      return {
        ...row,
        propertyKey: `p${index}`,
        advertId: `rent:infocasas:${index}`,
        advertiserKey: `infocasas:${Math.floor(index / 2)}`,
        privateSecret: 'DO-NOT-RETURN',
      }
    })
    const catalogue = { listings, generatedAt: now.toISOString(), catalogueProperties: 8 }
    const summary = analyzeRentalMarket(catalogue, {}, now)
    const estimate = estimateRentalPrice(
      catalogue,
      {
        department: 'Montevideo',
        neighborhood: 'Cordón',
        currency: 'UYU',
        type: 'apartamento',
        bedrooms: 1,
        bathrooms: 1,
        area: 40,
        areaBasis: 'built',
        parkingSpaces: null,
        askingPrice: null,
      },
      now
    )
    expect(estimate.status).toBe('supported')
    expect(JSON.stringify({ summary, estimate })).not.toMatch(
      /advertiserKey|advertId|privateSecret|DO-NOT-RETURN|PRIVATE/
    )
  })
})
