import { describe, expect, it } from 'vitest'
import { rentalFitPrefill } from '../../utils/rentalFit'

const DEPARTMENTS = ['Canelones', 'Montevideo', 'Paysandú']

describe('rentalFitPrefill', () => {
  it('toma barrio, presupuesto, tipo y dormitorios del asesor de barrios', () => {
    expect(
      rentalFitPrefill(
        {
          departamento: 'montevideo',
          barrio: 'Cordón',
          presupuesto: '40000',
          tipo: 'apartamento',
          dormitorios: '2',
        },
        DEPARTMENTS
      )
    ).toEqual({
      department: 'Montevideo',
      zones: {
        mode: 'prefer',
        include: [{ department: 'Montevideo', neighborhood: 'Cordón' }],
        exclude: [],
      },
      types: ['apartamento'],
      minBedrooms: 2,
      housingBudgetUyu: 40_000,
    })
  })

  it('el departamento se reconoce sin tildes y vuelve con las suyas', () => {
    expect(rentalFitPrefill({ departamento: 'Paysandu' }, DEPARTMENTS)).toEqual({
      department: 'Paysandú',
    })
  })

  it('lo inválido se ignora campo por campo, nunca tira', () => {
    expect(
      rentalFitPrefill(
        {
          departamento: 'Narnia',
          barrio: 'Centro',
          presupuesto: 'abc',
          tipo: 'castillo',
          dormitorios: '99',
        },
        DEPARTMENTS
      )
    ).toEqual({})
    expect(
      rentalFitPrefill({ departamento: 'Montevideo', barrio: '<script>' }, DEPARTMENTS)
    ).toEqual({ department: 'Montevideo' })
    expect(rentalFitPrefill({}, DEPARTMENTS)).toEqual({})
  })
})
