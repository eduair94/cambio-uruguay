import { describe, expect, it } from 'vitest'
import {
  annualIrpfCatI,
  capitalGainTax,
  CRYPTO_RULE,
  depositReturn,
  depositRule,
  DIVIDEND_RULE,
  foreignIncomeTax,
  isCapitalGainExempt,
  isSmallLandlordExempt,
  rentTax,
  RENT_WITHHOLDING_PCT,
  stepUpCost,
  termFromMonths,
  type AnnualIncomeItem,
  type Currency,
  type DepositTerm,
} from '../../utils/capitalTax'

describe('capitalTax — matriz de depósitos (T7 art. 37 lit. A)', () => {
  // The nine cells, verbatim from the spec. The USD 1–3y cell is the one that
  // gets copied wrong: it is a rowspan of the 12% in DGI's HTML, not a blank.
  const cells: Array<[Currency, DepositTerm, number]> = [
    ['UYU', 'hasta_1a', 5.5],
    ['UYU', 'de_1a_3a', 2.5],
    ['UYU', 'mas_3a', 0.5],
    ['UYU_UI', 'hasta_1a', 10],
    ['UYU_UI', 'de_1a_3a', 7],
    ['UYU_UI', 'mas_3a', 5],
    ['USD', 'hasta_1a', 12],
    ['USD', 'de_1a_3a', 12],
    ['USD', 'mas_3a', 7],
  ]

  it.each(cells)('%s a %s tributa %s%%', (currency, term, rate) => {
    expect(depositRule(currency, term).rate).toBe(rate)
  })

  it('cada tasa lleva su norma, fuente y fecha de verificación', () => {
    for (const [currency, term] of cells) {
      const rule = depositRule(currency, term)
      expect(rule.law).toMatch(/art\./)
      expect(rule.sourceUrl).toMatch(/^https:\/\//)
      expect(rule.verifiedOn).toBe('2026-07-12')
      expect(rule.confidence).toBe('confirmado')
    }
  })

  it('mapea meses a franja legal', () => {
    expect(termFromMonths(6)).toBe('hasta_1a')
    expect(termFromMonths(12)).toBe('hasta_1a')
    expect(termFromMonths(13)).toBe('de_1a_3a')
    expect(termFromMonths(36)).toBe('de_1a_3a')
    expect(termFromMonths(37)).toBe('mas_3a')
  })
})

describe('capitalTax — rendimiento neto de un depósito', () => {
  it('un plazo fijo en pesos a 3 años paga 2,5% de IRPF sobre el interés', () => {
    const r = depositReturn({
      principal: 500_000,
      annualRatePct: 9.5,
      termMonths: 36,
      currency: 'UYU',
    })
    // interés simple: 500.000 × 9,5% × 3 años
    expect(r.grossInterest).toBeCloseTo(142_500, 2)
    expect(r.tax).toBeCloseTo(3562.5, 2) // 2,5%
    expect(r.netInterest).toBeCloseTo(138_937.5, 2)
    expect(r.netAnnualRatePct).toBeCloseTo(9.2625, 3) // 9,5 × (1 − 0,025)
  })

  it('un depósito en dólares a 5 años paga 7%, no 12%', () => {
    const r = depositReturn({
      principal: 10_000,
      annualRatePct: 4,
      termMonths: 60,
      currency: 'USD',
    })
    expect(r.rule.rate).toBe(7)
    expect(r.tax).toBeCloseTo(140, 2) // 10.000 × 4% × 5 × 7%
  })

  it('no devuelve interés negativo con plazo cero', () => {
    const r = depositReturn({ principal: 1000, annualRatePct: 5, termMonths: 0, currency: 'UYU' })
    expect(r.grossInterest).toBe(0)
    expect(r.tax).toBe(0)
  })
})

describe('capitalTax — cripto', () => {
  it('no tiene tasa: es zona gris no resuelta', () => {
    expect(CRYPTO_RULE.rate).toBeNull()
    expect(CRYPTO_RULE.confidence).toBe('no-resuelto')
  })
})

describe('capitalTax — incrementos patrimoniales', () => {
  it('el régimen REAL es el default: 12% sobre (precio − costo actualizado)', () => {
    const r = capitalGainTax({ salePrice: 100_000, cost: 60_000, method: 'real' })
    expect(r.taxableBase).toBe(40_000)
    expect(r.tax).toBeCloseTo(4800, 2)
    expect(r.effectiveRatePct).toBeCloseTo(4.8, 2) // sobre el precio de venta
  })

  it('una pérdida no genera impuesto', () => {
    const r = capitalGainTax({ salePrice: 50_000, cost: 80_000, method: 'real' })
    expect(r.taxableBase).toBe(0)
    expect(r.tax).toBe(0)
  })

  it('el ficto del 20% da 2,4% efectivo — pero NO es el default', () => {
    const r = capitalGainTax({ salePrice: 100_000, method: 'ficto20' })
    expect(r.taxableBase).toBe(20_000)
    expect(r.tax).toBeCloseTo(2400, 2)
    expect(r.effectiveRatePct).toBeCloseTo(2.4, 2)
  })

  it('el ficto del 15% (inmuebles pre-2007) da 1,8% efectivo', () => {
    const r = capitalGainTax({ salePrice: 200_000, method: 'ficto15' })
    expect(r.tax).toBeCloseTo(3600, 2)
    expect(r.effectiveRatePct).toBeCloseTo(1.8, 2)
  })

  it('el régimen real SIN costo no grava la venta entera: falla', () => {
    // The trap: defaulting the missing cost to 0 taxed the FULL sale price (12% de 500.000 =
    // 60.000) and printed it as if it were the tax on the gain. The module now refuses.
    expect(() =>
      capitalGainTax({ salePrice: 500_000, method: 'real' } as {
        salePrice: number
        method: 'real'
      })
    ).toThrow(TypeError)
    expect(() => capitalGainTax({ salePrice: 500_000, cost: Number.NaN, method: 'real' })).toThrow(
      /costo fiscal/
    )
    // Un costo de 0 declarado explícitamente sí es válido: es una afirmación del usuario.
    expect(capitalGainTax({ salePrice: 500_000, cost: 0, method: 'real' }).tax).toBeCloseTo(
      60_000,
      2
    )
  })

  it('un costo negativo no se acepta: clamparlo a 0 gravaría la venta entera sin avisar', () => {
    // A negative fiscal cost is not a thing. Clamping it to 0 (the old behaviour) would
    // silently tax the FULL sale price — exactly the trap the missing-cost throw exists to
    // prevent, just reached through a different input.
    expect(() => capitalGainTax({ salePrice: 100_000, cost: -50_000, method: 'real' })).toThrow(
      TypeError
    )
    expect(() => capitalGainTax({ salePrice: 100_000, cost: -50_000, method: 'real' })).toThrow(
      /no puede ser negativo/
    )
  })

  it('con costo probado, el ficto puede ser PEOR que el real', () => {
    const real = capitalGainTax({ salePrice: 100_000, cost: 95_000, method: 'real' })
    const ficto = capitalGainTax({ salePrice: 100_000, method: 'ficto20' })
    expect(real.tax).toBeLessThan(ficto.tax)
  })

  it('exonera operaciones chicas: ≤30.000 UI cada una y <90.000 UI al año', () => {
    const ui = 6.6142
    // Operación de 25.000 UI, con 50.000 UI acumuladas antes en el año.
    expect(
      isCapitalGainExempt({
        operationAmountUyu: 25_000 * ui,
        yearSubThresholdTotalUyu: 50_000 * ui,
        uiValue: ui,
      })
    ).toBe(true)
    // Misma operación, pero el año ya acumula 80.000 UI → supera las 90.000 UI.
    expect(
      isCapitalGainExempt({
        operationAmountUyu: 25_000 * ui,
        yearSubThresholdTotalUyu: 80_000 * ui,
        uiValue: ui,
      })
    ).toBe(false)
    // Operación grande: no exonera, aunque el año esté vacío.
    expect(
      isCapitalGainExempt({
        operationAmountUyu: 40_000 * ui,
        yearSubThresholdTotalUyu: 0,
        uiValue: ui,
      })
    ).toBe(false)
  })
})

describe('capitalTax — alquileres', () => {
  it('la TASA es 12% sobre la renta neta; el 10,5% es la RETENCIÓN sobre el bruto', () => {
    expect(RENT_WITHHOLDING_PCT).toBe(10.5)
    const r = rentTax({ grossRent: 30_000, deductions: 4000 })
    expect(r.netRent).toBe(26_000)
    expect(r.tax).toBeCloseTo(3120, 2) // 26.000 × 12%
    expect(r.withholding).toBeCloseTo(3150, 2) // 30.000 × 10,5%
    expect(r.effectivePctOfGross).toBeCloseTo(10.4, 2)
  })

  it('sin deducciones, liquidar por lo real es PEOR que dejar la retención', () => {
    const r = rentTax({ grossRent: 30_000, deductions: 0 })
    expect(r.tax).toBeCloseTo(3600, 2) // 12% del bruto
    expect(r.tax).toBeGreaterThan(r.withholding)
  })

  it('exonera al pequeño arrendador: ≤40 BPC al año Y levantamiento del secreto bancario', () => {
    const bpc = 6864
    // Cumple el monto y renuncia al secreto → exento.
    expect(
      isSmallLandlordExempt({
        annualRentUyu: 30 * bpc,
        otherCapitalIncomeUyu: 0,
        waivesBankSecrecy: true,
        bpc,
      })
    ).toBe(true)
    // Mismo monto, pero NO autoriza el levantamiento del secreto bancario → NO exento.
    // (La condición legal es ésta, no "identificar al inquilino".)
    expect(
      isSmallLandlordExempt({
        annualRentUyu: 30 * bpc,
        otherCapitalIncomeUyu: 0,
        waivesBankSecrecy: false,
        bpc,
      })
    ).toBe(false)
    // Supera las 40 BPC → no exento.
    expect(
      isSmallLandlordExempt({
        annualRentUyu: 45 * bpc,
        otherCapitalIncomeUyu: 0,
        waivesBankSecrecy: true,
        bpc,
      })
    ).toBe(false)
    // Tiene otros rendimientos de capital > 3 BPC → la exoneración no opera.
    expect(
      isSmallLandlordExempt({
        annualRentUyu: 30 * bpc,
        otherCapitalIncomeUyu: 4 * bpc,
        waivesBankSecrecy: true,
        bpc,
      })
    ).toBe(false)
  })
})

describe('capitalTax — rentas del exterior (Ley 20.446, vigencia 1/1/2026)', () => {
  it('la TASA es 12%: el 8% es una retención, no una alícuota', () => {
    const r = foreignIncomeTax({ amount: 100_000, withholdingAgent: 'ninguno' })
    expect(r.taxRatePct).toBe(12)
    expect(r.tax).toBeCloseTo(12_000, 2)
    expect(r.withholdingRatePct).toBeNull()
  })

  it('solo un custodio/bróker local puede retener al 8%', () => {
    const custodio = foreignIncomeTax({ amount: 100_000, withholdingAgent: 'custodio-local' })
    expect(custodio.withholdingRatePct).toBe(8)
    expect(custodio.canOptForDefinitive).toBe(true)

    // Un banco o corredor que NO ejerce la custodia retiene 12%, no 8%.
    const otro = foreignIncomeTax({ amount: 100_000, withholdingAgent: 'otro-agente' })
    expect(otro.withholdingRatePct).toBe(12)
  })

  it('sin agente de retención (bróker del exterior) hay anticipos semestrales', () => {
    const r = foreignIncomeTax({ amount: 100_000, withholdingAgent: 'ninguno' })
    expect(r.requiresAnticipos).toBe(true)

    const conCustodio = foreignIncomeTax({ amount: 100_000, withholdingAgent: 'custodio-local' })
    expect(conCustodio.requiresAnticipos).toBe(false)
  })

  it('acredita el impuesto pagado en el exterior, topeado al IRPF de esas mismas rentas', () => {
    // Impuesto extranjero menor al IRPF: se acredita entero.
    const parcial = foreignIncomeTax({
      amount: 100_000,
      withholdingAgent: 'ninguno',
      foreignTaxPaid: 5000,
    })
    expect(parcial.foreignCreditApplied).toBeCloseTo(5000, 2)
    expect(parcial.taxDue).toBeCloseTo(7000, 2) // 12.000 − 5.000

    // Impuesto extranjero mayor: el crédito se topea, nunca da saldo a favor.
    const topeado = foreignIncomeTax({
      amount: 100_000,
      withholdingAgent: 'ninguno',
      foreignTaxPaid: 20_000,
    })
    expect(topeado.foreignCreditApplied).toBeCloseTo(12_000, 2)
    expect(topeado.taxDue).toBe(0)
  })
})

describe('capitalTax — step-up al 31/12/2025', () => {
  it('para activos cotizados comprados antes de 2026, el costo es la cotización al 31/12/2025', () => {
    // Compradas en 2015 a 10.000; valían 80.000 al 31/12/2025; vendidas a 100.000.
    const cost = stepUpCost({
      originalCost: 10_000,
      valueAt20251231: 80_000,
      acquiredBefore2026: true,
      listedOnRecognisedExchange: true,
    })
    expect(cost).toBe(80_000)

    const gain = capitalGainTax({ salePrice: 100_000, cost, method: 'real' })
    expect(gain.tax).toBeCloseTo(2400, 2) // 12% de 20.000, no de 90.000
  })

  it('no aplica a activos comprados en 2026 o después', () => {
    expect(
      stepUpCost({
        originalCost: 10_000,
        valueAt20251231: 80_000,
        acquiredBefore2026: false,
        listedOnRecognisedExchange: true,
      })
    ).toBe(10_000)
  })

  it('no aplica a activos que no cotizan en bolsas de reconocido prestigio', () => {
    expect(
      stepUpCost({
        originalCost: 10_000,
        valueAt20251231: 80_000,
        acquiredBefore2026: true,
        listedOnRecognisedExchange: false,
      })
    ).toBe(10_000)
  })
})

describe('capitalTax — liquidación anual (Cat. I)', () => {
  const bpc = 6864
  const ui = 6.6142

  it('suma las rentas del año y aplica el crédito por impuesto del exterior', () => {
    const items: AnnualIncomeItem[] = [
      { kind: 'deposito', amount: 100_000, currency: 'UYU', termMonths: 24 }, // 2,5% → 2.500
      { kind: 'dividendo', amount: 50_000 }, // 7% → 3.500
      { kind: 'deuda_publica', amount: 200_000 }, // exenta → 0
      { kind: 'exterior', amount: 100_000, foreignTaxPaid: 5000, withholdingAgent: 'ninguno' }, // 12.000 − 5.000 = 7.000
    ]
    const r = annualIrpfCatI(items, { bpc, uiValue: ui })

    expect(r.totalTax).toBeCloseTo(2500 + 3500 + 0 + 7000, 2)
    expect(r.foreignCreditApplied).toBeCloseTo(5000, 2)
    expect(r.requiresAnticipos).toBe(true) // hay renta del exterior sin retención
    expect(r.byItem).toHaveLength(4)
    expect(r.byItem[2]?.tax).toBe(0)
  })

  it('marca la cripto como no resuelta y NO le asigna impuesto', () => {
    const r = annualIrpfCatI([{ kind: 'cripto', amount: 500_000 }], { bpc, uiValue: ui })
    expect(r.totalTax).toBe(0)
    expect(r.unresolved).toContain('cripto')
    expect(r.byItem[0]?.rule.confidence).toBe('no-resuelto')
  })

  // The guards below used to live only in the pages. A caller that did not know to add them
  // would have published a wrong number, so they now live in the module and are pinned here.
  it('clampea los montos negativos: una renta negativa no baja el impuesto del año', () => {
    const r = annualIrpfCatI(
      [
        { kind: 'dividendo', amount: 100_000 }, // 7% → 7.000
        { kind: 'dividendo', amount: -500_000 }, // sin guarda: −35.000
        { kind: 'deposito', amount: -100_000, currency: 'UYU', termMonths: 12 }, // sin guarda: −5.500
      ],
      { bpc, uiValue: ui }
    )
    expect(r.totalTax).toBeCloseTo(7000, 2)
    expect(r.byItem.every(i => i.tax >= 0)).toBe(true)
    expect(r.byItem.every(i => i.amount >= 0)).toBe(true)
  })

  it('ignora montos no finitos en vez de propagar NaN al total', () => {
    const r = annualIrpfCatI(
      [
        { kind: 'dividendo', amount: Number.NaN },
        { kind: 'exterior', amount: 100_000, withholdingAgent: 'ninguno' }, // 12% → 12.000
      ],
      { bpc, uiValue: ui }
    )
    expect(Number.isFinite(r.totalTax)).toBe(true)
    expect(r.totalTax).toBeCloseTo(12_000, 2)
  })

  it('una venta en régimen real sin costo hace fallar la liquidación, no la grava entera', () => {
    expect(() =>
      annualIrpfCatI([{ kind: 'ganancia_local', amount: 500_000, method: 'real' }], {
        bpc,
        uiValue: ui,
      })
    ).toThrow(TypeError)
  })
})

describe('capitalTax — dividendos: el 7% es de fuente uruguaya', () => {
  it('la etiqueta de la regla dice de quién es el dividendo (contribuyentes de IRAE)', () => {
    // A bare "Dividendos y utilidades" label let a foreign dividend (12%) be booked at 7%.
    expect(DIVIDEND_RULE.rate).toBe(7)
    expect(DIVIDEND_RULE.label).toMatch(/IRAE/)
    expect(DIVIDEND_RULE.law).toBe('Título 7, art. 37 lit. B')
  })

  it('un dividendo del exterior NO es la regla del 7%: paga 12%', () => {
    const foreign = foreignIncomeTax({ amount: 100_000, withholdingAgent: 'ninguno' })
    expect(foreign.taxRatePct).toBe(12)
    expect(foreign.tax).toBeCloseTo(12_000, 2)

    const local = annualIrpfCatI([{ kind: 'dividendo', amount: 100_000 }], {
      bpc: 6864,
      uiValue: 6.6142,
    })
    expect(local.totalTax).toBeCloseTo(7000, 2)
    expect(foreign.tax).toBeGreaterThan(local.totalTax) // 5 puntos de diferencia
  })
})
