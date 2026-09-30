import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const requireAdmin = vi.fn()
const setResponseHeader = vi.fn()
const fetchMock = vi.fn()
const monitorFindOne = vi.fn()
const monitorFind = vi.fn()
const monitorUpsert = vi.fn()
const stateFindOne = vi.fn()
const stateFind = vi.fn()
const userFindById = vi.fn()
const apiAdminFetch = vi.fn()

vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/requireAdmin', () => ({ requireAdmin }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/utils/apiAdmin', () => ({ apiAdminFetch }))
vi.mock('../../server/models/CompetitorMonitor', () => ({
  CompetitorMonitorModel: {
    findOne: monitorFindOne,
    find: monitorFind,
    findOneAndUpdate: monitorUpsert,
  },
}))
vi.mock('../../server/models/CompetitorMonitorState', () => ({
  CompetitorMonitorStateModel: { findOne: stateFindOne, find: stateFind },
}))
vi.mock('../../server/models/User', () => ({ UserModel: { findById: userFindById } }))
vi.stubGlobal('$fetch', fetchMock)
vi.stubGlobal('setResponseHeader', setResponseHeader)

const { readBody, useRuntimeConfig } = installNitroGlobals()
const getH = (await import('../../server/api/me/monitor/index.get')).default
const putH = (await import('../../server/api/me/monitor/index.put')).default
const adminH = (await import('../../server/api/admin/monitors.get')).default

const lean = (value: unknown) => ({ lean: () => ({ exec: () => Promise.resolve(value) }) })
const sorted = (value: unknown) => ({ sort: () => lean(value) })

const good = {
  ownOrigin: 'propia',
  competitors: ['gales'],
  currencies: ['USD'],
  alerts: { moves: true, position: true, quiet: true, daily: true },
  channels: { telegram: true, email: 'daily' },
  active: true,
}

beforeEach(() => {
  ;[
    requireUser,
    requireAdmin,
    setResponseHeader,
    fetchMock,
    monitorFindOne,
    monitorFind,
    monitorUpsert,
    stateFindOne,
    stateFind,
    userFindById,
    apiAdminFetch,
    readBody,
  ].forEach(m => m.mockReset())
  useRuntimeConfig.mockImplementation(() => ({ apiBaseServer: 'http://api.test' }))
  requireUser.mockResolvedValue({
    uid: 'u1',
    email: 'ana@casa.uy',
    emailVerified: true,
    anonymous: false,
  })
  fetchMock.mockResolvedValue({
    propia: { name: 'Mi Casa' },
    gales: { name: 'Cambio Gales' },
    bcu: { name: 'BCU' },
  })
  apiAdminFetch.mockResolvedValue({ keys: [] })
})

describe('GET /api/me/monitor', () => {
  it('devuelve la configuración, el acceso y las casas sin el BCU', async () => {
    monitorFindOne.mockReturnValueOnce(
      lean({ ...good, uid: 'u1', email: 'ana@casa.uy', trialStartedAt: new Date() })
    )
    stateFindOne.mockReturnValueOnce(lean({ lastSentAt: new Date('2026-09-29T14:00:00Z') }))
    userFindById.mockReturnValueOnce(lean({ telegramChatId: '999' }))
    const res: any = await getH({} as any)
    expect(res.monitor).toMatchObject({ ownOrigin: 'propia', competitors: ['gales'] })
    expect(res.access).toMatchObject({ status: 'trial', daysLeft: 14 })
    expect(res.telegramLinked).toBe(true)
    expect(res.canCreate).toBe(true)
    expect(res.houses).toEqual([
      { id: 'gales', name: 'Cambio Gales' },
      { id: 'propia', name: 'Mi Casa' },
    ])
    expect(setResponseHeader).toHaveBeenCalledWith({}, 'cache-control', 'private, no-store')
  })

  it('una clave Empresa activa hace que el acceso sea Empresa', async () => {
    monitorFindOne.mockReturnValueOnce(
      lean({ ...good, uid: 'u1', trialStartedAt: new Date('2026-01-01T00:00:00Z') })
    )
    stateFindOne.mockReturnValueOnce(lean(null))
    userFindById.mockReturnValueOnce(lean(null))
    apiAdminFetch.mockResolvedValueOnce({ keys: [{ status: 'active', plan: 'business' }] })
    const res: any = await getH({} as any)
    expect(res.access).toEqual({ status: 'business' })
  })
})

