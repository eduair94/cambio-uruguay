// app/tests/unit/bankTierlist.test.ts
import { describe, expect, it } from 'vitest'
import {
  BANKS,
  BANK_RUBRIC,
  DIM_IDS,
  TIERS,
  PROFILE_PRESETS,
  scoreFor,
  tierForScore,
  rankEntities,
  buildBoard,
  matchPreset,
  type DimId,
} from '../../utils/bankTierlist'

describe('bankTierlist data integrity', () => {
  it('has unique entity ids', () => {
    const ids = BANKS.map(b => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('rubric weights sum to 100', () => {
    expect(BANK_RUBRIC.reduce((n, d) => n + d.weight, 0)).toBe(100)
  })

  it('every entity is scored 0..100 on every dimension', () => {
    for (const b of BANKS) {
      for (const id of DIM_IDS) {
        const v = b.scores[id]
        expect(v, `${b.id}.${id}`).toBeGreaterThanOrEqual(0)
        expect(v, `${b.id}.${id}`).toBeLessThanOrEqual(100)
      }
    }
  })

  it('every entity has pros, cons and at least one signal', () => {
    for (const b of BANKS) {
      expect(b.pros.length, b.id).toBeGreaterThan(0)
      expect(b.cons.length, b.id).toBeGreaterThan(0)
      expect(b.signals.length, b.id).toBeGreaterThan(0)
    }
  })

  it('presets reference only real dimensions and are non-empty', () => {
    for (const p of PROFILE_PRESETS) {
      expect(p.dims.length, p.id).toBeGreaterThan(0)
      for (const d of p.dims) expect(DIM_IDS).toContain(d)
    }
  })
})

describe('scoreFor', () => {
  it('balanced score equals the weighted average of all six dimensions', () => {
    const b = BANKS[0]!
    const expected = Math.round(
      BANK_RUBRIC.reduce((n, d) => n + b.scores[d.id] * d.weight, 0) / 100
    )
    expect(scoreFor(b, DIM_IDS)).toBe(expected)
  })

  it('a single active dimension returns that dimension score', () => {
    const b = BANKS[0]!
    expect(scoreFor(b, ['usd'])).toBe(b.scores.usd)
  })

  it('an empty subset falls back to all dimensions (hides nothing)', () => {
    const b = BANKS[0]!
    expect(scoreFor(b, [])).toBe(scoreFor(b, DIM_IDS))
  })

  it('re-weights over a subset by the original rubric weights', () => {
    const b = BANKS[0]!
    const sub: DimId[] = ['app', 'cobertura']
    const wApp = BANK_RUBRIC.find(d => d.id === 'app')!.weight
    const wCob = BANK_RUBRIC.find(d => d.id === 'cobertura')!.weight
    const expected = Math.round((b.scores.app * wApp + b.scores.cobertura * wCob) / (wApp + wCob))
    expect(scoreFor(b, sub)).toBe(expected)
  })
})

describe('tierForScore boundaries', () => {
  it('maps scores to the highest tier whose minimum they clear', () => {
    expect(tierForScore(90)).toBe('S')
    expect(tierForScore(85)).toBe('S')
    expect(tierForScore(84)).toBe('A')
    expect(tierForScore(72)).toBe('A')
    expect(tierForScore(64)).toBe('B')
    expect(tierForScore(54)).toBe('C')
    expect(tierForScore(44)).toBe('D')
    expect(tierForScore(43)).toBe('F')
    expect(tierForScore(0)).toBe('F')
  })
})

describe('board + ranking', () => {
  it('ranks entities best → worst', () => {
    const ranked = rankEntities(DIM_IDS)
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.score).toBeGreaterThanOrEqual(ranked[i]!.score)
    }
  })

  it('board has all six tier rows and covers every entity exactly once', () => {
    const board = buildBoard(DIM_IDS)
    expect(board.map(r => r.tier.id)).toEqual(TIERS.map(t => t.id))
    const total = board.reduce((n, r) => n + r.items.length, 0)
    expect(total).toBe(BANKS.length)
  })

  it('with balanced criteria no entity reaches S — the local ceiling', () => {
    const ranked = rankEntities(DIM_IDS)
    expect(ranked.every(r => r.tier !== 'S')).toBe(true)
    expect(ranked[0]!.score).toBeLessThan(85)
  })

  it('Mercado Pago tops the balanced board in tier A', () => {
    const top = rankEntities(DIM_IDS)[0]!
    expect(top.entity.id).toBe('mercadopago')
    expect(top.tier).toBe('A')
  })

  it('Scotiabank is the bottom of the balanced board — it runs the worst app in the country', () => {
    const ranked = rankEntities(DIM_IDS)
    const last = ranked[ranked.length - 1]!
    expect(last.entity.id).toBe('scotiabank')
    expect(last.tier).toBe('D')
  })

  it('BTG replaced HSBC on the board after the 2026-07-10 takeover', () => {
    const ids = BANKS.map(b => b.id)
    expect(ids).toContain('btg')
    expect(ids).not.toContain('hsbc')
  })

  it('Prex is no longer bottom-tier: the best-rated app on the board, sunk by its support', () => {
    // We used to score Prex productos=40 AND comisiones=46 — punishing the same defect twice.
    // Corrected, it clears D. What still drags it down is `atencion`, and only that.
    const byId = Object.fromEntries(rankEntities(DIM_IDS).map(r => [r.entity.id, r.tier]))
    expect(byId.prex).toBe('C')
    const bestApp = [...BANKS].sort((a, b) => b.scores.app - a.scores.app)[0]!
    expect(bestApp.id).toBe('itau')
    expect(BANKS.find(b => b.id === 'prex')!.scores.app).toBeGreaterThan(
      BANKS.find(b => b.id === 'scotiabank')!.scores.app
    )
  })
})

describe('interactive re-tiering', () => {
  it('a USD-only view sends the dollar specialists into S', () => {
    const ranked = rankEntities(['usd'])
    const top = ranked.filter(r => r.tier === 'S').map(r => r.entity.id)
    expect(top).toContain('heritage')
    expect(top).toContain('takenos')
  })

  it('an attention-only view drops Prex to F', () => {
    const ranked = rankEntities(['atencion'])
    const prex = ranked.find(r => r.entity.id === 'prex')!
    expect(prex.tier).toBe('F')
  })
})

describe('matchPreset', () => {
  it('matches the balanced preset when all dimensions are active (order-insensitive)', () => {
    expect(matchPreset([...DIM_IDS].reverse())?.id).toBe('equilibrado')
  })
  it('returns undefined for a selection no preset covers', () => {
    expect(matchPreset(['app'])).toBeUndefined()
  })
})
