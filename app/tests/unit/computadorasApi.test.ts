// Las tres rutas de computadoras sin base de datos: lo que se verifica acá es CÓMO responden cuando
// el job todavía no publicó nada, cuando Mongo no contesta, y que cada faceta se cuente sin su
// propio filtro y quede en su lugar. Ahí es donde estas rutas se diferencian de un CRUD, y donde un
// error no se nota hasta que la página queda en blanco en producción.
//
// La cadena de mongoose se reduce a los eslabones que las rutas llaman, como `motosApi.test.ts`.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const connectDb = vi.fn()
const catalogFindLean = vi.fn()
const catalogFindOneLean = vi.fn()
const catalogCount = vi.fn()
const metaFindOneLean = vi.fn()
const partFindLean = vi.fn()
const aggregateResult = vi.fn()
const catalogFindFilters: unknown[] = []
const partFindFilters: unknown[] = []
const countFilters: unknown[] = []

const chain = (lean: () => unknown) => {
  const query: Record<string, unknown> = {}
  for (const link of ['select', 'sort', 'skip', 'limit', 'maxTimeMS']) query[link] = () => query
  query.lean = () => {
    try {
      return Promise.resolve(lean())
    } catch (error) {
      return Promise.reject(error)
    }
  }
  return query
}

vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/models/ComputerCatalog', () => ({
  ComputerCatalogModel: {
    find: (filter: unknown) => {
      catalogFindFilters.push(filter)
      return chain(catalogFindLean)
    },
    findOne: () => chain(catalogFindOneLean),
    countDocuments: (filter: unknown) => {
      countFilters.push(filter)
      return { maxTimeMS: () => Promise.resolve(catalogCount(filter)) }
    },
    aggregate: (pipeline: unknown[]) => ({
      option: () => Promise.resolve(aggregateResult(pipeline)),
    }),
  },
}))
vi.mock('../../server/models/ComputerMeta', () => ({
  ComputerMetaModel: { findOne: () => chain(metaFindOneLean) },
}))
vi.mock('../../server/models/ComputerPart', () => ({
  ComputerPartModel: {
    find: (filter: unknown) => {
      partFindFilters.push(filter)
      return chain(partFindLean)
    },
  },
}))

const { getQuery, getRouterParam } = installNitroGlobals()
const headers: Array<[string, string]> = []
vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) => {
  headers.push([name, value])
})

const listHandler = async () => (await import('../../server/api/computadoras/index.get')).default
const avisoHandler = async () =>
  (await import('../../server/api/computadoras/aviso/[slug].get')).default
const componentsHandler = async () =>
  (await import('../../server/api/computadoras/componentes.get')).default

const META_DOC = {
  key: 'uy-computadoras',
  generatedAt: '2026-11-23T17:30:00.000Z',
  meta: {
    generatedAt: '2026-11-23T17:30:00.000Z',
    freshDays: 3,
    usdUyu: 40,
    counts: {
      total: 300,
      computers: 250,
      parts: 50,
      facebook: 200,
      mercadolibre: 100,
      withValuation: 120,
      withNewTotal: 60,
      withUsedTotal: 40,
      detailRead: 90,
    },
    sources: [],
    partsPriced: 80,
    presets: [
      {
        id: 'oficina',
        label: 'PC de oficina',
        description: 'x',
        parts: [],
        totalUsd: null,
        missing: ['Mother'],
      },
    ],
  },
}

const LISTING = {
  slug: 'fb-1234567890',
  kind: 'desktop',
  kindGroup: 'computer',
  cpuFamily: 'core-i5',
  priceUsd: 500,
  cpu: { slug: 'cpu:i5-12400f' },
  gpuSlug: 'gpu:rtx-3060',
  valuation: {
    parts: [
      { slug: 'cpu:i5-12400f' },
      { slug: 'gpu:rtx-3060' },
      { slug: null },
      { slug: 'case:basico' },
    ],
  },
}

beforeEach(() => {
  headers.length = 0
  catalogFindFilters.length = 0
  partFindFilters.length = 0
  countFilters.length = 0
  connectDb.mockReset().mockResolvedValue(undefined)
  catalogFindLean.mockReset().mockReturnValue([])
  catalogFindOneLean.mockReset().mockReturnValue(null)
  catalogCount.mockReset().mockReturnValue(0)
  metaFindOneLean.mockReset().mockReturnValue(null)
  partFindLean.mockReset().mockReturnValue([])
  aggregateResult.mockReset().mockReturnValue([])
  getQuery.mockReset().mockReturnValue({})
  getRouterParam.mockReset()
})

