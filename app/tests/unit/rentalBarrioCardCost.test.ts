import { describe, expect, it } from 'vitest'
import { rentalBarrioCardCost } from '../../utils/rentalBarrioCopy'

// The cost line of the "Avisos recientes" cards on /alquiler/<departamento>/<barrio>, from ONE
// advert (server/utils/rentalBarrio.ts picks it). Its own file: rentalBarrioCopy.test.ts is the
// page copy's, and other work edits it.
describe('rentalBarrioCardCost', () => {
  const card = {
    currency: 'UYU' as const,
    commonExpenses: 13400,
    commonExpensesCurrency: 'UYU' as const,
    totalUyu: 55400,
  }

  it('says rent + gastos comunes = total', () => {
    expect(rentalBarrioCardCost(card)).toBe('+ $ 13.400 de gastos comunes = $ 55.400 por mes')
  })

  it('marks a total that needed the exchange rate as approximate', () => {
    // A dollar rent is added in pesos with the rate.
    expect(rentalBarrioCardCost({ ...card, currency: 'USD', totalUyu: 57860 })).toBe(
      '+ $ 13.400 de gastos comunes ≈ $ 57.860 por mes'
    )
    expect(
      rentalBarrioCardCost({
        ...card,
        commonExpenses: 150,
        commonExpensesCurrency: 'USD',
        totalUyu: null,
      })
    ).toBe('+ U$S 150 de gastos comunes')
  })

  it('says zero only when the advert publishes it, and never assumes what it does not say', () => {
    expect(rentalBarrioCardCost({ ...card, commonExpenses: 0, commonExpensesCurrency: null })).toBe(
      'Sin gastos comunes'
    )
    expect(rentalBarrioCardCost({ ...card, commonExpenses: null, totalUyu: null })).toBe(
      'Gastos comunes no informados'
    )
    // An amount without its currency is not known either.
    expect(rentalBarrioCardCost({ ...card, commonExpensesCurrency: null })).toBe(
      'Gastos comunes no informados'
    )
  })
})
