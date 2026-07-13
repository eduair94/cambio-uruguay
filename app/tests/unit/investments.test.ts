// app/tests/unit/investments.test.ts
import { describe, expect, it } from 'vitest'
import {
  INVESTMENTS,
  INVESTMENT_CATEGORIES,
  getInvestment,
  investmentsByCategory,
  riskLabel,
  minInvestmentLabel,
  type InvestmentOption,
} from '../../utils/investments'

describe('investments catalog', () => {
  it('has unique ids', () => {
    const ids = INVESTMENTS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('every option has a source URL', () => {
    for (const i of INVESTMENTS) expect(i.source).toMatch(/^https?:\/\//)
  })
  it('rating is null or within 0..5', () => {
    for (const i of INVESTMENTS) {
      if (i.rating != null) {
        expect(i.rating).toBeGreaterThanOrEqual(0)
        expect(i.rating).toBeLessThanOrEqual(5)
      }
    }
  })
  it('every rated option cites at least one review source', () => {
    for (const i of INVESTMENTS) {
      if (i.rating != null) expect(i.reviewSources.length).toBeGreaterThan(0)
    }
  })
  it('covers all six tabular categories', () => {
    const cats = new Set(INVESTMENTS.map(i => i.category))
    expect([...cats].sort()).toEqual(
      [
        'banco_broker',
        'broker_internacional',
        'cripto',
        'fintech',
        'fondo_inversion',
        'renta_fija_local',
      ].sort()
    )
  })
  it('minInvestment is null or has a positive amount', () => {
    for (const i of INVESTMENTS) {
      if (i.minInvestment != null) expect(i.minInvestment.amount).toBeGreaterThan(0)
    }
  })
})

// Invariants over `taxNote`. These exist because three tax errors lived in this field
// unguarded: the 8% presented as a rate available whenever "un agente residente" withholds,
// a crypto percentage we have no norm for, and a step-up stated without its statutory
// condition. Source of truth: docs/superpowers/specs/2026-07-12-impuestos-inversiones-design.md.
describe('investments taxNote invariants', () => {
  it('every option has a non-empty taxNote', () => {
    for (const i of INVESTMENTS) {
      expect(i.taxNote.trim(), `${i.id} has an empty taxNote`).not.toBe('')
    }
  })

  it('no crypto row publishes a percentage (the treatment is unresolved)', () => {
    for (const i of INVESTMENTS.filter(i => i.category === 'cripto')) {
      expect(i.taxNote, `${i.id} publishes a crypto percentage: no norm settles it`).not.toMatch(
        /%/
      )
    }
  })

  it('never presents the 8% as a rate: it is a withholding, and only a custodian may apply it', () => {
    for (const i of INVESTMENTS.filter(i => i.taxNote.includes('8%'))) {
      expect(i.taxNote, `${i.id} mentions 8% without calling it a retención`).toMatch(/retención/)
      // T7 art. 52 lit. A + Dec. 148/007: only a resident entity that intermediates AND holds
      // custody may withhold the 8%. Without the custody condition the note reads as "any
      // resident agent", which is the error this guard exists to kill.
      expect(i.taxNote, `${i.id} mentions 8% without the custody condition`).toMatch(/custodi/)
    }
  })

  it('never states the 2025 step-up without its "bolsas de reconocido prestigio" condition', () => {
    for (const i of INVESTMENTS.filter(i => i.taxNote.includes('31/12/2025'))) {
      expect(i.taxNote, `${i.id} states the step-up unconditionally`).toMatch(
        /bolsas de reconocido prestigio/
      )
    }
  })
})

describe('investments helpers', () => {
  it('riskLabel maps every level to a capitalized Spanish label', () => {
    expect(riskLabel('bajo')).toBe('Bajo')
    expect(riskLabel('medio')).toBe('Medio')
    expect(riskLabel('alto')).toBe('Alto')
    expect(riskLabel('variable')).toBe('Variable')
  })
  it('minInvestmentLabel formats amount+currency or falls back to Sin mínimo', () => {
    const withAmount: InvestmentOption = {
      ...INVESTMENTS[0]!,
      minInvestment: { amount: 1000, currency: 'USD' },
    }
    expect(minInvestmentLabel(withAmount)).toBe('US$ 1.000')
    const noMin: InvestmentOption = { ...INVESTMENTS[0]!, minInvestment: null }
    expect(minInvestmentLabel(noMin)).toBe('Sin mínimo')
  })
  it('investmentsByCategory groups in INVESTMENT_CATEGORIES order with all options', () => {
    const groups = investmentsByCategory()
    expect(groups.map(g => g.category)).toEqual(Object.keys(INVESTMENT_CATEGORIES))
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(INVESTMENTS.length)
  })
  it('getInvestment finds by id', () => {
    expect(getInvestment(INVESTMENTS[0]!.id)?.id).toBe(INVESTMENTS[0]!.id)
    expect(getInvestment('nope')).toBeUndefined()
  })
})
