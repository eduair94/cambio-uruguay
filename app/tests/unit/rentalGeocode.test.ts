import { describe, expect, it, vi } from 'vitest'
import {
  normalizeRentalGeocodeQuery,
  rentalGeocodeItems,
  rentalGeocodeUniqueScope,
  rentalGeocodeMatchesScope,
} from '../../utils/rentalGeocode'
import { createRentalGeocoder } from '../../server/utils/rentalGeocode'

// Public IDE v1 response validated on 2026-09-07; no private geocoding key is required.
const crossing = {
  type: 'ESQUINA',
  address: 'HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO',
  idCalle: 8294,
  idCalleEsq: 9738,
  lat: -34.88974051732336,
  lng: -56.1768286423287,
  state: 1,
  stateMsg: '',
  source: 'ide_uy',
  ranking: 30,
  idLocalidad: 3180,
  idDepartamento: 1,
}

const street = {
  type: 'CALLE',
  id: '8294',
  nomVia: 'HOCQUART',
  address: 'HOCQUART, MONTEVIDEO, MONTEVIDEO',
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

describe('address input and exact IDE candidates', () => {
  it('accepts the requested Hocquart y Democracia crossing with a conservative alternate query', () => {
    expect(
      normalizeRentalGeocodeQuery({ q: ' Hocquart y Democracia ', department: 'Montevideo' })
    ).toEqual({
      text: 'Hocquart y Democracia, Montevideo',
      intersection: true,
      fallback: 'Hocquart esquina Democracia, Montevideo',
    })
    expect(
      normalizeRentalGeocodeQuery({
        q: 'Hocquart y Democracia, Montevideo',
        department: 'Montevideo',
      })?.text
    ).toBe('Hocquart y Democracia, Montevideo')
    expect(
      normalizeRentalGeocodeQuery({ q: 'Hocquart esquina Democracia', department: 'Montevideo' })
    ).toEqual({
      text: 'Hocquart esquina Democracia, Montevideo',
      intersection: true,
      fallback: null,
    })
  })

  it('preserves Treinta y Tres as a street name while recognizing another intersection separator', () => {
    expect(normalizeRentalGeocodeQuery({ q: 'Treinta y Tres 1234' })).toMatchObject({
      text: 'Treinta y Tres 1234',
      intersection: false,
      fallback: null,
    })
    expect(
      normalizeRentalGeocodeQuery({ q: 'Treinta y Tres y Buenos Aires', department: 'Montevideo' })
        ?.fallback
    ).toBe('Treinta y Tres esquina Buenos Aires, Montevideo')
  })

  it.each([
    {},
    { q: ['Hocquart'] },
    { q: 1234 },
    { q: 'ab' },
    { q: 'A'.repeat(181) },
    { q: 'Hocquart', department: ['Montevideo'] },
    { q: 'Hocquart', department: 'M'.repeat(41) },
    { q: '<script>dirección</script>' },
    { q: 'Hocquart\u0000Democracia' },
  ])('rejects malformed query %j', input => {
    expect(normalizeRentalGeocodeQuery(input)).toBeNull()
  })

  it('returns only safe full labels and rounded coordinates, never provider internals', () => {
    const query = normalizeRentalGeocodeQuery({ q: 'Hocquart y Democracia' })!
    expect(rentalGeocodeItems([crossing, crossing], query)).toEqual([
      {
        label: crossing.address,
        lat: -34.88974,
        lng: -56.17683,
      },
    ])
  })

  it('never turns a street centroid, locality, nearby door or unknown state into the requested crossing', () => {
    const query = normalizeRentalGeocodeQuery({ q: 'Hocquart y Democracia' })!
    expect(
      rentalGeocodeItems(
        [
          ...['CALLE', 'LOCALIDAD', 'CALLEyPORTAL', 'POI'].map(type => ({ ...crossing, type })),
          ...[undefined, 0, 2, '1'].map(state => ({ ...crossing, state })),
          ...['Aproximado', 'GEOMETRIA DE CALLE NO ENCONTRADA', undefined].map(stateMsg => ({
            ...crossing,
            stateMsg,
          })),
          ...[null, NaN, Infinity, '-34.89', 0, -40].map(lat => ({ ...crossing, lat })),
          { ...crossing, address: '<script>x</script>' },
          { ...crossing, address: '' },
        ],
        query
      )
    ).toEqual([])
    const address = normalizeRentalGeocodeQuery({ q: 'Hocquart 1234' })!
    expect(rentalGeocodeItems([{ ...crossing, type: 'CALLEyPORTAL' }], address)).toHaveLength(1)
    expect(rentalGeocodeItems([{ ...crossing, type: 'CALLE' }], address)).toHaveLength(0)
  })
})

describe('unscoped intersections use native street evidence', () => {
  const input = { q: 'Hocquart y Democracia' }
  const query = normalizeRentalGeocodeQuery(input)!

  it('finds bare Hocquart y Democracia in exactly two calls without assuming a city or using a street centroid', async () => {
    const fetch = vi.fn().mockResolvedValueOnce([street]).mockResolvedValueOnce([crossing])
    const lookup = createRentalGeocoder(fetch)
    expect(await lookup(input, 'client')).toEqual({
      source: 'IDE Uruguay',
      items: [{ label: crossing.address, lat: -34.88974, lng: -56.17683 }],
    })
    expect(fetch.mock.calls.map(([text]) => text)).toEqual([
      'Hocquart',
      'HOCQUART esquina Democracia, MONTEVIDEO, MONTEVIDEO',
    ])
    expect(await lookup(input, 'client')).toHaveProperty('items.0.lat', -34.88974)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('discovers scope only for a bare intersection, preserving supplied department/locality and numbered street names', () => {
    expect(query.unscopedIntersection).toEqual({
      firstStreet: 'Hocquart',
      secondStreet: 'Democracia',
    })
    expect(
      normalizeRentalGeocodeQuery({ q: 'Hocquart esq. Democracia' })?.unscopedIntersection
    ).toEqual(query.unscopedIntersection)
    expect(
      normalizeRentalGeocodeQuery({ q: 'Treinta y Tres y Buenos Aires' })?.unscopedIntersection
        ?.firstStreet
    ).toBe('Treinta y Tres')
    expect(
      normalizeRentalGeocodeQuery({ q: 'Treinta y Tres 1234' })?.unscopedIntersection
    ).toBeUndefined()
    expect(
      normalizeRentalGeocodeQuery({ q: 'Hocquart y Democracia, Montevideo' })?.unscopedIntersection
    ).toBeUndefined()
    expect(
      normalizeRentalGeocodeQuery({ ...input, department: 'Canelones' })?.unscopedIntersection
    ).toBeUndefined()
  })

  it.each(
    [
      [],
      [null],
      [{ ...street, nomVia: 'HOCQUART NORTE' }],
      [{ ...street, nomVia: 'HOQUART' }],
      [{ ...street, type: 'LOCALIDAD', lat: -34.9, lng: -56.17 }],
      [{ ...street, state: 2, stateMsg: 'Aproximado' }],
      [{ ...street, idCalle: '8294' }],
      [{ ...street, idLocalidad: 0 }],
      [{ ...street, idDepartamento: null }],
      [{ ...street, localidad: '' }],
      [{ ...street, departamento: undefined }],
      [street, { ...street, idCalle: 9999 }],
      [street, { ...street, idLocalidad: 9999, localidad: 'OTRA LOCALIDAD' }],
      [street, { ...street, idDepartamento: 19, departamento: 'CANELONES' }],
      [street, { ...street, idDepartamento: null }],
      [
        street,
        {
          ...street,
          idDepartamento: 19,
          departamento: 'CANELONES',
          state: 2,
          stateMsg: 'Aproximado',
        },
      ],
      [street, { ...street, idDepartamento: 19, departamento: 'CANELONES', state: undefined }],
      [street, { ...street, idDepartamento: 19, departamento: 'CANELONES', stateMsg: undefined }],
      [street, street, street, street, street],
    ].map(raw => ({ raw }))
  )(
    'declines ambiguous, truncated or inexact scope $raw without a second request',
    async ({ raw }) => {
      expect(rentalGeocodeUniqueScope(raw, query)).toBeNull()
      const fetch = vi.fn().mockResolvedValue(raw)
      expect(await createRentalGeocoder(fetch)(input, 'client')).toEqual({
        source: 'IDE Uruguay',
        items: [],
      })
      expect(fetch).toHaveBeenCalledTimes(1)
    }
  )

  it('accepts accent/case/spacing normalization but never a fuzzy street match', () => {
    expect(rentalGeocodeUniqueScope([{ ...street, nomVia: ' HÓCQUART ' }], query)).not.toBeNull()
    expect(rentalGeocodeUniqueScope([street, street], query)).not.toBeNull()
  })

  it.each([
    { ...crossing, idCalle: 9999 },
    { ...crossing, idCalleEsq: 0 },
    { ...crossing, idCalleEsq: crossing.idCalle },
    { ...crossing, idCalle: '8294' },
    { ...crossing, idLocalidad: 9999 },
    { ...crossing, idDepartamento: 19 },
    { ...crossing, address: 'HOCQUART ESQ DEFENSA, MONTEVIDEO, MONTEVIDEO' },
    { ...crossing, address: 'DEMOCRACIA ESQ HOCQUART, MONTEVIDEO, MONTEVIDEO' },
    { ...crossing, type: 'CALLE' },
    { ...crossing, state: 2 },
    { ...crossing, stateMsg: 'Aproximado' },
    { ...crossing, lat: 0, lng: 0 },
  ])('does not substitute an inconsistent or approximate second response %j', async row => {
    const fetch = vi.fn().mockResolvedValueOnce([street]).mockResolvedValueOnce([row])
    expect(await createRentalGeocoder(fetch)(input, 'client')).toEqual({
      source: 'IDE Uruguay',
      items: [],
    })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('accepts reversed native street orientation only when the corresponding labels also reverse', () => {
    const scope = rentalGeocodeUniqueScope([street], query)!
    expect(
      rentalGeocodeMatchesScope(
        {
          ...crossing,
          idCalle: 9738,
          idCalleEsq: 8294,
          address: 'DEMOCRACIA ESQ HOCQUART, MONTEVIDEO, MONTEVIDEO',
        },
        scope
      )
    ).toBe(true)
    const sameName = rentalGeocodeUniqueScope(
      [street],
      normalizeRentalGeocodeQuery({ q: 'Hocquart y Hocquart' })!
    )!
    expect(rentalGeocodeMatchesScope(crossing, sameName)).toBe(false)
  })
})

describe('bounded official address search', () => {
  it('falls back once to esquina and caches the result for repeated searches', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce([{ ...crossing, type: 'CALLE' }])
      .mockResolvedValue([crossing])
    const lookup = createRentalGeocoder(fetch)
    const input = { q: 'Hocquart y Democracia', department: 'Montevideo' }
    const result = await lookup(input, 'client')
    expect(result).toEqual({
      source: 'IDE Uruguay',
      items: [{ label: crossing.address, lat: -34.88974, lng: -56.17683 }],
    })
    expect(fetch.mock.calls.map(([query]) => query)).toEqual([
      'Hocquart y Democracia, Montevideo',
      'Hocquart esquina Democracia, Montevideo',
    ])
    expect(await lookup(input, 'client')).toEqual(result)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('uses the original answer when it already identifies the crossing', async () => {
    const fetch = vi.fn().mockResolvedValue([crossing])
    expect(
      (
        await createRentalGeocoder(fetch)(
          { q: 'Hocquart y Democracia', department: 'Montevideo' },
          'client'
        )
      ).items
    ).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('coalesces identical concurrent searches, and bounds unrelated pending work', async () => {
    let resolve!: (value: unknown) => void
    const fetch = vi.fn(
      () =>
        new Promise(done => {
          resolve = done
        })
    )
    const lookup = createRentalGeocoder(fetch)
    const first = lookup({ q: 'Hocquart esquina Democracia' }, 'a')
    const duplicate = lookup({ q: 'Hocquart esquina Democracia' }, 'b')
    expect(fetch).toHaveBeenCalledTimes(1)
    resolve([crossing])
    expect(await duplicate).toEqual(await first)

    const holds: Array<(value: unknown) => void> = []
    const busy = createRentalGeocoder(() => new Promise(done => holds.push(done)))
    const pending = [1, 2, 3, 4].map(i => busy({ q: `Dirección ${i}` }, `client-${i}`))
    await expect(busy({ q: 'Dirección 5' }, 'other')).rejects.toMatchObject({ statusCode: 429 })
    holds.forEach(done => done([]))
    await Promise.all(pending)
  })

  it('limits per-client and global traffic, then permits the next time window', async () => {
    let clock = 1000
    const fetch = vi.fn().mockResolvedValue([])
    const lookup = createRentalGeocoder(fetch, () => clock)
    for (let i = 0; i < 10; i++) await lookup({ q: `Dirección ${i}` }, 'same-client')
    await expect(lookup({ q: 'Dirección 11' }, 'same-client')).rejects.toMatchObject({
      statusCode: 429,
    })
    for (let i = 10; i < 30; i++) await lookup({ q: `Dirección ${i}` }, `client-${i}`)
    await expect(lookup({ q: 'Dirección 31' }, 'new-client')).rejects.toMatchObject({
      statusCode: 429,
    })
    expect(fetch).toHaveBeenCalledTimes(30)
    clock += 60_001
    await expect(lookup({ q: 'Dirección 31' }, 'same-client')).resolves.toEqual({
      items: [],
      source: 'IDE Uruguay',
    })
  })

  it('bounds the cache and expires empty results sooner than successful ones', async () => {
    let clock = 1000
    const fetch = vi.fn().mockResolvedValue([])
    const lookup = createRentalGeocoder(fetch, () => clock)
    for (let i = 0; i < 129; i++) {
      clock += 60_001
      await lookup({ q: `Dirección ${i}` }, 'client')
    }
    await lookup({ q: 'Dirección 0' }, 'client')
    expect(fetch).toHaveBeenCalledTimes(130)
    await lookup({ q: 'Dirección 0' }, 'client')
    expect(fetch).toHaveBeenCalledTimes(130)
    clock += 60_001
    await lookup({ q: 'Dirección 0' }, 'client')
    expect(fetch).toHaveBeenCalledTimes(131)
  })

  it('reports provider failures and malformed responses as unavailable, then allows retry', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({ error: 'broken' })
      .mockResolvedValueOnce([])
    const lookup = createRentalGeocoder(fetch)
    await expect(lookup({ q: 'Hocquart 1234' }, 'client')).rejects.toMatchObject({
      statusCode: 503,
    })
    await expect(lookup({ q: 'Hocquart 1234' }, 'client')).rejects.toMatchObject({
      statusCode: 503,
    })
    await expect(lookup({ q: 'Hocquart 1234' }, 'client')).resolves.toEqual({
      source: 'IDE Uruguay',
      items: [],
    })
    await expect(lookup({ q: [] }, 'client')).rejects.toMatchObject({ statusCode: 400 })
  })
})
