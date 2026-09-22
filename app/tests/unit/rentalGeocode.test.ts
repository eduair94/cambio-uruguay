import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createRentalGeocoder,
  fetchGoogle,
  GEOCODER_URL,
  type GeocoderFetch,
} from '../../server/utils/rentalGeocode'
import {
  normalizeRentalGeocodeQuery,
  rentalGeocodeLabel,
  splitRentalPredictions,
} from '../../utils/rentalGeocode'

const ok = (key: 'predictions' | 'results', rows: unknown[]) => ({ status: 'OK', [key]: rows })
const place = (lat: number, lng: number, formatted_address: string, extra: object = {}) => ({
  formatted_address,
  geometry: { location: { lat, lng } },
  ...extra,
})

/** A fake proxy: routes by path, records every call. */
function fakeGoogle(routes: Record<string, (params: Record<string, string>) => unknown>) {
  const calls: Array<{ path: string; params: Record<string, string> }> = []
  const fetchJson: GeocoderFetch = async (path, params) => {
    calls.push({ path, params })
    const route = routes[path]
    if (!route) throw new Error(`no route ${path}`)
    const value = route(params)
    if (value instanceof Error) throw value
    return value
  }
  return { fetchJson, calls }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('address input', () => {
  it('validates length, characters and the explicit autocomplete mode', () => {
    expect(normalizeRentalGeocodeQuery({ q: 'abc' })).toBeNull()
    expect(normalizeRentalGeocodeQuery({ q: 'Rivera <b>2500' })).toBeNull()
    expect(normalizeRentalGeocodeQuery({ q: 'Rivera 2500', autocomplete: 'yes' })).toBeNull()
    expect(normalizeRentalGeocodeQuery({ q: '  Rivera   2500 ', autocomplete: '1' })).toEqual({
      text: 'Rivera 2500',
      autocomplete: true,
    })
  })

  it('adds the department once', () => {
    expect(normalizeRentalGeocodeQuery({ q: 'Rivera 2500', department: 'Montevideo' })?.text).toBe(
      'Rivera 2500, Montevideo'
    )
    expect(
      normalizeRentalGeocodeQuery({ q: 'Rivera 2500, montevideo', department: 'Montevideo' })?.text
    ).toBe('Rivera 2500, montevideo')
  })
})

describe('Google labels', () => {
  it.each([
    [
      'Avenida 18 de Julio, Montevideo Departamento de Montevideo, Uruguay',
      'Avenida 18 de Julio, Montevideo',
    ],
    [
      'Av. 18 de Julio 1234, 11100 Montevideo, Departamento de Montevideo, Uruguay',
      'Av. 18 de Julio 1234, Montevideo',
    ],
    [
      '18 de Julio, Barros Blancos Departamento de Canelones, Uruguay',
      '18 de Julio, Barros Blancos, Canelones',
    ],
    ['Tres Cruces, Montevideo Departamento de Montevideo, Uruguay', 'Tres Cruces, Montevideo'],
  ])('%s → %s', (raw, clean) => {
    expect(rentalGeocodeLabel(raw)).toBe(clean)
  })
})

describe('predictions', () => {
  it('keeps precise places as points and bare streets as refinements', () => {
    const { points, streets } = splitRentalPredictions([
      {
        description: 'Avenida 18 de Julio, Montevideo Departamento de Montevideo, Uruguay',
        place_id: 'r',
        types: ['route', 'geocode'],
      },
      {
        description: 'Sarandí 690, Montevideo Departamento de Montevideo, Uruguay',
        place_id: 'a',
        types: ['street_address', 'geocode'],
      },
      {
        description:
          'Facultad de Ingeniería - UdelaR, Montevideo Departamento de Montevideo, Uruguay',
        place_id: 'f',
        types: ['establishment'],
      },
      {
        description: 'Pocitos, Montevideo Departamento de Montevideo, Uruguay',
        place_id: 'p',
        types: ['neighborhood', 'geocode'],
      },
      { description: 'bad', types: ['route'] },
    ])
    expect(points.map(p => p.placeId)).toEqual(['a', 'f', 'p'])
    expect(streets).toEqual([
      { label: 'Avenida 18 de Julio, Montevideo', query: 'Avenida 18 de Julio, Montevideo' },
    ])
  })
})

describe('lookup through the Google proxy', () => {
  it('autocompletes with points located by place_id and street refinements', async () => {
    const { fetchJson, calls } = fakeGoogle({
      '/placeAutocomplete': () =>
        ok('predictions', [
          {
            description:
              'Facultad de Ingeniería - UdelaR, Montevideo Departamento de Montevideo, Uruguay',
            place_id: 'f',
            types: ['establishment'],
          },
          {
            description:
              'Avenida Julio Herrera y Reissig, Montevideo Departamento de Montevideo, Uruguay',
            place_id: 'r',
            types: ['route'],
          },
        ]),
      '/geocode': p =>
        ok(
          'results',
          p.place_id === 'f' ? [place(-34.91827, -56.16627, 'Av. Julio Herrera y Reissig 565')] : []
        ),
    })
    const out = await createRentalGeocoder(fetchJson)(
      { q: 'Facultad de Ing', autocomplete: '1' },
      'c'
    )
    expect(calls[0]).toMatchObject({
      path: '/placeAutocomplete',
      params: { input: 'Facultad de Ing', components: 'country:uy', language: 'es' },
    })
    expect(calls[1]).toMatchObject({ path: '/geocode', params: { place_id: 'f' } })
    expect(out).toEqual({
      source: 'Google Maps',
      items: [
        { label: 'Facultad de Ingeniería - UdelaR, Montevideo', lat: -34.91827, lng: -56.16627 },
      ],
      refinements: [
        {
          label: 'Avenida Julio Herrera y Reissig, Montevideo',
          query: 'Avenida Julio Herrera y Reissig, Montevideo',
        },
      ],
    })
  })

  it('geocodes a full address Google does not predict', async () => {
    const { fetchJson, calls } = fakeGoogle({
      '/placeAutocomplete': () => ({ status: 'ZERO_RESULTS', predictions: [] }),
      '/geocode': () =>
        ok('results', [
          place(
            -34.9068,
            -56.2023,
            'Rincón 500, 11000 Montevideo, Departamento de Montevideo, Uruguay'
          ),
        ]),
    })
    const out = await createRentalGeocoder(fetchJson)({ q: 'Rincón 500', autocomplete: '1' }, 'c')
    expect(calls.map(c => c.path)).toEqual(['/placeAutocomplete', '/geocode'])
    expect(out.items).toEqual([{ label: 'Rincón 500, Montevideo', lat: -34.9068, lng: -56.2023 }])
  })

  it('submitted text: geocoding first, place search for names, nothing outside Uruguay', async () => {
    const { fetchJson, calls } = fakeGoogle({
      '/geocode': () => ({ status: 'ZERO_RESULTS', results: [] }),
      '/textSearch': () =>
        ok('results', [
          place(-34.903, -56.136, 'Av. Luis Alberto de Herrera 1290, Montevideo', {
            name: 'Montevideo Shopping',
          }),
          place(40.42, -3.7, 'Madrid, España', { name: 'Otro' }),
        ]),
    })
    const out = await createRentalGeocoder(fetchJson)({ q: 'Montevideo Shopping' }, 'c')
    expect(calls.map(c => c.path)).toEqual(['/geocode', '/textSearch'])
    expect(out.items).toEqual([
      {
        label: 'Montevideo Shopping, Av. Luis Alberto de Herrera 1290, Montevideo',
        lat: -34.903,
        lng: -56.136,
      },
    ])
  })

  it('tolerates one failed place lookup but not all of them', async () => {
    const two = ok('predictions', [
      { description: 'A 1, Montevideo', place_id: 'a', types: ['street_address'] },
      { description: 'B 2, Montevideo', place_id: 'b', types: ['street_address'] },
    ])
    const partial = fakeGoogle({
      '/placeAutocomplete': () => two,
      '/geocode': p =>
        p.place_id === 'a' ? new Error('down') : ok('results', [place(-34.9, -56.18, 'B 2')]),
    })
    const out = await createRentalGeocoder(partial.fetchJson)(
      { q: 'calle x', autocomplete: '1' },
      'c'
    )
    expect(out.items.map(i => i.label)).toEqual(['B 2, Montevideo'])
    const report = vi.fn()
    const down = fakeGoogle({
      '/placeAutocomplete': () => two,
      '/geocode': () => new Error('PRIVATE_ADDRESS'),
    })
    await expect(
      createRentalGeocoder(
        down.fetchJson,
        Date.now,
        report
      )({ q: 'calle x', autocomplete: '1' }, 'c')
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(report.mock.calls[0]![0]).toMatchObject({ stage: 'details', failure: 'internal' })
  })
})

describe('bounds, cache and failures', () => {
  const empty = () =>
    fakeGoogle({
      '/geocode': () => ({ status: 'ZERO_RESULTS', results: [] }),
      '/textSearch': () => ({ status: 'ZERO_RESULTS', results: [] }),
    })

  it('limits per-client and global traffic, then permits the next time window', async () => {
    let clock = 1000
    const { fetchJson } = empty()
    const lookup = createRentalGeocoder(fetchJson, () => clock)
    for (let i = 0; i < 60; i++) await lookup({ q: 'Dirección 0' }, 'same')
    await expect(lookup({ q: 'Dirección 1' }, 'same')).rejects.toMatchObject({ statusCode: 429 })
    for (let i = 1; i < 120; i++) await lookup({ q: `Dirección ${i}` }, `client-${i}`)
    await expect(lookup({ q: 'Dirección 500' }, 'new')).rejects.toMatchObject({ statusCode: 429 })
    clock += 60_001
    await expect(lookup({ q: 'Dirección 500' }, 'same')).resolves.toEqual({
      items: [],
      source: 'Google Maps',
    })
  })

  it('coalesces identical concurrent searches and bounds unrelated pending work', async () => {
    const holds: Array<() => void> = []
    const fetchJson: GeocoderFetch = () =>
      new Promise(done => holds.push(() => done({ status: 'ZERO_RESULTS', results: [] })))
    const lookup = createRentalGeocoder(fetchJson)
    const a = lookup({ q: 'Hocquart 1234' }, 'a')
    const b = lookup({ q: 'Hocquart 1234' }, 'b')
    expect(holds).toHaveLength(1)
    const others = [1, 2, 3, 4, 5, 6, 7].map(i => lookup({ q: `Dirección ${i}` }, `c${i}`))
    await expect(lookup({ q: 'Dirección 9' }, 'x')).rejects.toMatchObject({ statusCode: 429 })
    while (holds.length) {
      holds.shift()!()
      await Promise.resolve()
      await new Promise(r => setTimeout(r, 0))
    }
    await Promise.all([a, b, ...others].map(p => p.catch(() => undefined)))
  })

  it('expires empty results sooner than successful ones', async () => {
    let clock = 1000
    const { fetchJson, calls } = empty()
    const lookup = createRentalGeocoder(fetchJson, () => clock)
    await lookup({ q: 'Nada 123' }, 'c')
    await lookup({ q: 'Nada 123' }, 'c')
    expect(calls).toHaveLength(2)
    clock += 60_001
    await lookup({ q: 'Nada 123' }, 'c')
    expect(calls).toHaveLength(4)
  })

  it('treats a refused answer as unavailable, never as no match, and reports no address', async () => {
    const report = vi.fn()
    const { fetchJson } = fakeGoogle({
      '/geocode': () => ({ status: 'REQUEST_DENIED', error_message: 'PRIVATE_KEY' }),
    })
    await expect(
      createRentalGeocoder(fetchJson, () => 5, report)({ q: 'Hocquart 1234' }, 'PRIVATE_CLIENT')
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(report).toHaveBeenCalledWith({
      stage: 'query',
      failure: 'invalid_response',
      elapsedMs: 0,
    })
    expect(JSON.stringify(report.mock.calls)).not.toMatch(/PRIVATE_|Hocquart|https?:/)
    await expect(createRentalGeocoder(fetchJson)({ q: [] }, 'c')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('calls the proxy with GET query parameters and classifies HTTP failures', async () => {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ status: 'OK', results: [] }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetch)
    await fetchGoogle('/geocode', { address: 'Rincón 500' })
    expect(String(fetch.mock.calls[0]![0])).toBe(`${GEOCODER_URL}/geocode?address=Rinc%C3%B3n+500`)
    fetch.mockResolvedValueOnce(new Response('PRIVATE_BODY', { status: 502 }))
    await expect(fetchGoogle('/geocode', { address: 'x' })).rejects.toMatchObject({
      failure: 'upstream_http',
      httpStatus: 502,
    })
  })
})
