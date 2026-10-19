import { describe, expect, it } from 'vitest'
import {
  FICHA_REASONS,
  MISSING_REASONS,
  netPromoterScore,
  rentalSurveyUrl,
  sanitizeRentalFeedback,
  SEARCH_REASONS,
  SURVEY_QUESTIONS,
  SURVEY_VERSION,
  feedbackFilters,
} from '../../utils/rentalFeedback'

const ok = (input: Parameters<typeof sanitizeRentalFeedback>[0]) => {
  const result = sanitizeRentalFeedback(input)
  if ('error' in result) throw new Error(`refused: ${result.error}`)
  return result.record
}

describe('rental feedback answers', () => {
  it('keeps only the closed-list values of a micro-survey answer', () => {
    const record = ok({
      kind: 'micro',
      surface: 'directorio',
      path: '/alquileres-uruguay',
      found: 'no',
      reasons: ['pocas-opciones', 'hackeo', 'pocas-opciones', 42],
      comment: '  No hay   nada en  Malvín  ',
      filters: ['Montevideo', 'Malvín', 'Hasta $ 25.000'],
    })
    expect(record).toMatchObject({
      kind: 'micro',
      surface: 'directorio',
      found: 'no',
      reasons: ['pocas-opciones'],
      comment: 'No hay nada en Malvín',
      filters: ['Montevideo', 'Malvín', 'Hasta $ 25.000'],
      surveyVersion: null,
      email: null,
      zone: null,
    })
  })

  it('refuses an answer that says nothing, and a malformed e-mail', () => {
    expect(sanitizeRentalFeedback({ kind: 'micro', surface: 'directorio' })).toEqual({
      error: 'empty',
    })
    expect(sanitizeRentalFeedback({ kind: 'nope', found: 'si' })).toEqual({ error: 'kind' })
    expect(
      sanitizeRentalFeedback({ kind: 'box', comment: 'hola', email: 'no-es-un-correo' })
    ).toEqual({ error: 'email' })
    expect(ok({ kind: 'box', comment: 'hola', email: ' Ana@Example.COM ' }).email).toBe(
      'ana@example.com'
    )
  })

  it('validates every survey answer against its question, and versions the survey', () => {
    const record = ok({
      kind: 'survey',
      surface: 'alerta',
      alertId: '6512AA0B1C2D3E4F5A6B7C8D',
      answers: {
        uso: 'vivir',
        estado: 'inventado',
        recomienda: 11,
        importa: ['total-mes', 'barrio', 'fotos', 'mascotas'],
        mejorar: ['mapa', 'mapa', 'otro'],
        extra: 'x',
      },
    })
    expect(record.answers).toEqual({
      uso: 'vivir',
      importa: ['total-mes', 'barrio', 'fotos'],
      mejorar: ['mapa', 'otro'],
    })
    expect(record.surveyVersion).toBe(SURVEY_VERSION)
    expect(record.alertId).toBe('6512aa0b1c2d3e4f5a6b7c8d')
    expect(ok({ kind: 'survey', answers: { recomienda: 0 } }).answers).toEqual({ recomienda: 0 })
    // An answer outside the survey is not a survey answer.
    expect(ok({ kind: 'micro', found: 'si', answers: { uso: 'vivir' } }).answers).toEqual({})
  })

  it('cuts long text and never keeps more than fifteen filter labels', () => {
    expect(ok({ kind: 'box', comment: 'a'.repeat(5000) }).comment).toHaveLength(1000)
    expect(feedbackFilters(Array.from({ length: 30 }, (_, i) => `f${i}`))).toHaveLength(15)
    expect(feedbackFilters('Montevideo')).toEqual([])
    expect(ok({ kind: 'micro', found: 'si', path: 'javascript:alert(1)' }).path).toBe('')
  })

  it('offers the property page only the reasons a single listing can have', () => {
    expect(FICHA_REASONS.map(reason => reason.value)).toEqual([
      'avisos-viejos',
      'falta-info',
      'datos-mal',
      'dificil',
      'otro',
    ])
    expect(SEARCH_REASONS.map(reason => reason.value)).not.toContain('datos-mal')
    expect(MISSING_REASONS).toHaveLength(8)
  })

  it('has six questions at most, each with unique ids and options', () => {
    expect(SURVEY_QUESTIONS.length).toBeLessThanOrEqual(6)
    const ids = SURVEY_QUESTIONS.map(question => question.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const question of SURVEY_QUESTIONS) {
      if (question.kind === 'scale') continue
      const values = question.options.map(option => option.value)
      expect(new Set(values).size).toBe(values.length)
    }
  })

  it('scores the recommendation as a Net Promoter Score', () => {
    expect(netPromoterScore([])).toBeNull()
    expect(netPromoterScore([10, 9, 8, 7, 0])).toBe(20)
    expect(netPromoterScore([10, 10, 6])).toBe(33)
    expect(netPromoterScore([11, -1, 3.5, 10])).toBe(100)
  })

  it('builds the survey link the emails use', () => {
    expect(
      rentalSurveyUrl('https://cambio-uruguay.com/', 'alerta', '6512aa0b1c2d3e4f5a6b7c8d')
    ).toBe('https://cambio-uruguay.com/opinion-alquileres?origen=alerta&a=6512aa0b1c2d3e4f5a6b7c8d')
    expect(rentalSurveyUrl('https://cambio-uruguay.com', 'newsletter')).toBe(
      'https://cambio-uruguay.com/opinion-alquileres?origen=newsletter'
    )
    expect(rentalSurveyUrl('https://cambio-uruguay.com', 'alerta', 'not-an-id')).not.toContain('a=')
  })
})
