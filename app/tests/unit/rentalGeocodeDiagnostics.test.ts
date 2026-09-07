import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRentalGeocoder, RentalGeocodeError } from '../../server/utils/rentalGeocode'

const scoped = { q: 'Hocquart y Democracia', department: 'Montevideo' }
const bare = { q: 'Hocquart y Democracia' }
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
}
const privateError = () =>
  new Error('PRIVATE_ADDRESS https://private.example/?token=PRIVATE_TOKEN', {
    cause: new Error('PRIVATE_CAUSE'),
  })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('address failure diagnostics without submitted addresses or raw errors', () => {
  it.each(['query', 'fallback', 'street', 'intersection'] as const)(
    'records only the %s stage, failure class and elapsed time',
    async stage => {
      let clock = 100
      const report = vi.fn()
      const fail = async (): Promise<unknown> => {
        clock = 456
        throw privateError()
      }
      const fetch = vi.fn(fail)
      if (stage === 'fallback') fetch.mockResolvedValueOnce([])
      if (stage === 'intersection') fetch.mockResolvedValueOnce([street])
      const input = stage === 'street' || stage === 'intersection' ? bare : scoped
      await expect(
        createRentalGeocoder(fetch, () => clock, report)(input, 'PRIVATE_CLIENT')
      ).rejects.toMatchObject({ statusCode: 503 })
      expect(report.mock.calls).toEqual([[{ stage, failure: 'internal', elapsedMs: 356 }]])
      expect(fetch).toHaveBeenCalledTimes(['fallback', 'intersection'].includes(stage) ? 2 : 1)
      expect(JSON.stringify(report.mock.calls)).not.toMatch(/PRIVATE_|Hocquart|Democracia|https?:/)
    }
  )

  it.each([
    { name: 'network failure', response: () => Promise.reject(privateError()), failure: 'network' },
    {
      name: 'HTTP failure',
      response: () => Promise.resolve(new Response('PRIVATE_BODY', { status: 502 })),
      failure: 'upstream_http',
      httpStatus: 502,
    },
    {
      name: 'invalid JSON',
      response: () => Promise.resolve(new Response('PRIVATE_BODY')),
      failure: 'invalid_response',
    },
    {
      name: 'non-array JSON',
      response: () => Promise.resolve(new Response('{"PRIVATE_ADDRESS":"PRIVATE_TOKEN"}')),
      failure: 'invalid_response',
    },
    {
      name: 'missing response body',
      response: () => Promise.resolve(new Response(null, { status: 204 })),
      failure: 'invalid_response',
    },
    {
      name: 'oversized body',
      response: () => Promise.resolve(new Response('PRIVATE_BODY'.repeat(128 * 1024))),
      failure: 'oversized_response',
    },
  ])('classifies $name at the HTTP boundary without logging its payload', async test => {
    let clock = 10
    const report = vi.fn()
    const fetch = vi.fn(() => {
      clock = 27
      return test.response()
    })
    vi.stubGlobal('fetch', fetch)
    await expect(
      createRentalGeocoder(undefined, () => clock, report)(scoped, 'PRIVATE_CLIENT')
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(report.mock.calls).toEqual([
      [
        {
          stage: 'query',
          failure: test.failure,
          elapsedMs: 17,
          ...(test.httpStatus ? { httpStatus: test.httpStatus } : {}),
        },
      ],
    ])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(report.mock.calls)).not.toMatch(/PRIVATE_|Hocquart|Democracia|https?:/)
  })

  it('logs a safe object by default and rejects unexpected diagnostic values', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = new RentalGeocodeError(503)
    Object.assign(error, { failure: 'PRIVATE_ADDRESS', httpStatus: 'PRIVATE_TOKEN' })
    const fetch = vi.fn().mockRejectedValue(error)
    await expect(
      createRentalGeocoder(fetch, () => 0)(scoped, 'PRIVATE_CLIENT')
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(warn.mock.calls).toEqual([
      ['[rentals.geocode]', { stage: 'query', failure: 'internal', elapsedMs: 0 }],
    ])
  })

  it('keeps the public error opaque even when the diagnostic reporter fails', async () => {
    const fetch = vi.fn().mockRejectedValue(new RentalGeocodeError(503, 'upstream_http', 503))
    const report = vi.fn(() => {
      throw privateError()
    })
    await expect(
      createRentalGeocoder(fetch, () => 0, report)(scoped, 'PRIVATE_CLIENT')
    ).rejects.toMatchObject({ statusCode: 503, message: 'Address search temporarily unavailable' })
    expect(report.mock.calls).toEqual([
      [{ stage: 'query', failure: 'upstream_http', httpStatus: 503, elapsedMs: 0 }],
    ])
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
