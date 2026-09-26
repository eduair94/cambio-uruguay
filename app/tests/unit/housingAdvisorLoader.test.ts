import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// El loader junta tres agregados de la base. Lo que se prueba acá es cómo se porta cuando una
// parte falla: cuánto guarda, cuándo reintenta y qué sirve mientras tanto.
const mocks = vi.hoisted(() => ({
  zones: vi.fn(),
  scores: vi.fn(),
  meta: vi.fn(),
  index: vi.fn(),
  series: vi.fn(),
}))
const chain = (result: () => unknown) => {
  const query = {
    select: () => query,
    maxTimeMS: () => query,
    lean: () => Promise.resolve().then(result),
  }
  return query
}
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn(async () => undefined) }))
vi.mock('../../server/models/MarketSeries', () => ({
  MarketSeriesMetaModel: { findOne: () => chain(mocks.index) },
  MarketSeriesModel: { find: () => chain(mocks.series) },
}))
vi.mock('../../server/utils/rentalZones', () => ({ loadRentalZones: mocks.zones }))
vi.mock('../../server/utils/rentalZoneServices', () => ({ loadRentalZoneScores: mocks.scores }))
vi.mock('../../server/utils/propertySales', () => ({ loadPropertySalesMeta: mocks.meta }))

type Loader = typeof import('../../server/utils/housingAdvisor').loadHousingAdvisorData
let load: Loader
const run = () => load('Montevideo', 'apartamento', 2)
const later = (ms: number) => vi.setSystemTime(Date.now() + ms)

describe('loadHousingAdvisorData', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-26T12:00:00Z'))
    mocks.zones.mockResolvedValue({ generatedAt: '2026-09-26T06:00:00Z', zones: [] })
    mocks.scores.mockResolvedValue({
      zones: {},
      resolver: { ine: {}, aliases: {}, localities: {} },
      periods: { power: null },
    })
    mocks.meta.mockResolvedValue({ usdUyu: 40 })
    mocks.index.mockReturnValue({ day: '2026-09-26', scopes: [] })
    mocks.series.mockReturnValue([])
    load = (await import('../../server/utils/housingAdvisor')).loadHousingAdvisorData
  })
  afterEach(() => vi.useRealTimers())

  it('lo bueno se guarda 10 minutos', async () => {
    await run()
    later(5 * 60_000)
    await run()
    expect(mocks.zones).toHaveBeenCalledTimes(1)
  })

  it('si los datos de barrio fallan, sirve sin ellos pero reintenta al minuto', async () => {
    mocks.scores.mockRejectedValueOnce(new Error('scores down'))
    await run()
    later(30_000)
    await run()
    expect(mocks.zones).toHaveBeenCalledTimes(1)
    later(31_000)
    await run()
    expect(mocks.zones).toHaveBeenCalledTimes(2)
  })

  it('sin el dólar de ventas no se cae: devuelve 0 y reintenta al minuto', async () => {
    mocks.meta.mockResolvedValueOnce(null)
    expect((await run()).usdUyu).toBe(0)
    later(61_000)
    expect((await run()).usdUyu).toBe(40)
    expect(mocks.zones).toHaveBeenCalledTimes(2)
  })

  it('una caída sin nada guardado falla rápido durante 30 segundos', async () => {
    mocks.zones.mockRejectedValueOnce(new Error('mongo down'))
    await expect(run()).rejects.toThrow('mongo down')
    await expect(run()).rejects.toThrow('mongo down')
    expect(mocks.zones).toHaveBeenCalledTimes(1)
    later(31_000)
    await expect(run()).resolves.toMatchObject({ usdUyu: 40 })
    expect(mocks.zones).toHaveBeenCalledTimes(2)
  })

  it('una caída con algo guardado sirve lo último bueno y no reintenta en cada pedido', async () => {
    const first = await run()
    later(11 * 60_000)
    mocks.zones.mockRejectedValueOnce(new Error('mongo down'))
    expect(await run()).toBe(first)
    expect(await run()).toBe(first)
    expect(mocks.zones).toHaveBeenCalledTimes(2)
  })
})
