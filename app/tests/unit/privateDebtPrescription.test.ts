import { describe, expect, it } from 'vitest'
import {
  EXECUTIVE_TERM,
  INTERRUPTION_CAUSES,
  NOT_AUTOMATIC,
  NOT_AUTOMATIC_SOURCE,
  ORDINARY_TERM,
  PRESCRIPTION_TERMS,
  PRIVATE_DEBT_FAQ,
  PRIVATE_DEBT_SOURCES,
  PRIVATE_DEBT_VERIFIED_AT,
  REWRITE_SOURCE,
  REWRITTEN_IN_2020,
} from '../../utils/privateDebtPrescription'

/**
 * El contrato de este catálogo es más estricto que el de otros porque lo que publica son plazos
 * legales: un número sin cita propia acá es una página que le dice a alguien que no contestó un
 * reclamo a tiempo. Los tests de abajo son, en orden: que ningún plazo se afirme sin artículo,
 * cita textual y URL oficial; que las URLs sean de impo.com.uy y de un artículo concreto (no la
 * portada de la norma, que no prueba nada); y que la relación entre los dos plazos que la página
 * explica —ejecutar y demandar— sea la que dice el texto, porque es la afirmación que el lector se
 * lleva.
 */
describe('el catálogo de prescripción de deuda privada', () => {
  it('no afirma ningún plazo sin artículo, cita textual y fuente', () => {
    expect(PRESCRIPTION_TERMS.length).toBeGreaterThanOrEqual(5)
    for (const term of PRESCRIPTION_TERMS) {
      expect(term.key, 'key').toMatch(/^[a-z]+$/)
      expect(term.term, term.key).toMatch(/^\d+ (años|meses)$/)
      expect(term.months, term.key).toBeGreaterThan(0)
      expect(term.what.length, term.key).toBeGreaterThan(20)
      expect(term.from.length, term.key).toBeGreaterThan(10)
      expect(term.article, term.key).toMatch(/art\./)
      expect(term.quote.length, term.key).toBeGreaterThan(40)
      expect(term.url, term.key).toMatch(/^https:\/\/www\.impo\.com\.uy\/bases\/[a-z-]+\/\d+/)
    }
  })

  // Una URL a la portada de la norma no sostiene un plazo: la cita tiene que apuntar al artículo.
  it('cada fuente apunta a un artículo concreto de impo, no a la norma entera', () => {
    const urls = [
      ...PRESCRIPTION_TERMS.map(t => t.url),
      ...INTERRUPTION_CAUSES.map(c => c.url),
      NOT_AUTOMATIC_SOURCE,
      REWRITE_SOURCE,
      ...PRIVATE_DEBT_SOURCES.map(s => s.url),
    ]
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\/www\.impo\.com\.uy\/bases\/[a-z-]+\/[\d-]+\/\d+$/)
    }
  })

  it('el plazo en meses ordena el catálogo de más corto a más largo', () => {
    const months = PRESCRIPTION_TERMS.map(t => t.months)
    expect(months).toEqual([...months].sort((a, b) => a - b))
  })

  // La afirmación central de la página: ejecutar se cae ANTES que demandar. Si alguien invierte
  // estos dos números, la página pasa a decirle al lector lo contrario de lo que dice la ley.
  it('el plazo para ejecutar es más corto que el de la acción personal', () => {
    expect(EXECUTIVE_TERM.months).toBe(60)
    expect(ORDINARY_TERM.months).toBe(120)
    expect(EXECUTIVE_TERM.months).toBeLessThan(ORDINARY_TERM.months)
  })

  it('declara que la prescripción no opera de oficio y cita el artículo que lo dice', () => {
    expect(NOT_AUTOMATIC).toMatch(/no pueden suplir de oficio/)
    expect(NOT_AUTOMATIC_SOURCE).toContain('/1191')
  })

  // Las dos causales son de signo opuesto y las dos tienen que estar: sin la del reconocimiento la
  // página sería un consejo peligroso.
  it('nombra las dos causales de interrupción, con su artículo', () => {
    expect(INTERRUPTION_CAUSES).toHaveLength(2)
    expect(INTERRUPTION_CAUSES.map(c => c.url.split('/').pop())).toEqual(['1235', '1240'])
    for (const cause of INTERRUPTION_CAUSES) {
      expect(cause.detail.length, cause.label).toBeGreaterThan(60)
      expect(cause.article, cause.label).toMatch(/art\. \d+$/)
    }
  })

  // No se afirma cuánto decían los artículos antes de 2020: sólo la fecha de la redacción vigente,
  // que es lo único que se pudo contrastar contra impo.
  it('fecha la redacción vigente sin inventar la anterior', () => {
    expect(REWRITTEN_IN_2020).toContain('Ley 19.889')
    expect(REWRITTEN_IN_2020).toContain('463')
    expect(REWRITTEN_IN_2020).toMatch(/9 de julio de 2020/)
    expect(REWRITTEN_IN_2020).not.toMatch(/antes (eran|dec[íi]a)/i)
  })

  it('cada plazo publicado tiene su artículo también en la lista de fuentes', () => {
    const cited = PRIVATE_DEBT_SOURCES.map(s => s.url)
    for (const term of PRESCRIPTION_TERMS) expect(cited, term.key).toContain(term.url)
    for (const cause of INTERRUPTION_CAUSES) expect(cited, cause.label).toContain(cause.url)
  })

  it('las preguntas frecuentes tienen respuesta y no se repiten', () => {
    expect(PRIVATE_DEBT_FAQ.length).toBeGreaterThanOrEqual(5)
    const questions = PRIVATE_DEBT_FAQ.map(f => f.question)
    expect(new Set(questions).size).toBe(questions.length)
    for (const faq of PRIVATE_DEBT_FAQ) {
      expect(faq.question.endsWith('?'), faq.question).toBe(true)
      expect(faq.short.length, faq.question).toBeGreaterThan(10)
      expect(faq.answer.length, faq.question).toBeGreaterThan(120)
    }
  })

  it('lleva la fecha en que se contrastó contra impo', () => {
    expect(PRIVATE_DEBT_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
