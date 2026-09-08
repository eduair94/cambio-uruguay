import { describe, expect, it, vi } from 'vitest'
import { createRentalGeocoder } from '../../server/utils/rentalGeocode'
import {
  normalizeRentalGeocodeQuery,
  rentalGeocodeItems,
  rentalGeocodeRefinements,
} from '../../utils/rentalGeocode'

// Native responses measured on 2026-09-08: Hocq and HOCQUART esquina Demo, MONTEVIDEO, MONTEVIDEO.
const street = {
  type: 'CALLE',
  state: 1,
  stateMsg: '',
  nomVia: 'HOCQUART',
  idCalle: 8294,
  idLocalidad: 3180,
  idDepartamento: 1,
  localidad: 'MONTEVIDEO',
  departamento: 'MONTEVIDEO',
  address: 'HOCQUART, MONTEVIDEO, MONTEVIDEO',
  lat: 0,
  lng: 0,
}
const crossing = {
  ...street,
  type: 'ESQUINA',
  idCalleEsq: 9738,
  address: 'HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO',
  lat: -34.88974051732336,
  lng: -56.1768286423287,
}
const query = (q: string, extra = {}) =>
  normalizeRentalGeocodeQuery({ q, autocomplete: '1', ...extra })!

describe('native street refinements, never map points', () => {
  it('keeps the legacy contract and requires the explicit autocomplete mode', () => {
    expect(normalizeRentalGeocodeQuery({ q: 'Hocq' })).not.toHaveProperty('autocomplete')
    for (const autocomplete of [true, 1, '0', ['1'], null])
      expect(normalizeRentalGeocodeQuery({ q: 'Hocq', autocomplete })).toBeNull()
    expect(rentalGeocodeRefinements([street], normalizeRentalGeocodeQuery({ q: 'Hocq' })!)).toEqual(
      []
    )
  })

  it('offers a canonical street and city to continue typing, excluding geometry and private fields', async () => {
    const raw = {
      ...street,
      lat: -34.9,
      lng: -56.2,
      secret: 'PRIVATE_NATIVE',
      geometry: { coordinates: [1, 2] },
    }
    const lookup = createRentalGeocoder(vi.fn().mockResolvedValue([raw]))
    const response = await lookup({ q: 'Hocq', autocomplete: '1' }, 'client')
    expect(response).toEqual({
      source: 'IDE Uruguay',
      items: [],
      refinements: [{ label: street.address, query: street.address }],
    })
    expect(JSON.stringify(response)).not.toMatch(/lat|lng|geometry|PRIVATE_NATIVE|idCalle/)
  })

  it('offers separate native city refinements without silently picking one, capped at five', () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      ...street,
      localidad: `LOCALIDAD ${i}`,
      idLocalidad: i + 1,
    }))
    const result = rentalGeocodeRefinements(rows, query('Hocq'))
    expect(result).toHaveLength(5)
    expect(result[0]!.query).toBe('HOCQUART, LOCALIDAD 0, MONTEVIDEO')
    expect(rentalGeocodeRefinements([street, street], query('Hocq'))).toHaveLength(1)
  })

  it.each([
    { type: 'LOCALIDAD' },
    { type: 'CALLEyPORTAL' },
    { state: 2 },
    { stateMsg: 'Aproximado' },
    { idCalle: 0 },
    { idCalle: '8294' },
    { idLocalidad: null },
    { idDepartamento: undefined },
    { nomVia: 'OTRA CALLE' },
    { nomVia: '<HOCQUART>' },
    { localidad: '' },
    { departamento: 'x'.repeat(101) },
  ])('declines invalid native refinement evidence %j', patch => {
    expect(rentalGeocodeRefinements([{ ...street, ...patch }], query('Hocq'))).toEqual([])
  })

  it('does not reinterpret a missing portal, wrong city or crossing as a street-only selection', () => {
    expect(rentalGeocodeRefinements([street], query('Hocquart 9999'))).toEqual([])
    expect(rentalGeocodeRefinements([street], query('Hocquart y Demo'))).toEqual([])
    expect(rentalGeocodeRefinements([street], query('Hocq', { department: 'Canelones' }))).toEqual(
      []
    )
    expect(rentalGeocodeRefinements([street], query('Hocq, Montevideo, Canelones'))).toEqual([])
    expect(rentalGeocodeRefinements([street], query('Hocq, Montevideo, Montevideo'))).toHaveLength(
      1
    )
  })

  it('permits the measured native transposition but not arbitrary guessed spellings', () => {
    expect(rentalGeocodeRefinements([street], query('Hoqcuart'))).toHaveLength(1)
    expect(rentalGeocodeRefinements([street], query('Hoquart'))).toEqual([])
  })
})

