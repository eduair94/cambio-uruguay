import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const load = vi.hoisted(() => vi.fn())
vi.mock('../../server/utils/propertyOpportunities', () => ({ loadPropertyOpportunities: load }))
const { getQuery } = installNitroGlobals()
const headers = vi.fn()
vi.stubGlobal('setResponseHeader', headers)
const handler = (await import('../../server/api/property-opportunities.get')).default

describe('property opportunity API availability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getQuery.mockReturnValue({ operation: 'sale' })
  })
  it('uses a failure response rather than presenting an unavailable market as no opportunities', async () => {
    load.mockResolvedValue(null)
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 503 })
    expect(load).toHaveBeenCalledWith('sale')
    expect(headers).toHaveBeenLastCalledWith({}, 'cache-control', 'no-store')
  })
  it('does not publish database exception text', async () => {
    load.mockRejectedValue(new Error('Private database diagnostics'))
    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 503,
      message: 'Property comparison is temporarily unavailable',
    })
  })
  it('serves an honestly empty successful analysis with its evidence counts', async () => {
    const now = new Date().toISOString()
    load.mockResolvedValue({
      version: 1,
      operation: 'sale',
      generatedAt: now,
      sourceReadAt: now,
      usdUyu: 40,
      items: [],
      stats: {
        input: 500,
        eligible: 50,
        analyzed: 12,
        shortlisted: 0,
        qualified: 0,
        excluded: {},
        risks: {},
      },
      coverage: [],
    })
    await expect(handler({} as any)).resolves.toMatchObject({
      operation: 'sale',
      currency: 'USD',
      total: 0,
      stats: { input: 500 },
      items: [],
    })
  })
})
