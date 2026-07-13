import { describe, expect, it } from 'vitest'
import { applyCostOverrides, baselineCosts } from '../../server/utils/costsMerge'
import { COST_MODEL, SALARY_REFERENCE } from '../../utils/costOfLiving'

// The guardrail behaviour the page depends on: no overrides -> pure baseline; a valid boleto or
// rent figure is applied with the SAME arithmetic that used to live in costOfLivingLive.ts
// (transporte = boleto x 2 tramos x 22 días, rents rounded to the nearest 500); anything null,
// absent, or from an empty/never-synced backend leaves the baseline untouched.
describe('applyCostOverrides', () => {
  it('returns the pure baseline when live is null', () => {
    const out = applyCostOverrides(null)
    expect(out.model).toEqual(COST_MODEL)
    expect(out.salary).toEqual(SALARY_REFERENCE)
    expect(out.asOf).toBeNull()
    expect(out.updated).toEqual([])
  })

  it('returns the pure baseline when updated is empty (never synced)', () => {
    const out = applyCostOverrides({ figures: {}, asOf: null, updated: [], sources: [] })
    expect(out.model).toEqual(COST_MODEL)
    expect(out.salary).toEqual(SALARY_REFERENCE)
  })

  it('a boleto of 52 becomes transportPerAdult 2288 (52 x 2 x 22, rounded to the nearest 100)', () => {
    const out = applyCostOverrides({
      figures: { boletoStm: 52 },
      asOf: '2026-07-13T00:00:00.000Z',
      updated: ['boletoStm'],
      sources: [],
    })
    expect(out.model.transportPerAdult).toBe(2300)
  })

  it('a rent of 26300 is rounded to the nearest 500 (26500)', () => {
    const out = applyCostOverrides({
      figures: { rent1: 26300 },
      asOf: '2026-07-13T00:00:00.000Z',
      updated: ['rent1'],
      sources: [],
    })
    expect(out.model.rentMontevideo['1_dormitorio']).toBe(26500)
  })

  it('applies salarioMinimo to salary.minimoNacional verbatim (no rounding)', () => {
    const out = applyCostOverrides({
      figures: { salarioMinimo: 26500 },
      asOf: '2026-07-13T00:00:00.000Z',
      updated: ['salarioMinimo'],
      sources: [],
    })
    expect(out.salary.minimoNacional).toBe(26500)
    // Untouched fields keep the baseline.
    expect(out.model.transportPerAdult).toBe(COST_MODEL.transportPerAdult)
  })

  it('a null/absent field leaves the baseline value for that field', () => {
    const out = applyCostOverrides({
      figures: { salarioMinimo: 26500, rentMono: undefined },
      asOf: '2026-07-13T00:00:00.000Z',
      updated: ['salarioMinimo'],
      sources: [],
    })
    expect(out.model.rentMontevideo.monoambiente).toBe(COST_MODEL.rentMontevideo.monoambiente)
  })

  it('never mutates the shared COST_MODEL/SALARY_REFERENCE singletons', () => {
    const beforeRent = COST_MODEL.rentMontevideo.monoambiente
    const beforeSalary = SALARY_REFERENCE.minimoNacional
    applyCostOverrides({
      figures: { rentMono: 20000, salarioMinimo: 30000 },
      asOf: '2026-07-13T00:00:00.000Z',
      updated: ['rentMono', 'salarioMinimo'],
      sources: [],
    })
    expect(COST_MODEL.rentMontevideo.monoambiente).toBe(beforeRent)
    expect(SALARY_REFERENCE.minimoNacional).toBe(beforeSalary)
  })

  it('carries through asOf, updated and sources', () => {
    const out = applyCostOverrides({
      figures: { boletoStm: 55 },
      asOf: '2026-07-13T00:00:00.000Z',
      updated: ['boletoStm'],
      sources: [{ label: 'INE', url: 'https://ine.gub.uy' }],
    })
    expect(out.asOf).toBe('2026-07-13T00:00:00.000Z')
    expect(out.updated).toEqual(['boletoStm'])
    expect(out.sources).toEqual([{ label: 'INE', url: 'https://ine.gub.uy' }])
  })
})

describe('baselineCosts', () => {
  it('returns a fresh, unlinked copy each call', () => {
    const a = baselineCosts()
    const b = baselineCosts()
    a.model.rentMontevideo.monoambiente = 999999
    expect(b.model.rentMontevideo.monoambiente).toBe(COST_MODEL.rentMontevideo.monoambiente)
  })
})
