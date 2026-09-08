import { describe, expect, it } from 'vitest'
import { applyCostOverrides, baselineCosts } from '../../server/utils/costsMerge'
import { COST_MODEL, INE_PER_CAPITA_LINES, SALARY_REFERENCE } from '../../utils/costOfLiving'

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

// La comida: el override que reexpresa el ancla del INE a precios de hoy.
//
// No reemplaza la cifra por una medida —el SIPC no puede dar el costo de la
// comida, su catalogo no tiene leche ni pan fresco ni legumbres— sino que deja
// de servir el nivel de precios de diciembre como presupuesto de hoy.
describe('applyCostOverrides: comida reexpresada', () => {
  const live = (figures: Record<string, unknown>, updated: string[]) =>
    applyCostOverrides({
      figures: figures as never,
      asOf: '2026-09-08T00:00:00.000Z',
      updated,
      sources: [],
    })

  it('sin inflacion, foodPerAdult queda como el baseline', () => {
    const out = live({ boletoStm: 52 }, ['boletoStm'])
    expect(out.model.foodPerAdult).toBe(COST_MODEL.foodPerAdult)
    expect(out.updated).not.toContain('foodPerAdult')
    expect(out.food).toBeDefined()
    expect(out.food!.adjusted).toBe(false)
  })

  it('con inflacion, sube el foodPerAdult y lo declara actualizado', () => {
    const out = live({ inflacionAnual: 5.5 }, ['inflacionAnual'])
    expect(out.model.foodPerAdult).toBeGreaterThan(COST_MODEL.foodPerAdult)
    expect(out.updated).toContain('foodPerAdult')
    expect(out.food!.adjusted).toBe(true)
    expect(out.food!.note).toMatch(/reexpresado/i)
  })

  it('una inflacion imposible no toca la comida', () => {
    const out = live({ inflacionAnual: 900 }, ['inflacionAnual'])
    expect(out.model.foodPerAdult).toBe(COST_MODEL.foodPerAdult)
    expect(out.food!.adjusted).toBe(false)
  })

  it('el resultado nunca queda por debajo de la linea de indigencia del INE', () => {
    // foodPerAdult es ~2x la CBA per capita; si un ajuste lo dejara debajo de la
    // CBA publicada, el ajuste esta mal, no la CBA.
    const out = live({ inflacionAnual: 5.5 }, ['inflacionAnual'])
    expect(out.model.foodPerAdult).toBeGreaterThan(INE_PER_CAPITA_LINES.montevideo.cba)
  })
})
