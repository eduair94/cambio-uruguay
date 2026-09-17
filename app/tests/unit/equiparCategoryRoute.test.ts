import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { connectDb, findOneMock, leanOneMock, findMock, leanMock, headers } = vi.hoisted(() => {
  const leanOneMock = vi.fn()
  const findOneMock = vi.fn(() => ({ select: () => ({ lean: leanOneMock }) }))
  const leanMock = vi.fn()
  const findMock = vi.fn(() => ({ select: () => ({ lean: leanMock }) }))
  return {
    connectDb: vi.fn(),
    findOneMock,
    leanOneMock,
    findMock,
    leanMock,
    headers: [] as unknown[][],
  }
})

vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/models/EquiparMeta', () => ({ EquiparMetaModel: { findOne: findOneMock } }))
vi.mock('../../server/models/EquiparItem', () => ({ EquiparItemModel: { find: findMock } }))

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', (event: any, key: string) => event[key])
vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) =>
  headers.push([name, value])
)
vi.stubGlobal('createError', (options: Record<string, unknown>) =>
  Object.assign(new Error(String(options.statusMessage)), options)
)

const handler = (await import('../../server/api/equipar/[categoria].get')).default

beforeEach(() => {
  connectDb.mockReset()
  findOneMock.mockClear()
  leanOneMock.mockReset()
  findMock.mockClear()
  leanMock.mockReset()
  headers.length = 0
})

afterAll(() => vi.unstubAllGlobals())

describe('GET /api/equipar/[categoria]', () => {
  it('rejects an unknown category with a 404 and never touches the database', async () => {
    await expect(handler({ categoria: 'no-existe' } as any)).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(connectDb).not.toHaveBeenCalled()
    expect(findOneMock).not.toHaveBeenCalled()
    expect(findMock).not.toHaveBeenCalled()
  })

  it('resolves the 200 shape for a known category with no fresh rows', async () => {
    connectDb.mockResolvedValue(undefined)
    leanOneMock.mockResolvedValue({
      generatedAt: '2026-09-10T00:00:00.000Z',
      usdUyu: 40,
      runs: [
        {
          key: 'ml',
          label: 'Mercado Libre',
          adapter: 'mercadolibre',
          listings: 10,
          ok: true,
          note: 'nota interna',
        },
      ],
    })
    leanMock.mockResolvedValue([])

    const result = await handler({ categoria: 'heladera' } as any)

    // `note` and `key` never leave the endpoint, only `label`/`ok`/`listings`.
    expect(result).toEqual({
      category: 'heladera',
      generatedAt: '2026-09-10T00:00:00.000Z',
      usdUyu: 40,
      sources: [{ label: 'Mercado Libre', ok: true, listings: 10 }],
      items: [],
    })
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'heladera', lastSeen: expect.anything() })
    )
    expect(headers).toContainEqual([
      'cache-control',
      'public, max-age=900, s-maxage=900, stale-while-revalidate=86400',
    ])
  })

  it('resolves the empty shape, without throwing, when the database call fails', async () => {
    connectDb.mockRejectedValue(new Error('mongo down'))

    const result = await handler({ categoria: 'heladera' } as any)

    expect(result).toEqual({
      category: 'heladera',
      generatedAt: null,
      usdUyu: null,
      sources: [],
      items: [],
    })
  })
})
