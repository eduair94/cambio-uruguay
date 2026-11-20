import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, createError, toWebHandler } from 'h3'

const state = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  readCatalogue: vi.fn(),
  now: Date.parse('2026-09-21T15:00:00Z'),
}))

vi.mock('../../server/utils/requireAdmin', () => ({ requireAdmin: state.requireAdmin }))
vi.mock('../../server/data/commercialContacts', () => ({
  get COMMERCIAL_CONTACTS() {
    state.readCatalogue()
    return [
      {
        id: 'empresa-ejemplo',
        name: 'Empresa de prueba',
        sector: 'viviendas',
        phone: '2400 0000',
        phoneScope: 'business',
        sourceUrl: 'https://empresa.com.uy/contacto',
        observedAt: '2026-09-21T12:00:00Z',
        platforms: [],
        privateNote: 'internal-only',
      },
    ]
  },
}))

const handler = (await import('../../server/api/commercial-contacts.get')).default
const request = toWebHandler(createApp().use('/api/commercial-contacts', handler))

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(state.now)
  state.requireAdmin.mockResolvedValue({ uid: 'admin' })
})
afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('private business contact API', () => {
  it.each([401, 403, 503])(
    'does not read contacts after an admin gate failure (%s)',
    async statusCode => {
      state.requireAdmin.mockRejectedValue(
        createError({ statusCode, statusMessage: 'Access denied' })
      )
      const response = await request(new Request('http://localhost/api/commercial-contacts'))
      expect(response.status).toBe(statusCode)
      expect(response.headers.get('cache-control')).toBe('private, no-store')
      expect(response.headers.get('vary')).toBe('Authorization')
      expect(state.readCatalogue).not.toHaveBeenCalled()
      expect(await response.text()).not.toContain('empresa-ejemplo')
    }
  )

  it('serves only safe contacts to an authenticated admin without shared caching', async () => {
    const response = await request(new Request('http://localhost/api/commercial-contacts'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('vary')).toBe('Authorization')
    expect(state.requireAdmin).toHaveBeenCalledOnce()
    expect(state.readCatalogue).toHaveBeenCalledOnce()
    expect(state.requireAdmin.mock.invocationCallOrder[0]).toBeLessThan(
      state.readCatalogue.mock.invocationCallOrder[0]!
    )
    const body = await response.json()
    expect(body.contacts).toHaveLength(1)
    expect(body.contacts[0].phone).toBe('+59824000000')
    expect(JSON.stringify(body)).not.toContain('internal-only')
  })
})