describe('GET /api/computadoras', () => {
  it('sin corrida contesta 200 y dice que el relevamiento está arrancando', async () => {
    // Si esto tirara, el SSR de la página nueva sería un 500 el día del deploy, antes de que el job
    // haya corrido una sola vez.
    const response = await (await listHandler())({} as never)
    expect(response.status).toBe('preparing')
    expect(response.items).toEqual([])
    expect(response.total).toBe(0)
  })

  it('un fallo de base no se cachea ni se disfraza de directorio vacío', async () => {
    connectDb.mockRejectedValue(new Error('mongo down'))
    const response = await (await listHandler())({} as never)
    expect(response.status).toBe('unavailable')
    expect(headers).toContainEqual(['cache-control', 'no-store'])
  })

  it('el éxito se cachea diez minutos con revalidación en segundo plano', async () => {
    metaFindOneLean.mockReturnValue(META_DOC)
    const response = await (await listHandler())({} as never)
    expect(response.status).toBe('ok')
    expect(response.coverage?.counts.computers).toBe(250)
    expect(headers.find(([name]) => name === 'cache-control')?.[1]).toContain('max-age=600')
  })

  it('usa la ventana de frescura que publicó la corrida, no una propia', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-23T12:00:00Z'))
    metaFindOneLean.mockReturnValue(META_DOC)
    await (
      await listHandler()
    )({} as never)
    // freshDays: 3 → desde el 20.
    expect(JSON.stringify(catalogFindFilters[0])).toContain('2026-11-20')
    vi.useRealTimers()
  })

  it('por defecto lista computadoras; las piezas se piden', async () => {
    metaFindOneLean.mockReturnValue(META_DOC)
    await (
      await listHandler()
    )({} as never)
    expect(catalogFindFilters[0]).toMatchObject({ kindGroup: 'computer' })
    getQuery.mockReturnValue({ tipo: 'piezas' })
    await (
      await listHandler()
    )({} as never)
    expect(catalogFindFilters[1]).toMatchObject({ kindGroup: 'part' })
  })

  it('cada faceta se cuenta SIN su propio filtro', async () => {
    metaFindOneLean.mockReturnValue(META_DOC)
    getQuery.mockReturnValue({ departamento: 'Salto', tipo: 'notebook', placa: 'gpu:rtx-3060' })
    const pipelines: string[] = []
    aggregateResult.mockImplementation((pipeline: unknown[]) => {
      pipelines.push(JSON.stringify(pipeline))
      return []
    })
    await (
      await listHandler()
    )({} as never)
    const byField = (field: string) => pipelines.find(text => text.includes(`"_id":"$${field}"`))
    expect(byField('department')).not.toContain('Salto')
    expect(byField('department')).toContain('notebook')
    // El tipo se cuenta sobre TODO: ni el tipo pedido ni la vista por defecto.
    expect(byField('kind')).not.toContain('notebook')
    expect(byField('kind')).not.toContain('kindGroup')
    expect(byField('gpuSlug')).not.toContain('gpu:rtx-3060')
  })

  it('cada faceta en su lugar, por nombre y no por posición', async () => {
    // Motos sacó dos facetas cruzadas a producción el 23/11/2026 (Promise.all desestructurado).
    metaFindOneLean.mockReturnValue(META_DOC)
    aggregateResult.mockImplementation((pipeline: unknown[]) => {
      const text = JSON.stringify(pipeline)
      if (text.includes('"_id":"$source"')) return [{ _id: 'facebook', count: 40 }]
      if (text.includes('"_id":"$kind"'))
        return [
          { _id: 'notebook', count: 30 },
          { _id: 'gpu', count: 9 },
        ]
      if (text.includes('"_id":"$cpuFamily"')) return [{ _id: 'ryzen-5', count: 12 }]
      if (text.includes('"_id":"$gpuSlug"'))
        return [{ _id: 'gpu:rtx-3060', label: 'RTX 3060', count: 7 }]
      return []
    })
    catalogCount.mockReturnValue(5)
    const response = await (await listHandler())({} as never)
    expect(response.facets.sources).toEqual([
      { value: 'facebook', label: 'Facebook Marketplace', count: 40 },
    ])
    expect(response.facets.kinds).toEqual([
      { value: 'notebook', label: 'Notebook', count: 30 },
      { value: 'gpu', label: 'Placa de video', count: 9 },
    ])
    expect(response.facets.cpuFamilies).toEqual([{ value: 'ryzen-5', label: 'Ryzen 5', count: 12 }])
    expect(response.facets.gpus).toEqual([{ value: 'gpu:rtx-3060', label: 'RTX 3060', count: 7 }])
    expect(response.facets.rams.map(facet => facet.value)).toEqual(['8', '16', '32'])
  })

  it('no publica un valor vacío como opción de filtro', async () => {
    metaFindOneLean.mockReturnValue(META_DOC)
    aggregateResult.mockImplementation((pipeline: unknown[]) =>
      JSON.stringify(pipeline).includes('"_id":"$department"')
        ? [
            { _id: null, count: 40 },
            { _id: '', count: 3 },
            { _id: 'Salto', count: 12 },
          ]
        : []
    )
    const response = await (await listHandler())({} as never)
    expect(response.facets.departments).toEqual([{ value: 'Salto', label: 'Salto', count: 12 }])
  })

  it('«mejor relación» cuenta y lista sólo lo que tiene veredicto', async () => {
    metaFindOneLean.mockReturnValue(META_DOC)
    getQuery.mockReturnValue({ orden: 'relacion' })
    await (
      await listHandler()
    )({} as never)
    expect(countFilters[0]).toMatchObject({ 'valuation.verdict': { $ne: null } })
    expect(catalogFindFilters[0]).toMatchObject({ 'valuation.ratio': { $ne: null } })
  })
})