describe('autocomplete intersections preserve native evidence', () => {
  it('completes the final street prefix after confirming the first street scope', async () => {
    const fetch = vi.fn().mockResolvedValueOnce([street]).mockResolvedValueOnce([crossing])
    const response = await createRentalGeocoder(fetch)(
      { q: 'Hocquart y Demo', autocomplete: '1' },
      'client'
    )
    expect(response.items).toEqual([
      { label: crossing.address, lat: -34.88974, lng: -56.17683, suggested: true },
    ])
    expect(response).not.toHaveProperty('refinements')
    expect(fetch.mock.calls.map(([text]) => text)).toEqual([
      'Hocquart',
      'HOCQUART esquina Demo, MONTEVIDEO, MONTEVIDEO',
    ])
  })

  it('requires the explicit mode for partial names and four letters in a completion', async () => {
    const lookup = createRentalGeocoder(
      vi.fn().mockResolvedValueOnce([street]).mockResolvedValue([crossing])
    )
    expect((await lookup({ q: 'Hocquart y Demo' }, 'client')).items).toEqual([])
    expect(
      (await lookup({ q: 'Hocquart y Demo', autocomplete: '1' }, 'client')).items
    ).toHaveLength(1)
    expect((await lookup({ q: 'Hocquart y Dem', autocomplete: '1' }, 'client')).items).toEqual([])
  })

  it('checks both native names, IDs and explicit scope even for direct scoped responses', () => {
    const input = query('Hocquart y Demo', { department: 'Montevideo' })
    expect(rentalGeocodeItems([crossing], input)).toHaveLength(1)
    for (const patch of [
      { address: 'HOCQUART ESQ DEFENSA, MONTEVIDEO, MONTEVIDEO' },
      { address: 'DEFENSA ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO' },
      { idCalleEsq: 8294 },
      { idCalle: '8294' },
      { idLocalidad: 0 },
      { idDepartamento: null },
      { departamento: 'CANELONES' },
      { stateMsg: 'Aproximado' },
      { type: 'CALLE' },
      { lat: 0, lng: 0 },
    ])
      expect(rentalGeocodeItems([{ ...crossing, ...patch }], input)).toEqual([])
    expect(
      rentalGeocodeItems(
        [
          {
            ...crossing,
            address: 'DEMOCRACIA ESQ HOCQUART, MONTEVIDEO, MONTEVIDEO',
            idCalle: 9738,
            idCalleEsq: 8294,
          },
        ],
        input
      )
    ).toHaveLength(1)
  })

  it('retains the first native street ID and refuses an unrelated crossing in unscoped lookup', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce([street])
      .mockResolvedValueOnce([{ ...crossing, idCalle: 9999 }])
    expect(
      (await createRentalGeocoder(fetch)({ q: 'Hocquart y Demo', autocomplete: '1' }, 'client'))
        .items
    ).toEqual([])
  })

  it('does not complete fragments shorter than four letters or add a city to ambiguous evidence', async () => {
    expect(
      rentalGeocodeItems(
        [{ ...crossing, address: 'HOCQUART ESQ 18 DE JULIO, MONTEVIDEO, MONTEVIDEO' }],
        query('Hocquart y 18 de')
      )
    ).toEqual([])
    const fetch = vi
      .fn()
      .mockResolvedValue([street, { ...street, idLocalidad: 1234, localidad: 'OTRA CIUDAD' }])
    expect(
      (await createRentalGeocoder(fetch)({ q: 'Hocquart y Demo', autocomplete: '1' }, 'client'))
        .items
    ).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each(['Hocquart y', 'Hocquart y D', 'Hocquart esquina', 'Hocquart esq. D'])(
    'never turns the incomplete crossing %s into an arbitrary native intersection',
    text => {
      const input = query(text)
      expect(input.intersection).toBe(true)
      expect(rentalGeocodeItems([crossing], input)).toEqual([])
      expect(rentalGeocodeRefinements([street], input)).toEqual([])
    }
  )

  it('completes numbered native streets while retaining the exact numeric prefix', () => {
    const row = {
      ...crossing,
      address: 'BULEVAR ESPAÑA ESQ 18 DE JULIO, MONTEVIDEO, MONTEVIDEO',
    }
    expect(rentalGeocodeItems([row], query('Bulevar España esquina 18 de Ju'))).toEqual([
      { label: row.address, lat: -34.88974, lng: -56.17683, suggested: true },
    ])
    expect(rentalGeocodeItems([row], query('Bulevar España esquina 19 de Ju'))).toEqual([])
  })

  it('reuses and coalesces first-street metadata while the second street is being typed', async () => {
    let done!: (value: unknown) => void
    const fetch = vi.fn((text: string) =>
      text === 'Hocquart'
        ? new Promise(resolve => {
            done = resolve
          })
        : Promise.resolve([crossing])
    )
    const lookup = createRentalGeocoder(fetch)
    const first = lookup({ q: 'Hocquart y Demo', autocomplete: '1' }, 'client')
    const second = lookup({ q: 'Hocquart y Democ', autocomplete: '1' }, 'client')
    expect(fetch).toHaveBeenCalledTimes(1)
    done([street])
    expect((await first).items).toHaveLength(1)
    expect((await second).items).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(
      (await lookup({ q: 'Hocquart y Democr', autocomplete: '1' }, 'client')).items
    ).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  it('does not cache native scope transport failures', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('PRIVATE'))
      .mockResolvedValueOnce([street])
      .mockResolvedValue([crossing])
    const lookup = createRentalGeocoder(fetch, Date.now, () => {})
    await expect(
      lookup({ q: 'Hocquart y Demo', autocomplete: '1' }, 'client')
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(
      (await lookup({ q: 'Hocquart y Demo', autocomplete: '1' }, 'client')).items
    ).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(3)
  })
})
