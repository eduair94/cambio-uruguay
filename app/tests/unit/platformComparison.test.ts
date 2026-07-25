import { describe, expect, it } from 'vitest'
import {
  COMPARISON_CRITERIA,
  COMPARISON_SOURCES,
  PLATFORM_KEYS,
  filterCriteria,
  leaderCounts,
  sourcesForCriterion,
} from '../../utils/platformComparison'

describe('platform comparison catalogue', () => {
  it('compares every platform in every criterion', () => {
    for (const criterion of COMPARISON_CRITERIA) {
      expect(Object.keys(criterion.statuses).sort()).toEqual([...PLATFORM_KEYS].sort())
    }
  })

  it('backs every comparison row with resolvable public sources', () => {
    const ids = new Set(COMPARISON_SOURCES.map(source => source.id))

    for (const criterion of COMPARISON_CRITERIA) {
      expect(criterion.sourceIds.length).toBeGreaterThan(0)
      expect(criterion.sourceIds.every(id => ids.has(id))).toBe(true)
      expect(sourcesForCriterion(criterion).length).toBe(criterion.sourceIds.length)
    }
  })

  it('uses secure public source URLs', () => {
    expect(COMPARISON_SOURCES.every(source => source.url.startsWith('https://'))).toBe(true)
    expect(new Set(COMPARISON_SOURCES.map(source => source.id)).size).toBe(
      COMPARISON_SOURCES.length
    )
  })

  it('keeps Cambio Uruguay ahead without claiming every category', () => {
    const counts = leaderCounts()

    expect(counts.cambioUruguay).toBeGreaterThan(counts.dolarAhora)
    expect(counts.dolarAhora).toBeGreaterThan(0)
    expect(
      COMPARISON_CRITERIA.some(
        criterion =>
          criterion.statuses.dolarAhora === 'leader' &&
          criterion.statuses.cambioUruguay !== 'leader'
      )
    ).toBe(true)
  })

  it('filters the matrix by user need', () => {
    expect(filterCriteria('market').every(row => row.category === 'market')).toBe(true)
    expect(filterCriteria('all')).toHaveLength(COMPARISON_CRITERIA.length)
  })
})
