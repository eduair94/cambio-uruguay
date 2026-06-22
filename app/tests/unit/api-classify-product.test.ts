import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const classifyProductCategory = vi.fn()
vi.mock('../../server/utils/productClassify', () => ({ classifyProductCategory }))

const { getQuery } = installNitroGlobals()
const handler = (await import('../../server/api/classify-product.get')).default

beforeEach(() => {
  getQuery.mockReset()
  classifyProductCategory.mockReset()
})

describe('classify-product endpoint', () => {
  it('rejects a missing name', async () => {
    getQuery.mockReturnValueOnce({})
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns the suggested category with deterministic tax/forbidden facts', async () => {
    getQuery.mockReturnValueOnce({ name: 'Whisky single malt', regime: 'courier' })
    classifyProductCategory.mockResolvedValueOnce('alcohol_tabaco')
    const res = await handler({} as any)
    // The catalog (not the AI) decides that alcohol is courier-prohibited.
    expect(res.categoryId).toBe('alcohol_tabaco')
    expect(res.blocked).toBe(true)
    expect(res.reason).toBeTruthy()
  })

  it('returns null category when the AI cannot classify', async () => {
    getQuery.mockReturnValueOnce({ name: 'mysterious gadget' })
    classifyProductCategory.mockResolvedValueOnce(null)
    const res = await handler({} as any)
    expect(res).toEqual({ categoryId: null })
  })

  it('reports a normal category as not blocked', async () => {
    getQuery.mockReturnValueOnce({ name: 'Laptop', regime: 'courier' })
    classifyProductCategory.mockResolvedValueOnce('electronica')
    const res = await handler({} as any)
    expect(res.categoryId).toBe('electronica')
    expect(res.blocked).toBe(false)
  })
})
