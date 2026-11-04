import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  movilidadModelCategoria,
  movilidadModelCategoryFilter,
  movilidadModelPath,
} from '../../utils/movilidadModelos'

// Desde el 4/11/2026 `movilidadmodels` tiene monopatines y bicicletas. Lo que no puede pasar: que una
// lectura sin categoría mezcle bicis en la tabla de monopatines, en su sitemap o en sus hermanos.

describe('categoría del catálogo de modelos', () => {
  it('sin categoría, o con una desconocida, es monopatín (la API de antes de las bicis)', () => {
    expect(movilidadModelCategoria(undefined)).toBe('monopatin-electrico')
    expect(movilidadModelCategoria('heladera')).toBe('monopatin-electrico')
    expect(movilidadModelCategoria(['bicicleta-electrica'])).toBe('bicicleta-electrica')
  })

  it('el filtro de monopatín incluye los documentos sin categoría; el de bici, sólo los suyos', () => {
    expect(movilidadModelCategoryFilter('monopatin-electrico')).toEqual({
      category: { $in: ['monopatin-electrico', null] },
    })
    expect(movilidadModelCategoryFilter('bicicleta-electrica')).toEqual({
      category: 'bicicleta-electrica',
    })
  })

  it('la página del modelo cuelga del hub de su categoría', () => {
    expect(movilidadModelPath('monopatin-electrico', 'xiaomi-6-pro')).toBe(
      '/monopatines-electricos-uruguay/xiaomi-6-pro'
    )
    expect(movilidadModelPath('bicicleta-electrica', 'gyroor-c3')).toBe(
      '/bicicletas-electricas-uruguay/gyroor-c3'
    )
    expect(movilidadModelPath('heladera', 'x-y')).toBeNull()
  })
})

const { connectDb, findOneLean, findLean, findOneFilter, findFilter } = vi.hoisted(() => ({
  connectDb: vi.fn(),
  findOneLean: vi.fn(),
  findLean: vi.fn(),
  findOneFilter: [] as unknown[],
  findFilter: [] as unknown[],
}))

vi.mock('../../server/utils/db', () => ({ connectDb }))
vi.mock('../../server/models/MovilidadModel', () => ({
  MovilidadModelModel: {
    findOne: (filter: unknown) => {
      findOneFilter.push(filter)
      return { select: () => ({ maxTimeMS: () => ({ lean: findOneLean }) }) }
    },
    find: (filter: unknown) => {
      findFilter.push(filter)
      return { select: () => ({ maxTimeMS: () => ({ lean: findLean }) }) }
    },
  },
}))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', (event: any, key: string) => event[key])
vi.stubGlobal('getQuery', (event: any) => event.query ?? {})
vi.stubGlobal('setResponseHeader', () => undefined)
vi.stubGlobal('createError', (options: Record<string, unknown>) =>
  Object.assign(new Error(String(options.statusMessage)), options)
)

const detail = (await import('../../server/api/movilidad/modelos/[slug].get')).default
const list = (await import('../../server/api/movilidad/modelos/index.get')).default

beforeEach(() => {
  connectDb.mockReset()
  findOneLean.mockReset()
  findLean.mockReset()
  findOneFilter.length = 0
  findFilter.length = 0
})
afterAll(() => vi.unstubAllGlobals())

describe('las APIs de modelos piden una sola categoría', () => {
  it('la lista sin ?categoria= es la de monopatines, con los documentos viejos', async () => {
    findLean.mockResolvedValue([])
    await list({} as never)
    expect(findFilter[0]).toMatchObject({ category: { $in: ['monopatin-electrico', null] } })
  })

  it('la lista de bicis no trae monopatines', async () => {
    findLean.mockResolvedValue([])
    await list({ query: { categoria: 'bicicleta-electrica' } } as never)
    expect(findFilter[0]).toMatchObject({ category: 'bicicleta-electrica' })
  })

  it('el detalle de una bici busca el modelo y sus hermanos sólo entre bicis', async () => {
    findOneLean.mockResolvedValue({
      slug: 'gyroor-c3',
      category: 'bicicleta-electrica',
      variant: 'plegable',
      name: 'Gyroor C3',
      brandLabel: 'Gyroor',
      modelLabel: 'C3',
      sellers: 3,
      listings: 18,
      indexable: true,
      generatedAt: '2026-11-04T06:01:00Z',
      newBand: { min: 31000, median: 33000, max: 35000, n: 18, sellers: 3 },
      usedBand: null,
      specs: null,
      offers: [],
    })
    findLean.mockResolvedValue([])
    await detail({ slug: 'gyroor-c3', query: { categoria: 'bicicleta-electrica' } } as never)
    expect(findOneFilter[0]).toMatchObject({ slug: 'gyroor-c3', category: 'bicicleta-electrica' })
    expect(findFilter[0]).toMatchObject({ category: 'bicicleta-electrica', variant: 'plegable' })
  })

  it('un slug de bici pedido sin categoría (desde monopatines) no aparece: 404', async () => {
    findOneLean.mockResolvedValue(null)
    await expect(detail({ slug: 'gyroor-c3' } as never)).rejects.toMatchObject({ statusCode: 404 })
    expect(findOneFilter[0]).toMatchObject({ category: { $in: ['monopatin-electrico', null] } })
  })
})

describe('la URL de una categoría no filtra con la ficha de la otra (revisión de rama, 4/11/2026)', async () => {
  const { equiparProductosNormalize } = await import('../../utils/equiparProductos')
  it('monopatines ignora rodado y los rasgos de bici; bicis ignora rueda y app', () => {
    const mono = equiparProductosNormalize(
      { categoria: 'monopatin-electrico', rodado: '20', rueda: '9-10', rasgos: 'app,acelerador' },
      'movilidad'
    ).ficha!
    expect(mono).toMatchObject({ rodado: '', rueda: '9-10', rasgos: ['app'] })
    const bici = equiparProductosNormalize(
      { categoria: 'bicicleta-electrica', rodado: '20', rueda: '9-10', rasgos: 'app,acelerador' },
      'movilidad'
    ).ficha!
    expect(bici).toMatchObject({ rodado: '20', rueda: '', rasgos: ['acelerador'] })
  })
})
