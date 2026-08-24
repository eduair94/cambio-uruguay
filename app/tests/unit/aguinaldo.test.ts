// El catálogo de /cuando-se-cobra-el-aguinaldo-uruguay.
//
// Lo que estas pruebas cuidan es que los HECHOS LEGALES no se corran solos: el aguinaldo es la
// doceava parte de lo cobrado en dinero, el plazo firme es el de diciembre y la cuota de junio la
// fija un decreto. Cada uno sale de una fuente oficial; un cambio silencioso convierte la página en
// desinformación laboral, así que quedan fijados acá.

import { describe, expect, it } from 'vitest'

import {
  AGUINALDO_BASE_RULES,
  AGUINALDO_FAQ,
  AGUINALDO_MILESTONES,
  AGUINALDO_SOURCES,
  aguinaldoFromCashSalaries,
  aguinaldoProporcional,
} from '../../utils/aguinaldo'

describe('las dos cuotas del aguinaldo', () => {
  it('describe exactamente la primera y la segunda mitad', () => {
    expect(AGUINALDO_MILESTONES.map(m => m.key)).toEqual(['primera', 'segunda'])
  })

  it('la cuota de diciembre es la del plazo legal (Ley 12.840)', () => {
    const segunda = AGUINALDO_MILESTONES.find(m => m.key === 'segunda')
    expect(segunda?.when).toMatch(/24 de diciembre/)
    expect(segunda?.source).toMatch(/Ley 12\.840/)
  })

  it('la cuota de junio depende del decreto anual, no de una fecha fija', () => {
    const primera = AGUINALDO_MILESTONES.find(m => m.key === 'primera')
    expect(primera?.source).toMatch(/14\.525/)
    expect(primera?.when.toLowerCase()).toContain('decreto')
    // No se publica una fecha fija de junio: sería inventarla.
    expect(primera?.when).not.toMatch(/\b\d{1,2} de junio\b/)
  })
})

describe('la base del aguinaldo', () => {
  it('toma el sueldo en dinero y deja afuera los tickets de alimentación', () => {
    const tickets = AGUINALDO_BASE_RULES.find(r => /tickets/i.test(r.item))
    expect(tickets?.counts).toBe(false)
    const sueldo = AGUINALDO_BASE_RULES.find(r => /dinero/i.test(r.item))
    expect(sueldo?.counts).toBe(true)
  })

  it('las prestaciones en especie no integran la base', () => {
    const especie = AGUINALDO_BASE_RULES.find(r => /especie/i.test(r.item))
    expect(especie?.counts).toBe(false)
  })
})

describe('el cálculo: la doceava parte de lo cobrado en dinero', () => {
  it('divide el total anual entre doce', () => {
    expect(aguinaldoFromCashSalaries(120000)).toBeCloseTo(10000, 6)
  })

  it('el proporcional al egreso usa la misma cuenta sobre lo trabajado', () => {
    expect(aguinaldoProporcional(60000)).toBeCloseTo(aguinaldoFromCashSalaries(60000), 6)
  })

  it('nunca devuelve un número negativo ni rompe con entradas inválidas', () => {
    expect(aguinaldoFromCashSalaries(-100)).toBe(0)
    expect(aguinaldoFromCashSalaries(Number.NaN)).toBe(0)
  })
})

describe('preguntas y fuentes', () => {
  it('todas las preguntas están completas', () => {
    expect(AGUINALDO_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const f of AGUINALDO_FAQ) {
      expect(f.question.length).toBeGreaterThan(0)
      expect(f.short.length).toBeGreaterThan(0)
      expect(f.answer.length).toBeGreaterThan(40)
    }
  })

  it('cada fuente apunta a un organismo oficial (gub.uy o impo.com.uy)', () => {
    expect(AGUINALDO_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const s of AGUINALDO_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/(www\.)?(gub\.uy|impo\.com\.uy)/)
      expect(s.label.length).toBeGreaterThan(0)
    }
  })
})