describe('GET /api/computadoras/aviso/<slug>', () => {
  it('un slug imposible 404ea sin tocar la base', async () => {
    getRouterParam.mockReturnValue('../../etc/passwd')
    await expect((await avisoHandler())({} as never)).rejects.toMatchObject({ statusCode: 404 })
    expect(connectDb).not.toHaveBeenCalled()
  })

  it('un slug bien formado sin documento es un 404, y no se cachea', async () => {
    getRouterParam.mockReturnValue('fb-1234567890')
    await expect((await avisoHandler())({} as never)).rejects.toMatchObject({ statusCode: 404 })
    expect(headers).toContainEqual(['cache-control', 'no-store'])
  })

  it('un fallo de base es 503, nunca un 404: un negativo falso saca la ficha', async () => {
    getRouterParam.mockReturnValue('fb-1234567890')
    connectDb.mockRejectedValue(new Error('mongo down'))
    await expect((await avisoHandler())({} as never)).rejects.toMatchObject({ statusCode: 503 })
    expect(headers).toContainEqual(['cache-control', 'no-store'])
  })

  it('trae las piezas de su valuación y parecidas del mismo tipo y familia', async () => {
    getRouterParam.mockReturnValue('fb-1234567890')
    catalogFindOneLean.mockReturnValue(LISTING)
    metaFindOneLean.mockReturnValue(META_DOC)
    const response = await (await avisoHandler())({} as never)
    expect(response.computer.slug).toBe('fb-1234567890')
    expect(partFindFilters[0]).toEqual({
      slug: { $in: ['cpu:i5-12400f', 'gpu:rtx-3060', 'case:basico'] },
    })
    expect(catalogFindFilters[0]).toMatchObject({
      kind: 'desktop',
      cpuFamily: 'core-i5',
      slug: { $ne: 'fb-1234567890' },
    })
  })

  it('si las piezas o las parecidas fallan, la ficha sale igual: degradar no es fallar', async () => {
    getRouterParam.mockReturnValue('fb-1234567890')
    catalogFindOneLean.mockReturnValue(LISTING)
    metaFindOneLean.mockReturnValue(META_DOC)
    partFindLean.mockImplementation(() => {
      throw new Error('timeout')
    })
    catalogFindLean.mockImplementation(() => {
      throw new Error('timeout')
    })
    const response = await (await avisoHandler())({} as never)
    expect(response.computer.slug).toBe('fb-1234567890')
    expect(response.parts).toEqual([])
    expect(response.similar).toEqual([])
  })
})

describe('GET /api/computadoras/componentes', () => {
  it('sin corrida ni piezas dice que está arrancando', async () => {
    const response = await (await componentsHandler())({} as never)
    expect(response.status).toBe('preparing')
    expect(response.roles).toEqual([])
  })

  it('un fallo de base no se cachea', async () => {
    connectDb.mockRejectedValue(new Error('mongo down'))
    const response = await (await componentsHandler())({} as never)
    expect(response.status).toBe('unavailable')
    expect(headers).toContainEqual(['cache-control', 'no-store'])
  })

  it('agrupa por rol, trae las PCs tipo de la corrida y no pide el historial', async () => {
    metaFindOneLean.mockReturnValue(META_DOC)
    partFindLean.mockReturnValue([
      {
        slug: 'gpu:rtx-3060',
        role: 'gpu',
        label: 'RTX 3060',
        facts: {},
        new: { medianUsd: 330, p25Usd: 300, minUsd: 280, n: 9, sellers: 5, cheapest: null },
        used: null,
        inCatalog: 4,
        history: [],
        updatedAt: '2026-11-23',
      },
    ])
    const response = await (await componentsHandler())({} as never)
    expect(response.status).toBe('ok')
    expect(response.roles.map(table => table.role)).toEqual(['gpu'])
    expect(response.presets).toHaveLength(1)
    expect(response.usdUyu).toBe(40)
    expect(headers.find(([name]) => name === 'cache-control')?.[1]).toContain('max-age=600')
  })
})
