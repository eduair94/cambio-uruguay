import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  BPC_2025,
  BPC_2026,
  estimateMonthlyWithholding,
  IRPF_AGUINALDO_RULE,
  IRPF_ANNUAL_BRACKETS_2025,
  IRPF_ANNUAL_BRACKETS_2026,
  IRPF_AUTO_REFUNDS_2026,
  IRPF_CASOS_FAQ,
  IRPF_CASOS_SOURCES,
  IRPF_CASOS_VERIFIED_AT,
  IRPF_CHILD_DEDUCTION_ANNUAL_2026,
  IRPF_CHILD_DEDUCTION_MONTHLY_2026,
  IRPF_COMPENSATION_RULE,
  IRPF_CONTRIBUTION_RATES,
  IRPF_CONVENIO,
  IRPF_CONVENIO_RATES_2026,
  IRPF_CREDIT_CADUCITY_YEARS,
  IRPF_DEBT_PRESCRIPTION_YEARS,
  IRPF_DEBT_PRESCRIPTION_YEARS_EXTENDED,
  IRPF_DEDUCTION_RATE,
  IRPF_DEDUCTIONS,
  IRPF_DISABLED_CHILD_DEDUCTION_MONTHLY_2026,
  IRPF_EXAMPLE_DISCLAIMER,
  IRPF_EXAMPLES,
  IRPF_EXCLUSION_2026,
  IRPF_FORM_1102_YEARS,
  IRPF_INSTALMENTS_2025,
  IRPF_LATE_FILING_FINE,
  IRPF_MNI_ANNUAL_2025,
  IRPF_MNI_ANNUAL_2026,
  IRPF_MNI_MONTHLY_2026,
  IRPF_MONTHLY_BRACKETS_2026,
  IRPF_MORA_RATES_2026,
  IRPF_NEGATIVE_MEANING,
  IRPF_PAST_YEARS_FIGURES,
  IRPF_PAYMENT_CODES,
  IRPF_REFUND_CALENDAR_2026,
  IRPF_REFUND_RULE_CAVEAT,
  IRPF_RENTAL_CREDIT_NOTE,
  IRPF_SURCHARGE,
  irpfSource,
  latestPublishedRate,
  nextRefundWindow,
} from '../../utils/irpfCasos'

const ISO = /^\d{4}-\d{2}-\d{2}$/

/** Todo el texto publicable del módulo, para las guardas de grafía y de afirmaciones vetadas. */
const ALL_TEXT = JSON.stringify({
  IRPF_DEDUCTIONS,
  IRPF_CASOS_FAQ,
  IRPF_CASOS_SOURCES,
  IRPF_AGUINALDO_RULE,
  IRPF_NEGATIVE_MEANING,
  IRPF_COMPENSATION_RULE,
  IRPF_CONVENIO,
  IRPF_LATE_FILING_FINE,
  IRPF_PAST_YEARS_FIGURES,
  IRPF_RENTAL_CREDIT_NOTE,
  IRPF_REFUND_RULE_CAVEAT,
  IRPF_EXAMPLE_DISCLAIMER,
  IRPF_EXCLUSION_2026,
  IRPF_MORA_RATES_2026,
  IRPF_CONVENIO_RATES_2026,
})

describe('BPC y mínimo no imponible 2026', () => {
  it('la BPC 2026 es $ 6.864 (Decreto 11/026) y la 2025 $ 6.576', () => {
    expect(BPC_2026).toBe(6864)
    expect(BPC_2025).toBe(6576)
  })

  it('7 BPC mensuales = $ 48.048; 84 BPC anuales = $ 552.384 (2025) y $ 576.576 (2026)', () => {
    expect(IRPF_MNI_MONTHLY_2026).toBe(48_048)
    expect(IRPF_MNI_ANNUAL_2025).toBe(552_384)
    expect(IRPF_MNI_ANNUAL_2026).toBe(576_576)
  })

  it('la deducción por hijo es 20 BPC ($ 137.280 al año, $ 11.440 al mes), nunca 13 BPC', () => {
    expect(IRPF_CHILD_DEDUCTION_ANNUAL_2026).toBe(137_280)
    expect(IRPF_CHILD_DEDUCTION_MONTHLY_2026).toBe(11_440)
    expect(IRPF_DISABLED_CHILD_DEDUCTION_MONTHLY_2026).toBe(22_880)
    expect(ALL_TEXT).not.toMatch(/13 BPC/)
  })
})

