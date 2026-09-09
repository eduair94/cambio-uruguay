import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRentalGeocoder } from '../../server/utils/rentalGeocode'

const crossing = {
  type: 'ESQUINA',
  address: 'HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO',
  lat: -34.88974051732336,
  lng: -56.1768286423287,
  state: 1,
  stateMsg: '',
}
const query = { q: 'Hocquart esquina Democracia', department: 'Montevideo' }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('official address HTTP transport with native deadlines', () => {
  it('reads a scoped natural crossing through the two actual response bodies', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { ...crossing, type: 'CALLE', address: 'HOCQUART, MONTEVIDEO', lat: 0, lng: 0 },
          ])
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([crossing])))
    vi.stubGlobal('fetch', fetch)

    const result = await createRentalGeocoder()(
      { q: 'Hocquart y Democracia', department: 'Montevideo' },
      'scoped-response-test'
    )
    expect(result.items).toEqual([{ label: crossing.address, lat: -34.88974, lng: -56.17683 }])
    expect(fetch.mock.calls.map(([url]) => url.searchParams.get('q'))).toEqual([
      'Hocquart y Democracia, Montevideo',
      'Hocquart esquina Democracia, Montevideo',
    ])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('accepts a valid upstream response after six seconds without retrying', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    const fetch = vi.fn((_url: URL, options: RequestInit) => {
      const signal = options.signal!
      return new Promise<Response>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer)
          reject(signal.reason)
        }
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', abort)
          resolve(new Response(JSON.stringify([crossing])))
        }, 6000)
        signal.addEventListener('abort', abort, { once: true })
      })
    })
    vi.stubGlobal('fetch', fetch)

    const result = await createRentalGeocoder()(query, 'slow-response-test')
    expect(result).toEqual({
      items: [{ label: crossing.address, lat: -34.88974, lng: -56.17683 }],
      source: 'IDE Uruguay',
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(timeout).toHaveBeenCalledWith(8000)
    const [url, options] = fetch.mock.calls[0]!
    expect(url.origin + url.pathname).toBe('https://direcciones.ide.uy/api/v1/geocode/candidates')
    expect(url.searchParams.get('q')).toBe('Hocquart esquina Democracia, Montevideo')
    // Quince candidatos: con cinco, el ranking de IDE los llenaba de localidades.
    expect(url.searchParams.get('limit')).toBe('15')
    expect(options.redirect).toBe('error')
    expect(options.signal?.aborted).toBe(false)
  }, 10000)

  it('aborts a hung upstream request after eight seconds and returns unavailable', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    const report = vi.fn()
    const fetch = vi.fn((_url: URL, options: RequestInit) => {
      const signal = options.signal!
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
    })
    vi.stubGlobal('fetch', fetch)

    await expect(
      createRentalGeocoder(undefined, Date.now, report)(query, 'hung-response-test')
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(timeout).toHaveBeenCalledWith(8000)
    expect(fetch).toHaveBeenCalledTimes(1)
    const signal = fetch.mock.calls[0]![1].signal!
    expect(signal.aborted).toBe(true)
    expect(signal.reason.name).toBe('TimeoutError')
    expect(report.mock.calls).toEqual([
      [{ stage: 'query', failure: 'timeout', elapsedMs: expect.any(Number) }],
    ])
  }, 11000)

  it('still rejects responses above 128 KiB without retrying or returning no matches', async () => {
    const oversized = JSON.stringify([{ ...crossing, padding: 'x'.repeat(128 * 1024) }])
    const fetch = vi.fn().mockResolvedValue(new Response(oversized))
    vi.stubGlobal('fetch', fetch)

    await expect(createRentalGeocoder()(query, 'oversized-response-test')).rejects.toMatchObject({
      statusCode: 503,
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
