import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  zones: vi.fn(),
  boundaries: vi.fn(),
  query: vi.fn(),
  header: vi.fn(),
}))
vi.mock('h3', async importOriginal => ({
  ...(await importOriginal<typeof import('h3')>()),
  getQuery: mocks.query,
  setResponseHeader: mocks.header,
}))
vi.mock('../../server/utils/rentalZones', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/utils/rentalZones')>()),
  loadRentalZones: mocks.zones,
  loadRentalZoneBoundaries: mocks.boundaries,
}))
const { RentalZonesError } = await import('../../server/utils/rentalZones')
const zones = (await import('../../server/api/rentals/zones.get')).default
const boundaries = (await import('../../server/api/rentals/zone-boundaries.get')).default

describe('public rental zone endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.query.mockReturnValue({})
  })
  it('returns projected public zones with bounded shared caching', async () => {
    const body = { version: 1, zones: [] }
    mocks.zones.mockResolvedValue(body)
    expect(await zones({} as any)).toBe(body)
    expect(mocks.header).toHaveBeenLastCalledWith(
      {},
      'cache-control',
      'public, max-age=30, s-maxage=60'
    )
  })
  it('serves boundaries as GeoJSON and does not expose an arbitrary document lookup', async () => {
    mocks.boundaries.mockResolvedValue({ type: 'FeatureCollection', features: [] })
    await boundaries({} as any)
    expect(mocks.boundaries).toHaveBeenCalledWith({})
    expect(mocks.header).toHaveBeenCalledWith({}, 'content-type', 'application/json; charset=utf-8')
  })
  it.each([400, 503] as const)('keeps an honest %i and no-store on errors', async code => {
    mocks.zones.mockRejectedValue(new RentalZonesError(code))
    await expect(zones({} as any)).rejects.toMatchObject({ statusCode: code })
    expect(mocks.header).toHaveBeenLastCalledWith({}, 'cache-control', 'no-store')
  })
  it('does not publish raw error, cause, private query or database text', async () => {
    mocks.boundaries.mockRejectedValue(new Error('PRIVATE_DATABASE_ERROR'))
    const error = await boundaries({} as any).catch(value => value)
    expect(error.statusCode).toBe(503)
    expect(JSON.stringify(error.cause)).not.toContain('PRIVATE_')
    expect(error.message).not.toContain('PRIVATE_')
    expect(error.statusMessage).toBe('Zone boundaries temporarily unavailable')
  })
})
