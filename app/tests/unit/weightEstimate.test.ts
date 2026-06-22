import { describe, expect, it } from 'vitest'
import { parseWeightKg } from '../../utils/weightEstimate'

describe('parseWeightKg', () => {
  it('parses a kilogram value', () => {
    expect(parseWeightKg('0.5 kg')).toBe(0.5)
    expect(parseWeightKg('The estimated weight is 1.2 kg with packaging.')).toBe(1.2)
  })

  it('accepts a decimal comma', () => {
    expect(parseWeightKg('1,5 kg')).toBe(1.5)
  })

  it('converts grams to kilograms', () => {
    expect(parseWeightKg('500 g')).toBe(0.5)
    expect(parseWeightKg('approximately 250 gramos')).toBe(0.25)
  })

  it('converts pounds and ounces to kilograms', () => {
    expect(parseWeightKg('2 lb')).toBeCloseTo(0.907, 2)
    expect(parseWeightKg('8 oz')).toBeCloseTo(0.227, 2)
  })

  it('takes the first plausible weight and ignores other numbers', () => {
    expect(parseWeightKg('Model X-200, weight about 0.8 kg')).toBe(0.8)
  })

  it('returns null when no weight is present', () => {
    expect(parseWeightKg('I cannot determine the weight.')).toBeNull()
    expect(parseWeightKg('')).toBeNull()
  })

  it('rejects implausible weights (<= 0 or absurdly large)', () => {
    expect(parseWeightKg('0 kg')).toBeNull()
    expect(parseWeightKg('5000 kg')).toBeNull()
  })
})
