import { describe, expect, it } from 'vitest'
import {
  BENCHMARKS,
  IPC_INTERANUAL_PCT,
  IVA_RATE,
  LEGAL_FACTS,
  RATE_MYTHS,
  TPM_PCT,
  YIELD_LAST_REVIEWED,
  YIELD_PRODUCTS,
  YIELD_SOURCES,
  estimateYield,
  feeWithIva,
  getYieldProduct,
  liveProducts,
  realRate,
} from '../../utils/yieldAccounts'

describe('yieldAccounts - the legal frame', () => {
  it('states the rule the whole page hangs off, quoting the norm', () => {
    const noInterest = LEGAL_FACTS.find(f => f.id === 'no-intereses')
    expect(noInterest).toBeDefined()
    expect(noInterest!.norm).toContain('19.210')
    expect(noInterest!.quote).toBe('No genera intereses.')
  })

  it('every legal fact names its norm and cites an https source', () => {
    for (const f of LEGAL_FACTS) {
      expect(f.claim.trim().length).toBeGreaterThan(10)
      expect(f.norm.trim().length).toBeGreaterThan(4)
      expect(f.meaning.trim().length).toBeGreaterThan(40)
      expect(f.source.url).toMatch(/^https:\/\/\S+$/)
    }
  })

  it('records that the deposit insurance does not reach these products', () => {
    expect(LEGAL_FACTS.map(f => f.id)).toContain('sin-copab')
  })
})

describe('yieldAccounts - product catalogue', () => {
  it('lists the two products live in Uruguay', () => {
    expect(YIELD_PRODUCTS.map(p => p.id).sort()).toEqual([
      'mercadopago-rendimientos',
      'prex-inversion-violeta',
    ])
  })

  it('every product names the fund, its administrator and what it buys', () => {
    for (const p of YIELD_PRODUCTS) {
      expect(p.fundName.trim().length).toBeGreaterThan(5)
      expect(p.fundAdmin.trim().length).toBeGreaterThan(3)
      expect(p.investsIn.trim().length).toBeGreaterThan(30)
      expect(p.launched).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('publishes NO invented rate: neither product advertises one', () => {
    // The whole editorial promise. If an issuer ever publishes a real TNA this
    // test is what forces us to source it instead of guessing.
    for (const p of YIELD_PRODUCTS) {
      expect(p.publishedRatePct).toBeNull()
      expect(p.rateNote.trim().length).toBeGreaterThan(40)
    }
  })

  it('both products are peso-only, which is why they do not help a USD purchase', () => {
    for (const p of YIELD_PRODUCTS) expect(p.currency).toBe('UYU')
  })

  it('every product says out loud that there is no capital guarantee', () => {
    for (const p of YIELD_PRODUCTS) {
      const cons = p.cons.join(' ').toLowerCase()
      expect(cons).toMatch(/garant[íi]a de capital|dep[óo]sito bancario/)
    }
  })

  it('every product cites at least two https sources, none duplicated', () => {
    for (const p of YIELD_PRODUCTS) {
      expect(p.sources.length).toBeGreaterThanOrEqual(2)
      const urls = p.sources.map(s => s.url)
      expect(new Set(urls).size).toBe(urls.length)
      for (const s of p.sources) expect(s.url).toMatch(/^https:\/\/\S+$/)
    }
  })

  it('a declared fee ceiling is a plausible percentage, not a rate', () => {
    for (const p of YIELD_PRODUCTS) {
      if (p.fundFeeMaxPct === null) continue
      expect(p.fundFeeMaxPct).toBeGreaterThan(0)
      expect(p.fundFeeMaxPct).toBeLessThanOrEqual(10)
      expect(p.fundFeeNote).toMatch(/[Tt]ope|hasta/)
    }
  })

  it('liveProducts sorts newest first and getYieldProduct round-trips', () => {
    const list = liveProducts()
    expect(list.length).toBe(YIELD_PRODUCTS.length)
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1]!.launched >= list[i]!.launched).toBe(true)
    }
    expect(getYieldProduct('prex-inversion-violeta')?.provider).toContain('Prex')
    expect(getYieldProduct('__nope__')).toBeUndefined()
  })
})

describe('yieldAccounts - the imported-rate myth', () => {
  it('flags the Argentine TNA that circulates as Uruguayan', () => {
    expect(RATE_MYTHS.length).toBeGreaterThan(0)
    const myth = RATE_MYTHS[0]!
    expect(myth.figure).toContain('20,81')
    expect(myth.belongsTo.toUpperCase()).toContain('ARGENTINA')
    expect(myth.source.url).toMatch(/^https:\/\/\S+$/)
  })
})

describe('yieldAccounts - benchmarks', () => {
  it('anchors on the fact that a peso savings account pays nothing', () => {
    const caja = BENCHMARKS.find(b => b.id === 'caja-ahorro')
    expect(caja?.ratePct).toBe(0)
    expect(caja?.liquid).toBe(true)
  })

  it('every benchmark is sourced and its rate is a plausible Uruguayan peso rate', () => {
    for (const b of BENCHMARKS) {
      expect(b.source.url).toMatch(/^https:\/\/\S+$/)
      if (b.ratePct === null) continue
      expect(b.ratePct).toBeGreaterThanOrEqual(0)
      expect(b.ratePct).toBeLessThan(20)
    }
  })

  it('the products that pay a real rate are the ones that lock the money', () => {
    for (const b of BENCHMARKS) {
      if (b.ratePct !== null && b.ratePct > 0) expect(b.liquid).toBe(false)
    }
  })
})

