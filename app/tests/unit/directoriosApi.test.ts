import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { CARD_PROGRAMS, CARD_REWARDS_LAST_REVIEWED } from '../../utils/cardRewards'
import { CASAS_LAST_RESEARCHED, CASAS_REPUTATION } from '../../utils/casasDirectory'
import { COURIERS, COURIER_RATES_VERIFIED_AT } from '../../utils/courierShipping'

// La ruta no toca Mongo: le pregunta a la misma ruta que usa cada página. Acá cada una de esas
// rutas es una respuesta que un test puede cambiar o romper, con la forma que tiene en producción.
const m = vi.hoisted(() => ({
  responses: new Map<string, unknown>(),
  broken: new Set<string>(),
  calls: [] as Array<{ url: string; query?: Record<string, string> }>,
  headers: [] as Array<[string, string]>,
}))

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) =>
  m.headers.push([name, value])
)
vi.stubGlobal('$fetch', async (url: string, options?: { query?: Record<string, string> }) => {
  m.calls.push({ url, query: options?.query })
  if (m.broken.has(url)) throw new Error(`${url} caída`)
  if (!m.responses.has(url)) throw new Error(`${url} no simulada`)
  return m.responses.get(url)
})

const handler = (await import('../../server/api/directorios.get')).default as (
  event: unknown
) => Promise<{ cifras: Record<string, { count: number | null; asOf: string | null }> }>

/** Respuestas con la forma real de cada ruta, recortadas a los campos que se leen. */
function seedAll() {
  m.responses.set('/api/rentals', {
    total: 60454,
    meta: { generatedAt: '2026-09-18T04:52:00.000Z', properties: 66388 },
  })
  m.responses.set('/api/property-sales', {
    coverage: { listings: 16753 },
    meta: { generatedAt: '2026-09-18T06:21:00.000Z', total: 16753 },
  })
  m.responses.set('/api/agencies', {
    total: 769,
    coverage: { agencies: 769, computedAt: '2026-09-18T21:44:56.017Z' },
  })
  m.responses.set('/api/cars', {
    coverage: { listings: 18610, lastReadAt: '2026-09-18T08:29:00.000Z' },
  })
  m.responses.set('/api/phones', {
    generatedAt: '2026-09-18T14:29:00.000Z',
    brands: [{ models: [{}, {}, {}] }, { models: [{}] }, { models: [] }],
  })
  m.responses.set('/api/chairs', { meta: { products: 191, asOf: '2026-09-18' } })
  m.responses.set('/api/stores', {
    stores: Array.from({ length: 80 }, () => ({})),
    reviewedAt: '2026-09-14T07:17:00.000Z',
  })
  m.responses.set('/api/precios', { day: '2026-09-18', count: 213 })
}

/** La última cabecera cache-control que dejó la ruta. */
function cacheControl(): string | undefined {
  return [...m.headers].reverse().find(([name]) => name === 'cache-control')?.[1]
}

beforeEach(() => {
  m.responses.clear()
  m.broken.clear()
  m.calls.length = 0
  m.headers.length = 0
})

afterAll(() => vi.unstubAllGlobals())

describe('GET /api/directorios', () => {
  it('lee de cada ruta el mismo campo que imprime su página, con la fecha de ese dato', async () => {
    seedAll()
    const { cifras } = await handler({})
    // Alquileres: el `total` filtrado que muestra la página (60.454), no `meta.properties` (66.388).
    expect(cifras.alquileres).toEqual({ count: 60454, asOf: '2026-09-18' })
    expect(cifras.ventas).toEqual({ count: 16753, asOf: '2026-09-18' })
    expect(cifras.inmobiliarias).toEqual({ count: 769, asOf: '2026-09-18' })
    expect(cifras.autos).toEqual({ count: 18610, asOf: '2026-09-18' })
    expect(cifras.sillas).toEqual({ count: 191, asOf: '2026-09-18' })
    expect(cifras.tiendas).toEqual({ count: 80, asOf: '2026-09-14' })
    expect(cifras.precios).toEqual({ count: 213, asOf: '2026-09-18' })
    expect(cacheControl()).toMatch(/^public/)
  })

  it('celulares suma los modelos que dibuja el hub, marca por marca', async () => {
    seedAll()
    const { cifras } = await handler({})
    expect(cifras.celulares).toEqual({ count: 4, asOf: '2026-09-18' })
  })

  it('sillas pide el resumen liviano, el mismo que usa su página para esos números', async () => {
    seedAll()
    await handler({})
    expect(m.calls.find(call => call.url === '/api/chairs')?.query).toEqual({ summary: '1' })
  })

  it('los curados son el largo de la misma lista que dibuja su página, con su fecha de revisión', async () => {
    seedAll()
    const { cifras } = await handler({})
    expect(cifras.casas).toEqual({ count: CASAS_REPUTATION.length, asOf: CASAS_LAST_RESEARCHED })
    expect(cifras.couriers).toEqual({ count: COURIERS.length, asOf: COURIER_RATES_VERIFIED_AT })
    expect(cifras.tarjetas).toEqual({
      count: CARD_PROGRAMS.length,
      asOf: CARD_REWARDS_LAST_REVIEWED,
    })
  })

  it('no inventa cifra para un directorio cuya página no publica un total', async () => {
    seedAll()
    const { cifras } = await handler({})
    expect(cifras).not.toHaveProperty('equipar')
    expect(cifras).not.toHaveProperty('movilidad')
  })

  it('una ruta caída deja sólo esa tarjeta sin cifra, y la respuesta se sigue cacheando', async () => {
    seedAll()
    m.broken.add('/api/cars')
    const { cifras } = await handler({})
    expect(cifras).not.toHaveProperty('autos')
    expect(cifras.alquileres?.count).toBe(60454)
    expect(cacheControl()).toMatch(/^public/)
  })

  it('un cero no se publica: siempre quiere decir que no se pudo leer', async () => {
    seedAll()
    m.responses.set('/api/precios', { day: null, count: 0 })
    m.responses.set('/api/rentals', { total: 0, meta: null })
    const { cifras } = await handler({})
    expect(cifras).not.toHaveProperty('precios')
    expect(cifras).not.toHaveProperty('alquileres')
  })

  it('una respuesta sin el campo esperado no se publica como cifra', async () => {
    seedAll()
    m.responses.set('/api/cars', { coverage: {} })
    m.responses.set('/api/stores', {})
    const { cifras } = await handler({})
    expect(cifras).not.toHaveProperty('autos')
    expect(cifras).not.toHaveProperty('tiendas')
  })

  it('una fecha que no parece fecha se publica como ausente, no como texto', async () => {
    seedAll()
    m.responses.set('/api/property-sales', {
      coverage: { listings: 16753 },
      meta: { generatedAt: 'ayer' },
    })
    const { cifras } = await handler({})
    expect(cifras.ventas).toEqual({ count: 16753, asOf: null })
  })

  it('si no se pudo leer NINGUNA cifra relevada, la respuesta no se cachea', async () => {
    const { cifras } = await handler({})
    expect(Object.keys(cifras).sort()).toEqual(['casas', 'couriers', 'tarjetas'])
    expect(cacheControl()).toBe('no-store')
  })
})
