import { describe, expect, it, vi } from 'vitest'
import { createRentalGeocoder } from '../../server/utils/rentalGeocode'
import { normalizeRentalGeocodeQuery, rentalGeocodeUniqueScope } from '../../utils/rentalGeocode'

// Official candidates?q=Hoqcuart&limit=5 response, verified 2026-09-07.
const street = {
  type: 'CALLE',
  nomVia: 'HOCQUART',
  idCalle: 8294,
  idLocalidad: 3180,
  idDepartamento: 1,
  localidad: 'MONTEVIDEO',
  departamento: 'MONTEVIDEO',
  state: 1,
  stateMsg: '',
  lat: 0,
  lng: 0,
}
const crossing = {
  ...street,
  type: 'ESQUINA',
  address: 'HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO',
  idCalleEsq: 9738,
  lat: -34.88974051732336,
  lng: -56.1768286423287,
}
const input = { q: 'Hoqcuart y Democracia' }
const query = normalizeRentalGeocodeQuery(input)!

describe('native address suggestions for one adjacent letter transposition', () => {
  it.each([
    ['Hoqcuart', 'HOCQUART'],
    ['óHcquart', 'HOCQUART'],
    ['Larranaag', 'LARRANAGA'],
    ['Maldonaod', 'MALDONADO'],
    ['General Artigsa 19', 'GENERAL ARTIGAS 19'],
  ])(
    'suggests native %s -> %s only after the actual crossing is confirmed',
    async (typed, native) => {
      const response = { ...crossing, address: `${native} ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO` }
      const fetch = vi
        .fn()
        .mockResolvedValueOnce([{ ...street, nomVia: native }])
        .mockResolvedValueOnce([response])
      const result = await createRentalGeocoder(fetch)({ q: `${typed} y Democracia` }, 'client')
      expect(result).toEqual({
        source: 'IDE Uruguay',
        items: [{ label: response.address, lat: -34.88974, lng: -56.17683, suggested: true }],
      })
      expect(fetch.mock.calls.map(([text]) => text)).toEqual([
        typed,
        `${native} esquina Democracia, MONTEVIDEO, MONTEVIDEO`,
      ])
      expect(fetch).toHaveBeenCalledTimes(2)
    }
  )

  it('prioritizes an exact native name and leaves its response unchanged', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce([{ ...street, nomVia: 'HOQCUART', idCalle: 9999 }, street])
      .mockResolvedValueOnce([crossing])
    const result = await createRentalGeocoder(fetch)({ q: 'Hocquart y Democracia' }, 'client')
    expect(result.items).toEqual([{ label: crossing.address, lat: -34.88974, lng: -56.17683 }])
    expect(fetch.mock.calls[1]![0]).toBe('HOCQUART esquina Democracia, MONTEVIDEO, MONTEVIDEO')
  })

  it('does not use a correction to work around an unresolved exact native row', () => {
    expect(
      rentalGeocodeUniqueScope([{ ...street, nomVia: 'HOQCUART', state: undefined }, street], query)
    ).toBeNull()
  })

  it.each([
    ['Hoquart', 'HOCQUART'],
    ['Hoccquart', 'HOCQUART'],
    ['Hoxquart', 'HOCQUART'],
    ['Hocqu art', 'HOCQ UART'],
    ['Praod', 'PRADO'],
    ['General Artigas 19', 'GENERAL ARTIGAS 91'],
    ['General Artigsa 19', 'GENERAL ARTIGAS 91'],
    ['Geernal Artigsa', 'GENERAL ARTIGAS'],
  ])('declines %s -> %s without asking for a crossing', async (typed, native) => {
    const fetch = vi.fn().mockResolvedValue([{ ...street, nomVia: native }])
    const result = await createRentalGeocoder(fetch)({ q: `${typed} y Democracia` }, 'client')
    expect(result.items).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each([
    [street, { ...street, idCalle: 9999 }],
    [street, { ...street, idLocalidad: 9999, localidad: 'OTRA LOCALIDAD' }],
    [street, { ...street, idDepartamento: 19, departamento: 'CANELONES' }],
    [street, { ...street, nomVia: 'HQOCUART' }],
    [street, { ...street, state: 2, stateMsg: 'Aproximado' }],
    [street, { ...street, state: undefined }],
    [street, { ...street, stateMsg: undefined }],
    [street, { ...street, idCalle: undefined }],
    [street, { ...street, localidad: undefined }],
    [street, street, street, street, street],
  ])('declines ambiguous, unresolved or truncated correction candidates %j', async (...rows) => {
    const fetch = vi.fn().mockResolvedValue(rows)
    expect(rentalGeocodeUniqueScope(rows, query)).toBeNull()
    expect((await createRentalGeocoder(fetch)(input, 'client')).items).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each([
    { ...crossing, idCalle: 9999 },
    { ...crossing, idCalleEsq: 0 },
    { ...crossing, idLocalidad: 9999 },
    { ...crossing, idDepartamento: 19 },
    { ...crossing, address: 'HOCQUART ESQ DEFENSA, MONTEVIDEO, MONTEVIDEO' },
    { ...crossing, address: 'HOQCUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO' },
    { ...crossing, stateMsg: 'Aproximado' },
    { ...crossing, type: 'CALLE' },
  ])('never turns an unproven second response into a spelling suggestion %j', async response => {
    const fetch = vi.fn().mockResolvedValueOnce([street]).mockResolvedValueOnce([response])
    expect((await createRentalGeocoder(fetch)(input, 'client')).items).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
