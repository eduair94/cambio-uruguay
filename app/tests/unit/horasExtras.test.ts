// Los recargos y los topes salen de cuatro normas leídas en impo.com.uy el 2026-09-03. Estos
// tests atan el contenido a esa lectura: cambiar un número obliga a cambiar el test y volver a la
// norma.
import { describe, expect, it } from 'vitest'
import {
  HORAS_EXTRAS_FAQ,
  HORAS_EXTRAS_SOURCES,
  HORAS_EXTRAS_VERIFIED_AT,
  LIMITES_JORNADA,
  NOCTURNIDAD,
  RECARGOS,
  REGLAS,
} from '../../utils/horasExtras'

describe('los recargos', () => {
  it('son 100 % en día hábil y 150 % en feriado o descanso (Ley 15.996, art. 1)', () => {
    expect(RECARGOS).toHaveLength(2)
    const habil = RECARGOS.find(r => /hábil/i.test(r.cuando))!
    const feriado = RECARGOS.find(r => /feriado/i.test(r.cuando))!
    expect(habil.recargo).toBe('100 %')
    expect(feriado.recargo).toBe('150 %')
    expect(habil.articulo).toMatch(/15\.996/)
    expect(feriado.articulo).toMatch(/15\.996/)
  })

  it('aclara sobre qué valor se calcula el 150 %, que es donde se equivocan', () => {
    // El artículo dice: "Esta tasa se aplicará sobre el valor hora de los días laborales."
    const feriado = RECARGOS.find(r => /feriado/i.test(r.cuando))!
    expect(feriado.detalle).toMatch(/día laborable|días laborales/i)
  })
})

describe('los límites de jornada', () => {
  it('distingue industria de comercio, que es lo que define qué es una hora extra', () => {
    const industria = LIMITES_JORNADA.find(l => /industria/i.test(l.rama))!
    const comercio = LIMITES_JORNADA.find(l => /comercio/i.test(l.rama))!
    expect(industria.semanal).toMatch(/48/)
    expect(comercio.semanal).toMatch(/44/)
    expect(industria.diario).toMatch(/8 horas/)
    expect(comercio.diario).toMatch(/8 horas/)
  })

  it('cita la norma de cada rama', () => {
    expect(LIMITES_JORNADA.find(l => /industria/i.test(l.rama))!.norma).toMatch(/5\.350/)
    expect(LIMITES_JORNADA.find(l => /comercio/i.test(l.rama))!.norma).toMatch(/14\.320/)
  })
})

describe('las reglas', () => {
  const texto = REGLAS.map(r => r.regla).join(' ')

  it('dice el tope semanal y que hace falta consentimiento (art. 5)', () => {
    expect(texto).toMatch(/8 horas extras por semana/i)
    expect(texto).toMatch(/consentimiento/i)
  })

  it('explica el redondeo de las fracciones (art. 2)', () => {
    expect(texto).toMatch(/treinta minutos/i)
    expect(texto).toMatch(/media hora/i)
  })

  it('dice que son salario y que cuentan para la licencia (arts. 3 y 4)', () => {
    expect(texto).toMatch(/salario/i)
    expect(texto).toMatch(/licencia y el salario vacacional/i)
  })

  it('cada regla cita su artículo', () => {
    for (const r of REGLAS) expect(r.articulo).toMatch(/art\.\s*\d+/i)
  })
})

describe('el trabajo nocturno', () => {
  const texto = NOCTURNIDAD.map(r => r.regla).join(' ')

  it('define la franja y la condición de las cinco horas (Ley 19.313, art. 4)', () => {
    expect(texto).toMatch(/22 y las 6/)
    expect(texto).toMatch(/cinco horas seguidas/i)
  })

  it('dice que la sobretasa mínima es 20 % (art. 3)', () => {
    expect(texto).toMatch(/20 %/)
    expect(texto).toMatch(/reducción horaria/i)
  })

  it('sale de la Ley 19.313 y no de la de horas extras — no son lo mismo', () => {
    for (const r of NOCTURNIDAD) expect(r.articulo).toMatch(/19\.313/)
  })
})

describe('fuentes', () => {
  it('cita las cuatro normas que la página usa', () => {
    const urls = HORAS_EXTRAS_SOURCES.map(s => s.url).join(' ')
    expect(urls).toMatch(/15996-1988/)
    expect(urls).toMatch(/5350-1915/)
    expect(urls).toMatch(/14320-1974/)
    expect(urls).toMatch(/19313-2015/)
  })

  it('cita el texto VIGENTE, no el de la promulgación', () => {
    // `/bases/leyes-originales/<n>` es el texto original: citarlo es publicar algo derogado.
    expect(HORAS_EXTRAS_SOURCES.map(s => s.url).join(' ')).not.toMatch(/leyes-originales/)
  })

  it('deja constancia de cuándo se leyeron', () => {
    expect(HORAS_EXTRAS_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('las preguntas frecuentes', () => {
  it('contestan las que sugiere el autocompletado uruguayo', () => {
    const preguntas = HORAS_EXTRAS_FAQ.map(f => f.question.toLowerCase()).join(' ')
    expect(preguntas).toMatch(/cuánto se paga la hora extra/)
    expect(preguntas).toMatch(/tope/)
    expect(preguntas).toMatch(/obligar/)
    expect(preguntas).toMatch(/nocturno/)
  })

  it('la respuesta del nocturno aclara que NO es una hora extra', () => {
    const f = HORAS_EXTRAS_FAQ.find(x => /nocturno/i.test(x.question))!
    expect(f.answer).toMatch(/no,? son dos cosas distintas|no es una hora extra/i)
  })

  it('ninguna respuesta es una línea de relleno', () => {
    for (const f of HORAS_EXTRAS_FAQ) expect(f.answer.length).toBeGreaterThan(80)
  })
})
