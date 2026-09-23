import { describe, expect, it } from 'vitest'

import {
  CPE_ADJUSTMENT_RULE,
  CPE_CURRENT,
  CPE_FROM,
  CPE_HISTORY,
  CPE_JAN_2026,
  CPE_MONTHLY,
  CPE_UPLIFT,
  FONASA_ANTICIPO,
  FONASA_COBRO,
  FONASA_CONSULTA,
  FONASA_EXERCISES,
  FONASA_FAQ,
  FONASA_SOURCES,
  FONASA_STEPS,
  FONASA_VERIFIED_AT,
  HEALTH_PRICE_ADJUSTMENTS,
  IRPF_RETENTION_PCT,
  LATEST_ADJUSTMENT,
  LATEST_EXERCISE,
  RECEIPT_RULE_JULY_2026,
  annualCap,
  estimateRefund,
} from '../../utils/fonasaRefund'

describe('el tope anual de FONASA', () => {
  it('es la suma de los CPE mensuales incrementada en 25 %', () => {
    // Una persona sola, doce meses de cobertura: CPE × 12 × 1,25.
    expect(annualCap({ cpeMonthly: CPE_MONTHLY, months: 12, cpeUnits: 1 })).toBe(
      Math.round(CPE_MONTHLY * 12 * CPE_UPLIFT)
    )
  })

  it('sube cuando cubrís a más gente', () => {
    const solo = annualCap({ cpeMonthly: CPE_MONTHLY, months: 12, cpeUnits: 1 })
    const conConyuge = annualCap({ cpeMonthly: CPE_MONTHLY, months: 12, cpeUnits: 2 })
    // Medio CPE por hijo cuando ambos padres le dan cobertura.
    const conHijoCompartido = annualCap({ cpeMonthly: CPE_MONTHLY, months: 12, cpeUnits: 1.5 })
    expect(conConyuge).toBe(solo * 2)
    expect(conHijoCompartido).toBeGreaterThan(solo)
    expect(conHijoCompartido).toBeLessThan(conConyuge)
  })

  it('se prorratea por los meses con beneficio', () => {
    const anio = annualCap({ cpeMonthly: CPE_MONTHLY, months: 12, cpeUnits: 1 })
    // El tope viene redondeado al peso, así que medio año es la mitad ±1 peso, no la mitad exacta.
    expect(annualCap({ cpeMonthly: CPE_MONTHLY, months: 6, cpeUnits: 1 })).toBe(
      Math.round(anio / 2)
    )
    expect(annualCap({ cpeMonthly: CPE_MONTHLY, months: 0, cpeUnits: 1 })).toBe(0)
  })

  it('no se desborda con entradas basura del formulario', () => {
    // `v-model.number` sobre un campo vacío entrega NaN, y los meses vienen de un slider que el
    // usuario puede forzar por URL: ninguna de las dos cosas puede producir un tope negativo.
    expect(annualCap({ cpeMonthly: NaN, months: 12, cpeUnits: 1 })).toBe(0)
    expect(annualCap({ cpeMonthly: CPE_MONTHLY, months: 99, cpeUnits: 1 })).toBe(
      annualCap({ cpeMonthly: CPE_MONTHLY, months: 12, cpeUnits: 1 })
    )
    expect(annualCap({ cpeMonthly: CPE_MONTHLY, months: -5, cpeUnits: -3 })).toBe(0)
  })
})

