// GET /api/price-events. El caso que este archivo protege sobre todo es el de `days`: los totales
// tienen que salir de `dropsCount`/`inflatedCount` de cada documento `day:`, nunca del tamaño de
// `topDrops` (recortado a 200 en `classes/priceevents/aggregate.ts` — ver AGENTS.md, "NUNCA
// topDrops.length"). El resto sigue el mismo patrón de mock que `equiparCategoryRoute.test.ts`.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  connectDb,
  findOneMock,
  leanOneMock,
  findMock,
  selectFindMock,
  sortMock,
  limitMock,
  leanMock,
  headers,
} = vi.hoisted(() => {
  const leanOneMock = vi.fn()
  const findOneMock = vi.fn(() => ({ select: () => ({ lean: leanOneMock }) }))
  const leanMock = vi.fn()
  const limitMock = vi.fn(() => ({ lean: leanMock }))
  const sortMock = vi.fn(() => ({ limit: limitMock }))
  const selectFindMock = vi.fn(() => ({ sort: sortMock }))
  const findMock = vi.fn(() => ({ select: selectFindMock }))
  return {
    connectDb: vi.fn(),
    findOneMock,
    leanOneMock,
    findMock,
    selectFindMock,
    sortMock,
    limitMock,
    leanMock,
    headers: [] as unknown[][],
  }
})

vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/models/PriceEventSnapshot', () => ({
  PriceEventSnapshotModel: { findOne: findOneMock, find: findMock },
}))

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) =>
  headers.push([name, value])
)

const handler = (await import('../../server/api/price-events.get')).default

beforeEach(() => {
  connectDb.mockReset()
  findOneMock.mockClear()
  leanOneMock.mockReset()
  findMock.mockClear()
  selectFindMock.mockClear()
  sortMock.mockClear()
  limitMock.mockClear()
  leanMock.mockReset()
  headers.length = 0
})

afterAll(() => vi.unstubAllGlobals())

describe('GET /api/price-events', () => {
  it('sets a 600s cache header', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue(null)
    leanMock.mockResolvedValue([])

    await handler({} as any)

    expect(headers).toContainEqual([
      'cache-control',
      'public, max-age=600, s-maxage=600, stale-while-revalidate=86400',
    ])
  })

  it('resolves current: null and days: [] with no snapshot, without throwing', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue(null)
    leanMock.mockResolvedValue([])

    const result = await handler({} as any)

    expect(result.current).toBeNull()
    expect(result.days).toEqual([])
  })

  // M7 (final review): the page never reads `events` — it always paints the calendar from the static
  // mirror `PRICE_EVENT_CALENDAR` (`app/utils/priceEvents.ts`), independent of the database. Serving
  // it here too was ~40 KB per visit nobody read; the route (and `PriceEventApiResponse`) dropped it.
  it('never serves an `events` field — the calendar comes from the static mirror, not this route', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue(null)
    leanMock.mockResolvedValue([])

    const result = await handler({} as any)

    expect(result).not.toHaveProperty('events')
  })

  it('takes days.drops/inflated from dropsCount/inflatedCount, never from topDrops.length', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue(null)
    // Ningún documento de día trae `topDrops` (ese campo sólo vive en `current`): si la ruta leyera
    // `topDrops.length` para armar `days`, esto rompería con un TypeError o daría 0 siempre.
    leanMock.mockResolvedValue([
      { day: '2026-09-15', eligible: 40, dropsCount: 5, inflatedCount: 2 },
    ])

    const result = await handler({} as any)

    expect(result.days).toEqual([{ day: '2026-09-15', eligible: 40, drops: 5, inflated: 2 }])
  })

  it('reverses the descending Mongo order back to ascending', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue(null)
    leanMock.mockResolvedValue([
      { day: '2026-09-16', eligible: 10, dropsCount: 1, inflatedCount: 0 },
      { day: '2026-09-15', eligible: 8, dropsCount: 0, inflatedCount: 1 },
    ])

    const result = await handler({} as any)

    expect(result.days.map((d: any) => d.day)).toEqual(['2026-09-15', '2026-09-16'])
  })

  it('limits the day query to the last 30 documents', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue(null)
    leanMock.mockResolvedValue([])

    await handler({} as any)

    expect(sortMock).toHaveBeenCalledWith({ day: -1 })
    expect(limitMock).toHaveBeenCalledWith(30)
  })

  it('trims current.topDrops to 50 without touching dropsCount/inflatedCount', async () => {
    connectDb.mockResolvedValue(undefined)
    const topDrops = Array.from({ length: 80 }, (_, i) => ({ listingId: `l-${i}` }))
    leanOneMock.mockResolvedValue({
      day: '2026-09-16',
      trackingSince: '2026-09-01',
      dropsCount: 80,
      inflatedCount: 3,
      topDrops,
    })
    leanMock.mockResolvedValue([])

    const result = await handler({} as any)

    expect(result.current.topDrops).toHaveLength(50)
    expect(result.current.topDrops[0]).toEqual({ listingId: 'l-0' })
    expect(result.current.dropsCount).toBe(80)
    expect(result.current.inflatedCount).toBe(3)
  })

  it('defaults topDrops to an empty array when the snapshot has none', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue({ day: '2026-09-16', dropsCount: 0, inflatedCount: 0 })
    leanMock.mockResolvedValue([])

    const result = await handler({} as any)

    expect(result.current.topDrops).toEqual([])
  })

  it('resolves the empty shape, without throwing, when connectDb rejects', async () => {
    connectDb.mockRejectedValue(new Error('mongo down'))

    const result = await handler({} as any)

    expect(result.current).toBeNull()
    expect(result.days).toEqual([])
    expect(result).not.toHaveProperty('events')
  })

  it('resolves the empty shape, without throwing, when the day query rejects', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue(null)
    leanMock.mockRejectedValue(new Error('mongo down'))

    const result = await handler({} as any)

    expect(result).toEqual({
      current: null,
      days: [],
    })
  })
})
