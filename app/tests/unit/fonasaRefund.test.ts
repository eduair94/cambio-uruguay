import { describe, expect, it } from 'vitest'

import {
  CPE_ADJUSTMENT_RULE,
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
  IRPF_RETENTION_PCT,
  LATEST_EXERCISE,
  annualCap,
  estimateRefund,
} from '../../utils/fonasaRefund'

describe('el tope anual de FONASA', () => {
  it('es la suma de los CPE mensuales incrementada en 25 %', () => {
    // Una persona sola, doce meses de cobertura: 6693 × 12 × 1,25.
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
    // El 25 % sale de la ley y el CPE del decreto: si alguna se cae de la lista, la página
    // quedaría publicando un número sin fuente.
    expect(urls).toContain('leyes/18731-2011/3')
    expect(urls).toContain('decretos-originales/317-2025')
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

  // Y no estima el valor de hoy: no encontramos el decreto posterior, y estimarlo seria inventar.
  it('no publica un CPE estimado', () => {
    expect(CPE_ADJUSTMENT_RULE).not.toMatch(/\$\s*\d/)
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
  it('el mínimo del anticipo es el 75 % del CPE', () => {
    expect(FONASA_ANTICIPO.minPctOfCpe).toBe(75)
    expect(FONASA_ANTICIPO.minMonthly).toBe(Math.round(CPE_MONTHLY * 0.75))
    expect(FONASA_ANTICIPO.url).toMatch(/^https:\/\//)
  })
  it('FAQ y fuentes crecieron con 2026', () => {
    expect(FONASA_FAQ.some(f => /cómo saber si tengo/i.test(f.question))).toBe(true)
    expect(FONASA_FAQ.some(f => /2026/.test(f.question))).toBe(true)
    expect(FONASA_SOURCES.some(s => s.url.includes('bps.gub.uy/10573'))).toBe(true)
    for (const s of FONASA_SOURCES) expect(s.url).toMatch(/^https:\/\//)
    expect(FONASA_VERIFIED_AT).toBe('2026-09-15')
  })
})