describe('GET /api/me/monitor: bordes', () => {
  it('si la API de claves falla y la prueba venció, el acceso queda sin confirmar', async () => {
    monitorFindOne.mockReturnValueOnce(
      lean({ ...good, uid: 'u1', trialStartedAt: new Date('2026-01-01T00:00:00Z') })
    )
    stateFindOne.mockReturnValueOnce(lean(null))
    userFindById.mockReturnValueOnce(lean(null))
    apiAdminFetch.mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 502 }))
    const res: any = await getH({} as any)
    expect(res.access).toEqual({ status: 'unknown' })
  })

  it('el selector ofrece sólo casas con precio de mostrador hoy', async () => {
    fetchMock.mockImplementation(async (path: string) =>
      path === '/localData'
        ? {
            propia: { name: 'Mi Casa' },
            gales: { name: 'Cambio Gales' },
            soloebrou: { name: 'Solo eBROU' },
          }
        : [
            { origin: 'propia', type: '', buy: 40, sell: 42 },
            { origin: 'gales', type: 'BILLETE', buy: 40, sell: 42 },
            { origin: 'soloebrou', type: 'EBROU', buy: 40, sell: 42 },
          ]
    )
    monitorFindOne.mockReturnValueOnce(lean(null))
    stateFindOne.mockReturnValueOnce(lean(null))
    userFindById.mockReturnValueOnce(lean(null))
    const res: any = await getH({} as any)
    expect(res.houses.map((h: any) => h.id)).toEqual(['gales', 'propia'])
  })

  it('una casa ya guardada que hoy no publica sigue en el selector (si no, se borraría al guardar)', async () => {
    fetchMock.mockImplementation(async (path: string) =>
      path === '/localData'
        ? {
            propia: { name: 'Mi Casa' },
            gales: { name: 'Cambio Gales' },
            soloebrou: { name: 'Solo eBROU' },
          }
        : [
            { origin: 'propia', type: '', buy: 40, sell: 42 },
            { origin: 'gales', type: 'BILLETE', buy: 40, sell: 42 },
          ]
    )
    monitorFindOne.mockReturnValueOnce(
      lean({ ...good, competitors: ['gales', 'soloebrou'], uid: 'u1', trialStartedAt: new Date() })
    )
    stateFindOne.mockReturnValueOnce(lean(null))
    userFindById.mockReturnValueOnce(lean(null))
    const res: any = await getH({} as any)
    expect(res.houses.map((h: any) => h.id)).toEqual(['gales', 'propia', 'soloebrou'])
  })
})

describe('PUT /api/me/monitor', () => {
  it('una sesión de invitado o sin correo verificado no arma monitores', async () => {
    requireUser.mockResolvedValueOnce({
      uid: 'g',
      email: null,
      emailVerified: false,
      anonymous: true,
    })
    readBody.mockResolvedValueOnce(good)
    await expect(putH({} as any)).rejects.toMatchObject({ statusCode: 403 })
    expect(monitorUpsert).not.toHaveBeenCalled()
  })

  it('guarda con el correo de la sesión y fija la prueba sólo la primera vez', async () => {
    readBody.mockResolvedValueOnce({ ...good, email: 'otro@mail.uy', trialStartedAt: '2020-01-01' })
    monitorUpsert.mockReturnValueOnce(lean({}))
    expect(await putH({} as any)).toEqual({ ok: true })
    const [filter, update, options] = monitorUpsert.mock.calls[0]
    expect(filter).toEqual({ uid: 'u1' })
    expect(update.$set).toMatchObject({ ...good, email: 'ana@casa.uy' })
    expect(update.$set.trialStartedAt).toBeUndefined()
    expect(update.$setOnInsert.trialStartedAt).toBeInstanceOf(Date)
    expect(options).toMatchObject({ upsert: true })
  })

  it('una configuración inválida es 400 con el mensaje', async () => {
    readBody.mockResolvedValueOnce({ ...good, competitors: ['inventada'] })
    await expect(putH({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('sin la lista de casas no se puede validar: 502', async () => {
    fetchMock.mockRejectedValueOnce(new Error('api caída'))
    readBody.mockResolvedValueOnce(good)
    await expect(putH({} as any)).rejects.toMatchObject({ statusCode: 502 })
  })
})

describe('GET /api/admin/monitors', () => {
  it('exige administrador', async () => {
    requireAdmin.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { statusCode: 403 }))
    await expect(adminH({} as any)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('lista con acceso y último envío', async () => {
    requireAdmin.mockResolvedValueOnce({ uid: 'admin' })
    monitorFind.mockReturnValueOnce(
      sorted([{ ...good, uid: 'u1', email: 'ana@casa.uy', trialStartedAt: new Date() }])
    )
    stateFind.mockReturnValueOnce(
      lean([{ uid: 'u1', lastSentAt: new Date('2026-09-29T14:00:00Z') }])
    )
    apiAdminFetch.mockResolvedValueOnce({ keys: [] })
    const res: any = await adminH({} as any)
    expect(res.monitors[0]).toMatchObject({
      uid: 'u1',
      email: 'ana@casa.uy',
      access: { status: 'trial' },
    })
    expect(res.monitors[0].lastSentAt).toBe('2026-09-29T14:00:00.000Z')
  })
})
