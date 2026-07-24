import { describe, expect, it } from 'vitest'
import { RANKING_TIERS, rankingTierForScore } from '../../utils/rankingTiers'

describe('shared ranking tiers', () => {
  it('keeps every tier in descending order', () => {
    expect(RANKING_TIERS.map(tier => tier.id)).toEqual(['S', 'A', 'B', 'C', 'D', 'F'])
    expect(RANKING_TIERS.map(tier => tier.min)).toEqual([85, 72, 64, 54, 44, 0])
  })

  it('maps boundary scores consistently across product tops', () => {
    expect(rankingTierForScore(100)).toBe('S')
    expect(rankingTierForScore(85)).toBe('S')
    expect(rankingTierForScore(84)).toBe('A')
    expect(rankingTierForScore(72)).toBe('A')
    expect(rankingTierForScore(64)).toBe('B')
    expect(rankingTierForScore(54)).toBe('C')
    expect(rankingTierForScore(44)).toBe('D')
    expect(rankingTierForScore(0)).toBe('F')
  })
})