describe('escala mensual 2026', () => {
  it('reproduce la planilla oficial de DGI, franja por franja', () => {
    const rows = IRPF_MONTHLY_BRACKETS_2026.map(b => [b.from, b.to, b.rate])
    expect(rows).toEqual([
      [0, 48_048, 0],
      [48_048, 68_640, 10],
      [68_640, 102_960, 15],
      [102_960, 205_920, 24],
      [205_920, 343_200, 25],
      [343_200, 514_800, 27],
      [514_800, 789_360, 31],
      [789_360, null, 36],
    ])
  })

  it('las franjas son contiguas y las tasas suben', () => {
    for (let i = 1; i < IRPF_MONTHLY_BRACKETS_2026.length; i++) {
      const prev = IRPF_MONTHLY_BRACKETS_2026[i - 1]!
      const cur = IRPF_MONTHLY_BRACKETS_2026[i]!
      expect(cur.from).toBe(prev.to)
      expect(cur.rate).toBeGreaterThan(prev.rate)
    }
  })

  it('la escala anual 2025 arranca en $ 552.384 y la 2026 en $ 576.576', () => {
    expect(IRPF_ANNUAL_BRACKETS_2025[1]!.from).toBe(552_384)
    expect(IRPF_ANNUAL_BRACKETS_2025[1]!.to).toBe(789_120)
    expect(IRPF_ANNUAL_BRACKETS_2025[7]!.from).toBe(9_074_880)
    expect(IRPF_ANNUAL_BRACKETS_2026[1]!.from).toBe(576_576)
    expect(IRPF_ANNUAL_BRACKETS_2026[3]!.from).toBe(1_235_520)
    expect(IRPF_ANNUAL_BRACKETS_2026[7]!.from).toBe(9_472_320)
  })

  it('la tasa de deducciones es 14 % hasta 15 BPC ($ 102.960) y 8 % arriba', () => {
    expect(IRPF_DEDUCTION_RATE.lowPct).toBe(14)
    expect(IRPF_DEDUCTION_RATE.highPct).toBe(8)
    expect(IRPF_DEDUCTION_RATE.thresholdMonthly2026).toBe(102_960)
    expect(IRPF_DEDUCTION_RATE.thresholdAnnual2026).toBe(1_235_520)
  })

  it('el 6 % se suma sobre 10 BPC ($ 68.640)', () => {
    expect(IRPF_SURCHARGE.above2026).toBe(68_640)
    expect(IRPF_SURCHARGE.pct).toBe(6)
  })

  it('la exclusión de retenciones 2026 es $ 68.300 / $ 819.600, no el valor 2025', () => {
    expect(IRPF_EXCLUSION_2026.monthly).toBe(68_300)
    expect(IRPF_EXCLUSION_2026.annual).toBe(819_600)
    expect(ALL_TEXT).not.toMatch(/65\.400|784\.800/)
  })
})

