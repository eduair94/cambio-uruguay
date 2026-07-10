import { describe, expect, it } from 'vitest'
import {
  estimateBudget,
  household,
  dwellingFor,
  realityChecks,
  VERDICT_META,
  SITUATION_LABELS,
  CITY_LABELS,
  type BudgetInputs,
} from '../../utils/costOfLiving'

const base: BudgetInputs = {
  netIncome: 40000,
  situation: 'solo',
  city: 'montevideo',
  housing: 'alquila',
  children: 0,
}

describe('household composition', () => {
  it('derives adults and children per situation', () => {
    expect(household({ ...base, situation: 'solo' })).toEqual({ adults: 1, children: 0 })
    expect(household({ ...base, situation: 'compartido' })).toEqual({ adults: 1, children: 0 })
    expect(household({ ...base, situation: 'pareja' })).toEqual({ adults: 2, children: 0 })
    expect(household({ ...base, situation: 'familia', children: 2 })).toEqual({
      adults: 2,
      children: 2,
    })
    // children ignored unless familia
    expect(household({ ...base, situation: 'solo', children: 3 })).toEqual({
      adults: 1,
      children: 0,
    })
  })

  it('maps a standard dwelling to each situation', () => {
    expect(dwellingFor('solo')).toBe('monoambiente')
    expect(dwellingFor('compartido')).toBe('habitacion_compartida')
    expect(dwellingFor('pareja')).toBe('1_dormitorio')
    expect(dwellingFor('familia')).toBe('2_dormitorios')
  })
})

describe('estimateBudget', () => {
  it('computes positive essentials with all six lines', () => {
    const r = estimateBudget(base)
    expect(r.essentials).toBeGreaterThan(0)
    expect(r.essentialLines).toHaveLength(6)
    expect(r.essentialLines.reduce((s, l) => s + l.amount, 0)).toBe(r.essentials)
  })

  it('marks noAlcanza with a deficit when income is below essentials', () => {
    const essentials = estimateBudget(base).essentials
    const r = estimateBudget({ ...base, netIncome: Math.round(essentials * 0.8) })
    expect(r.verdict).toBe('noAlcanza')
    expect(r.deficit).toBeGreaterThan(0)
    expect(r.savingsSuggested).toBe(0)
    expect(r.discretionary).toBeLessThan(0)
  })

  it('marks holgado with savings when income is well above essentials', () => {
    const essentials = estimateBudget(base).essentials
    const r = estimateBudget({ ...base, netIncome: Math.round(essentials * 2.2) })
    expect(r.verdict).toBe('holgado')
    expect(r.deficit).toBe(0)
    expect(r.savingsSuggested).toBeGreaterThan(0)
    expect(r.discretionary).toBeGreaterThan(0)
  })

  it('walks the verdict tiers as income rises', () => {
    const essentials = estimateBudget(base).essentials
    const tierAt = (mult: number) =>
      estimateBudget({ ...base, netIncome: Math.round(essentials * mult) }).verdict
    expect(tierAt(0.9)).toBe('noAlcanza')
    expect(tierAt(1.1)).toBe('ajustado')
    expect(tierAt(1.25)).toBe('justo')
    expect(tierAt(1.6)).toBe('comodo')
    expect(tierAt(2.0)).toBe('holgado')
  })

  it('interior is cheaper than Montevideo, sharing cheaper than living alone', () => {
    const mvd = estimateBudget({ ...base, situation: 'solo', city: 'montevideo' }).essentials
    const interior = estimateBudget({ ...base, situation: 'solo', city: 'interior' }).essentials
    const shared = estimateBudget({
      ...base,
      situation: 'compartido',
      city: 'montevideo',
    }).essentials
    expect(interior).toBeLessThan(mvd)
    expect(shared).toBeLessThan(mvd)
  })

  it('owning (no rent) lowers essentials vs renting', () => {
    const renting = estimateBudget({ ...base, housing: 'alquila' }).essentials
    const owning = estimateBudget({ ...base, housing: 'propia' }).essentials
    expect(owning).toBeLessThan(renting)
    // the difference is roughly the rent line
    const rentLine = estimateBudget({ ...base, housing: 'alquila' }).essentialLines.find(
      l => l.key === 'vivienda'
    )!
    expect(renting - owning).toBe(rentLine.amount)
  })

  it('clamps invalid income to zero', () => {
    const r = estimateBudget({ ...base, netIncome: -100 })
    expect(r.income).toBe(0)
    expect(r.verdict).toBe('noAlcanza')
  })
})

describe('reality checks + metadata', () => {
  it('returns tips, including the deficit when it does not add up', () => {
    const essentials = estimateBudget(base).essentials
    const r = estimateBudget({ ...base, netIncome: Math.round(essentials * 0.8) })
    const tips = realityChecks(r, { ...base, netIncome: Math.round(essentials * 0.8) })
    expect(tips.length).toBeGreaterThan(0)
    expect(tips.some(t => t.toLowerCase().includes('faltan'))).toBe(true)
  })

  it('has metadata for every verdict, situation and city', () => {
    for (const v of ['noAlcanza', 'ajustado', 'justo', 'comodo', 'holgado'] as const) {
      expect(VERDICT_META[v].label.trim()).not.toBe('')
      expect(VERDICT_META[v].message.trim().length).toBeGreaterThan(20)
    }
    for (const s of ['solo', 'compartido', 'pareja', 'familia'] as const) {
      expect(SITUATION_LABELS[s].trim()).not.toBe('')
    }
    for (const c of ['montevideo', 'interior'] as const) {
      expect(CITY_LABELS[c].trim()).not.toBe('')
    }
  })
})
