import { describe, expect, it } from 'vitest'

import { URUGUAY } from '../../utils/calculators'
import {
  CAUSALES,
  DESPIDO_MONTHLY_CAPS,
  DESPIDO_PERCENTAGES,
  EXTENSION_MONTHS_50_PLUS,
  FAMILY_COMPLEMENT_PCT,
  REQUIREMENTS,
  SUSPENSION_CAP,
  SUSPENSION_FLOOR,
  SUSPENSION_PERCENTAGE,
  TERMINATION_CAUSES,
  UNEMPLOYMENT_FAQ,
  UNEMPLOYMENT_SOURCES,
  dependantIncomeCap,
  estimateUnemploymentBenefit,
  type BenefitInput,
} from '../../utils/unemploymentBenefit'

const input = (over: Partial<BenefitInput> = {}): BenefitInput => ({
  averageNominal: 50000,
  causal: 'despido',
  age: 35,
  hasDependants: false,
  ...over,
})

describe('subsidio por despido', () => {
  it('paga el porcentaje decreciente sobre el promedio nominal', () => {
    const r = estimateUnemploymentBenefit(input({ averageNominal: 50000 }))
    expect(r.months).toHaveLength(6)
    expect(r.months.map(m => m.percentage)).toEqual([...DESPIDO_PERCENTAGES])
    expect(r.months[0].amount).toBe(Math.round(50000 * 0.66))
    expect(r.months[5].amount).toBe(Math.round(50000 * 0.4))
  })

  // La queja recurrente en Reddit: "cada mes me pagan menos". Es el régimen, no un error.
  it('el importe baja mes a mes', () => {
    const r = estimateUnemploymentBenefit(input())
    for (let i = 1; i < r.months.length; i++) {
      expect(r.months[i].amount).toBeLessThan(r.months[i - 1].amount)
    }
    expect(r.notes.some(n => n.includes('baja todos los meses'))).toBe(true)
  })

  it('aplica el tope de cada mes cuando el sueldo es alto', () => {
    // Un promedio muy alto cobra el tope todos los meses.
    const r = estimateUnemploymentBenefit(input({ averageNominal: 400000 }))
    expect(r.months.map(m => m.amount)).toEqual([...DESPIDO_MONTHLY_CAPS])
    expect(r.months.every(m => m.cappedByLimit)).toBe(true)
    expect(r.notes.some(n => n.includes('supera el tope'))).toBe(true)
  })

  // Aunque esté topeado los seis meses, el importe igual baja: los topes también decrecen.
  it('con sueldo topeado el importe sigue bajando, porque los topes decrecen', () => {
    const r = estimateUnemploymentBenefit(input({ averageNominal: 400000 }))
    expect(r.months[0].amount).toBeGreaterThan(r.months[5].amount)
  })

  it('no aplica tope cuando el porcentaje da por debajo', () => {
    const r = estimateUnemploymentBenefit(input({ averageNominal: 40000 }))
    expect(r.months.every(m => m.cappedByLimit)).toBe(false)
  })
})

describe('complemento por cargas familiares', () => {
  it('suma el 20 % DESPUÉS del tope, no antes', () => {
    const capped = estimateUnemploymentBenefit(
      input({ averageNominal: 400000, hasDependants: true })
    )
    const expected = Math.round(DESPIDO_MONTHLY_CAPS[0] * (1 + FAMILY_COMPLEMENT_PCT / 100))
    expect(capped.months[0].amount).toBe(expected)
    // El error clásico sería topear después: daría exactamente el tope.
    expect(capped.months[0].amount).toBeGreaterThan(DESPIDO_MONTHLY_CAPS[0])
  })

  it('sin cargas familiares no suma nada', () => {
    const r = estimateUnemploymentBenefit(input({ hasDependants: false }))
    expect(r.months.every(m => m.complement === 0)).toBe(true)
  })

  it('el tope de ingreso de la persona a cargo es 1 BPC', () => {
    expect(dependantIncomeCap()).toBe(URUGUAY.bpc)
  })
})

describe('extensión por 50 años o más', () => {
  it('agrega seis meses y los marca como extensión', () => {
    const r = estimateUnemploymentBenefit(input({ age: 50 }))
    expect(r.totalMonths).toBe(6 + EXTENSION_MONTHS_50_PLUS)
    expect(r.months.filter(m => m.isExtension)).toHaveLength(EXTENSION_MONTHS_50_PLUS)
    expect(r.notes.some(n => n.includes('50 años'))).toBe(true)
  })

  it('la extensión mantiene el último porcentaje: no vuelve a empezar en 66 %', () => {
    const r = estimateUnemploymentBenefit(input({ age: 55 }))
    const last = DESPIDO_PERCENTAGES[DESPIDO_PERCENTAGES.length - 1]
    expect(r.months.filter(m => m.isExtension).every(m => m.percentage === last)).toBe(true)
  })

  it('a los 49 no se extiende', () => {
    expect(estimateUnemploymentBenefit(input({ age: 49 })).totalMonths).toBe(6)
  })
})

