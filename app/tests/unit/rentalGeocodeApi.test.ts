import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const lookup = vi.hoisted(() => vi.fn())
vi.mock('../../server/utils/rentalGeocode', async importOriginal => {
  const original = await importOriginal<typeof import('../../server/utils/rentalGeocode')>()
  return { ...original, lookupRentalGeocode: lookup }
})
const { getQuery } = installNitroGlobals()
const getRequestIP = vi.fn(() => 'fixture-client')
const setResponseHeader = vi.fn()
vi.stubGlobal('getRequestIP', getRequestIP)
vi.stubGlobal('setResponseHeader', setResponseHeader)
const { RentalGeocodeError } = await import('../../server/utils/rentalGeocode')
const handler = (await import('../../server/api/rentals/geocode.get')).default

describe('rental address endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getQuery.mockReturnValue({ q: 'Hocquart y Democracia', department: 'Montevideo' })
    lookup.mockResolvedValue({ source: 'IDE Uruguay', items: [] })
  })

  it('passes submitted input to the bounded resolver and keeps addresses out of shared caching', async () => {
    await expect(handler({} as any)).resolves.toEqual({ source: 'IDE Uruguay', items: [] })
    expect(lookup).toHaveBeenCalledWith(
      { q: 'Hocquart y Democracia', department: 'Montevideo' },
      'fixture-client'
    )
    expect(setResponseHeader).toHaveBeenCalledWith({}, 'cache-control', 'no-store')
  })

  it.each([400, 429, 503] as const)(
    'preserves an honest %i instead of returning address-not-found',
    async code => {
      lookup.mockRejectedValue(new RentalGeocodeError(code))
      await expect(handler({} as any)).rejects.toMatchObject({ statusCode: code })
      if (code === 429) expect(setResponseHeader).toHaveBeenCalledWith({}, 'retry-after', '60')
    }
  )

  it('does not expose upstream exception details or user address in an unexpected error', async () => {
    lookup.mockRejectedValue(new Error('PRIVATE_UPSTREAM_DIAGNOSTIC'))
    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'Address search temporarily unavailable',
    })
  })
})
