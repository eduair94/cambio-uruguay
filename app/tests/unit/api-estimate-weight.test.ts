import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const estimateWeightKg = vi.fn()
vi.mock('../../server/utils/weightEstimate', () => ({ estimateWeightKg }))

const { getQuery } = installNitroGlobals()
const handler = (await import('../../server/api/estimate-weight.get')).default

beforeEach(() => {
  getQuery.mockReset()
  estimateWeightKg.mockReset()
})

describe('estimate-weight endpoint', () => {
  it('rejects a missing name', async () => {
    getQuery.mockReturnValueOnce({})
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns the AI weight estimate for a product name', async () => {
    getQuery.mockReturnValueOnce({ name: 'Echo Dot' })
    estimateWeightKg.mockResolvedValueOnce(0.5)
    const res = await handler({} as any)
    expect(estimateWeightKg).toHaveBeenCalledWith('Echo Dot')
    expect(res).toEqual({ weightKg: 0.5 })
  })

  it('returns null weight when the AI cannot estimate', async () => {
    getQuery.mockReturnValueOnce({ name: 'something obscure' })
    estimateWeightKg.mockResolvedValueOnce(null)
    const res = await handler({} as any)
    expect(res).toEqual({ weightKg: null })
  })
})
