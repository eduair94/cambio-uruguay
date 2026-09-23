// Las dos rutas de `/motos-usadas-uruguay` sin base de datos: lo que se verifica acá es CÓMO
// responden cuando el job todavía no publicó nada, cuando Mongo no contesta y cuando la ficha que
// se pide es el informe. Ahí es donde estas rutas se diferencian de un CRUD, y donde un error no se
// nota hasta que la página queda en blanco en producción.
//
// La cadena de mongoose se reduce a los eslabones que las rutas realmente llaman, igual que hacen
// `carsApi.test.ts` y `phonesApi.test.ts`.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const connectDb = vi.fn()
const catalogFindLean = vi.fn()
const catalogCount = vi.fn()
const metaFindOneLean = vi.fn()
const snapshotFindOneLean = vi.fn()
const snapshotFindLean = vi.fn()
const aggregateResult = vi.fn()
const catalogFindFilters: unknown[] = []
const snapshotFindOneFilters: unknown[] = []

const chain = (lean: () => unknown) => {
  const query: Record<string, unknown> = {}
  for (const link of ['select', 'sort', 'skip', 'limit', 'maxTimeMS']) query[link] = () => query
  query.lean = lean
  return query
}

vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/models/MotoCatalog', () => ({
  MotoCatalogModel: {
    find: (filter: unknown) => {
      catalogFindFilters.push(filter)
      return chain(catalogFindLean)
    },
    countDocuments: () => ({ maxTimeMS: () => Promise.resolve(catalogCount()) }),
    aggregate: (pipeline: unknown[]) => ({
      option: () => Promise.resolve(aggregateResult(pipeline)),
    }),
  },
}))
vi.mock('../../server/models/MotoCatalogMeta', () => ({
  MotoCatalogMetaModel: { findOne: () => chain(metaFindOneLean) },
}))
vi.mock('../../server/models/MotoMarketSnapshot', () => ({
  MotoMarketSnapshotModel: {
    findOne: (filter: unknown) => {
      snapshotFindOneFilters.push(filter)
      return chain(snapshotFindOneLean)
    },
    find: () => chain(snapshotFindLean),
  },
}))

const { getQuery, getRouterParam } = installNitroGlobals()
const headers: Array<[string, string]> = []
vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) => {
  headers.push([name, value])
})

const listHandler = async () => (await import('../../server/api/motos/index.get')).default
const detailHandler = async () => (await import('../../server/api/motos/[key].get')).default

const META_DOC = {
  key: 'uy-motos',
  generatedAt: '2026-09-22',
  meta: {
    id: 'uy-motos',
    generatedAt: '2026-09-22',
    freshDays: 5,
    sourceCoverage: 'partial',
    listings: 1391,
    usdUyu: 41.2,
    lastFullReadAt: '2026-09-22',
    lastReadAt: '2026-09-22',
    reportedTotal: 1500,
    withoutDisplacement: 181,
    models: [{ slug: 'yumbo-gs', brand: 'Yumbo', model: 'GS', listings: 24 }],
    sources: [],
  },
}

const MODEL_DOC = {
  key: 'yumbo-gs',
  generatedAt: '2026-09-22',
  snapshot: {
    version: 1,
    slug: 'yumbo-gs',
    brand: 'Yumbo',
    brandSlug: 'yumbo',
    model: 'GS',
    modelSlug: 'gs',
    generatedAt: '2026-09-22',
    listings: 24,
    propulsion: 'combustion',
    band: { n: 20, sellers: 17, p25: 1800, median: 2300, p75: 2900, kmMedian: 14000 },
    years: [],
    displacements: [],
    annualDrop: 12.4,
    types: [],
  },
}

beforeEach(() => {
  headers.length = 0
  catalogFindFilters.length = 0
  snapshotFindOneFilters.length = 0
  connectDb.mockReset().mockResolvedValue(undefined)
  catalogFindLean.mockReset().mockReturnValue([])
  catalogCount.mockReset().mockReturnValue(0)
  metaFindOneLean.mockReset().mockReturnValue(null)
  snapshotFindOneLean.mockReset().mockReturnValue(null)
  snapshotFindLean.mockReset().mockReturnValue([])
  aggregateResult.mockReset().mockReturnValue([])
  getQuery.mockReset().mockReturnValue({})
  getRouterParam.mockReset()
})

