import { describe, expect, it } from 'vitest'
import { analyzeBankos, type AnalysisRawData } from '../../utils/bankosAnalysis'

// Two issuers, three brands: one shared, one Itaú-only, one BROU-only.
const DATA: AnalysisRawData = {
  brands: {
    superx: { brandId: 'superx', name: 'Super X', categories: ['Supermercados'] },
    cafey: { brandId: 'cafey', name: 'Café Y', categories: ['Cafeterías'] },
    barz: { brandId: 'barz', name: 'Bar Z', categories: ['Gastronomía', 'Cafeterías'] },
  },
  locations: {
    'superx-1': { locationId: 'superx-1', brandId: 'superx' },
    'superx-2': { locationId: 'superx-2', brandId: 'superx' },
    'cafey-1': { locationId: 'cafey-1', brandId: 'cafey' },
    'barz-1': { locationId: 'barz-1', brandId: 'barz' },
  },
  bankBrands: {
    itau: {
      superx: { creditDescription: '20%', debitDescription: '10%' },
      cafey: { creditDescription: '15%', debitDescription: null },
    },
    brou: {
      superx: { creditDescription: '10%', debitDescription: null },
      barz: { creditDescription: null, debitDescription: '25%' },
    },
  },
  brandLocations: {
    superx: ['superx-1', 'superx-2'],
    cafey: ['cafey-1'],
    barz: ['barz-1'],
  },
}

describe('analyzeBankos', () => {
  const a = analyzeBankos(DATA)
  const itau = a.banks.find(b => b.bankId === 'itau')!
  const brou = a.banks.find(b => b.bankId === 'brou')!

  it('counts brands and their locations per issuer', () => {
    expect(itau.brands).toBe(2)
    expect(itau.locations).toBe(3) // superx (2) + cafey (1)
    expect(brou.brands).toBe(2)
    expect(brou.locations).toBe(3) // superx (2) + barz (1)
  })

  it('counts credit and debit separately, not as a total', () => {
    expect(itau.credit).toBe(2)
    expect(itau.debit).toBe(1)
    expect(brou.credit).toBe(1)
    expect(brou.debit).toBe(1)
  })

  it('reports debit as a share of that issuer, which is what actually varies between banks', () => {
    expect(itau.debitShare).toBeCloseTo(1 / 2)
    expect(brou.debitShare).toBeCloseTo(1 / 2)
    // An issuer with no debit benefit at all must read 0, never NaN.
    const none = analyzeBankos({
      ...DATA,
      bankBrands: { itau: { superx: { creditDescription: '20%', debitDescription: null } } },
    }).banks.find(b => b.bankId === 'itau')!
    expect(none.debitShare).toBe(0)
  })

  it('counts a brand as exclusive only when no other issuer discounts it', () => {
    expect(itau.exclusive).toBe(1) // cafey
    expect(brou.exclusive).toBe(1) // barz
  })

  it('measures coverage against the brands that have any discount', () => {
    expect(a.totals.discountedBrands).toBe(3)
    expect(itau.coverage).toBeCloseTo(2 / 3)
  })

  it('ranks issuers inside each category and counts a multi-category brand in both', () => {
    const superm = a.categories.find(c => c.category === 'Supermercados')!
    expect(superm.brands).toBe(1)
    expect(superm.ranking.map(r => r.bankId).sort()).toEqual(['brou', 'itau'])

    const cafes = a.categories.find(c => c.category === 'Cafeterías')!
    expect(cafes.brands).toBe(2) // cafey (itau) + barz (brou)
  })

  it('sorts issuers by breadth, biggest first', () => {
    expect(a.banks[0]!.brands).toBeGreaterThanOrEqual(a.banks[a.banks.length - 1]!.brands)
  })
})
