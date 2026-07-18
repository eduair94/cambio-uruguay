import { describe, expect, it } from 'vitest'
import { regimeRulesFromPayload } from '../../utils/regimeOverlay'
import { DEFAULT_REGIME_RULES } from '../../utils/importRules'

const payload = (facts: any[], updatedAt: string | null = '2026-09-30') => ({
  facts,
  problems: [],
  sources: [],
  updatedAt,
  stale: false,
  pendingReview: [],
})

describe('regimeRulesFromPayload', () => {
  it('maps fact ids onto RegimeRules, leaving untouched keys at their default', () => {
    const { rules } = regimeRulesFromPayload(
      payload([
        { id: 'registro_vendedor.exigible_desde', value: '2027-01-01' },
        { id: 'prestacion_unica.minimo_usd', value: 25 },
      ])
    )
    expect(rules.sellerRegistryEnforcedFrom).toBe('2027-01-01')
    expect(rules.simplifiedMinUsd).toBe(25)
    expect(rules.franchiseAnnualUsd).toBe(DEFAULT_REGIME_RULES.franchiseAnnualUsd) // untouched key kept
  })

  it('never drops a key on a garbage payload', () => {
    expect(regimeRulesFromPayload({ facts: null }).rules).toEqual(DEFAULT_REGIME_RULES)
    expect(regimeRulesFromPayload(null).rules).toEqual(DEFAULT_REGIME_RULES)
    expect(regimeRulesFromPayload(undefined).rules).toEqual(DEFAULT_REGIME_RULES)
  })

  it('ignores a wrong-typed value instead of corrupting the rule', () => {
    const { rules } = regimeRulesFromPayload(
      payload([
        { id: 'prestacion_unica.minimo_usd', value: 'veinte' }, // not a number
        { id: 'registro_vendedor.exigible_desde', value: 20260101 }, // not a date string
      ])
    )
    expect(rules.simplifiedMinUsd).toBe(DEFAULT_REGIME_RULES.simplifiedMinUsd)
    expect(rules.sellerRegistryEnforcedFrom).toBe(DEFAULT_REGIME_RULES.sellerRegistryEnforcedFrom)
  })

  it('reports which values are auto-published and the sync date', () => {
    const out = regimeRulesFromPayload(
      payload([{ id: 'prestacion_unica.minimo_usd', value: 25, autoPublished: true }], '2026-09-30')
    )
    expect(out.autoPublished).toContain('prestacion_unica.minimo_usd')
    expect(out.asOf).toBe('2026-09-30')
  })

  it('asOf is null when the payload has no updatedAt (baseline fallback)', () => {
    expect(regimeRulesFromPayload(payload([], null)).asOf).toBeNull()
  })
})
