import { describe, expect, it } from 'vitest'

import {
  COMMERCIAL_IMPORT_SOURCES,
  FORMALIZATION_STEPS,
  PAYMENT_STEPS,
  PERSONA_FISICA_MAX_DUA_PER_YEAR,
  POSTAL_MAX_INVOICE_USD,
  POSTAL_MAX_WEIGHT_KG,
  PRODUCT_CHECKS,
  SIMPLIFIED_MIN_USD,
  SIMPLIFIED_RATE_PCT,
  basketFlags,
  breakEvenInvoiceUsd,
  commercialImportSources,
  compareRoutes,
  estimatePrestacionUnica,
  estimateRegimenGeneral,
  productCheck,
  resolveResaleRoute,
} from '../../utils/commercialImport'

describe('resolveResaleRoute', () => {
  it('sends a small commercial shipment through the prestación única, with no despachante', () => {
    const d = resolveResaleRoute({ invoiceUsd: 500, weightKg: 8 })
    expect(d.route).toBe('prestacion-unica')
    expect(d.despachante).toBe(false)
    expect(d.dua).toBe(false)
    expect(d.blockers).toEqual([])
  })

  it('never returns the franquicia, because resale is outside it by definition', () => {
    for (const invoice of [10, 100, 799, 800, 5000]) {
      const d = resolveResaleRoute({ invoiceUsd: invoice, weightKg: 1 })
      expect(d.route).not.toBe('franquicia')
    }
  })

  it('says out loud that the 60% route is open to companies and to resale', () => {
    const d = resolveResaleRoute({ invoiceUsd: 300, weightKg: 3 })
    expect(d.reasons.join(' ')).toMatch(/personas físicas o jurídicas/)
  })

  it('switches to the general regime above the value ceiling', () => {
    const d = resolveResaleRoute({ invoiceUsd: POSTAL_MAX_INVOICE_USD + 1, weightKg: 2 })
    expect(d.route).toBe('regimen-general')
    expect(d.despachante).toBe(true)
    expect(d.dua).toBe(true)
  })

  it('keeps the boundary inclusive: exactly the ceiling still uses the postal route', () => {
    const d = resolveResaleRoute({
      invoiceUsd: POSTAL_MAX_INVOICE_USD,
      weightKg: POSTAL_MAX_WEIGHT_KG,
    })
    expect(d.route).toBe('prestacion-unica')
  })

  it('switches to the general regime above the weight ceiling', () => {
    const d = resolveResaleRoute({ invoiceUsd: 100, weightKg: POSTAL_MAX_WEIGHT_KG + 0.5 })
    expect(d.route).toBe('regimen-general')
  })

  it('excludes IMESI goods from the postal regimes', () => {
    const d = resolveResaleRoute({ invoiceUsd: 100, weightKg: 1, imesi: true })
    expect(d.route).toBe('regimen-general')
    expect(d.reasons.join(' ')).toMatch(/IMESI/)
  })

  it('mentions the two-DUA-per-year cap whenever it routes to the general regime', () => {
    const d = resolveResaleRoute({ invoiceUsd: 2000, weightKg: 30 })
    expect(d.reasons.join(' ')).toContain(String(PERSONA_FISICA_MAX_DUA_PER_YEAR))
    expect(d.reasons.join(' ')).toMatch(/DUA/)
  })

  it('treats a carrier refusal as a blocker AND as a reroute', () => {
    const d = resolveResaleRoute({ invoiceUsd: 200, weightKg: 4, carrierRefuses: true })
    expect(d.blockers).toHaveLength(1)
    expect(d.route).toBe('regimen-general')
  })

  it('blocks a missing agency authorization without pretending the general regime fixes it', () => {
    const d = resolveResaleRoute({ invoiceUsd: 200, weightKg: 4, missingAgencyAuthorization: true })
    expect(d.blockers.join(' ')).toMatch(/art\. 7/)
    // A missing permit does not, by itself, push the shipment out of the postal regime:
    // getting the permit puts it right back in.
    expect(d.route).toBe('prestacion-unica')
  })

  it('resolves every source id it hands back', () => {
    const d = resolveResaleRoute({ invoiceUsd: 900, weightKg: 25, carrierRefuses: true })
    expect(commercialImportSources(d.sourceIds)).toHaveLength(d.sourceIds.length)
  })

  it('never returns negative or NaN-driven results for junk input', () => {
    const d = resolveResaleRoute({ invoiceUsd: Number.NaN, weightKg: -5 })
    expect(d.route).toBe('prestacion-unica')
  })
})

