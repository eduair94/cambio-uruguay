// Filtrar por TARJETA y no por emisor.
//
// El bug: la pantalla deja elegir "BROU Débito" pero la consulta viajaba con el emisor pelado
// (`banks=brou`), y el emisor descuenta con las dos. Medido contra la API viva el 2026-09-02:
// BROU devuelve 1.224 locales y sólo 193 publican beneficio con débito. O sea que quien elegía su
// tarjeta de débito veía 1.031 comercios donde su tarjeta no sirve — 84 % de ruido, en la única
// pantalla del sitio cuya pregunta es "¿me sirve mi tarjeta acá?".
import { describe, expect, it } from 'vitest'
import { flattenForCards, brandCountForCards } from '../../server/utils/bankos'

/**
 * Catálogo mínimo con la forma real del upstream: una marca que BROU descuenta sólo con crédito,
 * otra con las dos, y una que descuenta Itaú.
 */
const data: any = {
  brands: {
    soloCredito: { brandId: 'soloCredito', name: 'Sólo Crédito', categories: ['Mercados'] },
    ambas: { brandId: 'ambas', name: 'Ambas', categories: ['Farmacias'] },
    deItau: { brandId: 'deItau', name: 'De Itaú', categories: ['Cines'] },
  },
  bankBrands: {
    brou: {
      soloCredito: {
        creditDescription: '10% con crédito BROU',
        debitDescription: null,
        hasCredit: true,
        hasDebit: false,
      },
      ambas: {
        creditDescription: '15% con crédito BROU',
        debitDescription: '5% con débito BROU',
        hasCredit: true,
        hasDebit: true,
      },
    },
    itau: {
      deItau: {
        creditDescription: '20% con crédito Itaú',
        debitDescription: null,
        hasCredit: true,
        hasDebit: false,
      },
    },
  },
  brandLocations: { soloCredito: ['l1', 'l2'], ambas: ['l3'], deItau: ['l4'] },
  locations: {
    l1: { location: { coordinates: [-56.1, -34.9] }, rating: 4 },
    l2: { location: { coordinates: [-56.2, -34.8] }, rating: 4 },
    l3: { location: { coordinates: [-56.3, -34.7] }, rating: 5 },
    l4: { location: { coordinates: [-56.4, -34.6] }, rating: 3 },
  },
}

describe('flattenForCards', () => {
  it('con una tarjeta de DÉBITO no devuelve los locales que sólo dan crédito', () => {
    const items = flattenForCards(data, ['brou_debit'])
    // Es el caso medido: de los tres locales de BROU sólo uno da beneficio con débito.
    expect(items.map(i => i.locationId)).toEqual(['l3'])
  })

  it('con la de crédito del mismo emisor sí los devuelve', () => {
    const items = flattenForCards(data, ['brou_credit'])
    expect(items.map(i => i.locationId).sort()).toEqual(['l1', 'l2', 'l3'])
  })

  it('con las dos del mismo emisor devuelve la unión', () => {
    const items = flattenForCards(data, ['brou_debit', 'brou_credit'])
    expect(items.map(i => i.locationId).sort()).toEqual(['l1', 'l2', 'l3'])
  })

  it('dice con cuál de MIS medios de pago aplica, no con los del emisor', () => {
    // El local `l3` da con las dos, pero el visitante sólo tiene la de débito: la ficha no puede
    // mostrarle el texto de crédito como si le sirviera.
    const [item] = flattenForCards(data, ['brou_debit'])
    expect(item.banks[0].matchedKinds).toEqual(['debit'])

    const [both] = flattenForCards(data, ['brou_debit', 'brou_credit']).filter(
      i => i.locationId === 'l3'
    )
    expect(both.banks[0].matchedKinds).toEqual(['credit', 'debit'])
  })

  it('junta varios emisores', () => {
    const items = flattenForCards(data, ['brou_debit', 'itau_credit'])
    expect(items.map(i => i.locationId).sort()).toEqual(['l3', 'l4'])
  })

  it('sin tarjetas no devuelve nada, y no despierta al catálogo por gusto', () => {
    expect(flattenForCards(data, [])).toEqual([])
    expect(flattenForCards(data, ['tarjeta_inventada'])).toEqual([])
  })

  it('deja afuera al emisor que no aporta, en vez de mostrarlo vacío', () => {
    // Itaú no descuenta `ambas`, así que en ese local no debe aparecer aunque esté elegido.
    const [item] = flattenForCards(data, ['brou_debit', 'itau_credit']).filter(
      i => i.locationId === 'l3'
    )
    expect(item.banks.map(b => b.bankId)).toEqual(['brou'])
  })
})

describe('brandCountForCards', () => {
  it('cuenta las marcas alcanzables con esas tarjetas, no las del emisor', () => {
    expect(brandCountForCards(data, ['brou_credit'])).toBe(2)
    expect(brandCountForCards(data, ['brou_debit'])).toBe(1)
    expect(brandCountForCards(data, [])).toBe(0)
  })
})
