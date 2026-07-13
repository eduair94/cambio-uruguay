import { describe, expect, it } from 'vitest'
import {
  applyLiveCompanyFigures,
  baselineCompanyFigures,
  COMPANY_FIGURE_BANDS,
  ageInDays,
} from '../../server/utils/companyFiguresLive'

describe('applyLiveCompanyFigures guardrails', () => {
  it('keeps the baseline when the payload is empty', () => {
    const { figures, updated } = applyLiveCompanyFigures(baselineCompanyFigures(), {})
    expect(updated).toEqual([])
    expect(figures).toEqual(baselineCompanyFigures())
  })

  it('accepts an in-band value and marks it updated', () => {
    const { figures, updated } = applyLiveCompanyFigures(baselineCompanyFigures(), {
      bpsUnipersonalPleno: 8900,
    })
    expect(updated).toEqual(['bpsUnipersonalPleno'])
    expect(figures.bpsUnipersonalPleno).toBe(8900)
  })

  it('rejects an out-of-band value and keeps the baseline for it', () => {
    const base = baselineCompanyFigures()
    const { figures, updated } = applyLiveCompanyFigures(base, {
      ivaMinimo: 999_999, // absurd, above band
      bpsUnipersonalPleno: 8900, // in band
    })
    expect(updated).toEqual(['bpsUnipersonalPleno'])
    expect(figures.ivaMinimo).toBe(base.ivaMinimo) // hallucination rejected
    expect(figures.bpsUnipersonalPleno).toBe(8900)
  })

  it('rejects a non-number, and a below-band value', () => {
    const base = baselineCompanyFigures()
    const { figures, updated } = applyLiveCompanyFigures(base, {
      ivaMinimo: 'cinco mil' as unknown as number,
      icosaAnual: 1, // below band
    })
    expect(updated).toEqual([])
    expect(figures).toEqual(base)
  })

  it('rounds an accepted value to a whole peso', () => {
    const { figures } = applyLiveCompanyFigures(baselineCompanyFigures(), {
      bpsAdminSas: 10504.73,
    })
    expect(figures.bpsAdminSas).toBe(10505)
  })

  it('never mutates the baseline it was handed', () => {
    const base = baselineCompanyFigures()
    const before = base.ivaMinimo
    applyLiveCompanyFigures(base, { ivaMinimo: 6200 })
    expect(base.ivaMinimo).toBe(before)
  })

  it('every band is a valid [min, max] pair enclosing its baseline value', () => {
    const base = baselineCompanyFigures()
    for (const [key, [lo, hi]] of Object.entries(COMPANY_FIGURE_BANDS)) {
      expect(lo, `${key} band`).toBeLessThan(hi)
      const v = base[key as keyof typeof COMPANY_FIGURE_BANDS]
      expect(v, `${key} baseline in band`).toBeGreaterThanOrEqual(lo)
      expect(v).toBeLessThanOrEqual(hi)
    }
  })
})

describe('ageInDays', () => {
  it('is Infinity for a null timestamp', () => {
    expect(ageInDays(null)).toBe(Infinity)
  })
  it('is ~0 for a just-now timestamp', () => {
    expect(ageInDays(new Date().toISOString())).toBeLessThan(1)
  })
})