describe('la estimación de la devolución', () => {
  it('devuelve el excedente neto de la retención de IRPF', () => {
    const result = estimateRefund({ contributions: 200000, cap: 100000 })
    expect(result.excess).toBe(100000)
    expect(result.retention).toBe((100000 * IRPF_RETENTION_PCT) / 100)
    expect(result.net).toBe(100000 - result.retention)
    expect(result.shortfall).toBe(0)
  })

  it('no inventa una devolución cuando no se llegó al tope', () => {
    const result = estimateRefund({ contributions: 80000, cap: 100000 })
    expect(result.excess).toBe(0)
    expect(result.retention).toBe(0)
    expect(result.net).toBe(0)
    // El dato útil en ese caso es cuánto faltó, no un cero pelado.
    expect(result.shortfall).toBe(20000)
  })

  it('trata el empate exacto como «sin devolución»', () => {
    expect(estimateRefund({ contributions: 100000, cap: 100000 })).toMatchObject({
      excess: 0,
      shortfall: 0,
    })
  })

  it('admite la retención histórica de los ejercicios 2011 a 2015', () => {
    expect(estimateRefund({ contributions: 200000, cap: 100000, retentionPct: 20 }).net).toBe(80000)
  })
})

describe('las cifras publicadas', () => {
  it('sólo lista ejercicios con números oficiales, en orden', () => {
    const years = FONASA_EXERCISES.map(e => e.year)
    expect(years).toEqual([...years].sort((a, b) => a - b))
    expect(LATEST_EXERCISE).toBe(FONASA_EXERCISES[FONASA_EXERCISES.length - 1])
  })

  it('mantiene las cifras del ejercicio 2024 tal como las publicó Presidencia', () => {
    const e2024 = FONASA_EXERCISES.find(e => e.year === 2024)
    expect(e2024).toMatchObject({
      paidFrom: '2025-09-22',
      people: 155000,
      totalPesos: 7_774_000_000,
      workerThreshold: 113167,
      retireeThreshold: 122598,
    })
  })

  it('deja el umbral de jubilados por encima del de trabajadores', () => {
    for (const e of FONASA_EXERCISES) {
      expect(e.retireeThreshold).toBeGreaterThan(e.workerThreshold)
    }
  })
})

describe('el contenido de la página', () => {
  it('numera los pasos sin saltos', () => {
    expect(FONASA_STEPS.map(s => s.n)).toEqual(FONASA_STEPS.map((_, i) => i + 1))
  })

  it('no repite preguntas en el FAQ', () => {
    const questions = FONASA_FAQ.map(f => f.question)
    expect(new Set(questions).size).toBe(questions.length)
  })

  it('cita únicamente fuentes oficiales uruguayas', () => {
    const allowed =
      /^https:\/\/(www\.impo\.com\.uy|www\.gub\.uy|www\.bps\.gub\.uy|devolucionfonasa\.bps\.gub\.uy)\//
    for (const source of FONASA_SOURCES) {
      expect(source.url).toMatch(allowed)
      expect(source.label.length).toBeGreaterThan(10)
    }
  })

  it('respalda cada cifra legal con la norma que la fija', () => {
    const urls = FONASA_SOURCES.map(s => s.url).join(' ')
    // El 25 % sale de la ley y el CPE de los dos decretos del año: si alguno se cae de la lista,
    // la página quedaría publicando un número sin fuente.
    expect(urls).toContain('leyes/18731-2011/3')
    expect(urls).toContain('decretos-originales/317-2025')
    expect(urls).toContain('decretos/163-2026')
    expect(urls).toContain('ajustes-precios-salud-julio-2026.pdf')
  })

  it('escribe setiembre, nunca septiembre', () => {
    const text = [
      ...FONASA_FAQ.map(f => `${f.question} ${f.short} ${f.answer}`),
      ...FONASA_STEPS.map(s => `${s.title} ${s.detail}`),
      ...FONASA_SOURCES.map(s => s.label),
      CPE_ADJUSTMENT_RULE,
    ].join(' ')
    expect(text).not.toMatch(/septiembre/i)
  })
})

