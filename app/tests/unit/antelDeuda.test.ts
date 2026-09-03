// La página existe porque el job de demanda encontró tres consultas del mismo tema cuyo SERP son
// foros, y sobrevive sólo si cada afirmación sigue teniendo su documento al lado. Lo que este test
// vigila no es la redacción: es que no aparezca una cifra sin fuente, y que la parte honesta —el
// plazo hasta el corte, que Antel no publica— siga estando dicha.
import { describe, expect, it } from 'vitest'
import {
  A_FAVOR_DEL_CLIENTE,
  ANTEL_DEUDA_FAQ,
  ANTEL_DEUDA_SOURCES,
  ANTEL_DEUDA_VERIFIED_AT,
  REGISTRO_MOROSOS,
  RESCISION,
  SECUENCIA,
  type HechoAntel,
} from '../../utils/antelDeuda'

const TODOS: HechoAntel[] = [
  ...SECUENCIA,
  ...REGISTRO_MOROSOS,
  ...A_FAVOR_DEL_CLIENTE,
  ...RESCISION,
]

describe('cada hecho trae su documento', () => {
  it.each(TODOS.map(h => [h.pregunta, h] as const))('%s cita una fuente', (_p, hecho) => {
    expect(hecho.fuente.trim().length).toBeGreaterThan(10)
    expect(hecho.respuesta.trim().length).toBeGreaterThan(40)
  })

  it('las fuentes son documentos de Antel y nada más', () => {
    for (const src of ANTEL_DEUDA_SOURCES) {
      expect(src.url).toMatch(/^https:\/\/www\.antel\.com\.uy\//)
    }
    expect(ANTEL_DEUDA_SOURCES.length).toBeGreaterThanOrEqual(3)
  })

  it('cada fuente citada en un hecho existe en la lista de documentos', () => {
    // Sin esto se puede citar "Reglamento art. 9.9" sin que el reglamento esté en las fuentes.
    const docs = [
      'Reglamento General de Servicios',
      'Condiciones de Contratación',
      'Preguntas frecuentes',
    ]
    for (const hecho of TODOS) {
      expect(
        docs.some(d => hecho.fuente.includes(d)),
        `fuente sin documento: ${hecho.fuente}`
      ).toBe(true)
    }
  })
})

describe('lo que Antel no publica se dice que no lo publica', () => {
  it('el plazo hasta el corte está marcado como no publicado', () => {
    const sinPublicar = SECUENCIA.filter(p => p.sinPublicar)
    expect(sinPublicar).toHaveLength(1)
    expect(sinPublicar[0]!.pregunta).toMatch(/cuántos días/i)
  })

  it('ese renglón no inventa un número de días', () => {
    const texto = SECUENCIA.find(p => p.sinPublicar)!.respuesta
    expect(texto).not.toMatch(/\b\d+\s*(días|dias)\b/i)
    expect(texto).toMatch(/no lo publica/i)
  })

  it('la FAQ contesta lo mismo, sin inventar el plazo tampoco', () => {
    const q = ANTEL_DEUDA_FAQ.find(f => /cuándo te corta/i.test(f.question))
    expect(q, 'falta la pregunta del corte').toBeTruthy()
    expect(q!.answer).toMatch(/no publica/i)
    expect(q!.answer).not.toMatch(/\b\d+\s*(días|dias)\b/i)
  })
})

describe('los plazos que sí están publicados', () => {
  it('la reconexión son 48 horas hábiles en el fijo y 72 en internet', () => {
    const paso = SECUENCIA.find(p => /Cuánto tarda en volver/i.test(p.pregunta))
    expect(paso).toBeTruthy()
    expect(paso!.respuesta).toContain('48 horas hábiles')
    expect(paso!.respuesta).toContain('72 horas')
    expect(paso!.fuente).toMatch(/Preguntas frecuentes de facturación/)
  })

  it('el reintegro por corte es de 12 horas o más y sale a solicitud', () => {
    const r = A_FAVOR_DEL_CLIENTE.find(x => /12 horas/.test(x.pregunta))
    expect(r).toBeTruthy()
    expect(r!.respuesta).toMatch(/a solicitud/i)
  })
})

describe('la FAQ sale del autocompletado, no de la imaginación', () => {
  it.each(ANTEL_DEUDA_FAQ.map(f => [f.question, f] as const))('%s tiene respuesta', (_q, item) => {
    expect(item.answer.trim().length).toBeGreaterThan(60)
  })

  it('cubre las tres consultas que trajo el job de demanda', () => {
    const todas = ANTEL_DEUDA_FAQ.map(f => f.question.toLowerCase()).join(' | ')
    expect(todas).toMatch(/no pago la factura de antel/)
    expect(todas).toMatch(/cuándo te corta antel/)
    expect(todas).toMatch(/demora antel en reconectar/)
  })
})

describe('la fecha de verificación', () => {
  it('es una fecha ISO y no del futuro', () => {
    expect(ANTEL_DEUDA_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(`${ANTEL_DEUDA_VERIFIED_AT}T00:00:00Z`).getTime()).toBeLessThanOrEqual(
      Date.now()
    )
  })
})