describe('ejemplo de retención (aritmética del simulador de DGI)', () => {
  it('$ 80.000 sin hijos → renta 84.800, impuesto 4.483,20, crédito 2.195,20, retención 2.288', () => {
    const e = estimateMonthlyWithholding(80_000)
    expect(e.computable).toBe(84_800)
    expect(e.tax).toBe(4483.2)
    expect(e.deductionsBase).toBe(15_680)
    expect(e.deductionRatePct).toBe(14)
    expect(e.deductionsCredit).toBe(2195.2)
    expect(e.withholding).toBe(2288)
  })

  it('$ 60.000 sin hijos → las deducciones superan el impuesto y la retención es cero, nunca negativa', () => {
    const e = estimateMonthlyWithholding(60_000)
    expect(e.computable).toBe(60_000)
    expect(e.tax).toBe(1195.2)
    expect(e.deductionsCredit).toBe(1646.4)
    expect(e.withholding).toBe(0)
  })

  it('con un hijo declarado y FONASA 6 % la retención baja', () => {
    const base = estimateMonthlyWithholding(80_000)
    const withChild = estimateMonthlyWithholding(80_000, {
      fonasaPct: IRPF_CONTRIBUTION_RATES.fonasaWithChildrenPct,
      children: 1,
    })
    expect(withChild.deductionsBase).toBe(16_880 + 11_440)
    expect(withChild.withholding).toBeLessThan(base.withholding)
    expect(withChild.withholding).toBeGreaterThan(0)
  })

  it('por debajo de 7 BPC la retención es cero', () => {
    expect(estimateMonthlyWithholding(48_048).withholding).toBe(0)
    expect(estimateMonthlyWithholding(0).withholding).toBe(0)
  })

  it('arriba de 15 BPC la tasa de deducciones cae a 8 %', () => {
    expect(estimateMonthlyWithholding(110_000).deductionRatePct).toBe(8)
  })

  it('los ejemplos publicados dicen que son cálculo propio y remiten al simulador', () => {
    expect(IRPF_EXAMPLES.length).toBeGreaterThanOrEqual(2)
    expect(IRPF_EXAMPLE_DISCLAIMER).toMatch(/cálculo propio/i)
    expect(IRPF_EXAMPLE_DISCLAIMER).toMatch(/simulador/i)
    expect(irpfSource('simulador').url).toMatch(/^https:\/\//)
  })
})

describe('sale negativo: crédito y calendario de devoluciones', () => {
  it('define el signo en los dos planos: declaración (crédito) y recibo (retención cero)', () => {
    expect(IRPF_NEGATIVE_MEANING).toMatch(/crédito/i)
    expect(IRPF_NEGATIVE_MEANING).toMatch(/retención cero/i)
    expect(IRPF_NEGATIVE_MEANING).toMatch(/nunca te paga/i)
  })

  it('la devolución automática 2026 es 10/15/16 de junio y no incluye alquiler ni hipoteca', () => {
    expect(IRPF_AUTO_REFUNDS_2026.consultFrom).toBe('2026-06-10')
    expect(IRPF_AUTO_REFUNDS_2026.bankFrom).toBe('2026-06-15')
    expect(IRPF_AUTO_REFUNDS_2026.networksFrom).toBe('2026-06-16')
    expect(IRPF_AUTO_REFUNDS_2026.excludes).toMatch(/alquiler/i)
    expect(IRPF_AUTO_REFUNDS_2026.excludes).toMatch(/hipotecarias/i)
  })

  it('la tabla oficial tiene 12 filas ordenadas, ISO, y el banco nunca paga después que las redes', () => {
    expect(IRPF_REFUND_CALENDAR_2026).toHaveLength(12)
    for (let i = 0; i < IRPF_REFUND_CALENDAR_2026.length; i++) {
      const r = IRPF_REFUND_CALENDAR_2026[i]!
      expect(r.filedBy).toMatch(ISO)
      expect(r.bank).toMatch(ISO)
      expect(r.networks).toMatch(ISO)
      expect(r.bank > r.filedBy).toBe(true)
      expect(r.networks >= r.bank).toBe(true)
      if (i > 0) expect(r.filedBy > IRPF_REFUND_CALENDAR_2026[i - 1]!.filedBy).toBe(true)
    }
    expect(IRPF_REFUND_CALENDAR_2026[0]).toEqual({
      filedBy: '2026-07-10',
      bank: '2026-07-20',
      networks: '2026-07-28',
    })
    expect(IRPF_REFUND_CALENDAR_2026[5]).toEqual({
      filedBy: '2026-09-18',
      bank: '2026-09-25',
      networks: '2026-09-28',
    })
  })

  it('nextRefundWindow devuelve la primera fila cuyo corte no pasó, y null cuando la tabla se agotó', () => {
    expect(nextRefundWindow('2026-09-22')?.filedBy).toBe('2026-10-09')
    expect(nextRefundWindow('2026-09-18')?.filedBy).toBe('2026-09-18')
    expect(nextRefundWindow('2026-01-01')?.filedBy).toBe('2026-07-10')
    expect(nextRefundWindow('2026-12-19')).toBeNull()
  })

  it('avisa que la regla del día 15 es la simplificación y la tabla manda', () => {
    expect(IRPF_REFUND_RULE_CAVEAT).toMatch(/18/)
    expect(IRPF_REFUND_RULE_CAVEAT).toMatch(/tabla/i)
  })

  it('la compensación de oficio explica la devolución trabada', () => {
    expect(IRPF_COMPENSATION_RULE).toMatch(/compensa de oficio/i)
    expect(IRPF_COMPENSATION_RULE).toMatch(/trabada/i)
  })
})

describe('debo IRPF: cuotas, mora, convenio', () => {
  it('el saldo 2025 va en 5 cuotas del 31/8 al 30/12 de 2026', () => {
    expect(IRPF_INSTALMENTS_2025.map(c => c.due)).toEqual([
      '2026-08-31',
      '2026-09-30',
      '2026-10-30',
      '2026-11-30',
      '2026-12-30',
    ])
    expect(IRPF_INSTALMENTS_2025.map(c => c.n)).toEqual([1, 2, 3, 4, 5])
  })

  it('los códigos son 109 (cat. II), 117 (núcleo) y 101 (cat. I)', () => {
    expect(IRPF_PAYMENT_CODES.map(c => c.code)).toEqual(['109', '117', '101'])
  })

  it('el recargo por mora 2026 es 1,00 en enero, 0,90 febrero–abril, 0,80 mayo–setiembre y sin publicar después', () => {
    const pct = IRPF_MORA_RATES_2026.map(r => r.pct)
    expect(pct).toEqual([1, 0.9, 0.9, 0.9, 0.8, 0.8, 0.8, 0.8, 0.8, null, null, null])
    expect(latestPublishedRate(IRPF_MORA_RATES_2026)).toEqual({ month: 'setiembre', pct: 0.8 })
  })

  it('el interés por convenio es más bajo que el recargo por mora en cada mes publicado', () => {
    expect(latestPublishedRate(IRPF_CONVENIO_RATES_2026)).toEqual({ month: 'setiembre', pct: 0.7 })
    IRPF_CONVENIO_RATES_2026.forEach((row, i) => {
      const mora = IRPF_MORA_RATES_2026[i]!
      expect(row.month).toBe(mora.month)
      if (row.pct !== null && mora.pct !== null) expect(row.pct).toBeLessThan(mora.pct)
    })
  })

  it('el convenio pide 10 % de entrega (no 20 %) y admite hasta 72 meses', () => {
    expect(IRPF_CONVENIO.minUpfrontPct).toBe(10)
    expect(IRPF_CONVENIO.maxMonths).toBe(72)
    expect(IRPF_CONVENIO.form).toBe('2/015')
    expect(IRPF_CONVENIO.rule).not.toMatch(/20 %/)
  })

  it('la contravención por presentar fuera de plazo es $ 910 con tope de $ 2.730', () => {
    expect(IRPF_LATE_FILING_FINE.amount).toBe(910)
    expect(IRPF_LATE_FILING_FINE.cap).toBe(2_730)
  })
})

describe('años anteriores: las cifras que deciden', () => {
  it('el crédito caduca a los 4 años; la deuda prescribe a los 5, 10 sin declaraciones', () => {
    expect(IRPF_CREDIT_CADUCITY_YEARS).toBe(4)
    expect(IRPF_DEBT_PRESCRIPTION_YEARS).toBe(5)
    expect(IRPF_DEBT_PRESCRIPTION_YEARS_EXTENDED).toBe(10)
    expect(IRPF_PAST_YEARS_FIGURES).toMatch(/4 años/)
    expect(IRPF_PAST_YEARS_FIGURES).toMatch(/5 años/)
    expect(IRPF_PAST_YEARS_FIGURES).toMatch(/no la aplica sola/i)
  })

  it('la aplicación 1102 existe de 2008 a 2025', () => {
    expect(IRPF_FORM_1102_YEARS).toEqual({ from: 2008, to: 2025 })
  })
})

describe('FAQ con las frases exactas de búsqueda', () => {
  it('tiene entre 3 y 5 preguntas', () => {
    expect(IRPF_CASOS_FAQ.length).toBeGreaterThanOrEqual(3)
    expect(IRPF_CASOS_FAQ.length).toBeLessThanOrEqual(5)
  })

  it('cubre las cuatro consultas de la cola de demanda con sus palabras', () => {
    const qs = IRPF_CASOS_FAQ.map(f => f.question.toLowerCase())
    expect(qs.some(q => q.includes('cuánto irpf me tienen que quitar'))).toBe(true)
    expect(qs.some(q => q.includes('irpf sale negativo'))).toBe(true)
    expect(qs.some(q => q.includes('si debo irpf'))).toBe(true)
    expect(qs.some(q => q.includes('irpf de años anteriores'))).toBe(true)
  })

  it('cada respuesta es texto plano, con resumen corto y sin markdown', () => {
    for (const f of IRPF_CASOS_FAQ) {
      expect(f.short.length).toBeGreaterThan(20)
      expect(f.short.length).toBeLessThan(120)
      expect(f.answer.length).toBeGreaterThan(120)
      expect(f.answer).not.toMatch(/\*\*|<[a-z]/)
    }
  })
})

describe('fuentes y grafía', () => {
  it('cada fuente lleva editor, URL https y fecha de lectura ISO igual a la verificación', () => {
    expect(IRPF_CASOS_VERIFIED_AT).toMatch(ISO)
    expect(IRPF_CASOS_SOURCES.length).toBeGreaterThanOrEqual(20)
    const ids = new Set<string>()
    for (const s of IRPF_CASOS_SOURCES) {
      expect(s.url).toMatch(/^https:\/\//)
      expect(s.publisher.length).toBeGreaterThan(1)
      expect(s.seenOn).toBe(IRPF_CASOS_VERIFIED_AT)
      expect(ids.has(s.id)).toBe(false)
      ids.add(s.id)
    }
    expect(() => irpfSource('no-existe')).toThrow()
  })

  it('escribe setiembre, nunca septiembre', () => {
    expect(ALL_TEXT).not.toMatch(/septiembre/i)
    expect(ALL_TEXT).toMatch(/setiembre/)
  })

  it('el aguinaldo no inventa una retención bajo 7 BPC: la tasa marginal máxima ahí es 0 %', () => {
    expect(IRPF_AGUINALDO_RULE).toMatch(/tasa marginal máxima/)
    expect(IRPF_AGUINALDO_RULE).not.toMatch(/no llega a 7 BPC/)
  })

  it('no repite las afirmaciones refutadas: 6 % de alquiler, 20 % de entrega, deuda a 4 años', () => {
    expect(IRPF_RENTAL_CREDIT_NOTE).toMatch(/8 %/)
    expect(IRPF_RENTAL_CREDIT_NOTE).not.toMatch(/6 %/)
    expect(ALL_TEXT).not.toMatch(/entrega inicial[^.]*20 %/i)
    expect(ALL_TEXT).not.toMatch(/deuda[^.]*prescribe[^.]*4 años/i)
  })

  it('el ejemplo no se publica como cifra oficial: la página muestra el aviso', () => {
    const page = readFileSync(
      join(__dirname, '..', '..', 'pages', 'declaracion-de-irpf-uruguay.vue'),
      'utf8'
    )
    expect(page).toMatch(/IRPF_EXAMPLE_DISCLAIMER/)
    expect(page).toMatch(/IRPF_REFUND_CALENDAR_2026/)
    expect(page).toMatch(/IRPF_INSTALMENTS_2025/)
    expect(page).toMatch(/IRPF_CASOS_FAQ/)
    expect(page).not.toMatch(/septiembre/i)
  })
})
