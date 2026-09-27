import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const requireAdmin = vi.fn()
const fetchMock = vi.fn()
const setResponseHeader = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/requireAdmin', () => ({ requireAdmin }))
vi.stubGlobal('$fetch', fetchMock)
vi.stubGlobal('setResponseHeader', setResponseHeader)

const { readBody, getRouterParam, useRuntimeConfig } = installNitroGlobals()

const listH = (await import('../../server/api/me/api-keys/index.get')).default
const createH = (await import('../../server/api/me/api-keys/index.post')).default
const revokeH = (await import('../../server/api/me/api-keys/[id].delete')).default
const adminListH = (await import('../../server/api/admin/api-clients.get')).default
const adminPatchH = (await import('../../server/api/admin/api-clients/[id].patch')).default

const ADMIN = 'z'.repeat(40)
const ID = 'a'.repeat(24)

beforeEach(() => {
  ;[requireUser, requireAdmin, fetchMock, setResponseHeader, readBody, getRouterParam].forEach(m => m.mockReset())
  useRuntimeConfig.mockImplementation(() => ({ apiAdminToken: ADMIN, apiBaseServer: 'http://api.test' }))
  requireUser.mockResolvedValue({ uid: 'uid-1', email: 'ana@empresa.uy' })
  requireAdmin.mockResolvedValue({ uid: 'admin', email: 'admin@cambio-uruguay.com' })
})

describe('claves propias', () => {
  it('lista sólo las del usuario, con su uso, y nunca expone el token', async () => {
    fetchMock.mockResolvedValueOnce({ keys: [{ id: ID }] }).mockResolvedValueOnce({ byClient: {} })
    const res = await listH({} as any)
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://api.test/admin/api-keys', expect.objectContaining({
      query: { ownerUid: 'uid-1' },
      headers: { 'x-admin-token': ADMIN },
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://api.test/admin/api-usage', expect.objectContaining({
      query: { ownerUid: 'uid-1', days: 30 },
    }))
    expect(res).toEqual({ keys: [{ id: ID }], usage: { byClient: {} } })
    expect(JSON.stringify(res)).not.toContain(ADMIN)
    expect(setResponseHeader).toHaveBeenCalledWith({}, 'cache-control', 'private, no-store')
  })

  it('crea con el uid y el correo de la sesión, nunca los del cuerpo, y exige aceptar condiciones', async () => {
    readBody.mockResolvedValueOnce({ label: 'Pantalla', company: 'Cambio', useCase: 'Pizarra del local', acceptTerms: false })
    await expect(createH({} as any)).rejects.toMatchObject({ statusCode: 400 })

    readBody.mockResolvedValueOnce({
      label: 'Pantalla', company: 'Cambio', useCase: 'Pizarra del local', website: '', acceptTerms: true,
      ownerUid: 'otro', plan: 'business',
    })
    fetchMock.mockResolvedValueOnce({ key: 'cu_x', apiKey: { id: ID } })
    await createH({} as any)
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/admin/api-keys', expect.objectContaining({
      method: 'POST',
      body: { ownerUid: 'uid-1', ownerEmail: 'ana@empresa.uy', label: 'Pantalla', company: 'Cambio', useCase: 'Pizarra del local', website: '' },
    }))
  })

  it('revoca con el uid de la sesión y sólo manda status', async () => {
    getRouterParam.mockReturnValueOnce(ID)
    fetchMock.mockResolvedValueOnce({ apiKey: { id: ID, status: 'revoked' } })
    expect(await revokeH({} as any)).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(`http://api.test/admin/api-keys/${ID}`, expect.objectContaining({
      method: 'PATCH',
      body: { ownerUid: 'uid-1', status: 'revoked' },
    }))
    getRouterParam.mockReturnValueOnce('../../admin')
    await expect(revokeH({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('traduce los errores de la API: 409 pasa con su mensaje, un 500 se vuelve 502', async () => {
    readBody.mockResolvedValue({ label: 'P', company: 'Cambio', useCase: 'Pizarra del local', acceptTerms: true })
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 409, data: { error: 'too_many_keys', message: 'Hay un tope de 3 claves' } }))
    await expect(createH({} as any)).rejects.toMatchObject({ statusCode: 409, statusMessage: 'Hay un tope de 3 claves' })
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 500 }))
    await expect(createH({} as any)).rejects.toMatchObject({ statusCode: 502 })
  })

  it('sin token configurado responde 503 sin llamar a la API', async () => {
    useRuntimeConfig.mockImplementation(() => ({ apiAdminToken: '', apiBaseServer: 'http://api.test' }))
    await expect(listH({} as any)).rejects.toMatchObject({ statusCode: 503 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('administración', () => {
  it('exige requireAdmin antes de llamar a la API', async () => {
    requireAdmin.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { statusCode: 403 }))
    await expect(adminListH({} as any)).rejects.toMatchObject({ statusCode: 403 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lista todo sin ownerUid', async () => {
    fetchMock.mockResolvedValueOnce({ keys: [] }).mockResolvedValueOnce({ byClient: {}, anonymous: [] })
    await adminListH({} as any)
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://api.test/admin/api-keys', expect.objectContaining({ query: {} }))
  })

  it('cambia plan y notas, y nunca reenvía ownerUid', async () => {
    getRouterParam.mockReturnValueOnce(ID)
    readBody.mockResolvedValueOnce({ plan: 'business', notes: 'Factura', ownerUid: 'uid-1' })
    fetchMock.mockResolvedValueOnce({ apiKey: { id: ID, plan: 'business' } })
    await adminPatchH({} as any)
    expect(fetchMock).toHaveBeenCalledWith(`http://api.test/admin/api-keys/${ID}`, expect.objectContaining({
      method: 'PATCH',
      body: { plan: 'business', notes: 'Factura' },
    }))
  })
})
