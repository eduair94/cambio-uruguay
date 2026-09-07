import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyPropertyNearby } from '../../utils/propertyNearby'
const { resolve, headers } = vi.hoisted(() => ({ resolve: vi.fn(), headers: [] as unknown[][] }))
vi.mock('../../server/utils/propertyNearby', () => ({ resolvePropertyNearby: resolve }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', (event: any, key: string) => event[key])
vi.stubGlobal('getQuery', (event: any) => event.query || {})
vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) =>
  headers.push([name, value])
)
vi.stubGlobal('createError', (options: Record<string, unknown>) =>
  Object.assign(new Error(String(options.statusMessage)), options)
)
const handler = (await import('../../server/api/property-nearby/[operation]/[key].get')).default
beforeEach(() => {
  resolve.mockReset()
  headers.length = 0
})
afterAll(() => vi.unstubAllGlobals())
describe('nearby public endpoint bounds', () => {
  it.each([
    { operation: 'other', key: 'a' },
    { operation: 'sale', key: 'bad' },
    { operation: 'rent', key: '' },
  ])('rejects invalid routes before data access', async event => {
    await expect(handler(event as any)).rejects.toMatchObject({ statusCode: 404 })
    expect(resolve).not.toHaveBeenCalled()
  })
  it('never acts as an arbitrary geolocation or upstream query proxy', async () => {
    await expect(
      handler({ operation: 'rent', key: 'valid', query: { lat: -34.9, lng: -56.16 } } as any)
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(resolve).not.toHaveBeenCalled()
  })
  it('retired property remains unavailable despite stored service data', async () => {
    resolve.mockResolvedValue(null)
    await expect(handler({ operation: 'rent', key: 'retired' } as any)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
  it('missing coordinates remain a meaningful state', async () => {
    resolve.mockResolvedValue(emptyPropertyNearby('rent', 'a', null, 'unlocated'))
    const result = await handler({ operation: 'rent', key: 'a' } as any)
    expect(result.status).toBe('unlocated')
    expect(headers).toContainEqual(['cache-control', 'public, max-age=30, s-maxage=60'])
  })
  it('a DB outage does not become a cached empty neighborhood', async () => {
    resolve.mockRejectedValue(new Error('db unavailable'))
    const result = await handler({ operation: 'rent', key: 'a' } as any)
    expect(result.status).toBe('unavailable')
    expect(result.retryAfterSeconds).toBe(60)
    expect(headers).toContainEqual(['cache-control', 'no-store'])
  })
  it('bounds a stalled initial connection without pretending the area is empty', async () => {
    vi.useFakeTimers()
    try {
      resolve.mockReturnValue(new Promise(() => {}))
      const pending = handler({ operation: 'rent', key: 'a' } as any)
      await vi.advanceTimersByTimeAsync(5001)
      expect((await pending).status).toBe('unavailable')
      expect(headers).toContainEqual(['cache-control', 'no-store'])
    } finally {
      vi.useRealTimers()
    }
  })
})
