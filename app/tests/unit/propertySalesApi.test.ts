import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const data = vi.hoisted(() => ({ meta: null as any, calls: [] as any[], headers: [] as any[] }))
vi.mock('../../server/models/PropertySaleCatalog', () => ({
  PropertySaleCatalogModel: {
    aggregate: (pipeline: any[]) => {
      const call = { pipeline, collation: null as any, options: null as any }
      data.calls.push(call)
      const result = Promise.resolve([]) as any
      result.collation = (value: any) => {
        call.collation = value
        return result
      }
      result.option = (value: any) => {
        call.options = value
        return result
      }
      return result
    },
  },
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
vi.mock('../../server/utils/propertySales', () => ({
  loadPropertySalesMeta: () => Promise.resolve(data.meta),
  loadPropertySalesCoverage: () =>
    Promise.resolve({ listings: 0, sources: [], computedAt: '2026-09-06' }),
}))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getQuery', (event: any) => event.query || {})
vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) =>
  data.headers.push([name, value])
)
vi.stubGlobal('createError', (options: Record<string, unknown>) =>
  Object.assign(new Error(String(options.statusMessage)), options)
)
const list = (await import('../../server/api/property-sales/index.get')).default
const map = (await import('../../server/api/property-sales/mapa.get')).default

beforeEach(() => {
  data.meta = null
  data.calls = []
  data.headers = []
})
afterAll(() => {
  vi.unstubAllGlobals()
})
describe('sale API availability and bounded queries', () => {
  it.each([
    ['list', list],
    ['map', map],
  ] as const)(
    'returns 503 from %s while the catalogue has not been published',
    async (_name, handler) => {
      const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
      await expect(handler({ query: {} } as any)).rejects.toMatchObject({
        statusCode: 503,
        statusMessage: 'Property sales catalogue is being prepared',
      })
      expect(data.calls).toHaveLength(0)
      expect(data.headers).toContainEqual(['cache-control', 'no-store'])
      quiet.mockRestore()
    }
  )
  it.each([
    ['list', list],
    ['map', map],
  ] as const)(
    'distinguishes a valid empty %s and caps all database work',
    async (_name, handler) => {
      data.meta = { usdUyu: 40, total: 0, sources: [] }
      const result = await handler({
        query: { department: 'montevideo', q: 'terraza norte' },
      } as any)
      expect(result.total).toBe(0)
      expect(data.calls.length).toBeGreaterThan(0)
      for (const call of data.calls) {
        expect(call.options).toEqual({ maxTimeMS: 10000 })
        expect(call.collation).toEqual({ locale: 'es', strength: 1 })
        expect(call.pipeline[0].$match.operation).toBe('sale')
        expect(call.pipeline[0].$match.lastSeen.$gte).toBeTruthy()
      }
      expect(data.headers).toContainEqual(['cache-control', 'public, max-age=60, s-maxage=120'])
    }
  )
  it('groups only adverts without published coordinates into zone markers', async () => {
    data.meta = { usdUyu: 40, total: 0, sources: [] }
    await map({ query: {} } as any)
    const zones = data.calls.find(call =>
      call.pipeline.some((stage: any) => stage.$group?._id?.neighborhood)
    )
    const zoneMatch = zones.pipeline.find((stage: any) => stage.$match?.$nor)?.$match
    expect(zoneMatch.department).toBe('Montevideo')
    expect(zoneMatch.$nor[0]).toHaveProperty('geo.lat')
    expect(zoneMatch.$nor[0]).toHaveProperty('geo.lng')
    expect(zoneMatch.$nor[0]).toHaveProperty('geo.precision')
  })
})
