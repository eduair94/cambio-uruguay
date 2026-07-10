import { describe, expect, it } from 'vitest'
import {
  INCOME_IDEAS,
  INCOME_CATEGORIES,
  HEALTH_PILLARS,
  HEALTH_LEVELS,
  UY_FACTS,
  incomeIdeasByCategory,
  getIncomeIdea,
  effortLabel,
  scoreHealth,
  allHealthItemIds,
  maxHealthWeight,
} from '../../utils/personalFinance'

const EFFORTS = ['bajo', 'medio', 'alto']

describe('extra-income ideas catalogue', () => {
  it('has unique ids and substantive fields', () => {
    const ids = INCOME_IDEAS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(INCOME_IDEAS.length).toBeGreaterThanOrEqual(10)
    for (const idea of INCOME_IDEAS) {
      expect(idea.name.trim()).not.toBe('')
      expect(EFFORTS).toContain(idea.effort)
      expect(Object.keys(INCOME_CATEGORIES)).toContain(idea.category)
      expect(idea.startupCapital.trim()).not.toBe('')
      expect(idea.incomePotential.trim()).not.toBe('')
      expect(idea.timeToFirst.trim()).not.toBe('')
      expect(idea.howToStart.trim().length).toBeGreaterThan(20)
      expect(idea.uyNote.trim().length).toBeGreaterThan(20)
      expect(Array.isArray(idea.skills)).toBe(true)
    }
  })

  it('groups every idea into a known category and resolves by id', () => {
    const grouped = incomeIdeasByCategory()
    const count = grouped.reduce((n, g) => n + g.items.length, 0)
    expect(count).toBe(INCOME_IDEAS.length)
    expect(getIncomeIdea(INCOME_IDEAS[0]!.id)).toBeDefined()
    expect(getIncomeIdea('nope')).toBeUndefined()
    expect(effortLabel('bajo')).toBe('Bajo')
  })
})

describe('financial-health checklist', () => {
  it('has 5 pillars with unique item ids and valid weights', () => {
    expect(HEALTH_PILLARS.length).toBe(5)
    const ids = allHealthItemIds()
    expect(new Set(ids).size).toBe(ids.length)
    for (const pillar of HEALTH_PILLARS) {
      expect(pillar.title.trim()).not.toBe('')
      expect(pillar.icon.startsWith('mdi-')).toBe(true)
      expect(pillar.items.length).toBeGreaterThanOrEqual(3)
      for (const item of pillar.items) {
        expect(item.label.trim()).not.toBe('')
        expect(item.weight).toBeGreaterThanOrEqual(1)
        expect(item.weight).toBeLessThanOrEqual(3)
      }
    }
    expect(maxHealthWeight()).toBeGreaterThan(0)
  })

  it('scores 0 (crítico) when nothing is checked', () => {
    const r = scoreHealth([])
    expect(r.score).toBe(0)
    expect(r.level).toBe('critico')
    expect(r.checkedCount).toBe(0)
  })

  it('scores 100 (sólido) when everything is checked', () => {
    const r = scoreHealth(allHealthItemIds())
    expect(r.score).toBe(100)
    expect(r.level).toBe('solido')
    expect(r.checkedCount).toBe(r.totalCount)
  })

  it('is monotonic and ignores unknown ids', () => {
    const ids = allHealthItemIds()
    const partial = scoreHealth(ids.slice(0, 4))
    const more = scoreHealth(ids.slice(0, 8))
    expect(more.score).toBeGreaterThanOrEqual(partial.score)
    expect(scoreHealth(['does-not-exist']).score).toBe(0)
  })

  it('exposes advice + colour for every level', () => {
    for (const level of ['critico', 'enproceso', 'saludable', 'solido'] as const) {
      expect(HEALTH_LEVELS[level].label.trim()).not.toBe('')
      expect(HEALTH_LEVELS[level].advice.trim().length).toBeGreaterThan(10)
      expect(HEALTH_LEVELS[level].color.trim()).not.toBe('')
    }
  })
})

describe('Uruguay facts', () => {
  it('are non-empty and cite a source url', () => {
    expect(UY_FACTS.length).toBeGreaterThanOrEqual(5)
    for (const f of UY_FACTS) {
      expect(f.fact.trim().length).toBeGreaterThan(30)
      expect(f.sourceLabel.trim()).not.toBe('')
      expect(f.sourceUrl.startsWith('http')).toBe(true)
      expect(typeof f.official).toBe('boolean')
    }
  })
})