describe('estimatePrestacionUnica', () => {
  it('charges the flat rate', () => {
    const r = estimatePrestacionUnica(300)
    expect(r.chargesUsd).toBe(180)
    expect(r.totalUsd).toBe(480)
    expect(r.effectivePct).toBe(SIMPLIFIED_RATE_PCT)
  })

  it('applies the per-shipment minimum on tiny shipments', () => {
    const r = estimatePrestacionUnica(10)
    expect(r.chargesUsd).toBe(SIMPLIFIED_MIN_USD)
    expect(r.effectivePct).toBeGreaterThan(SIMPLIFIED_RATE_PCT)
    expect(r.lines.some(l => l.label.includes('Mínimo'))).toBe(true)
  })

  it('does not add a minimum line when the rate already exceeds it', () => {
    const r = estimatePrestacionUnica(100)
    expect(r.lines.some(l => l.label.includes('Mínimo'))).toBe(false)
  })

  it('survives zero', () => {
    const r = estimatePrestacionUnica(0)
    expect(r.chargesUsd).toBe(SIMPLIFIED_MIN_USD)
    expect(r.effectivePct).toBe(0)
  })
})

describe('estimateRegimenGeneral', () => {
  it('puts the arancel and the tasa consular INSIDE the IVA base', () => {
    const r = estimateRegimenGeneral({
      invoiceUsd: 1000,
      freightUsd: 0,
      insuranceUsd: 0,
      arancelPct: 10,
      ivaPct: 22,
      tasaConsularPct: 5,
    })
    // arancel 100 + consular 50 → IVA base 1150 → IVA 253 → charges 403
    const iva = r.lines.find(l => l.label.startsWith('IVA'))
    expect(iva?.amountUsd).toBe(253)
    expect(r.chargesUsd).toBe(403)
    expect(r.effectivePct).toBe(40.3)
  })

  it('includes freight and insurance in the customs value', () => {
    const r = estimateRegimenGeneral({
      invoiceUsd: 1000,
      freightUsd: 200,
      insuranceUsd: 50,
      arancelPct: 0,
      ivaPct: 22,
      tasaConsularPct: 0,
    })
    const base = r.lines.find(l => l.label.startsWith('Valor en aduana'))
    expect(base?.amountUsd).toBe(1250)
    expect(r.chargesUsd).toBe(275)
  })

  it('adds clearing costs as a line only when there are any', () => {
    const without = estimateRegimenGeneral({ invoiceUsd: 100, arancelPct: 0, tasaConsularPct: 0 })
    expect(without.lines.some(l => l.label.startsWith('Despacho'))).toBe(false)
    const withCosts = estimateRegimenGeneral({
      invoiceUsd: 100,
      arancelPct: 0,
      tasaConsularPct: 0,
      clearingCostsUsd: 150,
    })
    expect(withCosts.lines.some(l => l.label.startsWith('Despacho'))).toBe(true)
    expect(withCosts.chargesUsd).toBe(172)
  })
})

describe('compareRoutes', () => {
  it('prefers the general regime on a large-ish shipment with low duties', () => {
    const c = compareRoutes({
      invoiceUsd: 700,
      weightKg: 10,
      arancelPct: 2,
      ivaPct: 22,
      tasaConsularPct: 5,
      clearingCostsUsd: 150,
    })
    expect(c.postalUnavailable).toBe(false)
    expect(c.cheaper).toBe('regimen-general')
    expect(c.savingUsd).toBeGreaterThan(0)
  })

  it('still prefers the flat 60% at the same size when the arancel is high', () => {
    // A 10% arancel plus the tasa pushes the combined load to ~40%; with USD 150 of
    // clearing costs the DUA only catches up near the very top of the postal window.
    const c = compareRoutes({
      invoiceUsd: 700,
      weightKg: 10,
      arancelPct: 10,
      ivaPct: 22,
      tasaConsularPct: 5,
      clearingCostsUsd: 150,
    })
    expect(c.cheaper).toBe('prestacion-unica')

    const v = breakEvenInvoiceUsd({ arancelPct: 10, tasaConsularPct: 5, clearingCostsUsd: 150 })
    expect(v as number).toBeGreaterThan(700)
    expect(v as number).toBeLessThan(POSTAL_MAX_INVOICE_USD)
  })

  it('prefers the flat 60% on a small shipment, where fixed clearing costs dominate', () => {
    const c = compareRoutes({
      invoiceUsd: 120,
      weightKg: 3,
      arancelPct: 10,
      ivaPct: 22,
      tasaConsularPct: 5,
      clearingCostsUsd: 150,
    })
    expect(c.cheaper).toBe('prestacion-unica')
  })

  it('refuses to declare a winner when the postal route is not on the table', () => {
    const c = compareRoutes({ invoiceUsd: 2500, weightKg: 40, arancelPct: 10 })
    expect(c.postalUnavailable).toBe(true)
    expect(c.cheaper).toBeNull()
    expect(c.savingUsd).toBe(0)
  })
})

