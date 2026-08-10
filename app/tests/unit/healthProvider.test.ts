import { describe, expect, it } from 'vitest'

import {
  CHANGE_EFFECTIVE_RULE,
  CPE_MENSUAL,
  CPE_MENSUAL_ANTERIOR,
  DIGIT_MONTH,
  REFUND_REACH_AFTER,
  REFUND_REACH_BEFORE,
  REFUND_TIMELINE,
  topeAnualAporte,
  HEALTH_FAQ,
  HEALTH_SOURCES,
  LAST_PUBLISHED_REFUND,
  MIN_PERMANENCE_MONTHS,
  MOBILITY_EXCEPTIONS,
  MOBILITY_REQUIREMENTS,
  MONTH_NAMES,
  REFUND_FACTS,
  checkMobility,
} from '../../utils/healthProvider'

describe('calendario de movilidad regulada', () => {
  // El calendario de BPS, dígito por dígito. Si esto se rompe, la página le dice a alguien
  // que vaya a la mutualista el mes equivocado.
  it('asigna a cada dígito el mes que publica BPS', () => {
    expect(DIGIT_MONTH[3]).toBe(3) // marzo
    expect(DIGIT_MONTH[4]).toBe(4)
    expect(DIGIT_MONTH[5]).toBe(5)
    expect(DIGIT_MONTH[6]).toBe(6)
    expect(DIGIT_MONTH[7]).toBe(7)
    expect(DIGIT_MONTH[8]).toBe(8)
    expect(DIGIT_MONTH[9]).toBe(9)
    expect(DIGIT_MONTH[0]).toBe(10) // octubre
    expect(DIGIT_MONTH[1]).toBe(11)
    expect(DIGIT_MONTH[2]).toBe(12)
  })

  it('cubre los diez dígitos, sin repetir mes', () => {
    const months = Object.values(DIGIT_MONTH)
    expect(months).toHaveLength(10)
    expect(new Set(months).size).toBe(10)
  })

  it('no hay movilidad en enero ni febrero', () => {
    const months = Object.values(DIGIT_MONTH)
    expect(months).not.toContain(1)
    expect(months).not.toContain(2)
  })
})

describe('checkMobility', () => {
  it('con permanencia suficiente, habilita y nombra el mes', () => {
    const r = checkMobility({ cedulaDigit: 7, permanenceMonths: 30 })
    expect(r.month).toBe(7)
    expect(r.monthName).toBe('julio')
    expect(r.canChange).toBe(true)
    expect(r.monthsShort).toBe(0)
    expect(r.verdict).toContain('julio')
  })

  it('sin permanencia suficiente, dice cuántos meses faltan', () => {
    const r = checkMobility({ cedulaDigit: 0, permanenceMonths: 10 })
    expect(r.monthName).toBe('octubre')
    expect(r.canChange).toBe(false)
    expect(r.monthsShort).toBe(MIN_PERMANENCE_MONTHS - 10)
    expect(r.verdict).toContain('13')
  })

  it('el corte está exactamente en 23 meses', () => {
    expect(checkMobility({ cedulaDigit: 1, permanenceMonths: 22 }).canChange).toBe(false)
    expect(checkMobility({ cedulaDigit: 1, permanenceMonths: 23 }).canChange).toBe(true)
  })

  it('singulariza «mes» cuando falta uno solo', () => {
    const r = checkMobility({ cedulaDigit: 5, permanenceMonths: MIN_PERMANENCE_MONTHS - 1 })
    expect(r.verdict).toContain('1 mes ')
    expect(r.verdict).not.toContain('1 meses')
  })

  it('rechaza un dígito inválido sin romper', () => {
    const r = checkMobility({ cedulaDigit: 42, permanenceMonths: 30 })
    expect(r.month).toBeNull()
    expect(r.canChange).toBe(false)
    expect(r.verdict).toMatch(/dígito/)
  })

  it('trata una permanencia negativa como 0', () => {
    const r = checkMobility({ cedulaDigit: 3, permanenceMonths: -5 })
    expect(r.monthsShort).toBe(MIN_PERMANENCE_MONTHS)
  })

  it('el nombre del mes coincide con el índice del calendario', () => {
    for (const [digit, month] of Object.entries(DIGIT_MONTH)) {
      const r = checkMobility({ cedulaDigit: Number(digit), permanenceMonths: 24 })
      expect(r.monthName).toBe(MONTH_NAMES[month - 1])
    }
  })
})

