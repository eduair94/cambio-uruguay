import { describe, it, expect } from 'vitest'
import { strengthLabel, readingKeyFor } from '../../utils/driverReadings'

describe('strengthLabel', () => {
  it('buckets by absolute r', () => {
    expect(strengthLabel(0.6)).toBe('fuerte')
    expect(strengthLabel(-0.55)).toBe('fuerte')
    expect(strengthLabel(0.31)).toBe('moderada')
    expect(strengthLabel(0.115)).toBe('debil')
    expect(strengthLabel(0.03)).toBe('casiNula')
    expect(strengthLabel(0)).toBe('casiNula')
  })
})

describe('readingKeyFor', () => {
  it('picks pos/neg by sign for a known driver above the weak threshold', () => {
    expect(readingKeyFor('brl', 0.365)).toBe('porQueDolar.readings.brl.pos')
    expect(readingKeyFor('dxy', -0.31)).toBe('porQueDolar.readings.dxy.neg')
  })
  it('picks the weak key when correlation is near zero', () => {
    expect(readingKeyFor('arBlue', 0.03)).toBe('porQueDolar.readings.arBlue.weak')
  })
  it('falls back to generic for an unknown driver', () => {
    expect(readingKeyFor('mystery', 0.4)).toBe('porQueDolar.readings.generic.pos')
    expect(readingKeyFor('mystery', -0.4)).toBe('porQueDolar.readings.generic.neg')
    expect(readingKeyFor('mystery', 0.01)).toBe('porQueDolar.readings.generic.weak')
  })
})