describe('breakEvenInvoiceUsd', () => {
  it('finds the value where the DUA stops being the more expensive route', () => {
    const params = {
      arancelPct: 10,
      ivaPct: 22,
      tasaConsularPct: 5,
      clearingCostsUsd: 150,
      freightUsd: 0,
    }
    const v = breakEvenInvoiceUsd(params)
    expect(v).not.toBeNull()

    // Just below the break-even the flat rate wins; just above it, the DUA does.
    const below = compareRoutes({ ...params, invoiceUsd: (v as number) - 20, weightKg: 1 })
    const above = compareRoutes({ ...params, invoiceUsd: (v as number) + 20, weightKg: 1 })
    expect(below.cheaper).toBe('prestacion-unica')
    expect(above.cheaper).toBe('regimen-general')
  })

  it('returns null when the general regime is never cheaper', () => {
    // A combined load above 60% has no crossing point.
    expect(breakEvenInvoiceUsd({ arancelPct: 35, ivaPct: 22, tasaConsularPct: 5 })).toBeNull()
  })

  it('grows with the fixed clearing costs', () => {
    const cheap = breakEvenInvoiceUsd({ arancelPct: 10, tasaConsularPct: 5, clearingCostsUsd: 100 })
    const dear = breakEvenInvoiceUsd({ arancelPct: 10, tasaConsularPct: 5, clearingCostsUsd: 400 })
    expect(cheap).not.toBeNull()
    expect(dear as number).toBeGreaterThan(cheap as number)
  })
})

describe('product checks', () => {
  it('covers the accessories a phone-accessory store starts with', () => {
    const ids = PRODUCT_CHECKS.map(p => p.id)
    for (const id of ['cargador-pared', 'powerbank', 'funda-vidrio', 'auriculares-bt']) {
      expect(ids).toContain(id)
    }
  })

  it('has unique ids and a source for every check that asserts a rule', () => {
    const ids = PRODUCT_CHECKS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const check of PRODUCT_CHECKS) {
      if (check.sourceIds.length === 0) continue
      expect(commercialImportSources(check.sourceIds)).toHaveLength(check.sourceIds.length)
    }
  })

  it('keeps the two counter-intuitive verdicts that justify the page', () => {
    // A plain wall charger needs no prior authorisation; a plug adapter does.
    expect(productCheck('cargador-pared')?.verdict).toBe('no-requiere')
    expect(productCheck('adaptadores-zapatillas')?.verdict).toBe('requiere')
    // Bluetooth-only devices are carved out of URSEC; phones are not.
    expect(productCheck('auriculares-bt')?.verdict).toBe('no-requiere')
    expect(productCheck('celulares')?.verdict).toBe('requiere')
  })

  it('treats power banks as a transport blocker, not as a permit', () => {
    const pb = productCheck('powerbank')
    expect(pb?.verdict).toBe('bloqueante')
    expect(pb?.organisms).toEqual([])
  })
})

describe('basketFlags', () => {
  it('raises the carrier flag for a basket that contains power banks', () => {
    expect(basketFlags(['funda-vidrio', 'powerbank']).carrierRefuses).toBe(true)
  })

  it('does not turn an open question into a proven blocker', () => {
    const flags = basketFlags(['cargador-inalambrico'])
    expect(flags.toConsult).toBe(true)
    expect(flags.requiresAuthorization).toBe(false)
    expect(flags.carrierRefuses).toBe(false)
  })

  it('ignores unknown ids', () => {
    expect(basketFlags(['no-existe'])).toEqual({
      requiresAuthorization: false,
      carrierRefuses: false,
      toConsult: false,
    })
  })

  it('drives the router end to end', () => {
    const flags = basketFlags(['powerbank'])
    const d = resolveResaleRoute({
      invoiceUsd: 300,
      weightKg: 5,
      carrierRefuses: flags.carrierRefuses,
    })
    expect(d.route).toBe('regimen-general')
  })
})

describe('editorial content', () => {
  it('resolves every source id used by the formalisation and payment steps', () => {
    for (const step of [...FORMALIZATION_STEPS, ...PAYMENT_STEPS]) {
      expect(commercialImportSources(step.sourceIds)).toHaveLength(step.sourceIds.length)
    }
  })

  it('keeps every declared source pointing at an https URL', () => {
    for (const source of Object.values(COMMERCIAL_IMPORT_SOURCES)) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.label.length).toBeGreaterThan(10)
    }
  })

  it('warns about the DNA page calling the single payment "monotributo"', () => {
    expect(PAYMENT_STEPS.map(s => s.title).join(' ')).toMatch(/monotributo/i)
  })

  it('puts "no necesitás empresa todavía" before "abrí la empresa"', () => {
    expect(FORMALIZATION_STEPS[0].id).toBe('probar')
    expect(FORMALIZATION_STEPS.map(s => s.id)).toContain('vender')
  })
})
