import { describe, expect, it } from 'vitest'
import { starParts } from '../../utils/reviews'

describe('starParts', () => {
  it('splits a whole rating into full + empty (5 slots)', () => {
    expect(starParts(4)).toEqual({ full: 4, half: false, empty: 1 })
  })
  it('rounds .5+ to a half star', () => {
    expect(starParts(3.6)).toEqual({ full: 3, half: true, empty: 1 })
  })
  it('treats null as no stars', () => {
    expect(starParts(null)).toEqual({ full: 0, half: false, empty: 5 })
  })
  it('clamps out-of-range to 0..5', () => {
    expect(starParts(7)).toEqual({ full: 5, half: false, empty: 0 })
    expect(starParts(-1)).toEqual({ full: 0, half: false, empty: 5 })
  })
})
