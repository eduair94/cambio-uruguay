// La franja de lunes a viernes que comparte la mayoría de las sucursales de un banco.
//
// Los textos son los del feed real (`/api/branches`, leído el 2026-10-21): Itaú publica
// «Lunes a Viernes de 10 a 14 hs.» en 16 de sus 17 sucursales, el BROU «Lunes a Viernes de 13 a
// 18 hs.» en 69 de 113 y otras 17 que abren lunes, miércoles y viernes.

import { describe, expect, it } from 'vitest'

import { BANK_ORIGINS, dominantWeekdayHours, spokenClock } from '../../utils/branches'

const repeat = (text: string, times: number) => Array.from({ length: times }, () => text)

describe('dominantWeekdayHours', () => {
  it('encuentra la franja de Itaú aunque una sucursal cierre más tarde', () => {
    const hours = [...repeat('Lunes a Viernes de 10 a 14 hs.', 16), 'Lun a Vie de 10 a 18 hs.']
    expect(dominantWeekdayHours(hours)).toEqual({
      opens: '10:00',
      closes: '14:00',
      matching: 16,
      total: 17,
    })
  })

  it('no cuenta como de lunes a viernes a la sucursal que abre tres días', () => {
    const hours = [
      ...repeat('Lunes a Viernes de 13 a 18 hs.', 69),
      ...repeat('Lunes, Miércoles y Viernes de 13 a 18 hs.', 12),
      ...repeat('Lunes, Miercoles y Viernes de 13 a 18hs', 5),
      ...repeat('Sin informar', 27),
    ]
    const result = dominantWeekdayHours(hours)
    expect(result).toMatchObject({ opens: '13:00', closes: '18:00', matching: 69, total: 113 })
  })

  it('lee las grafías distintas de la misma franja como una sola', () => {
    const hours = [
      'Lunes a viernes de 13 a 17 horas',
      'Lunes a Viernes 13:00 a 17:00 hs.',
      'Lunes a viernes de 13.00 a 17.00hs.',
      'LUNES A VIERNES DE 13 A 17 HORAS',
    ]
    expect(dominantWeekdayHours(hours)).toMatchObject({ matching: 4, total: 4 })
  })

  it('ignora el horario de cajas que OCA escribe después del de atención', () => {
    const hours = [
      'Lunes a viernes de 10 a 18 h. No cuenta con servicio de cajas.',
      'Lunes a viernes de 10 a 18 hs. Horario de cajas: de L a V de 10 a 18 h',
    ]
    expect(dominantWeekdayHours(hours)).toMatchObject({
      opens: '10:00',
      closes: '18:00',
      matching: 2,
    })
  })

  it('no inventa una franja con un horario cortado', () => {
    expect(dominantWeekdayHours(['Lunes a Viernes de 9 a 12 y de 15 a 19 hs.'])).toBeNull()
  })

  it('devuelve null cuando ninguna franja llega a la mitad', () => {
    const hours = [
      'Lunes a Viernes de 10 a 14 hs.',
      'Lunes a Viernes de 13 a 18 hs.',
      'Sin informar',
    ]
    expect(dominantWeekdayHours(hours)).toBeNull()
    expect(dominantWeekdayHours([])).toBeNull()
  })

  it('acepta la mitad justa', () => {
    expect(dominantWeekdayHours(['Lunes a Viernes de 10 a 14 hs.', 'Sin informar'])).toMatchObject({
      matching: 1,
      total: 2,
    })
  })
})

describe('spokenClock', () => {
  it('escribe la hora como en una oración', () => {
    expect(spokenClock('10:00')).toBe('10')
    expect(spokenClock('09:30')).toBe('9:30')
    expect(spokenClock('13:00')).toBe('13')
  })
})

describe('BANK_ORIGINS', () => {
  it('lista los bancos y financieras, no las casas de cambio', () => {
    for (const bank of ['brou', 'oca', 'itau', 'scotiabank', 'santander']) {
      expect(BANK_ORIGINS.has(bank)).toBe(true)
    }
    for (const casa of ['gales', 'cambilex', 'varlix', 'cambio_principal']) {
      expect(BANK_ORIGINS.has(casa)).toBe(false)
    }
  })
})
