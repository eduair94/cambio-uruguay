import { describe, it, expect } from 'vitest'
import { detectDirection, isNoForecastText } from '../../server/utils/externalForecasts'

describe('detectDirection', () => {
  it('detects an upward lean from Spanish alza/suba wording', () => {
    expect(detectDirection('El banco proyecta una suba del dólar hacia fin de año.')).toBe('up')
    expect(detectDirection('Se espera una fuerte alza en los próximos meses.')).toBe('up')
  })

  it('detects a downward lean from Spanish baja/caída wording', () => {
    expect(detectDirection('La consultora anticipa una baja moderada.')).toBe('down')
    expect(detectDirection('Proyectan una caída del tipo de cambio.')).toBe('down')
  })

  it('detects a flat lean from estable/sin cambios wording', () => {
    expect(detectDirection('El pronóstico lo ve estable en el corto plazo.')).toBe('flat')
  })

  it('returns null when no directional wording is present', () => {
    expect(detectDirection('El BCU publicó su informe mensual de política monetaria.')).toBeNull()
  })
})

describe('isNoForecastText', () => {
  it('is true for an exact or prefixed SIN PRONOSTICOS reply, case-insensitive, with or without accent', () => {
    expect(isNoForecastText('SIN PRONOSTICOS')).toBe(true)
    expect(isNoForecastText('sin pronosticos')).toBe(true)
    expect(isNoForecastText('Sin pronósticos disponibles.')).toBe(true)
  })

  it('is false for a real forecast summary', () => {
    expect(isNoForecastText('El banco X proyecta una suba del 3% para el dólar.')).toBe(false)
    expect(isNoForecastText('')).toBe(false)
  })
})
