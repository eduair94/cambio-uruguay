import { describe, expect, it } from 'vitest'
import {
  LOCAL_PROJECTS,
  LOCAL_PROJECT_CATEGORIES,
  LOCAL_PROJECT_SOURCES,
  localProjectsByCategory,
  getLocalProject,
  lpMinInvestmentLabel,
  lpRiskLabel,
  lpRegulationBadge,
  type LocalProject,
} from '../../utils/localProjects'

const RISKS = ['bajo', 'medio', 'alto', 'variable']
const REGS = ['bcu', 'exterior_regulado', 'no_regulado']
const CURRENCIES = ['UYU', 'USD', 'UI']

describe('local projects catalogue', () => {
  it('has unique ids and substantive required fields', () => {
    const ids = LOCAL_PROJECTS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of LOCAL_PROJECTS) {
      expect(p.name.trim()).not.toBe('')
      expect(p.regulationNote.trim().length).toBeGreaterThan(20)
      expect(p.taxNote.trim().length).toBeGreaterThan(10)
      expect(p.liquidity.trim()).not.toBe('')
      expect(p.horizon.trim()).not.toBe('')
      expect(p.note.trim().length).toBeGreaterThan(20)
      expect(p.source.startsWith('http')).toBe(true)
      expect(RISKS).toContain(p.riskLevel)
      expect(REGS).toContain(p.regulation)
      expect(Object.keys(LOCAL_PROJECT_CATEGORIES)).toContain(p.category)
      expect(typeof p.verified).toBe('boolean')
      if (p.minInvestment) {
        expect(p.minInvestment.amount).toBeGreaterThan(0)
        expect(CURRENCIES).toContain(p.minInvestment.currency)
      }
      if (p.website) expect(p.website.startsWith('http')).toBe(true)
    }
  })

  it('groups every project into a known category', () => {
    const grouped = localProjectsByCategory()
    const count = grouped.reduce((n, g) => n + g.items.length, 0)
    expect(count).toBe(LOCAL_PROJECTS.length)
    for (const g of grouped) {
      expect(g.items.length).toBeGreaterThan(0)
      expect(Object.keys(LOCAL_PROJECT_CATEGORIES)).toContain(g.category)
    }
  })

  it('includes exactly one cautionary (warning) row', () => {
    expect(LOCAL_PROJECTS.filter(p => p.caution).length).toBe(1)
  })

  it('formats minimum-investment labels', () => {
    const usd: LocalProject = {
      ...LOCAL_PROJECTS[0]!,
      minInvestment: { amount: 1000, currency: 'USD' },
    }
    const ui: LocalProject = {
      ...LOCAL_PROJECTS[0]!,
      minInvestment: { amount: 10000, currency: 'UI' },
    }
    const none: LocalProject = { ...LOCAL_PROJECTS[0]!, minInvestment: null }
    expect(lpMinInvestmentLabel(usd)).toContain('US$')
    expect(lpMinInvestmentLabel(ui)).toContain('UI')
    expect(lpMinInvestmentLabel(none)).toBe('Según la emisión')
  })

  it('resolves projects by id and labels risk/regulation', () => {
    expect(getLocalProject('crowder-crowdfunding')).toBeDefined()
    expect(getLocalProject('nope')).toBeUndefined()
    expect(lpRiskLabel('alto')).toBe('Alto')
    expect(lpRegulationBadge('bcu')).toBe('BCU')
    expect(lpRegulationBadge('no_regulado')).toBe('No regulado')
  })

  it('lists sources with valid urls', () => {
    expect(LOCAL_PROJECT_SOURCES.length).toBeGreaterThan(3)
    for (const s of LOCAL_PROJECT_SOURCES) {
      expect(s.label.trim()).not.toBe('')
      expect(s.url.startsWith('http')).toBe(true)
    }
  })
})
