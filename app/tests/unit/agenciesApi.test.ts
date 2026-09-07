import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApp,
  createRouter,
  toWebHandler,
  getRouterParam,
  defineEventHandler,
  setResponseHeader,
  createError,
} from 'h3'
const fixture = vi.hoisted(() => ({
  agency: {
    version: 1,
    key: 'infocasas:123',
    name: 'Agencia pública',
    profileUrl: 'https://www.infocasas.com.uy/inmobiliarias/perfil/123-empresa',
    observedAt: new Date().toISOString(),
  },
  rentals: 2,
  sales: 1,
  listings: 3,
  departments: ['Montevideo'],
  zones: [],
  lastListingSeen: new Date().toISOString(),
}))
vi.mock('../../server/utils/agencies', () => ({
  loadAgencyDirectory: async () => [fixture],
  loadAgencyProfileContact: async () => null,
}))
vi.stubGlobal('defineEventHandler', defineEventHandler)
vi.stubGlobal('setResponseHeader', setResponseHeader)
vi.stubGlobal('getRouterParam', getRouterParam)
vi.stubGlobal('createError', createError)
const handler = (await import('../../server/api/agencies/[key].get')).default
afterEach(() => vi.clearAllMocks())
describe('encoded native agency routes through real H3', () => {
  const app = createApp().use(createRouter().get('/api/agencies/:key', handler))
  const request = toWebHandler(app)
  it('decodes the colon in a source-qualified key and returns profile links to both own catalogues', async () => {
    const response = await request(new Request('http://localhost/api/agencies/infocasas%3A123'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.agency.key).toBe('infocasas:123')
    expect(body.links).toEqual({
      rentals: '/alquileres-uruguay?agency=infocasas%3A123',
      sales: '/venta-viviendas-uruguay?agency=infocasas%3A123',
    })
    expect(body).not.toHaveProperty('identity')
  })
  it('returns an uncached 404 for invalid or absent profiles', async () => {
    for (const key of ['not-a-profile', 'infocasas%3A999']) {
      const response = await request(new Request(`http://localhost/api/agencies/${key}`))
      expect(response.status).toBe(404)
      expect(response.headers.get('cache-control')).toBe('no-store')
    }
  })
})
