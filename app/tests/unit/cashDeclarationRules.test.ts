import { describe, expect, it } from 'vitest'

import {
  CASH_RULE_SOURCES,
  CHANGES_2026,
  DECLARATION_THRESHOLD_USD,
  FINE_RATE_FIRST_PCT,
  FINE_RATE_REPEAT_PCT,
  resolveCashDeclaration,
} from '../../utils/cashDeclarationRules'

describe('the declaration threshold', () => {
  // Ley 19.574 art. 29 says "por un monto SUPERIOR a US$ 10.000". Exactly ten
  // thousand is below the line, and getting this wrong in either direction is
  // the whole point of the page.
  it('does not trigger at exactly the threshold', () => {
    const r = resolveCashDeclaration({ amountUsd: DECLARATION_THRESHOLD_USD })
    expect(r.mustDeclare).toBe(false)
    expect(r.excessUsd).toBe(0)
    expect(r.fineUsd).toBe(0)
  })

  it('triggers one dollar above it', () => {
    const r = resolveCashDeclaration({ amountUsd: DECLARATION_THRESHOLD_USD + 1 })
    expect(r.mustDeclare).toBe(true)
    expect(r.excessUsd).toBe(1)
  })

  it('never reports an obligation below the threshold', () => {
    for (const amount of [0, 500, 9_999]) {
      expect(resolveCashDeclaration({ amountUsd: amount }).mustDeclare).toBe(false)
    }
  })
})

describe('the fine', () => {
  it('charges 30% of the EXCESS on a first omission', () => {
    const r = resolveCashDeclaration({ amountUsd: 25_000 })
    expect(r.fineRatePct).toBe(FINE_RATE_FIRST_PCT)
    expect(r.fineOnTotal).toBe(false)
    expect(r.fineUsd).toBeCloseTo(4_500, 6) // 30% de 15.000
  })

  it('charges 60% of the TOTAL on repetition, not of the excess', () => {
    const r = resolveCashDeclaration({ amountUsd: 25_000, repeatOffence: true })
    expect(r.fineRatePct).toBe(FINE_RATE_REPEAT_PCT)
    expect(r.fineOnTotal).toBe(true)
    expect(r.fineUsd).toBeCloseTo(15_000, 6) // 60% de 25.000, no de 15.000
  })

  // The repetition rate biting the whole sum is what makes it an escalation:
  // just above the threshold the second fine is an order of magnitude worse.
  it('is far harsher on repetition just above the threshold', () => {
    const first = resolveCashDeclaration({ amountUsd: 11_000 })
    const again = resolveCashDeclaration({ amountUsd: 11_000, repeatOffence: true })
    expect(first.fineUsd).toBeCloseTo(300, 6)
    expect(again.fineUsd).toBeCloseTo(6_600, 6)
  })

  it('stays at zero when there was nothing to declare', () => {
    expect(resolveCashDeclaration({ amountUsd: 9_000, repeatOffence: true }).fineUsd).toBe(0)
  })
})

describe('the reporting channel', () => {
  it('sends the ordinary traveller to Aduanas', () => {
    expect(resolveCashDeclaration({ amountUsd: 20_000 }).channel).toBe('aduana')
  })

  it('sends a BCU-supervised entity to the BCU', () => {
    expect(resolveCashDeclaration({ amountUsd: 20_000, bcuSupervised: true }).channel).toBe('bcu')
  })
})

describe('malformed input', () => {
  it('clamps negatives and non-numbers to zero instead of inventing a fine', () => {
    for (const amount of [-5_000, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = resolveCashDeclaration({ amountUsd: amount })
      expect(r.fineUsd).toBe(0)
      expect(r.mustDeclare).toBe(false)
    }
  })
})

describe('the sourcing contract', () => {
  it('cites only primary Uruguayan sources', () => {
    expect(CASH_RULE_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const source of CASH_RULE_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.)?(impo\.com\.uy|aduanas\.gub\.uy|gub\.uy)\//)
      expect(source.label.length).toBeGreaterThan(20)
    }
  })

  it('describes both sides of every 2026 change', () => {
    expect(CHANGES_2026.length).toBeGreaterThan(0)
    for (const change of CHANGES_2026) {
      expect(change.before.length).toBeGreaterThan(10)
      expect(change.after.length).toBeGreaterThan(10)
      expect(change.before).not.toBe(change.after)
    }
  })
})
