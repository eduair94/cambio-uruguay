// app/tests/unit/loanTierlist.test.ts
import { describe, expect, it } from 'vitest'
import {
  BCU_LABELS,
  CLEARING_LABELS,
  LENDER_TIERLIST,
  LOAN_DIM_IDS,
  LOAN_PROFILE_PRESETS,
  LOAN_RUBRIC,
  LOAN_TIERS,
  SEGMENT_LABELS,
  TEA_BEST,
  TEA_WORST,
  accesoScore,
  buildBoard,
  costoScore,
  matchPreset,
  mergeLenderFacts,
  rankLenders,
  representativeTea,
  scoreFor,
  scoresFor,
  teaScore,
  tierForScore,
  velocidadScore,
  type LenderEntity,
  type LenderFacts,
} from '../../utils/loanTierlist'

describe('loanTierlist data integrity', () => {
  it('has unique lender ids', () => {
    const ids = LENDER_TIERLIST.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('rubric weights sum to 100', () => {
    expect(LOAN_RUBRIC.reduce((n, d) => n + d.weight, 0)).toBe(100)
  })

  it('every lender has pros, cons, a signal and a verdict', () => {
    for (const l of LENDER_TIERLIST) {
      expect(l.pros.length, l.id).toBeGreaterThan(0)
      expect(l.cons.length, l.id).toBeGreaterThan(0)
      expect(l.signals.length, l.id).toBeGreaterThan(0)
      expect(l.verdict.length, l.id).toBeGreaterThan(40)
    }
  })

  // Every claim about who gets lent to has to come with the sentence behind it, because this is
  // the field a reader acts on: sending somebody with Clearing marks to a door that is shut costs
  // them a rejection that itself gets recorded.
  it('every lender explains its clearing stance in words', () => {
    for (const l of LENDER_TIERLIST) {
      expect(CLEARING_LABELS[l.clearing], l.id).toBeTruthy()
      expect(l.clearingNote.length, l.id).toBeGreaterThan(20)
    }
  })

  it('every lender has a reachable-looking website, source and at least one source link', () => {
    for (const l of LENDER_TIERLIST) {
      expect(l.website, l.id).toMatch(/^https?:\/\//)
      expect(l.sourceUrl, l.id).toMatch(/^https?:\/\//)
      expect(l.sources.length, l.id).toBeGreaterThan(0)
      for (const s of l.sources) expect(s.url, `${l.id} · ${s.label}`).toMatch(/^https?:\/\//)
    }
  })

  it('every lender uses a known segment and BCU status', () => {
    for (const l of LENDER_TIERLIST) {
      expect(SEGMENT_LABELS[l.segment], l.id).toBeTruthy()
      expect(BCU_LABELS[l.bcu], l.id).toBeTruthy()
    }
  })

  it('rates that are published sit inside a plausible Uruguayan band', () => {
    for (const l of LENDER_TIERLIST) {
      if (l.teaPct == null) continue
      // `0` is allowed and meaningful: PayFlex's borrower rate genuinely is zero.
      expect(l.teaPct, l.id).toBeGreaterThanOrEqual(0)
      expect(l.teaPct, l.id).toBeLessThanOrEqual(250)
      if (l.teaMaxPct != null) expect(l.teaMaxPct, l.id).toBeGreaterThanOrEqual(l.teaPct)
    }
  })

  it('presets reference only real dimensions and are non-empty', () => {
    for (const p of LOAN_PROFILE_PRESETS) {
      expect(p.dims.length, p.id).toBeGreaterThan(0)
      for (const d of p.dims) expect(LOAN_DIM_IDS).toContain(d)
    }
  })

  it('the clearing preset actually has lenders to show', () => {
    const usable = LENDER_TIERLIST.filter(l => l.clearing === 'si' || l.clearing === 'parcial')
    expect(usable.length).toBeGreaterThan(2)
  })
})

describe('teaScore', () => {
  it('is monotonic: a cheaper rate never scores worse', () => {
    for (let tea = 15; tea < 200; tea += 5) {
      expect(teaScore(tea)).toBeGreaterThanOrEqual(teaScore(tea + 5))
    }
  })

  it('pins the ends of the band', () => {
    expect(teaScore(TEA_BEST)).toBe(100)
    expect(teaScore(TEA_WORST)).toBe(0)
    expect(teaScore(5)).toBe(100)
    expect(teaScore(400)).toBe(0)
  })

  it('penalises a rate that adds IVA on top of the interest', () => {
    expect(teaScore(40, true)).toBeLessThan(teaScore(40, false))
  })

  // The reason this exists: FUCEREP publishes 14,25%–99% and OCA 29%–87%. Scoring the floor would
  // hand the best rating to whoever writes the widest range.
  it('weights a published band toward its ceiling, not its "desde"', () => {
    expect(representativeTea(20, null)).toBe(20)
    expect(representativeTea(20, 20)).toBe(20)
    expect(representativeTea(20, 100)).toBeGreaterThan(50)
    expect(teaScore(14.25, true, 99)).toBeLessThan(teaScore(14.25, true, null))
    // A lender that publishes one honest rate is never punished by the band rule.
    expect(teaScore(40, true, null)).toBe(teaScore(40, true, 40))
  })

  it('scores a genuine 0% as the best possible, not as a missing value', () => {
    expect(teaScore(0)).toBe(100)
  })

  it('treats "does not publish" as mediocre, not catastrophic', () => {
    const missing = teaScore(null)
    expect(missing).toBeGreaterThan(teaScore(120))
    expect(missing).toBeLessThan(teaScore(45))
  })
})

const BASE_FACTS: LenderFacts = {
  teaPct: 50,
  teaMaxPct: null,
  ivaOnInterest: true,
  publishesCft: false,
  clearing: 'no',
  clearingNote: 'x',
  minIncomeUyu: null,
  maxAmountUyu: 300000,
  maxTermMonths: 36,
  currencies: ['UYU'],
  onlineEndToEnd: false,
  disbursementHours: 48,
  audiences: ['dependiente'],
  payrollDeductionRequired: false,
  earlyRepaymentFree: null,
  originationFee: null,
  insuranceMandatory: null,
  bcu: 'registrada',
  membershipRequired: false,
}

describe('accesoScore', () => {
  it('ranks the clearing stances in the only order that helps a reader', () => {
    const at = (clearing: LenderFacts['clearing']) => accesoScore({ ...BASE_FACTS, clearing })
    expect(at('si')).toBeGreaterThan(at('parcial'))
    expect(at('parcial')).toBeGreaterThan(at('no'))
  })

  it('scores an unverified stance exactly like a refusal', () => {
    // Assuming an unproven "yes" is the one error that costs a reader a real rejection.
    expect(accesoScore({ ...BASE_FACTS, clearing: 'desconocido' })).toBe(
      accesoScore({ ...BASE_FACTS, clearing: 'no' })
    )
  })

  it('penalises a high income floor and rewards serving more kinds of borrower', () => {
    expect(accesoScore({ ...BASE_FACTS, minIncomeUyu: 45000 })).toBeLessThan(
      accesoScore(BASE_FACTS)
    )
    expect(
      accesoScore({ ...BASE_FACTS, audiences: ['dependiente', 'jubilado', 'independiente'] })
    ).toBeGreaterThan(accesoScore(BASE_FACTS))
  })

  it('penalises compulsory membership and compulsory payroll deduction', () => {
    expect(accesoScore({ ...BASE_FACTS, membershipRequired: true })).toBeLessThan(
      accesoScore(BASE_FACTS)
    )
    expect(accesoScore({ ...BASE_FACTS, payrollDeductionRequired: true })).toBeLessThan(
      accesoScore(BASE_FACTS)
    )
  })

  it('stays inside 0..100 for every combination of extremes', () => {
    const worst = accesoScore({
      ...BASE_FACTS,
      clearing: 'no',
      minIncomeUyu: 200000,
      membershipRequired: true,
      payrollDeductionRequired: true,
      onlineEndToEnd: false,
    })
    expect(worst).toBeGreaterThanOrEqual(0)
    expect(worst).toBeLessThanOrEqual(100)
  })
})

describe('costoScore', () => {
  it('rewards publishing a CFT over publishing only a TEA', () => {
    expect(costoScore({ ...BASE_FACTS, publishesCft: true })).toBeGreaterThan(
      costoScore(BASE_FACTS)
    )
  })

  it('punishes compulsory insurance, origination fees and early-repayment penalties', () => {
    expect(costoScore({ ...BASE_FACTS, insuranceMandatory: true })).toBeLessThan(
      costoScore({ ...BASE_FACTS, insuranceMandatory: false })
    )
    expect(costoScore({ ...BASE_FACTS, originationFee: true })).toBeLessThan(
      costoScore({ ...BASE_FACTS, originationFee: false })
    )
    expect(costoScore({ ...BASE_FACTS, earlyRepaymentFree: false })).toBeLessThan(
      costoScore({ ...BASE_FACTS, earlyRepaymentFree: true })
    )
  })

  it('punishes being outside the BCU perimeter, and an unverified status less', () => {
    expect(costoScore({ ...BASE_FACTS, bcu: 'no-regulada' })).toBeLessThan(
      costoScore({ ...BASE_FACTS, bcu: 'desconocido' })
    )
    expect(costoScore({ ...BASE_FACTS, bcu: 'desconocido' })).toBeLessThan(costoScore(BASE_FACTS))
  })

  // Hiding the price has to cost MORE on the transparency axis than having a bad one, or every
  // opaque lender floats to the top of the column that exists to catch them. (On the overall
  // score an opaque lender can still outrank a 130% one — "unknown" is genuinely not the same
  // verdict as "certainly terrible", and the ficha says which is which in words.)
  it('punishes publishing no rate at all harder than publishing a bad one', () => {
    expect(costoScore({ ...BASE_FACTS, teaPct: null })).toBeLessThan(
      costoScore({ ...BASE_FACTS, teaPct: 130 })
    )
  })
})

describe('velocidadScore', () => {
  it('rewards a faster disbursement', () => {
    expect(velocidadScore({ ...BASE_FACTS, disbursementHours: 1 })).toBeGreaterThan(
      velocidadScore({ ...BASE_FACTS, disbursementHours: 72 })
    )
  })

  it('rewards a trámite that never sends you to a branch', () => {
    expect(velocidadScore({ ...BASE_FACTS, onlineEndToEnd: true })).toBeGreaterThan(
      velocidadScore({ ...BASE_FACTS, onlineEndToEnd: false })
    )
  })
})

describe('scoreFor / tiers', () => {
  it('balanced score equals the weighted average of all six dimensions', () => {
    const l = LENDER_TIERLIST[0]!
    const s = scoresFor(l)
    const expected = Math.round(LOAN_RUBRIC.reduce((n, d) => n + s[d.id] * d.weight, 0) / 100)
    expect(scoreFor(l, LOAN_DIM_IDS)).toBe(expected)
  })

  it('an empty dimension subset falls back to all of them, so a filter never hides everything', () => {
    const l = LENDER_TIERLIST[0]!
    expect(scoreFor(l, [])).toBe(scoreFor(l, LOAN_DIM_IDS))
  })

  it('re-weighting changes the order — that is the point of the controls', () => {
    const balanced = rankLenders(LOAN_DIM_IDS).map(r => r.entity.id)
    const byAccess = rankLenders(['acceso']).map(r => r.entity.id)
    expect(byAccess).not.toEqual(balanced)
  })

  it('tierForScore respects the published thresholds', () => {
    for (const t of LOAN_TIERS) expect(tierForScore(t.min)).toBe(t.id)
    expect(tierForScore(0)).toBe('F')
    expect(tierForScore(100)).toBe('S')
  })

  it('buildBoard shows every tier row and loses nobody', () => {
    const board = buildBoard()
    expect(board.map(r => r.tier.id)).toEqual(LOAN_TIERS.map(t => t.id))
    expect(board.reduce((n, r) => n + r.items.length, 0)).toBe(LENDER_TIERLIST.length)
  })

  it('matchPreset only matches when the clearing filter matches too', () => {
    const clearing = LOAN_PROFILE_PRESETS.find(p => p.id === 'clearing')!
    expect(matchPreset(clearing.dims, true)?.id).toBe('clearing')
    expect(matchPreset(clearing.dims, false)?.id).not.toBe('clearing')
  })
})

describe('mergeLenderFacts', () => {
  const seed = LENDER_TIERLIST.slice(0, 3) as LenderEntity[]

  it('returns the seed untouched when there is no snapshot', () => {
    expect(mergeLenderFacts(seed, null)).toEqual([...seed])
    expect(mergeLenderFacts(seed, [])).toEqual([...seed])
  })

  it('overlays only the facts a patch actually carries', () => {
    const target = seed[0]!
    const merged = mergeLenderFacts(seed, [{ id: target.id, teaPct: 77 }])
    expect(merged[0]!.teaPct).toBe(77)
    expect(merged[0]!.verdict).toBe(target.verdict)
    expect(merged[0]!.clearing).toBe(target.clearing)
  })

  it('ignores a patch for a lender that is not in the catalogue', () => {
    const merged = mergeLenderFacts(seed, [{ id: 'no-existe', teaPct: 12 }])
    expect(merged).toHaveLength(seed.length)
    expect(merged.map(l => l.id)).toEqual(seed.map(l => l.id))
  })

  it('never lets a refresh rewrite the editorial fields', () => {
    const merged = mergeLenderFacts(seed, [
      { id: seed[0]!.id, verdict: 'hackeado', reputacion: 100, pros: [] } as any,
    ])
    expect(merged[0]!.verdict).toBe(seed[0]!.verdict)
    expect(merged[0]!.reputacion).toBe(seed[0]!.reputacion)
    expect(merged[0]!.pros).toEqual(seed[0]!.pros)
  })

  it('lets a refresh record that a lender stopped publishing its rate', () => {
    const withRate = seed.find(l => l.teaPct != null)
    if (!withRate) return
    const merged = mergeLenderFacts(seed, [{ id: withRate.id, teaPct: null }])
    expect(merged.find(l => l.id === withRate.id)!.teaPct).toBeNull()
  })

  it('a refreshed rate actually moves the board — the whole reason the job exists', () => {
    const cheapest = rankLenders(['tasa'])[0]!.entity
    const wrecked = mergeLenderFacts(LENDER_TIERLIST, [{ id: cheapest.id, teaPct: 149 }])
    const after = rankLenders(['tasa'], wrecked)[0]!.entity.id
    expect(after).not.toBe(cheapest.id)
  })
})
