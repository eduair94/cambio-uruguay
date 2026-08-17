import { describe, expect, it } from 'vitest'
import {
  REWARD_RUBRIC,
  ISSUER_TYPE_LABELS,
  NETWORK_LABELS,
  CARD_PROGRAMS,
  PROGRAM_REDDIT_ENTITY,
  computeOverall,
  rankedPrograms,
  medalFor,
  getCardProgram,
  billPayWorthIt,
  type CardProgram,
  type RubricId,
} from '../../utils/cardRewards'

const ZERO: Record<RubricId, number> = {
  acumulacion: 0,
  canje: 0,
  descuentos: 0,
  costo: 0,
  flexibilidad: 0,
  cobertura: 0,
}
const full = (n: number): Record<RubricId, number> => ({
  acumulacion: n,
  canje: n,
  descuentos: n,
  costo: n,
  flexibilidad: n,
  cobertura: n,
})

const stub = (id: string, scores: Record<RubricId, number>): CardProgram => ({
  id,
  name: id,
  issuer: 'x',
  issuerType: 'banco',
  networks: ['visa'],
  pointsProgramName: 'p',
  earnRateNote: 'n',
  redemptionNote: 'n',
  discountNote: 'n',
  feeNote: 'n',
  pros: [],
  cons: [],
  bestFor: 'n',
  scores,
  verified: true,
})

describe('reward rubric', () => {
  it('has unique ids and weights that sum to 100', () => {
    const ids = REWARD_RUBRIC.map(d => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(REWARD_RUBRIC.reduce((s, d) => s + d.weight, 0)).toBe(100)
    for (const d of REWARD_RUBRIC) {
      expect(d.label.trim()).not.toBe('')
      expect(d.what.trim().length).toBeGreaterThan(10)
    }
  })
})

describe('overall score', () => {
  it('is 0 for all-zero and 100 for all-100', () => {
    expect(computeOverall(ZERO)).toBe(0)
    expect(computeOverall(full(100))).toBe(100)
    expect(computeOverall(full(50))).toBe(50)
  })

  it('weights the dimensions (acumulación pulls harder than cobertura)', () => {
    const a = computeOverall({ ...ZERO, acumulacion: 100 }) // weight 25
    const b = computeOverall({ ...ZERO, cobertura: 100 }) // weight 7
    expect(a).toBeGreaterThan(b)
    expect(a).toBe(25)
    expect(b).toBe(7)
  })
})

describe('ranking', () => {
  it('sorts by overall desc and assigns 1-indexed ranks', () => {
    const ranked = rankedPrograms([
      stub('low', full(30)),
      stub('high', full(90)),
      stub('mid', full(60)),
    ])
    expect(ranked.map(p => p.id)).toEqual(['high', 'mid', 'low'])
    expect(ranked.map(p => p.rank)).toEqual([1, 2, 3])
    expect(ranked[0].overall).toBe(90)
  })

  it('gives medals to the top three only', () => {
    expect(medalFor(1)).toBe('🥇')
    expect(medalFor(2)).toBe('🥈')
    expect(medalFor(3)).toBe('🥉')
    expect(medalFor(4)).toBeNull()
  })
})

describe('bill-pay worth-it calculator', () => {
  it('nets positive when reward beats surcharge', () => {
    const r = billPayWorthIt({ monthlyBills: 10000, rewardRatePct: 1, surchargePct: 0 })
    expect(r.yearlyReward).toBe(1200) // 120000 * 1%
    expect(r.yearlySurcharge).toBe(0)
    expect(r.net).toBe(1200)
    expect(r.worthIt).toBe(true)
  })

  it('nets negative when surcharge beats reward', () => {
    const r = billPayWorthIt({ monthlyBills: 10000, rewardRatePct: 0.5, surchargePct: 3 })
    expect(r.net).toBeLessThan(0)
    expect(r.worthIt).toBe(false)
  })

  it('clamps invalid/negative inputs to zero', () => {
    const r = billPayWorthIt({ monthlyBills: -5, rewardRatePct: -1, surchargePct: -2 })
    expect(r).toEqual({ yearlyReward: 0, yearlySurcharge: 0, net: 0, worthIt: false })
  })
})

describe('card programs catalogue invariants', () => {
  it('has unique ids and valid, in-range scores', () => {
    const ids = CARD_PROGRAMS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    const rubricIds = REWARD_RUBRIC.map(d => d.id)
    for (const p of CARD_PROGRAMS) {
      expect(p.name.trim()).not.toBe('')
      expect(p.issuer.trim()).not.toBe('')
      expect(Object.keys(ISSUER_TYPE_LABELS)).toContain(p.issuerType)
      expect(p.networks.length).toBeGreaterThan(0)
      for (const n of p.networks) expect(Object.keys(NETWORK_LABELS)).toContain(n)
      for (const dim of rubricIds) {
        expect(p.scores[dim]).toBeGreaterThanOrEqual(0)
        expect(p.scores[dim]).toBeLessThanOrEqual(100)
      }
      expect(p.pros.length + p.cons.length).toBeGreaterThan(0)
    }
  })

  it('resolves by id', () => {
    if (CARD_PROGRAMS.length) {
      expect(getCardProgram(CARD_PROGRAMS[0]!.id)).toBeDefined()
    }
    expect(getCardProgram('definitely-not-real')).toBeUndefined()
  })

  it('ranks no prepaid card: those belong to the debit ranking', () => {
    // This page is titled "Ranking de tarjetas de crédito". Prepaid cards are
    // ranked in utils/debitCards.ts. A card cannot sit in both, so a product
    // whose NAME is the prepaid card itself must not appear here. Mentioning a
    // prepaid sibling in the body is fine — BROU Recompensa, Puntos BBVA, OCA
    // Metraje and ANDA all do while ranking the credit card.
    for (const p of CARD_PROGRAMS) {
      const name = p.name.toLowerCase()
      // The rule is not "never say prepaid" — ANDA bundles its Prepaga DEANDA
      // into a name that leads with "Tarjeta de crédito ANDA". The rule is that
      // a name mentioning a prepaid product must ALSO name a credit card, which
      // is exactly what "Prex (tarjeta prepaga Mastercard)" failed to do.
      if (/prepag/.test(name)) expect(name).toMatch(/cr[ée]dito/)
    }
  })

  it('keeps out the three issuers removed on 2026-08-17 for having no credit card', () => {
    // Mercado Pago Uruguay issues no credit card at all (the credit card is
    // Argentine); Prex and MiDinero are prepaid by their own product name. A
    // research pass that re-adds any of them turns this red.
    const gone = ['mercado-pago-uruguay', 'prex-uruguay', 'midinero-uruguay']
    const ids = CARD_PROGRAMS.map(p => p.id)
    for (const id of gone) {
      expect(ids).not.toContain(id)
      expect(Object.keys(PROGRAM_REDDIT_ENTITY)).not.toContain(id)
    }
    for (const p of CARD_PROGRAMS) {
      expect(`${p.name} ${p.issuer}`.toLowerCase()).not.toContain('mercado pago')
    }
  })

  it('every Reddit entity mapping points at a programme that still exists', () => {
    const ids = new Set(CARD_PROGRAMS.map(p => p.id))
    for (const id of Object.keys(PROGRAM_REDDIT_ENTITY)) expect(ids).toContain(id)
  })
})