describe('GET /api/motos', () => {
  it('sin catálogo contesta 200 y dice que el relevamiento está arrancando', async () => {
    // Si esto tirara 503, el SSR de la página nueva sería un 500 el día del deploy, antes de que el
    // job haya corrido una sola vez.
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

  it('el éxito se cachea con revalidación en segundo plano', async () => {
    metaFindOneLean.mockReturnValue(META_DOC)
    const response = await (await listHandler())({} as never)
    expect(response.status).toBe('ok')
    expect(headers.find(([name]) => name === 'cache-control')?.[1]).toContain('max-age=600')
  })

  it('usa la ventana de frescura que publicó la corrida, no una propia', async () => {
    // El job publica `freshDays: 5`. Si el app usara su propio número listaría avisos que el job ya
    // dejó de contar (o al revés) y nadie lo notaría.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-22T12:00:00Z'))
    metaFindOneLean.mockReturnValue(META_DOC)
    await (
      await listHandler()
    )({} as never)
    expect(JSON.stringify(catalogFindFilters[0])).toContain('2026-09-17')
    vi.useRealTimers()
  })

  it('el facet de una dimensión se cuenta SIN su propio filtro', async () => {
    // Con su filtro puesto devolvería una sola opción con el total de la pantalla, y el lector no
    // podría ver cuántos avisos hay del otro lado del filtro.
    metaFindOneLean.mockReturnValue(META_DOC)
    getQuery.mockReturnValue({ departamento: 'Salto' })
    const pipelines: string[] = []
    aggregateResult.mockImplementation((pipeline: unknown[]) => {
      pipelines.push(JSON.stringify(pipeline))
      return []
    })
    await (
      await listHandler()
    )({} as never)
    const departmentPipeline = pipelines.find(text => text.includes('$department'))
    expect(departmentPipeline).toBeDefined()
    expect(departmentPipeline).not.toContain('Salto')
  })

  it('no publica un valor vacío como opción de filtro', async () => {
    // "Sin departamento" no es un departamento: ofrecerlo sería ofrecer una pregunta que el dato no
    // contesta.
    metaFindOneLean.mockReturnValue(META_DOC)
    aggregateResult.mockImplementation((pipeline: unknown[]) =>
      JSON.stringify(pipeline).includes('$department')
        ? [
            { _id: null, count: 40 },
            { _id: 'Salto', count: 12 },
          ]
        : []
    )
    const response = await (await listHandler())({} as never)
    expect(response.facets.departments).toEqual([{ value: 'Salto', label: 'Salto', count: 12 }])
  })

  it('traduce las etiquetas cerradas en la API y no en la plantilla', async () => {
    metaFindOneLean.mockReturnValue(META_DOC)
    aggregateResult.mockImplementation((pipeline: unknown[]) =>
      JSON.stringify(pipeline).includes('$fuel') ? [{ _id: 'electrica', count: 35 }] : []
    )
    const response = await (await listHandler())({} as never)
    expect(response.facets.fuels).toEqual([{ value: 'electrica', label: 'Eléctrica', count: 35 }])
  })
})

describe('GET /api/motos/<key>', () => {
  it('una clave imposible 404ea sin tocar la base', async () => {
    getRouterParam.mockReturnValue('../../etc/passwd')
    await expect((await detailHandler())({} as never)).rejects.toMatchObject({ statusCode: 404 })
    expect(connectDb).not.toHaveBeenCalled()
  })

  it('la clave reservada del informe no es una ficha', async () => {
    // Vive en la misma colección que las fichas: sin esta negativa se serviría el informe con la
    // forma de un modelo.
    getRouterParam.mockReturnValue('_informe')
    await expect((await detailHandler())({} as never)).rejects.toMatchObject({ statusCode: 404 })
    expect(connectDb).not.toHaveBeenCalled()
  })

  it('una clave bien formada sin documento es un 404, y no se cachea', async () => {
    getRouterParam.mockReturnValue('yumbo-inexistente')
    await expect((await detailHandler())({} as never)).rejects.toMatchObject({ statusCode: 404 })
    expect(headers).toContainEqual(['cache-control', 'no-store'])
  })

  it('un fallo de base es 503, nunca un 404: un negativo falso saca la ficha del índice', async () => {
    getRouterParam.mockReturnValue('yumbo-gs')
    connectDb.mockRejectedValue(new Error('mongo down'))
    await expect((await detailHandler())({} as never)).rejects.toMatchObject({ statusCode: 503 })
  })

  it('trae los avisos del modelo separados por propulsión', async () => {
    // El job hizo ficha aparte para la línea eléctrica: traerle los avisos de nafta del mismo
    // nombre mezclaría los dos mercados que separó a propósito.
    getRouterParam.mockReturnValue('yumbo-gs')
    snapshotFindOneLean.mockReturnValue(MODEL_DOC)
    metaFindOneLean.mockReturnValue(META_DOC)
    catalogFindLean.mockReturnValue([])
    await (
      await detailHandler()
    )({} as never)
    expect(catalogFindFilters[0]).toMatchObject({
      brandSlug: 'yumbo',
      modelSlug: 'gs',
      fuel: { $ne: 'electrica' },
    })
  })

  it('la ficha eléctrica pide sólo avisos eléctricos', async () => {
    getRouterParam.mockReturnValue('yumbo-gs-electrica')
    snapshotFindOneLean.mockReturnValue({
      ...MODEL_DOC,
      key: 'yumbo-gs-electrica',
      snapshot: { ...MODEL_DOC.snapshot, slug: 'yumbo-gs-electrica', propulsion: 'electrica' },
    })
    metaFindOneLean.mockReturnValue(META_DOC)
    await (
      await detailHandler()
    )({} as never)
    expect(catalogFindFilters[0]).toMatchObject({ fuel: 'electrica' })
  })

  it('si los avisos fallan, publica la banda igual: degradar no es fallar', async () => {
    getRouterParam.mockReturnValue('yumbo-gs')
    snapshotFindOneLean.mockReturnValue(MODEL_DOC)
    metaFindOneLean.mockReturnValue(META_DOC)
    catalogFindLean.mockImplementation(() => {
      throw new Error('timeout')
    })
    const response = await (await detailHandler())({} as never)
    expect(response.model.band?.median).toBe(2300)
    expect(response.listings).toEqual([])
  })
})
