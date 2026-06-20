import { describe, expect, it } from 'vitest'
import type { ExchangeRate } from '../../types/api'
import {
  currentIndicatorValue,
  indicatorFromSlug,
  indicators,
  listIndicatorSlugs,
} from '../../utils/indicators'

const row = (origin: string, code: string, value: number): ExchangeRate => ({
  origin,
  date: '2026-06-20',
  type: '',
  code,
  name: code,
  buy: value,
  sell: value,
})

describe('indicatorFromSlug / listIndicatorSlugs', () => {
  it('resolves every catalogue slug', () => {
    for (const slug of listIndicatorSlugs()) {
      expect(indicatorFromSlug(slug)?.slug).toBe(slug)
    }
  })

  it('is case-insensitive and trims', () => {
    expect(indicatorFromSlug('  UNIDAD-INDEXADA ')?.code).toBe('UI')
  })

  it('returns null for unknown or empty slugs', () => {
    expect(indicatorFromSlug('zzz')).toBeNull()
    expect(indicatorFromSlug('')).toBeNull()
    expect(indicatorFromSlug('   ')).toBeNull()
  })

  it('includes UI, UR and BPC', () => {
    expect(listIndicatorSlugs()).toEqual(['unidad-indexada', 'unidad-reajustable', 'bpc'])
  })
})

describe('catalogue integrity', () => {
  it('gives every indicator non-empty copy and at least three FAQs', () => {
    for (const ind of indicators) {
      expect(ind.name.length).toBeGreaterThan(0)
      expect(ind.whatItIs.length).toBeGreaterThan(60)
      expect(ind.usedFor.length).toBeGreaterThanOrEqual(3)
      expect(ind.faqs.length).toBeGreaterThanOrEqual(3)
      expect(ind.referenceValue).toBeGreaterThan(0)
    }
  })

  it('only allows UI/UR/null as live codes', () => {
    for (const ind of indicators) {
      expect([null, 'UI', 'UR']).toContain(ind.code)
    }
  })
})

describe('currentIndicatorValue', () => {
  const ui = indicatorFromSlug('unidad-indexada')!
  const ur = indicatorFromSlug('unidad-reajustable')!
  const bpc = indicatorFromSlug('bpc')!

  it('prefers the authoritative BCU row', () => {
    const rows = [
      row('itau', 'UI', 6.5),
      row('bcu', 'UI', 6.5827),
      row('cambio_argentino', 'UI', 6.6),
    ]
    expect(currentIndicatorValue(rows, ui)).toBe(6.5827)
  })

  it('falls back to the first valid non-BCU row when no BCU row exists', () => {
    const rows = [row('itau', 'UI', 6.5), row('cambio_argentino', 'UI', 6.6)]
    expect(currentIndicatorValue(rows, ui)).toBe(6.5)
  })

  it('falls back to the static reference value when the code is absent', () => {
    expect(currentIndicatorValue([], ur)).toBe(ur.referenceValue)
  })

  it('ignores zero / non-positive quotes', () => {
    const rows = [row('cambio_argentino', 'UI', 0), row('bcu', 'UI', 6.59)]
    expect(currentIndicatorValue(rows, ui)).toBe(6.59)
  })

  it('always returns the reference value for statically-valued indicators (BPC)', () => {
    const rows = [row('bcu', 'UI', 6.5827)]
    expect(currentIndicatorValue(rows, bpc)).toBe(bpc.referenceValue)
  })
})