describe('suspensión total', () => {
  it('paga 50 % fijo durante 4 meses', () => {
    const r = estimateUnemploymentBenefit(input({ causal: 'suspension', averageNominal: 50000 }))
    expect(r.totalMonths).toBe(4)
    expect(r.months.every(m => m.percentage === SUSPENSION_PERCENTAGE)).toBe(true)
    expect(r.months.every(m => m.amount === Math.round(50000 * 0.5))).toBe(true)
  })

  it('respeta el tope máximo', () => {
    const r = estimateUnemploymentBenefit(input({ causal: 'suspension', averageNominal: 500000 }))
    expect(r.months.every(m => m.amount === SUSPENSION_CAP)).toBe(true)
  })

  it('respeta el piso mínimo', () => {
    const r = estimateUnemploymentBenefit(input({ causal: 'suspension', averageNominal: 5000 }))
    expect(r.months.every(m => m.amount === SUSPENSION_FLOOR)).toBe(true)
    expect(r.notes.some(n => n.includes('mínimo'))).toBe(true)
  })
})

describe('trabajo reducido', () => {
  it('cubre la diferencia contra lo que se sigue cobrando', () => {
    const r = estimateUnemploymentBenefit(
      input({ causal: 'reduccion', averageNominal: 50000, reducedIncome: 20000 })
    )
    expect(r.months[0].amount).toBe(Math.round(50000 * 0.66 - 20000))
  })

  it('nunca da negativo si lo que se cobra supera el subsidio', () => {
    const r = estimateUnemploymentBenefit(
      input({ causal: 'reduccion', averageNominal: 50000, reducedIncome: 90000 })
    )
    expect(r.months.every(m => m.amount >= 0)).toBe(true)
  })
})

describe('robustez', () => {
  it('un promedio de 0 no rompe ni produce NaN', () => {
    const r = estimateUnemploymentBenefit(input({ averageNominal: 0 }))
    expect(r.total).toBe(0)
    expect(r.months.every(m => Number.isFinite(m.amount))).toBe(true)
  })

  it('un promedio negativo se trata como 0', () => {
    expect(estimateUnemploymentBenefit(input({ averageNominal: -5000 })).total).toBe(0)
  })

  it('el total es la suma de los meses', () => {
    const r = estimateUnemploymentBenefit(input({ age: 52, hasDependants: true }))
    expect(r.total).toBe(r.months.reduce((n, m) => n + m.amount, 0))
  })
})

describe('integridad de los datos publicados', () => {
  it('hay un tope por cada mes del régimen general', () => {
    expect(DESPIDO_MONTHLY_CAPS).toHaveLength(DESPIDO_PERCENTAGES.length)
  })

  it('porcentajes y topes son estrictamente decrecientes', () => {
    for (let i = 1; i < DESPIDO_PERCENTAGES.length; i++) {
      expect(DESPIDO_PERCENTAGES[i]).toBeLessThan(DESPIDO_PERCENTAGES[i - 1])
      expect(DESPIDO_MONTHLY_CAPS[i]).toBeLessThan(DESPIDO_MONTHLY_CAPS[i - 1])
    }
  })

  it('el piso de suspensión es menor que su tope', () => {
    expect(SUSPENSION_FLOOR).toBeLessThan(SUSPENSION_CAP)
  })

  it('las tres causales están descritas con duración', () => {
    expect(CAUSALES).toHaveLength(3)
    for (const c of CAUSALES) {
      expect(c.months).toBeGreaterThan(0)
      expect(c.jornales).toBeGreaterThan(0)
      expect(c.what.length).toBeGreaterThan(30)
    }
  })

  it('requisitos y causas de cese están documentados', () => {
    expect(REQUIREMENTS.length).toBeGreaterThanOrEqual(3)
    expect(TERMINATION_CAUSES.length).toBeGreaterThanOrEqual(3)
  })

  it('cada pregunta del FAQ tiene respuesta corta y desarrollo', () => {
    expect(UNEMPLOYMENT_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of UNEMPLOYMENT_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(80)
    }
  })

  it('toda cifra publicada tiene fuente oficial', () => {
    expect(UNEMPLOYMENT_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const s of UNEMPLOYMENT_SOURCES) expect(s.url).toMatch(/^https:\/\/(www\.)?(bps|gub)\./)
  })
})
