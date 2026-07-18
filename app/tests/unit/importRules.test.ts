// app/tests/unit/importRules.test.ts
//
// These tests encode the 2026 regime as the primary sources actually define it. Several of
// them fail against the model we shipped for months — that is the point; each one is a bug
// a Uruguayan would have paid for.
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REGIME_RULES,
  FRANCHISE_ANNUAL_USD,
  FRANCHISE_MAX_SHIPMENTS,
  type RegimeRules,
  SELLER_REGISTRY_ENFORCED_FROM,
  SIMPLIFIED_MIN_USD,
  SIMPLIFIED_RATE_PCT,
  USA_IVA_EXEMPTION_USD,
  isSellerRegistryEnforced,
  resolveRegime,
} from '../../utils/importRules'

const BEFORE = new Date('2026-07-11T00:00:00Z') // today: registry NOT yet enforceable
const AFTER = new Date('2026-10-01T00:00:00Z') // the day the gate closes

const base = {
  valueUsd: 100,
  origin: 'usa' as const,
  franchiseAvailableUsd: 800,
  shipmentsUsed: 0,
  useFranchise: true,
  today: BEFORE,
}

describe('sourced constants', () => {
  it('the simplified minimum is USD 20, not the repealed USD 10', () => {
    // Ley 20.446 art. 627: "con un pago mínimo de US$ 20 ... por envío". The USD 10 we used
    // to charge came from Decreto 356/014, which is repealed.
    expect(SIMPLIFIED_MIN_USD).toBe(20)
    expect(SIMPLIFIED_RATE_PCT).toBe(60)
  })

  it('the franchise is USD 800 a year across at most 3 shipments', () => {
    expect(FRANCHISE_ANNUAL_USD).toBe(800)
    expect(FRANCHISE_MAX_SHIPMENTS).toBe(3)
  })

  it('USD 200 is the US IVA threshold — not a per-shipment franchise cap', () => {
    expect(USA_IVA_EXEMPTION_USD).toBe(200)
  })
})

describe('the seller-registration gate', () => {
  it('is not enforceable today', () => {
    expect(isSellerRegistryEnforced(BEFORE)).toBe(false)
  })

  it('is enforceable from 2026-10-01', () => {
    expect(SELLER_REGISTRY_ENFORCED_FROM).toBe('2026-10-01')
    expect(isSellerRegistryEnforced(AFTER)).toBe(true)
    expect(isSellerRegistryEnforced(new Date('2026-09-30T00:00:00Z'))).toBe(false)
  })

  it('today a US purchase under USD 200 is IVA-exempt regardless of the seller', () => {
    const d = resolveRegime({ ...base, valueUsd: 150, sellerRegistered: false })
    expect(d.regime).toBe('franquicia')
    expect(d.ivaExempt).toBe(true)
  })

  it('from 2026-10-01 the SAME purchase pays IVA if the seller is not registered', () => {
    // This is the bug: the old code would have kept exempting it forever.
    const d = resolveRegime({ ...base, valueUsd: 150, sellerRegistered: false, today: AFTER })
    expect(d.regime).toBe('franquicia')
    expect(d.ivaExempt).toBe(false)
    expect(d.reasons.join(' ')).toMatch(/registrado/i)
  })

  it('from 2026-10-01 it stays exempt when the seller IS registered', () => {
    const d = resolveRegime({ ...base, valueUsd: 150, sellerRegistered: true, today: AFTER })
    expect(d.ivaExempt).toBe(true)
  })
})

describe('the US IVA exoneration is all-or-nothing', () => {
  it('exempts a US shipment at exactly the threshold', () => {
    expect(resolveRegime({ ...base, valueUsd: 200 }).ivaExempt).toBe(true)
  })

  it('taxes the WHOLE shipment one dollar over — there is no partial exemption', () => {
    const d = resolveRegime({ ...base, valueUsd: 201 })
    expect(d.regime).toBe('franquicia')
    expect(d.ivaExempt).toBe(false)
    expect(d.reasons.join(' ')).toMatch(/todo o nada/i)
  })

  it('never exempts a non-US shipment, however small', () => {
    expect(resolveRegime({ ...base, valueUsd: 20, origin: 'other' }).ivaExempt).toBe(false)
  })
})