// El Decreto 317/025 art. 17 dice que el CPE se ajusta "en las mismas oportunidades que determine
// el Poder Ejecutivo para las cuotas salud", y recien "adicionalmente, en enero de cada anio" se
// recalcula. La pagina publicaba "$ 6.693 desde el 1/1/2026" sin esa parte, lo que lo hacia leer
// como un valor fijo hasta el enero siguiente.
describe('la regla de ajuste del CPE', () => {
  it('dice que se mueve con las cuotas salud, no solo en enero', () => {
    expect(CPE_ADJUSTMENT_RULE).toMatch(/cuotas salud/i)
    expect(CPE_ADJUSTMENT_RULE).toMatch(/enero de cada a[nñ]o/i)
  })

  // La regla va sin cifras: el valor vive en CPE_HISTORY, con decreto y fecha. Una cifra suelta
  // en la prosa es la que envejece sin que nadie la vea.
  it('no lleva ninguna cifra en pesos', () => {
    expect(CPE_ADJUSTMENT_RULE).not.toMatch(/\$\s*\d/)
  })

  it('nombra el ajuste de julio de 2026 que ya la aplicó', () => {
    expect(CPE_ADJUSTMENT_RULE).toMatch(/163\/026/)
  })
})

// 2026-09-22: la pagina publicaba solo el CPE de enero ($ 6.693) y decia no haber encontrado el
// ajuste posterior. Existe: Decreto 163/026 (D.O. 23/07/2026), art. 11, $ 6.858 desde el 1/7/2026.
describe('el CPE fechado de 2026', () => {
  it('trae los dos decretos del año, en orden y con fuente', () => {
    expect(CPE_HISTORY.map(c => c.from)).toEqual(['2026-01-01', '2026-07-01'])
    expect(CPE_HISTORY.map(c => c.monthly)).toEqual([6693, 6858])
    for (const c of CPE_HISTORY) {
      expect(c.url).toMatch(/^https:\/\/www\.impo\.com\.uy\//)
      expect(c.norm).toMatch(/Decreto \d{3}\/0\d\d, artículo \d+/)
    }
  })

  it('el vigente es el último y CPE_MONTHLY lo refleja', () => {
    expect(CPE_CURRENT).toBe(CPE_HISTORY[CPE_HISTORY.length - 1])
    expect(CPE_CURRENT.monthly).toBe(6858)
    expect(CPE_CURRENT.norm).toBe('Decreto 163/026, artículo 11')
    expect(CPE_MONTHLY).toBe(CPE_CURRENT.monthly)
    expect(CPE_FROM).toBe('2026-07-01')
    expect(CPE_JAN_2026.monthly).toBe(6693)
    expect(CPE_JAN_2026.norm).toBe('Decreto 317/025, artículo 18')
  })

  it('nunca baja de un decreto al siguiente', () => {
    for (let i = 1; i < CPE_HISTORY.length; i++) {
      expect(CPE_HISTORY[i]!.monthly).toBeGreaterThan(CPE_HISTORY[i - 1]!.monthly)
      expect(CPE_HISTORY[i]!.from > CPE_HISTORY[i - 1]!.from).toBe(true)
    }
  })

  it('el FAQ del CPE publica el valor vigente con su decreto, y el de enero como historia', () => {
    const faq = FONASA_FAQ.find(f => /qué es el CPE/i.test(f.question))!
    expect(faq.answer).toContain('$ 6.858')
    expect(faq.answer).toContain('Decreto 163/026, artículo 11')
    expect(faq.answer).toContain('$ 6.693')
    expect(faq.answer).toMatch(/1\.º de julio de 2026/)
  })
})

// Los dos ajustes de precios de salud de 2026, leidos de los decretos (317/025 y 163/026) y del
// cuadro del MSP de julio. Lo que NO se publica: un precio de cuota mutual en pesos, porque el
// Ejecutivo solo autoriza el aumento maximo.
describe('los ajustes de cuotas y tickets de 2026', () => {
  it('son enero y julio, con decreto y URL de IMPO', () => {
    expect(HEALTH_PRICE_ADJUSTMENTS.map(a => a.norm)).toEqual([
      'Decreto 317/025',
      'Decreto 163/026',
    ])
    expect(HEALTH_PRICE_ADJUSTMENTS.map(a => a.from)).toEqual(['2026-01-01', '2026-07-01'])
    for (const a of HEALTH_PRICE_ADJUSTMENTS)
      expect(a.url).toMatch(/^https:\/\/www\.impo\.com\.uy\//)
    expect(LATEST_ADJUSTMENT.norm).toBe('Decreto 163/026')
  })

  it('julio de 2026: individuales 2,13 %, tope $ 880, banda 660–880 al 1,60 %, ASSE 1,00 %', () => {
    expect(LATEST_ADJUSTMENT).toMatchObject({
      individualQuotaMaxPct: 2.13,
      moderatorFeeCapPesos: 880,
      bandFloorPesos: 660,
      bandMaxPct: 1.6,
      asseMaxPct: 1,
      cpeMonthly: 6858,
    })
  })

  it('enero de 2026: individuales 2,50 %, banda al 1,88 %, ASSE 2,96 %, CPE 6.693', () => {
    expect(HEALTH_PRICE_ADJUSTMENTS[0]).toMatchObject({
      individualQuotaMaxPct: 2.5,
      moderatorFeeCapPesos: 880,
      bandMaxPct: 1.88,
      asseMaxPct: 2.96,
      cpeMonthly: 6693,
    })
  })

  it('la banda alta sube menos que la cuota general y el tope no se movió', () => {
    for (const a of HEALTH_PRICE_ADJUSTMENTS) {
      expect(a.bandMaxPct).toBeLessThan(a.individualQuotaMaxPct)
      expect(a.moderatorFeeCapPesos).toBe(880)
    }
  })

  it('el CPE de cada ajuste coincide con la historia del CPE', () => {
    expect(HEALTH_PRICE_ADJUSTMENTS.map(a => a.cpeMonthly)).toEqual(CPE_HISTORY.map(c => c.monthly))
  })

  it('la regla del recibo cita el texto del art. 17 con el 2,13 % y la frase de los meses sin aumento', () => {
    expect(RECEIPT_RULE_JULY_2026.julyText).toContain('julio de 2026')
    expect(RECEIPT_RULE_JULY_2026.julyText).toContain('2,13%')
    expect(RECEIPT_RULE_JULY_2026.followingMonthsText).toMatch(/no está autorizado incrementar/)
    expect(RECEIPT_RULE_JULY_2026.url).toContain('decretos/163-2026')
  })

  it('el FAQ de julio lleva las cuatro cifras y niega un precio oficial de cuota', () => {
    const faq = FONASA_FAQ.find(f => /julio de 2026/i.test(f.question))!
    expect(faq.answer).toContain('2,13 %')
    expect(faq.answer).toContain('$ 880')
    expect(faq.answer).toContain('1,60 %')
    expect(faq.answer).toContain('$ 660')
    expect(faq.answer).toContain('$ 6.858')
    expect(faq.answer).toMatch(/No hay un precio oficial de cuota mutual/)
  })
})

// El BPS publico las cifras del ejercicio 2025 (se cobra en 2026) el 2026-09-15: consulta por
// tres canales, plazo para elegir deposito y el anticipo mensual de servicios personales, que es
// un tramite distinto y no debe confundirse con esta devolucion anual.
describe('el ejercicio 2025 (se cobra en 2026)', () => {
  it('es el último y trae las cifras del BPS', () => {
    expect(LATEST_EXERCISE.year).toBe(2025)
    expect(LATEST_EXERCISE.paidFrom).toBe('2026-09-21')
    expect(LATEST_EXERCISE.people).toBe(152000)
    // BPS: 8.676 millones. Presidencia publico 8.085 el mismo dia; se conserva la del BPS.
    expect(LATEST_EXERCISE.totalPesos).toBe(8_676_000_000)
    expect(LATEST_EXERCISE.workerThreshold).toBe(122629)
    expect(LATEST_EXERCISE.retireeThreshold).toBe(132848)
  })
  it('los umbrales suben respecto de 2024 y los años van en orden', () => {
    const years = FONASA_EXERCISES.map(e => e.year)
    expect(years).toEqual([...years].sort((a, b) => a - b))
    const prev = FONASA_EXERCISES[FONASA_EXERCISES.length - 2]!
    expect(LATEST_EXERCISE.workerThreshold).toBeGreaterThan(prev.workerThreshold)
    expect(LATEST_EXERCISE.retireeThreshold).toBeGreaterThan(prev.retireeThreshold)
  })
})

describe('consulta, cobro y anticipo', () => {
  it('canales y fechas', () => {
    expect(FONASA_CONSULTA.web).toMatch(/^https:\/\/www\.bps\.gub\.uy\//)
    expect(FONASA_CONSULTA.phone).toBe('0800 2016')
    expect(FONASA_CONSULTA.whatsapp).toBe('092 366 272')
    expect(FONASA_CONSULTA.openedForRegistered < FONASA_CONSULTA.openedForAll).toBe(true)
    expect(FONASA_COBRO.chooseBy).toBe('2026-09-16')
    expect(FONASA_COBRO.depositOptions).toContain('Prex')
    expect(FONASA_COBRO.inPerson.length).toBeGreaterThanOrEqual(4)
  })
  // El minimo del anticipo ($ 5.020) lo publico el BPS sobre el CPE de ENERO. El CPE subio en julio
  // y la cifra no se recalcula a ojo: se conserva con su base declarada y su fecha.
  it('el mínimo del anticipo es el 75 % del CPE de enero, con la base declarada', () => {
    expect(FONASA_ANTICIPO.minPctOfCpe).toBe(75)
    expect(FONASA_ANTICIPO.cpeBasisMonthly).toBe(CPE_JAN_2026.monthly)
    expect(FONASA_ANTICIPO.minMonthly).toBe(Math.round(FONASA_ANTICIPO.cpeBasisMonthly * 0.75))
    expect(FONASA_ANTICIPO.since).toBe(CPE_JAN_2026.from)
    expect(FONASA_ANTICIPO.url).toMatch(/^https:\/\//)
  })
  it('FAQ y fuentes crecieron con 2026', () => {
    expect(FONASA_FAQ.some(f => /cómo saber si tengo/i.test(f.question))).toBe(true)
    expect(FONASA_FAQ.some(f => /2026/.test(f.question))).toBe(true)
    expect(FONASA_SOURCES.some(s => s.url.includes('bps.gub.uy/10573'))).toBe(true)
    expect(FONASA_SOURCES.some(s => s.url.includes('bps.gub.uy/24521'))).toBe(true)
    for (const s of FONASA_SOURCES) expect(s.url).toMatch(/^https:\/\//)
    expect(FONASA_VERIFIED_AT).toBe('2026-09-22')
  })
})

// La pregunta que llega junto con la devolucion: "me quede sin trabajo". La respuesta larga vive en
// la guia /guias/me-quede-sin-trabajo-mutualista-fonasa-uruguay; aca va la parte que toca al tope.
describe('quedarse sin trabajo y la devolución', () => {
  it('el FAQ dice hasta cuándo cubre y que el tope se arma sólo con los meses con beneficio', () => {
    const faq = FONASA_FAQ.find(f => /sin trabajo/i.test(f.question))!
    expect(faq).toBeDefined()
    expect(faq.answer).toMatch(/último día del mes/)
    expect(faq.answer).toMatch(/seguro de paro/)
    expect(faq.answer).toMatch(/sólo los meses/)
    // No promete meses extra: los "3 meses mas" fueron una medida COVID de 2020.
    expect(faq.answer).not.toMatch(/tres meses|3 meses|días de gracia/i)
  })
  it('el prorrateo cita la regla del BPS y distingue seguro de paro de meses sin aporte', () => {
    const faq = FONASA_FAQ.find(f => /doce meses/i.test(f.question))!
    expect(faq.answer).toMatch(/exclusivamente los meses del ejercicio/)
    expect(faq.answer).toMatch(/seguro de paro cuentan/)
    expect(FONASA_SOURCES.some(s => s.url.includes('bps.gub.uy/23321'))).toBe(true)
  })
})
