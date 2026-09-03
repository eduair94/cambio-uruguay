// Horarios que el sitio publicaba mal, con las cadenas EXACTAS del feed.
//
// Las dos formas salieron de un censo de las 528 fichas /sucursal/<slug> el 2026-09-03, cruzando el
// "Horario publicado" visible contra el JSON-LD emitido: 9 sucursales declaraban "Cerrado" días en
// que la casa abre, y 20 emitían dos franjas contradictorias el mismo día.
import { describe, expect, it } from 'vitest'
import {
  openingHoursSpecification,
  parseOpeningHours,
  weeklyHoursTable,
} from '../../utils/branches'

const dias = (raw: string) =>
  parseOpeningHours(raw)
    .flatMap(w => w.days)
    .filter((d, i, a) => a.indexOf(d) === i)
    .sort((a, b) => a - b)

describe('enumeraciones de días: "A, B y C"', () => {
  // /sucursal/brou-rivera-44 publicaba "Viernes 13:00 a 18:00" y "Cerrado" el resto.
  it('"Martes, Jueves y Viernes" son tres días, no uno', () => {
    const raw = 'Martes, Jueves y Viernes de 13 a 18 hs.'
    expect(dias(raw)).toEqual([1, 3, 4])
    const spec = openingHoursSpecification(raw)
    expect(spec).toHaveLength(1)
    expect(spec[0]!.dayOfWeek).toEqual(['Tuesday', 'Thursday', 'Friday'])
    expect(spec[0]!.opens).toBe('13:00')
    expect(spec[0]!.closes).toBe('18:00')
  })

  it('"Lunes, Miércoles y Jueves" también', () => {
    expect(dias('Lunes, Miércoles y Jueves de 13 a 18 hs.')).toEqual([0, 2, 3])
  })

  it('el caso que ya funcionaba sigue funcionando', () => {
    expect(dias('Lunes, Miercoles y Viernes de 13 a 18hs')).toEqual([0, 2, 4])
  })

  it('la tabla visible deja de decir "Cerrado" un día que abre', () => {
    const tabla = weeklyHoursTable('Martes, Jueves y Viernes de 13 a 18 hs.')
    expect(tabla[1]!.hours).toBe('13:00 a 18:00') // martes
    expect(tabla[3]!.hours).toBe('13:00 a 18:00') // jueves
    expect(tabla[0]!.hours).toBe('Cerrado') // lunes, que de verdad cierra
  })

  it('no une días cuando entre medio hay un horario', () => {
    // "Lunes a Viernes de 8 a 19 hs. Sábados 8 a 12.30" son dos franjas distintas.
    const w = parseOpeningHours('Lunes a Viernes de 8 a 19 hs. Sábados de 8 a 12.30 hs')
    expect(w).toHaveLength(2)
    expect(w[0]!.days).toEqual([0, 1, 2, 3, 4])
    expect(w[1]!.days).toEqual([5])
  })
})

describe('lo que no es horario de atención al público', () => {
  it('la buzonera del Santander no se publica como horario de la sucursal', () => {
    const raw = 'Lunes a viernes de 13 a 17 horas Buzonera de 6 a 22 horas'
    const w = parseOpeningHours(raw)
    expect(w).toHaveLength(1)
    expect(w[0]!.opens).toBe('13:00')
    expect(w[0]!.closes).toBe('17:00')
  })

  it('tampoco las terminales de autoservicio 24 h', () => {
    const w = parseOpeningHours('Lunes a viernes de 13.00 a 18.00hs. Terminales Autoservicio 24hs')
    expect(w).toHaveLength(1)
    expect(w[0]!.closes).toBe('18:00')
  })

  it('ni el horario de cajas de OCA cuando difiere del de la sucursal', () => {
    const w = parseOpeningHours(
      'Todos los días de 10 a 20 h Horario de cajas: de L a S de 11 a 19 h'
    )
    expect(w).toHaveLength(1)
    expect(w[0]!.opens).toBe('10:00')
    expect(w[0]!.closes).toBe('20:00')
  })

  it('ni el horario de temporada estival, que rige dos meses', () => {
    const w = parseOpeningHours(
      'Lun a Vie 9:30 a 19 hs Sab 9:30 a 16 hs. Horario en temporada estival: Lun a Sab 9:30 a 22 hs y Dom Cerrado'
    )
    expect(w.every(x => x.closes !== '22:00')).toBe(true)
    expect(w.some(x => x.closes === '19:00')).toBe(true)
  })

  it('una sucursal SIN atención al público no publica horario ninguno', () => {
    // El caso que decide el diseño: la marca está al principio y la cabeza queda vacía.
    expect(
      parseOpeningHours('Zona de autoservicios de 9 a 21 horas sin atención al público.')
    ).toEqual([])
    expect(
      openingHoursSpecification('Zona de autoservicios de 9 a 21 horas sin atención al público.')
    ).toEqual([])
  })
})