describe('a shipment is never split between regimes', () => {
  it('sends the whole shipment to the simplified regime when the franchise does not cover it', () => {
    // Decreto 50/026 art. 15. The old model franchised USD 100 and charged 60% on the other
    // USD 400 — a regime that does not exist.
    const d = resolveRegime({ ...base, valueUsd: 500, franchiseAvailableUsd: 100 })
    expect(d.regime).toBe('simplificado')
    expect(d.reasons.join(' ')).toMatch(/no se puede partir/i)
  })

  it('sends it to the simplified regime once the 3 franchise shipments are used up', () => {
    const d = resolveRegime({ ...base, valueUsd: 100, shipmentsUsed: 3 })
    expect(d.regime).toBe('simplificado')
    expect(d.reasons.join(' ')).toMatch(/3 envíos/i)
  })

  it('uses the franchise when it fully covers the shipment', () => {
    const d = resolveRegime({ ...base, valueUsd: 800, franchiseAvailableUsd: 800, origin: 'other' })
    expect(d.regime).toBe('franquicia')
    expect(d.ivaExempt).toBe(false) // franchise exempts aranceles, NOT iva
  })

  it('honours a reader who declines the franchise', () => {
    expect(resolveRegime({ ...base, useFranchise: false }).regime).toBe('simplificado')
  })
})

describe('above USD 800 neither regime applies', () => {
  it('routes it to the general regime instead of inventing a number', () => {
    const d = resolveRegime({ ...base, valueUsd: 801 })
    expect(d.regime).toBe('general')
    expect(d.ivaExempt).toBe(false)
    expect(d.reasons.join(' ')).toMatch(/supera/i)
  })
})

describe('injectable RegimeRules overlay', () => {
  const base = {
    valueUsd: 100,
    origin: 'usa' as const,
    franchiseAvailableUsd: 800,
    shipmentsUsed: 0,
    useFranchise: true,
  }

  it('DEFAULT_REGIME_RULES equals the static constants (no drift from the fallback)', () => {
    expect(DEFAULT_REGIME_RULES).toEqual({
      franchiseAnnualUsd: FRANCHISE_ANNUAL_USD,
      simplifiedRatePct: SIMPLIFIED_RATE_PCT,
      simplifiedMinUsd: SIMPLIFIED_MIN_USD,
      usaIvaExemptionUsd: USA_IVA_EXEMPTION_USD,
      sellerRegistryEnforcedFrom: SELLER_REGISTRY_ENFORCED_FROM,
    })
  })

  it('uses the live overlay date, not the static constant', () => {
    const rules: RegimeRules = { ...DEFAULT_REGIME_RULES, sellerRegistryEnforcedFrom: '2027-01-01' }
    // A US$150 US shipment on 2026-11-01: enforced under the default (>= 2026-10-01), but a 3rd
    // prórroga to 2027-01-01 means the seller-registration is NOT yet required, so it stays exempt.
    expect(isSellerRegistryEnforced(new Date('2026-11-01T00:00:00Z'), rules)).toBe(false)
    expect(isSellerRegistryEnforced(new Date('2026-11-01T00:00:00Z'))).toBe(true) // default = 2026-10-01

    const withPushedDate = resolveRegime(
      { ...base, valueUsd: 150, sellerRegistered: false, today: new Date('2026-11-01T00:00:00Z') },
      rules
    )
    expect(withPushedDate.regime).toBe('franquicia')
    expect(withPushedDate.ivaExempt).toBe(true) // date pushed → still exempt
  })

  it('prices with an overlaid minimum', () => {
    const rules: RegimeRules = { ...DEFAULT_REGIME_RULES, simplifiedMinUsd: 25 }
    const d = resolveRegime(
      { valueUsd: 30, origin: 'other', franchiseAvailableUsd: 0, shipmentsUsed: 0, useFranchise: false },
      rules
    )
    expect(d.regime).toBe('simplificado')
    expect(d.reasons.join(' ')).toContain('25')
  })

  it('falls back to the static baseline when no overlay is passed (no regression)', () => {
    const d = resolveRegime({ ...base, today: new Date('2026-07-01T00:00:00Z') })
    expect(d.regime).toBe('franquicia')
    expect(d.ivaExempt).toBe(true)
  })
})
