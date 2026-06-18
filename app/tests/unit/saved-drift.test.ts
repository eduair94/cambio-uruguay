import { describe, it, expect } from 'vitest'
import { computeDrift } from '../../composables/useSavedDrift'

describe('computeDrift', () => {
  it('returns null pct when current is null', () => {
    expect(computeDrift({ value: 40 } as any, null)).toEqual({ value: null, pct: null })
  })

  it('returns null pct when snapshot value is zero', () => {
    expect(computeDrift({ value: 0 } as any, 41)).toEqual({ value: 41, pct: null })
  })

  it('computes a positive percentage drift', () => {
    const r = computeDrift({ value: 40 } as any, 42)
    expect(r.value).toBe(42)
    expect(r.pct).toBeCloseTo(5, 5)
  })

  it('computes a negative percentage drift', () => {
    const r = computeDrift({ value: 40 } as any, 38)
    expect(r.pct).toBeCloseTo(-5, 5)
  })
})
