// app/tests/unit/travelerBaggageRules.test.ts
//
// Verified against primary sources 2026-07-12. Several assertions here exist because
// a plausible-looking wrong answer was found on aduanas.gub.uy's own site during
// research (a stale 2014 tiered-by-origin split, and a page that cites the wrong
// decree number) — these tests pin the CURRENT, correct figures.
import { describe, expect, it } from 'vitest'
import {
  EXCESS_TAX_RATE_PCT,
  FRANCHISE_AIR_SEA_USD,
  FRANCHISE_LAND_USD,
  franchiseFor,
  resolveBaggageTax,
} from '../../utils/travelerBaggageRules'

describe('sourced constants', () => {
  it('the air/sea franchise is USD 500, not the old tiered-by-origin split', () => {
    // Decreto 43/019 (2019) unified the old 300 (MERCOSUR) / 500 (rest of world) split
    // into a flat 500 for everyone entering by air or sea. Confirmed against the
    // current gub.uy trámite page and IMPO directly, 2026-07-12.
    expect(FRANCHISE_AIR_SEA_USD).toBe(500)
  })

  it('the land-border franchise is USD 300', () => {
    expect(FRANCHISE_LAND_USD).toBe(300)
  })

  it('the excess tax rate is a flat 50%', () => {
    // Decreto 139/014 art. 13: "un único tributo con alícuota del 50% sobre el valor
    // que exceda dichos límites".
    expect(EXCESS_TAX_RATE_PCT).toBe(50)
  })
})

describe('franchiseFor', () => {
  it('returns the air/sea amount for air-sea entry', () => {
    expect(franchiseFor('air-sea')).toBe(500)
  })

  it('returns the land amount for land entry', () => {
    expect(franchiseFor('land')).toBe(300)
  })
})

describe('resolveBaggageTax', () => {
  it('charges nothing when the value is exactly at the franchise', () => {
    const d = resolveBaggageTax({ entryMode: 'air-sea', valueUsd: 500 })
    expect(d.withinFranchise).toBe(true)
    expect(d.excessUsd).toBe(0)
    expect(d.taxUsd).toBe(0)
  })

  it('taxes only the excess over the franchise, not the whole value', () => {
    const d = resolveBaggageTax({ entryMode: 'air-sea', valueUsd: 700 })
    expect(d.withinFranchise).toBe(false)
    expect(d.excessUsd).toBe(200)
    expect(d.taxUsd).toBe(100) // 50% of 200, not 50% of 700
  })

  it('uses the lower land-border franchise', () => {
    const d = resolveBaggageTax({ entryMode: 'land', valueUsd: 400 })
    expect(d.franchiseUsd).toBe(300)
    expect(d.excessUsd).toBe(100)
    expect(d.taxUsd).toBe(50)
  })

  it('treats a negative or missing value as zero', () => {
    const d = resolveBaggageTax({ entryMode: 'air-sea', valueUsd: -50 })
    expect(d.valueUsd).toBe(0)
    expect(d.withinFranchise).toBe(true)
    expect(d.taxUsd).toBe(0)
  })
})
