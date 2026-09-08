import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRentalGeocoder, RentalGeocodeError } from '../../server/utils/rentalGeocode'

const query = { q: 'Hocquart esquina Democracia', department: 'Montevideo' }
const crossing = {
  type: 'ESQUINA',
  address: 'HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO',
  lat: -34.88974,
  lng: -56.17683,
  state: 1,
  stateMsg: '',
}
const coded = (code: unknown) => Object.assign(new Error('PRIVATE_ADDRESS'), { code })
const wrapped = (code: unknown) => new TypeError('PRIVATE_URL', { cause: coded(code) })
const success = () => new Response(JSON.stringify([crossing]))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('bounded recovery of explicit transient IDE network failures', () => {
  it.each(['ECONNRESET', 'EAI_AGAIN', 'ETIMEDOUT', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT'])(
    'recovers from %s once using the original deadline',
    async code => {
      const timeout = vi.spyOn(AbortSignal, 'timeout')
      const fetch = vi.fn().mockRejectedValueOnce(wrapped(code)).mockResolvedValueOnce(success())
      const report = vi.fn()
      vi.stubGlobal('fetch', fetch)
      expect(
        (await createRentalGeocoder(undefined, Date.now, report)(query, 'PRIVATE_CLIENT')).items
      ).toHaveLength(1)
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch.mock.calls[0]![0]).toEqual(fetch.mock.calls[1]![0])
      expect(fetch.mock.calls[0]![1].signal).toBe(fetch.mock.calls[1]![1].signal)
      expect(timeout.mock.calls).toEqual([[8000]])
      expect(report).not.toHaveBeenCalled()
    }
  )

  it('stops after a second socket failure and reports only allowlisted nested codes', async () => {
    const error = new TypeError('PRIVATE_URL', {
      cause: new AggregateError([coded('ECONNRESET'), coded('ETIMEDOUT')], 'PRIVATE_HOST'),
    })
    const fetch = vi.fn().mockRejectedValue(error)
    const report = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(
      createRentalGeocoder(undefined, () => 0, report)(query, 'PRIVATE_CLIENT')
    ).rejects.toMatchObject({ statusCode: 503, message: 'Address search temporarily unavailable' })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(report.mock.calls).toEqual([
      [
        {
          stage: 'query',
          failure: 'network',
          elapsedMs: 0,
          networkCodes: ['ECONNRESET', 'ETIMEDOUT'],
        },
      ],
    ])
    expect(JSON.stringify(report.mock.calls)).not.toMatch(/PRIVATE_|Hocquart|Democracia|https?:/)
  })

  it.each([
    { error: new TypeError('PRIVATE_REDIRECT'), codes: [] },
    { error: wrapped('PRIVATE_CODE'), codes: [] },
    { error: wrapped('ERR_TLS_CERT_ALTNAME_INVALID'), codes: ['ERR_TLS_CERT_ALTNAME_INVALID'] },
    { error: wrapped('CERT_HAS_EXPIRED'), codes: ['CERT_HAS_EXPIRED'] },
    { error: wrapped('ENOTFOUND'), codes: ['ENOTFOUND'] },
    {
      error: new AggregateError([coded('ECONNRESET'), coded('CERT_HAS_EXPIRED')], 'PRIVATE_HOST'),
      codes: ['ECONNRESET', 'CERT_HAS_EXPIRED'],
    },
    {
      error: new AggregateError([coded('ECONNRESET'), coded('PRIVATE_CODE')], 'PRIVATE_HOST'),
      codes: ['ECONNRESET'],
    },
  ])('never retries an unknown, mixed, permanent or TLS failure %#', async ({ error, codes }) => {
    const fetch = vi.fn().mockRejectedValue(error)
    const report = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(
      createRentalGeocoder(undefined, () => 0, report)(query, 'PRIVATE_CLIENT')
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(report.mock.calls).toEqual([
      [
        {
          stage: 'query',
          failure: 'network',
          elapsedMs: 0,
          ...(codes.length ? { networkCodes: codes } : {}),
        },
      ],
    ])
    expect(JSON.stringify(report.mock.calls)).not.toContain('PRIVATE_')
  })

  it.each([403, 429, 500, 503])('never retries an HTTP %i response', async status => {
    const fetch = vi.fn().mockResolvedValue(new Response('PRIVATE_BODY', { status }))
    const report = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(
      createRentalGeocoder(undefined, () => 0, report)(query, 'PRIVATE_CLIENT')
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(report.mock.calls).toEqual([
      [
        {
          stage: 'query',
          failure: 'upstream_http',
          elapsedMs: 0,
          httpStatus: status,
        },
      ],
    ])
  })

  it('discards a partially received body before recovering from its socket failure', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('[{"PRIVATE_PARTIAL":'))
      },
      pull(controller) {
        controller.error(wrapped('ECONNRESET'))
      },
    })
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(stream))
      .mockResolvedValueOnce(success())
    vi.stubGlobal('fetch', fetch)
    const response = await createRentalGeocoder()(query, 'client')
    expect(response.items).toHaveLength(1)
    expect(JSON.stringify(response)).not.toContain('PRIVATE_')
    expect(stream.locked).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not reset the eight-second budget when the retried connection hangs', async () => {
    const controller = new AbortController()
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
    let began!: () => void
    const retryBegan = new Promise<void>(resolve => {
      began = resolve
    })
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(wrapped('ECONNRESET'))
      .mockImplementationOnce(
        (_url: URL, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            began()
            options.signal!.addEventListener('abort', () => reject(options.signal!.reason), {
              once: true,
            })
          })
      )
    const report = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const pending = createRentalGeocoder(undefined, () => 0, report)(query, 'client')
    await retryBegan
    controller.abort(new DOMException('PRIVATE_TIMEOUT', 'TimeoutError'))
    await expect(pending).rejects.toMatchObject({ statusCode: 503 })
    expect(timeout.mock.calls).toEqual([[8000]])
    expect(fetch.mock.calls[0]![1].signal).toBe(fetch.mock.calls[1]![1].signal)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(report.mock.calls).toEqual([[{ stage: 'query', failure: 'timeout', elapsedMs: 0 }]])
  })

  it('revalidates diagnostic codes and never retains injected metadata', async () => {
    const error = new RentalGeocodeError(503, 'network')
    Object.assign(error, {
      networkCodes: ['ECONNRESET', 'PRIVATE_ADDRESS', 'ECONNRESET', { secret: 1 }],
    })
    const report = vi.fn()
    await expect(
      createRentalGeocoder(vi.fn().mockRejectedValue(error), () => 0, report)(query, 'client')
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(report.mock.calls).toEqual([
      [
        {
          stage: 'query',
          failure: 'network',
          elapsedMs: 0,
          networkCodes: ['ECONNRESET'],
        },
      ],
    ])
  })
})
