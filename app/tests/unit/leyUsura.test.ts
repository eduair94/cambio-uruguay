// Los topes de la Ley 18.212, y las dos trampas que tiene citarlos.
//
// PRIMERA: el art. 11 tiene la redacción que le dio la Ley 19.732 en 2018. En IMPO,
// /bases/leyes/<n> es el vigente y /bases/leyes-originales/<n> el de la promulgación; citar el
// segundo publicaría topes derogados. Este test fija los seis porcentajes del texto vigente.
//
// SEGUNDA: se suele citar sólo el par 55/80, que es el del crédito común y su mora. La ley tiene
// seis casos, y el más barato —20 % para los Créditos de Nómina— es el que más le cambia la cuenta
// a quien tiene el préstamo descontado del sueldo.
import { describe, expect, it } from 'vitest'
import {
  CONSECUENCIAS,
  CONTROL,
  LEY_USURA_FAQ,
  LEY_USURA_SOURCES,
  LEY_USURA_VERIFIED_AT,
  PEQUENOS_CREDITOS,
  QUE_CUENTA,
  TOPES,
  type ReglaUsura,
} from '../../utils/leyUsura'

describe('los topes del artículo 11', () => {
  it('son los seis del texto vigente, con sus porcentajes', () => {
    expect(TOPES.map(t => t.recargo)).toEqual([55, 20, 30, 80, 90, 120])
  })

  it('el Crédito de Nómina es el más barato de todos', () => {
    const nomina = TOPES.find(t => /nómina/i.test(t.caso))
    expect(nomina).toBeTruthy()
    expect(nomina!.recargo).toBe(20)
    expect(Math.min(...TOPES.map(t => t.recargo))).toBe(20)
  })

  it('la mora de un crédito chico es 80 y no 55', () => {
    const mora = TOPES.find(t => t.caso.startsWith('Mora, en cualquiera'))
    expect(mora!.recargo).toBe(80)
  })

  it('ningún detalle exagera el múltiplo que representa su recargo', () => {
    // Escribí "llega a triplicar la tasa media" para el +120 %, y +120 % es 2,2 veces, no 3. La
    // aritmética es la única fuente: recargo r por ciento => tope = media × (1 + r/100).
    for (const t of TOPES) {
      const multiplo = 1 + t.recargo / 100
      if (/triplic/i.test(t.detalle)) expect(multiplo).toBeGreaterThanOrEqual(3)
      if (/duplic/i.test(t.detalle)) expect(multiplo).toBeGreaterThanOrEqual(2)
    }
    const mora = TOPES.find(t => t.recargo === 120)!
    expect(mora.detalle).toContain('2,2 veces')
  })

  it('cada tope cita su inciso', () => {
    for (const t of TOPES) expect(t.articulo).toMatch(/Ley 18\.212, art/)
  })
})

describe('cada regla trae su artículo', () => {
  const TODAS: ReglaUsura[] = [...QUE_CUENTA, ...CONSECUENCIAS, ...PEQUENOS_CREDITOS, ...CONTROL]

  it.each(TODAS.map(r => [r.titulo, r] as const))('%s cita su norma', (_t, regla) => {
    expect(regla.articulo).toMatch(/Ley 18\.212, art/)
    expect(regla.texto.trim().length).toBeGreaterThan(60)
  })
})

describe('lo que la ley dice y casi nadie cita', () => {
  it('la tasa que se compara es la implícita, no la del contrato', () => {
    const implicita = QUE_CUENTA.find(r => /implícita/i.test(r.titulo))
    expect(implicita).toBeTruthy()
    expect(implicita!.articulo).toContain('art. 10')
  })

  it('con usura caduca todo lo accesorio y lo cobrado se descuenta', () => {
    const textos = CONSECUENCIAS.map(c => c.texto).join(' ')
    expect(textos).toMatch(/caduca el derecho/i)
    expect(textos).toMatch(/descontarse del crédito/i)
  })

  it('la usura se releva de oficio', () => {
    expect(CONSECUENCIAS.some(c => /de oficio/i.test(c.texto))).toBe(true)
  })

  it('la mora de las deudas de menos de 20.000 UI caduca a los 24 meses', () => {
    const caducidad = PEQUENOS_CREDITOS[0]!
    expect(caducidad.texto).toContain('20.000 UI')
    expect(caducidad.texto).toContain('veinticuatro meses')
    expect(caducidad.articulo).toContain('art. 20')
  })

  it('nombra a los dos organismos que controlan, que no son el mismo', () => {
    expect(CONTROL).toHaveLength(2)
    const titulos = CONTROL.map(c => c.titulo).join(' | ')
    expect(titulos).toMatch(/Banco Central/)
    expect(titulos).toMatch(/Defensa del Consumidor/)
  })
})

describe('fuentes y FAQ', () => {
  it('cita el texto vigente de IMPO y no el original', () => {
    const impo = LEY_USURA_SOURCES.filter(s => s.url.includes('impo.com.uy'))
    expect(impo.length).toBeGreaterThanOrEqual(2)
    for (const s of impo) {
      expect(s.url).toContain('/bases/leyes/')
      expect(s.url).not.toContain('leyes-originales')
    }
  })

  it('cita la ley que le dio al art. 11 su redacción vigente', () => {
    expect(LEY_USURA_SOURCES.some(s => s.label.includes('19.732'))).toBe(true)
  })

  it.each(LEY_USURA_FAQ.map(f => [f.question, f] as const))('%s tiene respuesta', (_q, item) => {
    expect(item.answer.trim().length).toBeGreaterThan(80)
  })

  it('la primera pregunta no promete un número fijo, porque no lo hay', () => {
    const primera = LEY_USURA_FAQ[0]!
    expect(primera.question).toMatch(/tasa máxima legal/i)
    expect(primera.answer).toMatch(/no es un número fijo/i)
  })

  it('la fecha de verificación es ISO y no del futuro', () => {
    expect(LEY_USURA_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(`${LEY_USURA_VERIFIED_AT}T00:00:00Z`).getTime()).toBeLessThanOrEqual(Date.now())
  })
})
