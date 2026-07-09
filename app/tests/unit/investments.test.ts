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
