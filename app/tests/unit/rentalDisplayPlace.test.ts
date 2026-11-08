import { describe, expect, it } from 'vitest'
import { rentalPlaceKey } from '../../utils/rentalBarrioName'
import {
  rentalDisplayBarrio,
  rentalDisplayPlace,
  rentalDisplayZone,
  rentalPlaceTitleCase,
} from '../../utils/rentalDisplayPlace'
import { rentalZoneName } from '../../utils/rentalZones'

const montevideo = (neighborhood: string, officialZone: string | null = null) => ({
  department: 'Montevideo',
  neighborhood,
  officialZone: officialZone
    ? { zone: 'mvd:8', name: officialZone, department: 'Montevideo', evidence: 'name' as const }
    : null,
})

describe('rentalDisplayPlace', () => {
  it('uses the barrio page label or the official area when they name the same barrio', () => {
    // 9fedu4 (El País): the title read 'en POCITOS' while the API already had both spellings.
    expect(
      rentalDisplayPlace(montevideo('POCITOS'), {
        barrioLink: { path: '/alquiler/montevideo/pocitos', label: 'Pocitos' },
      })
    ).toBe('Pocitos')
    // Gallito/Casasweb write it without the accent; the INE area keeps it.
    expect(rentalDisplayPlace(montevideo('CORDON', 'Cordón'))).toBe('Cordón')
  })

  it('gives way to the official area, then the department, when the barrio is not a barrio', () => {
    // montevideo-60-m2-60-m2-1ua7c8h: its coordinate puts it in Pocitos.
    expect(rentalDisplayPlace(montevideo('60 m2 60 m2', 'Pocitos'))).toBe('Pocitos')
    // /alquileres/montevideo-uruguay-doctor-javier-barrios-amorin-1y41rkn-9mpt3r
    expect(rentalDisplayPlace(montevideo('Uruguay'))).toBe('Montevideo')
    expect(rentalDisplayZone(montevideo('Uruguay'))).toBe('Montevideo')
    expect(rentalDisplayBarrio(montevideo('4 H'))).toBeNull()
  })

  it('writes the portal capitals as a proper name, without inventing accents', () => {
    expect(
      rentalDisplayPlace({
        department: 'Canelones',
        neighborhood: 'Aeropuerto Internacional De Carrasco',
      })
    ).toBe('Aeropuerto Internacional de Carrasco')
    expect(rentalDisplayPlace(montevideo('BARRIO SUR'))).toBe('Barrio Sur')
    expect(rentalDisplayPlace(montevideo('PEREZ CASTELLANOS'))).toBe('Perez Castellanos')
    expect(rentalDisplayPlace(montevideo('CORDON'))).toBe('Cordon')
    expect(rentalDisplayPlace({ department: 'Canelones', neighborhood: 'parque miramar' })).toBe(
      'Parque Miramar'
    )
    expect(
      rentalDisplayPlace({ department: 'Canelones', neighborhood: 'Ciudad De La Costa' })
    ).toBe('Ciudad de la Costa')
  })

  it('keeps an advert barrio that is more precise than its official area', () => {
    expect(rentalDisplayPlace(montevideo('Pocitos Nuevo', 'Pocitos'))).toBe('Pocitos Nuevo')
    expect(rentalDisplayZone(montevideo('Pocitos Nuevo', 'Pocitos'))).toBe(
      'Pocitos Nuevo, Montevideo'
    )
  })

  it('never repeats the department as if it were the barrio', () => {
    const maldonado = { department: 'Maldonado', neighborhood: 'MALDONADO' }
    expect(rentalDisplayBarrio(maldonado)).toBeNull()
    expect(rentalDisplayPlace(maldonado)).toBe('Maldonado')
    expect(rentalDisplayZone(maldonado)).toBe('Maldonado')
    expect(rentalDisplayZone(montevideo('POCITOS', 'Pocitos'))).toBe('Pocitos, Montevideo')
    expect(rentalDisplayZone({ department: '', neighborhood: '' })).toBe('')
  })
})

describe('rentalPlaceTitleCase', () => {
  it('lowers the joiners, and the article only after "de"', () => {
    expect(rentalPlaceTitleCase('PASO DE LAS DURANAS')).toBe('Paso de las Duranas')
    expect(rentalPlaceTitleCase('ALTOS DE LA TAHONA')).toBe('Altos de la Tahona')
    expect(rentalPlaceTitleCase('PARQUE DEL PLATA')).toBe('Parque del Plata')
    expect(rentalPlaceTitleCase('BELLA VISTA Y PRADO')).toBe('Bella Vista y Prado')
    // The article is part of these names.
    expect(rentalPlaceTitleCase('QUINTA LOS HORNEROS')).toBe('Quinta Los Horneros')
    expect(rentalPlaceTitleCase('LA BLANQUEADA')).toBe('La Blanqueada')
    expect(rentalPlaceTitleCase('Barrio La Teja')).toBe('Barrio La Teja')
  })

  it('lets a number open the name', () => {
    expect(rentalPlaceTitleCase('25 DE MAYO')).toBe('25 de Mayo')
    expect(rentalPlaceTitleCase('26 De Marzo 1220')).toBe('26 de Marzo 1220')
    expect(rentalPlaceTitleCase('AV. GRAL. OSCAR GESTIDO 2500')).toBe(
      'Av. Gral. Oscar Gestido 2500'
    )
    expect(rentalPlaceTitleCase('PEÑAROL')).toBe('Peñarol')
  })
})

describe('rentalPlaceKey', () => {
  it('folds exactly like the zone grouping', () => {
    for (const name of ['Cordón', 'CORDON', '  Malvín   Norte ', 'Peñarol', 'Ciudad de la Costa'])
      expect(rentalPlaceKey(name)).toBe(rentalZoneName(name))
  })
})
