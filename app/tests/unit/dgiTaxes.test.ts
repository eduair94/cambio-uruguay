import { describe, expect, it } from 'vitest'

import {
  DEBT_REGIMES,
  DEPARTMENTAL_EXCLUSION,
  DGI_FAQ,
  DGI_SOURCES,
  EXTENSION_CAUSES,
  GOOD_HISTORY_RELIEF,
  INTERRUPTION_CAUSES,
  INTERRUPTION_WARNING,
  IRPF_CAMPAIGN,
  IRPF_FORMS,
  MORA_FACILIDADES_PCT,
  MORA_TIERS,
  NOT_OBLIGATED,
  OBLIGATION_CASES,
  PRESCRIPTION_NOT_AUTOMATIC,
  PRESCRIPTION_START,
  PRESCRIPTION_YEARS,
  PRESCRIPTION_YEARS_EXTENDED,
  RECARGOS_RULE,
  REFUND_RULE,
  SANCTIONS_PRESCRIPTION,
} from '../../utils/dgiTaxes'

describe('campaña de IRPF', () => {
  it('declara a qué ejercicio corresponde, no sólo el número', () => {
    // El umbral cambia todos los años: publicarlo suelto lo vuelve engañoso en doce meses.
    expect(IRPF_CAMPAIGN.incomeYear).toBe(2025)
    expect(IRPF_CAMPAIGN.campaignYear).toBe(2026)
    expect(IRPF_CAMPAIGN.incomeThreshold).toBeGreaterThan(0)
  })

  it('las fechas están en orden y son ISO', () => {
    const d = IRPF_CAMPAIGN
    for (const k of ['opensForDependents', 'opens', 'deadline', 'refundsFrom'] as const) {
      expect(d[k]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    expect(d.opensForDependents <= d.opens).toBe(true)
    expect(d.opens < d.deadline).toBe(true)
    expect(d.refundsFrom > d.opens).toBe(true)
  })

  it('la regla del día 15 está publicada', () => {
    expect(IRPF_CAMPAIGN.refundCutoffDay).toBe(15)
    expect(REFUND_RULE).toMatch(/15/)
    expect(REFUND_RULE).toMatch(/mes siguiente/i)
  })

  it('cubre los tres tipos de declarante y el caso más común', () => {
    const kinds = new Set(OBLIGATION_CASES.map(c => c.kind))
    expect(kinds).toEqual(new Set(['dependiente', 'independiente', 'capital']))
    expect(OBLIGATION_CASES.some(c => /m[aá]s de un empleador/i.test(c.situation))).toBe(true)
  })

  it('dice explícitamente quién NO está obligado', () => {
    expect(NOT_OBLIGATED).toMatch(/un solo empleador/i)
    expect(NOT_OBLIGATED.length).toBeGreaterThan(80)
  })

  it('lista los tres formularios', () => {
    const codes = IRPF_FORMS.map(f => f.code)
    expect(codes).toContain('1102')
    expect(codes).toContain('1103')
    expect(codes).toContain('1101')
  })
})

describe('mora (art. 94)', () => {
  it('la multa escala con el atraso', () => {
    expect(MORA_TIERS.map(t => t.pct)).toEqual([5, 10, 20])
    for (let i = 1; i < MORA_TIERS.length; i++) {
      expect(MORA_TIERS[i].pct).toBeGreaterThan(MORA_TIERS[i - 1].pct)
    }
  })

  it('facilidades de pago paga el tramo intermedio', () => {
    expect(MORA_FACILIDADES_PCT).toBe(10)
  })

  // No publicamos una tasa de recargo: la fija el PE y el art. 94 sólo pone un techo relativo.
  it('no publica una tasa de recargo concreta, sí la regla', () => {
    expect(RECARGOS_RULE).toMatch(/Poder Ejecutivo/)
    expect(RECARGOS_RULE).toMatch(/Banco Central/)
    expect(RECARGOS_RULE).not.toMatch(/\d+(?:,\d+)?\s*% mensual/)
  })

  it('documenta la salida por buena historia de pago', () => {
    expect(GOOD_HISTORY_RELIEF).toMatch(/sin multa/i)
    expect(GOOD_HISTORY_RELIEF).toMatch(/un año/i)
  })
})

describe('prescripción tributaria', () => {
  it('cinco años, diez en los supuestos agravados', () => {
    expect(PRESCRIPTION_YEARS).toBe(5)
    expect(PRESCRIPTION_YEARS_EXTENDED).toBe(10)
    expect(EXTENSION_CAUSES.length).toBeGreaterThanOrEqual(5)
  })

  it('el cómputo arranca al fin del año civil, no cuando te reclaman', () => {
    expect(PRESCRIPTION_START).toMatch(/a[ñn]o civil/i)
  })

  // La trampa práctica: el plazo cumplido no borra nada por sí solo.
  it('deja claro que no es automática', () => {
    expect(PRESCRIPTION_NOT_AUTOMATIC).toMatch(/NO opera autom/i)
    expect(PRESCRIPTION_NOT_AUTOMATIC).toMatch(/petici[oó]n de parte/i)
  })

  it('las sanciones siguen al tributo salvo la contravención', () => {
    expect(SANCTIONS_PRESCRIPTION).toMatch(/contravenci[oó]n/i)
    expect(SANCTIONS_PRESCRIPTION).toMatch(/cinco a[ñn]os/i)
  })

  it('documenta qué interrumpe el plazo', () => {
    // El art. 39 enumera SEIS causales y la pagina publicaba dos como si fueran la lista entera.
    // Las que faltaban son las que dependen del propio deudor —reconocer la deuda, pagar una
    // parte— o sea las unicas que alguien puede disparar sin querer leyendo esta pagina.
    expect(INTERRUPTION_CAUSES).toHaveLength(6)
    const todas = INTERRUPTION_CAUSES.join(' ')
    expect(todas).toMatch(/acta final de inspecci[oó]n/i)
    expect(todas).toMatch(/reconocimiento expreso o t[aá]cito/i)
    expect(todas).toMatch(/pago o consignaci[oó]n total o parcial/i)
    expect(todas).toMatch(/emplazamiento judicial/i)
    expect(todas).toMatch(/dem[aá]s medios del derecho com[uú]n/i)
    // Y la advertencia tiene que decir lo que cambia una decision de hoy.
    expect(INTERRUPTION_WARNING).toMatch(/pagar una parte|cuota/i)
  })
})

describe('el error que la página existe para evitar', () => {
  // Código Tributario art. 1: se aplica a todos los tributos EXCEPTO aduaneros y departamentales.
  it('avisa que la patente NO se rige por el artículo 38', () => {
    expect(DEPARTMENTAL_EXCLUSION).toMatch(/departamentales/i)
    expect(DEPARTMENTAL_EXCLUSION).toMatch(/patente/i)
    expect(DEPARTMENTAL_EXCLUSION).toMatch(/intendencia/i)
  })

  it('separa los tres regímenes que la gente mezcla', () => {
    expect(DEBT_REGIMES).toHaveLength(3)
    const labels = DEBT_REGIMES.map(r => r.label).join(' ')
    expect(labels).toMatch(/nacionales/i)
    expect(labels).toMatch(/departamentales/i)
    expect(labels).toMatch(/privada/i)
    // La deuda privada ya tiene su página: hay que mandar ahí, no re-explicarla.
    expect(DEBT_REGIMES.find(r => /privada/i.test(r.label))?.to).toBe('/saldar-deudas-uruguay')
  })
})

describe('integridad', () => {
  it('cada pregunta del FAQ tiene respuesta corta y desarrollo', () => {
    expect(DGI_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of DGI_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.short.length).toBeGreaterThan(10)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })

  it('toda regla publicada tiene fuente oficial', () => {
    expect(DGI_SOURCES.length).toBeGreaterThanOrEqual(6)
    for (const s of DGI_SOURCES) expect(s.url).toMatch(/^https:\/\/(www\.)?(impo|gub)\./)
    // Los cuatro artículos que sostienen la página.
    const urls = DGI_SOURCES.map(s => s.url).join(' ')
    for (const art of ['/1', '/38', '/39', '/94']) {
      expect(urls).toContain(`14306-1974${art}`)
    }
  })
})