describe('yieldAccounts - macro anchors', () => {
  it('the reference rate is the BCU policy rate and inflation is below it', () => {
    expect(TPM_PCT).toBeGreaterThan(0)
    expect(IPC_INTERANUAL_PCT).toBeGreaterThan(0)
    expect(IPC_INTERANUAL_PCT).toBeLessThan(TPM_PCT)
  })

  it('carries a review date and general sources', () => {
    expect(YIELD_LAST_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(YIELD_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of YIELD_SOURCES) expect(s.url).toMatch(/^https:\/\/\S+$/)
  })
})

describe('yieldAccounts - feeWithIva', () => {
  it('adds 22% IVA', () => {
    expect(feeWithIva(3)).toBe(3.66)
    expect(feeWithIva(1.2)).toBeCloseTo(1.2 * (1 + IVA_RATE), 2)
  })

  it('clamps nonsense to zero', () => {
    expect(feeWithIva(-5)).toBe(0)
    expect(feeWithIva(Number.NaN)).toBe(0)
  })
})

describe('yieldAccounts - realRate uses the exact relation, not a subtraction', () => {
  it('is strictly below nominal minus inflation when inflation is positive', () => {
    const exact = realRate(5.75, 4.27)
    const naive = 5.75 - 4.27
    expect(exact).toBeLessThan(naive)
    expect(exact).toBeCloseTo((1.0575 / 1.0427 - 1) * 100, 6)
  })

  it('is zero when nominal equals inflation', () => {
    expect(realRate(4.27, 4.27)).toBeCloseTo(0, 10)
  })

  it('goes negative when the yield loses to inflation', () => {
    expect(realRate(2, 4.27)).toBeLessThan(0)
  })
})

describe('yieldAccounts - estimateYield', () => {
  it('a year at the policy rate with no commission beats inflation, barely', () => {
    const r = estimateYield({
      amountUyu: 100000,
      annualRatePct: TPM_PCT,
      days: 365,
      feeAnnualPct: 0,
    })
    expect(r.netRatePct).toBe(TPM_PCT)
    expect(r.feeUyu).toBe(0)
    expect(r.netUyu).toBeCloseTo(5750, 0)
    expect(r.realUyu).toBeGreaterThan(0)
    expect(r.realRatePct).toBeGreaterThan(0)
    expect(r.realRatePct).toBeLessThan(2)
  })

  it('the fund fee ceiling flips the real return negative — the whole point', () => {
    const r = estimateYield({
      amountUyu: 100000,
      annualRatePct: TPM_PCT,
      days: 365,
      feeAnnualPct: feeWithIva(3),
    })
    expect(r.netRatePct).toBeCloseTo(TPM_PCT - 3.66, 2)
    expect(r.netUyu).toBeGreaterThan(0)
    expect(r.realUyu).toBeLessThan(0)
    expect(r.realRatePct).toBeLessThan(0)
  })

  it('a bank fund fee of 1,2% still clears inflation', () => {
    const r = estimateYield({
      amountUyu: 100000,
      annualRatePct: TPM_PCT,
      days: 365,
      feeAnnualPct: 1.2,
    })
    expect(r.realRatePct).toBeGreaterThan(0)
  })

  it('compounds over the period rather than prorating a flat year', () => {
    const half = estimateYield({ amountUyu: 100000, annualRatePct: 10, days: 182.5 })
    // sqrt(1.10) − 1 ≈ 4,881 %, strictly less than half of 10 %
    expect(half.netUyu).toBeCloseTo(100000 * (Math.sqrt(1.1) - 1), 0)
    expect(half.netUyu).toBeLessThan(5000)
  })

  it('the commission line equals gross minus net', () => {
    const r = estimateYield({
      amountUyu: 250000,
      annualRatePct: 6,
      days: 90,
      feeAnnualPct: 2,
    })
    // Exact, not approximate: the three values are printed as three rows of one
    // table, so they must reconcile to the cent.
    expect(r.feeUyu).toBe(Math.round((r.grossUyu - r.netUyu) * 100) / 100)
    expect(r.feeUyu).toBeGreaterThan(0)
  })

  it('zero days and zero money earn nothing instead of NaN', () => {
    const none = estimateYield({ amountUyu: 0, annualRatePct: TPM_PCT, days: 365 })
    expect(none.netUyu).toBe(0)
    expect(none.realUyu).toBe(0)
    const instant = estimateYield({ amountUyu: 100000, annualRatePct: TPM_PCT, days: 0 })
    expect(instant.netUyu).toBe(0)
  })

  it('clamps typos: negative money, absurd rates and negative days', () => {
    const r = estimateYield({ amountUyu: -1000, annualRatePct: 1e9, days: -30 })
    expect(Number.isFinite(r.netUyu)).toBe(true)
    expect(r.netUyu).toBe(0)
    expect(r.grossUyu).toBe(0)
  })

  it('survives a commission larger than the yield without producing NaN', () => {
    const r = estimateYield({
      amountUyu: 100000,
      annualRatePct: 5.75,
      days: 365,
      feeAnnualPct: 200,
    })
    expect(Number.isFinite(r.netUyu)).toBe(true)
    expect(r.netUyu).toBeLessThan(0)
    expect(r.realRatePct).toBeLessThan(0)
  })

  it('defaults the inflation benchmark to the published INE figure', () => {
    const withDefault = estimateYield({ amountUyu: 100000, annualRatePct: 8, days: 365 })
    const explicit = estimateYield({
      amountUyu: 100000,
      annualRatePct: 8,
      days: 365,
      inflationPct: IPC_INTERANUAL_PCT,
    })
    expect(withDefault.realUyu).toBe(explicit.realUyu)
  })
})
