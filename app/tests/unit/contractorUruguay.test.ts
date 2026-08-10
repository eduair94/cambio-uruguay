import { describe, expect, it } from 'vitest'

import {
  CONTRACTOR_APORTE_PATRONAL_PCT,
  CONTRACTOR_APORTE_PERSONAL_PCT,
  CONTRACTOR_BASE_RULE,
  CONTRACTOR_FAQ,
  CONTRACTOR_FICTA_MIN_BFC_CON_EMPLEADOS,
  CONTRACTOR_FICTA_MIN_BFC_SIN_EMPLEADOS,
  CONTRACTOR_JUBILACION_TAKEAWAY,
  CONTRACTOR_SOURCES,
  CONTRACTOR_EMPLOYEE_MONTHS_PER_YEAR,
  CONTRACTOR_LOST_BENEFITS,
  compareContractorVsEmployee,
} from '../../utils/contractorUruguay'

describe('la base del aporte, que es lo que la página corrige', () => {
  // El error cómodo y falso: "aportás sobre una ficta baja por más que factures".
  it('deja escrito que la ficta es un piso, no la base', () => {
    expect(CONTRACTOR_BASE_RULE).toMatch(/MAYOR/i)
    expect(CONTRACTOR_BASE_RULE).toMatch(/piso, no un techo/i)
    expect(CONTRACTOR_BASE_RULE).toMatch(/ingresos reales/i)
  })

  it('publica los dos mínimos en BFC y el de con empleados es mayor', () => {
    expect(CONTRACTOR_FICTA_MIN_BFC_SIN_EMPLEADOS).toBe(11)
    expect(CONTRACTOR_FICTA_MIN_BFC_CON_EMPLEADOS).toBe(15)
    expect(CONTRACTOR_FICTA_MIN_BFC_CON_EMPLEADOS).toBeGreaterThan(
      CONTRACTOR_FICTA_MIN_BFC_SIN_EMPLEADOS
    )
  })

  it('las tasas son las de BPS', () => {
    expect(CONTRACTOR_APORTE_PERSONAL_PCT).toBe(15)
    expect(CONTRACTOR_APORTE_PATRONAL_PCT).toBe(7.5)
  })

  // No promete ni condena: la jubilación depende de lo declarado.
  it('no afirma que el contractor se quede sin jubilación', () => {
    expect(CONTRACTOR_JUBILACION_TAKEAWAY).toMatch(/no es s[ií] ni no/i)
    expect(CONTRACTOR_JUBILACION_TAKEAWAY).toMatch(/lo que declar/i)
  })
})

describe('comparación contra un sueldo', () => {
  // El dato que casi nadie tiene presente: el dependiente cobra 13, no 12.
  it('el dependiente cobra trece sueldos por el aguinaldo', () => {
    expect(CONTRACTOR_EMPLOYEE_MONTHS_PER_YEAR).toBe(13)
    const r = compareContractorVsEmployee({ monthlyBilling: 100_000, employeeNominal: 100_000 })
    expect(r.employeeAnnual).toBe(1_300_000)
    expect(r.contractorAnnual).toBe(1_200_000)
    // Facturar exactamente el nominal ya te deja por debajo.
    expect(r.annualGap).toBeLessThan(0)
  })

  it('el break-even es el nominal por trece sobre doce', () => {
    const r = compareContractorVsEmployee({ monthlyBilling: 0, employeeNominal: 120_000 })
    expect(r.breakEvenBilling).toBe(Math.round((120_000 * 13) / 12))
    expect(r.breakEvenBilling).toBeGreaterThan(120_000)
  })

  it('facturando el break-even, la brecha anual se cierra', () => {
    const nominal = 90_000
    const be = compareContractorVsEmployee({
      monthlyBilling: 0,
      employeeNominal: nominal,
    }).breakEvenBilling
    const r = compareContractorVsEmployee({ monthlyBilling: be, employeeNominal: nominal })
    expect(Math.abs(r.annualGap)).toBeLessThanOrEqual(12)
  })

  it('expresa la facturación en sueldos equivalentes', () => {
    const r = compareContractorVsEmployee({ monthlyBilling: 130_000, employeeNominal: 100_000 })
    expect(r.contractorMonthsEquivalent).toBeCloseTo(15.6, 1)
  })

  it('no rompe con cero ni con negativos', () => {
    const z = compareContractorVsEmployee({ monthlyBilling: 0, employeeNominal: 0 })
    expect(z.contractorMonthsEquivalent).toBe(0)
    expect(Number.isFinite(z.annualGap)).toBe(true)
    const n = compareContractorVsEmployee({ monthlyBilling: -5, employeeNominal: -5 })
    expect(n.contractorAnnual).toBe(0)
    expect(n.employeeAnnual).toBe(0)
  })
})

describe('lo que se pierde fuera de planilla', () => {
  it('lista los seis y cada uno explica qué es', () => {
    expect(CONTRACTOR_LOST_BENEFITS.length).toBeGreaterThanOrEqual(6)
    for (const b of CONTRACTOR_LOST_BENEFITS) expect(b.detail.length).toBeGreaterThan(25)
  })

  it('enlaza a lo que el sitio ya desarrolla, en vez de reexplicarlo', () => {
    const linked = CONTRACTOR_LOST_BENEFITS.filter(b => b.to)
    expect(linked.length).toBeGreaterThanOrEqual(3)
    for (const b of linked) expect(b.to).toMatch(/^\//)
  })
})

describe('integridad', () => {
  it('el FAQ arranca por la pregunta del hilo testigo', () => {
    expect(CONTRACTOR_FAQ[0].question).toMatch(/jubilaci/i)
  })

  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(CONTRACTOR_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const f of CONTRACTOR_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })

  it('toda regla publicada tiene fuente de BPS', () => {
    expect(CONTRACTOR_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const s of CONTRACTOR_SOURCES) expect(s.url).toMatch(/^https:\/\/www\.bps\.gub\.uy\//)
  })
})
