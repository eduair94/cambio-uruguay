import { describe, expect, it } from 'vitest'
import { compareRateAmounts } from '../../utils/rateAmountComparison'

describe('equal-quantity quote comparison', () => {
  it('shows pesos received and the shortfall when selling foreign currency', () => {
    expect(compareRateAmounts(1000, 40, 40.1, true)).toEqual({ total: 40000, difference: 100 })
  })

  it('shows pesos paid and the extra cost when buying foreign currency', () => {
    expect(compareRateAmounts(1000, 41, 40.63, false)).toEqual({ total: 41000, difference: 370 })
  })

  it('compares rounded payable amounts, including ties and fractional quantities', () => {
    expect(compareRateAmounts(2.46, 40.63, 40.63, false)).toEqual({ total: 99.95, difference: 0 })
    expect(compareRateAmounts(0.01, 40.63, 40.62, false)).toEqual({ total: 0.41, difference: 0 })
  })

  it.each([0, -1, NaN, Infinity])('does not invent a total from invalid input %s', value => {
    expect(compareRateAmounts(value, 40, 41, true)).toBeNull()
    expect(compareRateAmounts(100, value, 41, true)).toBeNull()
    expect(compareRateAmounts(100, 40, value, true)).toBeNull()
  })

  it('declines amounts beyond safe cent precision', () => {
    expect(compareRateAmounts(Number.MAX_VALUE, 40, 41, true)).toBeNull()
  })
})
