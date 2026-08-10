import { describe, expect, it } from 'vitest'

import {
  BENEFIT_YEARS,
  HOUSING_ANSWERS,
  HOUSING_SOURCES,
  NATIONAL_VACANCY_PCT,
  PROMOTED_HOUSING_BENEFITS,
  TOTAL_DWELLINGS,
  VACANCY_EXTREMES,
  VACANCY_REASONS,
} from '../../utils/housingMarket'

const mvd = () => VACANCY_EXTREMES.find(d => d.department === 'Montevideo')!
const mdo = () => VACANCY_EXTREMES.find(d => d.department === 'Maldonado')!

describe('datos del Censo 2023', () => {
  it('el total de viviendas es el relevado por el INE', () => {
    expect(TOTAL_DWELLINGS).toBe(1_659_048)
    expect(NATIONAL_VACANCY_PCT).toBeCloseTo(19.5, 1)
  })

  // El hallazgo entero de la página: la intuición («sobran viviendas en Montevideo») está al revés.
  it('Montevideo tiene la vacancia MÁS BAJA del país', () => {
    const min = Math.min(...VACANCY_EXTREMES.map(d => d.vacancyPct))
    expect(mvd().vacancyPct).toBe(min)
    expect(mvd().vacancyPct).toBeLessThan(NATIONAL_VACANCY_PCT)
  })

  it('Maldonado tiene la más alta y está muy por encima del promedio', () => {
    const max = Math.max(...VACANCY_EXTREMES.map(d => d.vacancyPct))
    expect(mdo().vacancyPct).toBe(max)
    expect(mdo().vacancyPct).toBeGreaterThan(NATIONAL_VACANCY_PCT * 2)
  })

  it('el promedio nacional queda entre los extremos', () => {
    expect(NATIONAL_VACANCY_PCT).toBeGreaterThan(mvd().vacancyPct)
    expect(NATIONAL_VACANCY_PCT).toBeLessThan(mdo().vacancyPct)
  })

  it('cada departamento explica su número', () => {
    for (const d of VACANCY_EXTREMES) {
      expect(d.vacancyPct).toBeGreaterThan(0)
      expect(d.vacancyPct).toBeLessThan(100)
      expect(d.note.length).toBeGreaterThan(30)
    }
  })
})

describe('por qué está vacía', () => {
  // La respuesta a "¿quién vive ahí?": en Montevideo el motivo dominante es que está EN VENTA
  // O ALQUILER; en Maldonado es que es casa de temporada. Son mercados distintos.
  it('en Montevideo domina «en venta o alquiler»; en Maldonado, «uso temporal»', () => {
    const venta = VACANCY_REASONS.find(r => r.label === 'En venta o alquiler')!
    const temporal = VACANCY_REASONS.find(r => r.label === 'Uso temporal')!
    expect(venta.montevideoPct).toBeGreaterThan(temporal.montevideoPct)
    expect(temporal.maldonadoPct).toBeGreaterThan(venta.maldonadoPct)
    expect(temporal.maldonadoPct).toBeGreaterThan(70)
  })

  it('las categorías de cada departamento no superan el 100 %', () => {
    const mSum = VACANCY_REASONS.reduce((n, r) => n + r.montevideoPct, 0)
    const dSum = VACANCY_REASONS.reduce((n, r) => n + r.maldonadoPct, 0)
    expect(mSum).toBeLessThanOrEqual(100)
    expect(dSum).toBeLessThanOrEqual(100)
  })

  it('cada categoría explica qué significa', () => {
    expect(VACANCY_REASONS.length).toBeGreaterThanOrEqual(3)
    for (const r of VACANCY_REASONS) expect(r.detail.length).toBeGreaterThan(30)
  })
})

describe('Ley 18.795 — vivienda promovida', () => {
  it('los dos beneficios grandes duran 10 años', () => {
    const tenYear = PROMOTED_HOUSING_BENEFITS.filter(b =>
      b.duration.includes(String(BENEFIT_YEARS))
    )
    expect(tenYear.length).toBeGreaterThanOrEqual(2)
    expect(BENEFIT_YEARS).toBe(10)
  })

  it('incluye la exoneración sobre la renta del alquiler', () => {
    const renta = PROMOTED_HOUSING_BENEFITS.find(b => /IRPF/.test(b.tax))!
    expect(renta).toBeDefined()
    expect(renta.duration).toMatch(/10 años/)
    expect(renta.benefit).toMatch(/100 %/)
  })

  it('cada beneficio dice impuesto, alcance y plazo', () => {
    for (const b of PROMOTED_HOUSING_BENEFITS) {
      expect(b.tax.length).toBeGreaterThan(3)
      expect(b.benefit.length).toBeGreaterThan(5)
      expect(b.duration.length).toBeGreaterThan(3)
    }
  })
})

describe('respuestas', () => {
  it('responde las cuatro preguntas del hilo original', () => {
    expect(HOUSING_ANSWERS.length).toBeGreaterThanOrEqual(5)
    const all = HOUSING_ANSWERS.map(a => a.question).join(' ')
    expect(all).toMatch(/qui[eé]n vive/i)
    expect(all).toMatch(/no baja el alquiler/i)
    expect(all).toMatch(/10 años|crisis/i)
  })

  it('cada respuesta tiene versión corta y desarrollo', () => {
    for (const a of HOUSING_ANSWERS) {
      expect(a.question.endsWith('?')).toBe(true)
      expect(a.short.length).toBeGreaterThan(15)
      expect(a.answer.length).toBeGreaterThan(120)
    }
  })

  // El módulo se autoimpone no afirmar causalidad. Si alguien la agrega, este test lo frena.
  it('no afirma que la ley sea LA causa de que el alquiler no baje', () => {
    const causal = HOUSING_ANSWERS.find(a => /no baja el alquiler/i.test(a.question))!
    expect(causal.answer).toMatch(/discutible|no lo afirmamos|qué tanto/i)
  })
})

describe('fuentes', () => {
  it('toda cifra publicada tiene fuente oficial', () => {
    expect(HOUSING_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of HOUSING_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/(www\.)?(gub|impo|anv)\./)
    }
    expect(HOUSING_SOURCES.some(s => s.url.includes('censo-2023-viviendas-desocupadas'))).toBe(true)
    expect(HOUSING_SOURCES.some(s => s.url.includes('18795'))).toBe(true)
  })
})
