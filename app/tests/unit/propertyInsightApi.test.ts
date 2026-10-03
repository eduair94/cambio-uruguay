import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const loadRentalInsight = vi.fn()
const loadPropertySaleInsight = vi.fn()
vi.mock('../../server/utils/propertyInsight', () => ({
  loadRentalInsight,
  loadPropertySaleInsight,
}))
const { getRouterParam } = installNitroGlobals()
vi.stubGlobal('setResponseHeader', vi.fn())
const handler = (await import('../../server/api/property-insight/[operation]/[key].get')).default

const route = (operation: string, key: string) =>
  getRouterParam.mockImplementation((_event: unknown, name: string) =>
    name === 'operation' ? operation : key
  )

describe('/api/property-insight', () => {
  beforeEach(() => {
    loadRentalInsight.mockReset()
    loadPropertySaleInsight.mockReset()
  })

  it('404s an unknown operation or a malformed key without touching the database', async () => {
    route('compra', 'infocasas-1')
    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 404 })
    route('venta', 'not a key; drop')
    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 404 })
    expect(loadRentalInsight).not.toHaveBeenCalled()
    expect(loadPropertySaleInsight).not.toHaveBeenCalled()
  })

  it('routes each operation to its own loader', async () => {
    loadPropertySaleInsight.mockResolvedValue({ unit: 'USD' })
    route('venta', 'infocasas-123')
    expect(await handler({} as never)).toEqual({ insight: { unit: 'USD' } })
    expect(loadPropertySaleInsight).toHaveBeenCalledWith('infocasas-123')
  })

  it('answers null when there is nothing to compare, and 503 when the read fails', async () => {
    loadPropertySaleInsight.mockResolvedValue(null)
    route('venta', 'infocasas-123')
    expect(await handler({} as never)).toEqual({ insight: null })
    loadPropertySaleInsight.mockRejectedValue(new Error('down'))
    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 503 })
  })
})
