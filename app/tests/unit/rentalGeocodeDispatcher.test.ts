import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGlobalDispatcher } from 'undici'

const captured = vi.hoisted(() => ({ options: [] as unknown[], globalSetter: vi.fn() }))
vi.mock('undici', async importOriginal => {
  const original = await importOriginal<typeof import('undici')>()
  return {
    ...original,
    setGlobalDispatcher: captured.globalSetter,
    Agent: class extends original.Agent {
      constructor(options: ConstructorParameters<typeof original.Agent>[0]) {
        super(options)
        captured.options.push(options)
      }
    },
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('IDE-only connection policy', () => {
  it('reuses a bounded IPv4 dispatcher without changing global transport or TLS verification', async () => {
    const global = getGlobalDispatcher()
    const { createRentalGeocoder } = await import('../../server/utils/rentalGeocode')
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('[]')))
    vi.stubGlobal('fetch', fetch)
    const lookup = createRentalGeocoder()
    await lookup({ q: 'Hocquart' }, 'client')
    await lookup({ q: 'Democracia' }, 'client')
    expect(captured.options).toEqual([
      {
        connections: 4,
        pipelining: 1,
        connect: { family: 4 },
        autoSelectFamily: false,
        keepAliveTimeout: 4000,
        keepAliveMaxTimeout: 10000,
      },
    ])
    expect(fetch).toHaveBeenCalledTimes(2)
    const options = fetch.mock.calls.map(call => call[1])
    expect(options[0].dispatcher).toBe(options[1].dispatcher)
    expect(options[0].dispatcher).not.toBe(global)
    for (const [url, options] of fetch.mock.calls) {
      expect(url.origin + url.pathname).toBe('https://direcciones.ide.uy/api/v1/geocode/candidates')
      expect(url.hostname).toBe('direcciones.ide.uy')
      expect(options.redirect).toBe('error')
      expect(options.signal).toBeInstanceOf(AbortSignal)
      expect(options).not.toHaveProperty('rejectUnauthorized')
      expect(options).not.toHaveProperty('lookup')
    }
    expect(getGlobalDispatcher()).toBe(global)
    expect(captured.globalSetter).not.toHaveBeenCalled()
  })
})