describe('integridad de los datos publicados', () => {
  it('están documentados los requisitos y las cuatro excepciones', () => {
    expect(MOBILITY_REQUIREMENTS.length).toBeGreaterThanOrEqual(4)
    expect(MOBILITY_EXCEPTIONS).toHaveLength(4)
    for (const e of MOBILITY_EXCEPTIONS) {
      expect(e.when.length).toBeGreaterThan(5)
      expect(e.detail.length).toBeGreaterThan(40)
    }
  })

  it('la regla de efectividad del cambio está escrita', () => {
    expect(CHANGE_EFFECTIVE_RULE).toMatch(/primer día hábil/)
  })

  // Los umbrales de la devolución cambian todos los años: publicarlos sin ejercicio los
  // convierte en desinformación doce meses después.
  it('la devolución publicada declara a qué ejercicio corresponde', () => {
    expect(LAST_PUBLISHED_REFUND.year).toBeGreaterThan(2020)
    expect(LAST_PUBLISHED_REFUND.workerThreshold).toBeGreaterThan(0)
    expect(LAST_PUBLISHED_REFUND.retireeThreshold).toBeGreaterThan(
      LAST_PUBLISHED_REFUND.workerThreshold
    )
    expect(LAST_PUBLISHED_REFUND.availableFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('los datos de la devolución explican el mecanismo', () => {
    expect(REFUND_FACTS.length).toBeGreaterThanOrEqual(4)
    for (const f of REFUND_FACTS) expect(f.detail.length).toBeGreaterThan(40)
  })
})

describe('tope de aporte y el cambio de 2026', () => {
  // La aritmética que hace publicable la fórmula: con el CPE del Decreto 317/025 da exacto.
  it('el tope anual de una persona sola son $ 100.395', () => {
    expect(CPE_MENSUAL).toBe(6693)
    expect(topeAnualAporte(1)).toBe(100_395)
    expect(topeAnualAporte(1)).toBe(Math.round(CPE_MENSUAL * 12 * 1.25))
  })

  it('el tope escala con la cantidad de personas que cubrís', () => {
    expect(topeAnualAporte(2)).toBe(topeAnualAporte(1) * 2)
    expect(topeAnualAporte(3)).toBeGreaterThan(topeAnualAporte(2))
  })

  it('nunca calcula con menos de un beneficiario', () => {
    expect(topeAnualAporte(0)).toBe(topeAnualAporte(1))
    expect(topeAnualAporte(-4)).toBe(topeAnualAporte(1))
  })

  it('el CPE nuevo es mayor que el anterior, que es lo que reduce el alcance', () => {
    expect(CPE_MENSUAL).toBeGreaterThan(CPE_MENSUAL_ANTERIOR)
    expect(topeAnualAporte(1, CPE_MENSUAL)).toBeGreaterThan(
      topeAnualAporte(1, CPE_MENSUAL_ANTERIOR)
    )
    expect(REFUND_REACH_AFTER).toBeLessThan(REFUND_REACH_BEFORE)
  })

  // El error de plazos que la página existe para evitar: creer que ya te afecta este año.
  it('deja claro qué ejercicio va por el régimen anterior y cuál por el nuevo', () => {
    const prev = REFUND_TIMELINE.find(t => t.regime === 'anterior')!
    const next = REFUND_TIMELINE.find(t => t.regime === 'nuevo')!
    expect(prev.contributionYear).toBe(2025)
    expect(prev.paidIn).toBe(2026)
    expect(next.contributionYear).toBe(2026)
    expect(next.paidIn).toBe(2027)
    expect(next.contributionYear).toBeGreaterThan(prev.contributionYear)
  })

  it('cita el decreto que fija el CPE', () => {
    expect(HEALTH_SOURCES.some(s => s.url.includes('317-2025'))).toBe(true)
  })
})

describe('FAQ y fuentes', () => {
  it('cada pregunta del FAQ tiene respuesta corta y desarrollo', () => {
    expect(HEALTH_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of HEALTH_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(80)
    }
  })

  it('toda regla publicada tiene fuente oficial', () => {
    expect(HEALTH_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const s of HEALTH_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/(www\.)?(bps|impo)\./)
    }
  })
})
