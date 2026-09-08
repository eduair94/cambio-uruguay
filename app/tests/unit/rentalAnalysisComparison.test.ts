import { describe, expect, it } from 'vitest'
import { rentalAnalysisContext, rentalAnalysisIncome } from '../../utils/rentalAnalysisComparison'
import type { RentalZone } from '../../utils/rentalZoneTypes'

const zone = (department: string, neighborhood: string) =>
  ({
    id: `${department}-${neighborhood}`,
    ref: { department, neighborhood },
    services: null,
    crime: null,
  }) as RentalZone

describe('analysis territorial matching', () => {
  const cordon = zone('Montevideo', 'Cordón')
  it('accepts accents/case/spacing but requires the same explicit department and name', () => {
    expect(rentalAnalysisContext([cordon], 'montevideo', '  cordon ')).toBe(cordon)
    expect(rentalAnalysisContext([cordon], 'Canelones', 'Cordón')).toBeNull()
    expect(rentalAnalysisContext([cordon], 'Montevideo', 'Cordón Sur')).toBeNull()
    expect(rentalAnalysisContext([cordon], '', 'Cordón')).toBeNull()
  })
  it('abstains on ambiguous matches rather than attaching an arbitrary geography', () => {
    expect(
      rentalAnalysisContext([cordon, zone('Montevideo', 'CORDON')], 'Montevideo', 'Cordón')
    ).toBeNull()
  })
})
describe('household income scenarios', () => {
  it('uses the per-listing monthly-cost median plus entered extras and chosen share', () => {
    expect(rentalAnalysisIncome(27000, 30, 3000)).toBe(100000)
    expect(rentalAnalysisIncome(1000, 50)).toBe(2000)
  })
  it('never turns absent costs or invalid shares into a plausible requirement', () => {
    for (const input of [null, undefined, NaN, Infinity, 0, -1])
      expect(rentalAnalysisIncome(input, 30)).toBeNull()
    for (const share of [0, -1, 101, NaN, Infinity])
      expect(rentalAnalysisIncome(30000, share)).toBeNull()
    expect(rentalAnalysisIncome(30000, 30, -1)).toBeNull()
  })
})
