import { describe, expect, it } from 'vitest'
import { easeOutCubic, frameValue } from '../../utils/tween'

describe('easeOutCubic', () => {
  it('is pinned at the endpoints', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
  })
  it('clamps out-of-range input', () => {
    expect(easeOutCubic(-1)).toBe(0)
    expect(easeOutCubic(2)).toBe(1)
  })
  it('eases out (past the midpoint by t=0.5)', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
  })
})

describe('frameValue', () => {
  it('returns the start value at elapsed 0', () => {
    expect(frameValue(100, 200, 0, 1000)).toBe(100)
  })
  it('returns the end value once the duration has elapsed', () => {
    expect(frameValue(100, 200, 1000, 1000)).toBe(200)
    expect(frameValue(100, 200, 5000, 1000)).toBe(200)
  })
  it('jumps straight to the end for a zero / negative duration', () => {
    expect(frameValue(0, 500, 0, 0)).toBe(500)
    expect(frameValue(0, 500, 0, -10)).toBe(500)
  })
  it('is monotonic between the endpoints', () => {
    const a = frameValue(0, 100, 250, 1000)
    const b = frameValue(0, 100, 500, 1000)
    expect(b).toBeGreaterThan(a)
    expect(a).toBeGreaterThan(0)
    expect(b).toBeLessThan(100)
  })
})
