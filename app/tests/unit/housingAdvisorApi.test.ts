import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ load: vi.fn(), query: vi.fn(), header: vi.fn() }))
vi.mock('h3', async importOriginal => ({
  ...(await importOriginal<typeof import('h3')>()),
  getQuery: mocks.query,
  setResponseHeader: mocks.header,
}))
vi.mock('../../server/utils/housingAdvisor', () => ({ loadHousingAdvisorData: mocks.load }))
const handler = (await import('../../server/api/housing/advisor.get')).default

describe('GET /api/housing/advisor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.load.mockResolvedValue({ generatedAt: null, usdUyu: 0, zones: [], power: null })
  })

  it('sin dólar, alquilar responde: no lo necesita', async () => {
    mocks.query.mockReturnValue({ operacion: 'alquilar', ingreso: '100000' })
    await expect(handler({} as never)).resolves.toMatchObject({ usdUyu: 0, results: [] })
  })

  it.each(['comprar', 'comparar'])('sin dólar, %s dice que no está disponible', async operacion => {
    mocks.query.mockReturnValue({ operacion })
    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 503 })
    expect(mocks.header).toHaveBeenLastCalledWith({}, 'cache-control', 'no-store')
  })
})
