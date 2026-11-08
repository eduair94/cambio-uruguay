import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

// POST /api/rental-feedback stores the micro-survey's first tap and returns the row's id;
// PATCH /api/rental-feedback/:id completes THAT row with reasons and a comment, only from the
// browser that tapped, only a `micro` row and only within 30 minutes. The model is an in-memory
// fake that applies the same filter Mongo would, so the handler's filter is what is tested.
interface Row {
  _id: string
  kind: string
  surface: string
  zone: string | null
  propertyKey: string | null
  found: string | null
  reasons: string[]
  comment: string
  clientId: string | null
  createdAt: Date
}
const rows: Row[] = []
let sequence = 0

const create = vi.fn(async (doc: Omit<Row, '_id' | 'createdAt'>) => {
  const row = { ...doc, _id: (++sequence).toString(16).padStart(24, 'a'), createdAt: new Date() }
  rows.push(row as Row)
  return row
})
const findOneAndUpdate = vi.fn(
  (
    filter: { _id: string; kind: string; clientId: string; createdAt: { $gte: Date } },
    update: { $set: Partial<Row> }
  ) => {
    const row = rows.find(
      item =>
        item._id === filter._id &&
        item.kind === filter.kind &&
        item.clientId === filter.clientId &&
        item.createdAt >= filter.createdAt.$gte
    )
    const before = row ? { ...row } : null
    if (row) Object.assign(row, update.$set)
    return { lean: async () => before }
  }
)
vi.mock('../../server/models/RentalFeedback', () => ({
  RentalFeedbackModel: { create, findOneAndUpdate, updateOne: vi.fn() },
}))
vi.mock('../../server/models/RentalAlert', () => ({
  RentalAlertModel: { findById: vi.fn(() => ({ lean: async () => null })) },
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn(async () => {}) }))
const sendTelegram = vi.fn(async () => true)
vi.mock('../../server/utils/telegram', () => ({
  sendTelegram,
  escapeTelegramMarkdown: (text: string) => text,
}))

const { readBody, getRouterParam, useRuntimeConfig } = installNitroGlobals()
let ip = '198.51.100.1'
vi.stubGlobal('setResponseHeaders', vi.fn())
vi.stubGlobal('getRequestIP', () => ip)

const post = (await import('../../server/api/rental-feedback/index.post')).default as (
  event: unknown
) => Promise<{ ok: boolean; id?: string }>
const patch = (await import('../../server/api/rental-feedback/[id].patch')).default as (
  event: unknown
) => Promise<{ ok: boolean }>

const browser = 'a1b2c3d4e5f6a7b8c9d0e1f2'
let ipCounter = 0
/** Each test answers from its own address: the per-IP limits live in the modules. */
const freshAddress = () => {
  ip = `198.51.100.${++ipCounter}`
}

async function tap(body: Record<string, unknown> = {}) {
  readBody.mockResolvedValueOnce({
    kind: 'micro',
    surface: 'ficha',
    path: '/alquileres/montevideo-cordon-1rt3jaj',
    propertyKey: 'montevideo-cordon-1rt3jaj',
    found: 'no',
    clientId: browser,
    ...body,
  })
  return post({})
}

async function complete(rowId: string, body: Record<string, unknown>) {
  getRouterParam.mockReturnValueOnce(rowId)
  readBody.mockResolvedValueOnce(body)
  return patch({})
}

beforeEach(() => {
  rows.length = 0
  // A honeypot request returns before reading its id: drop any value it left queued.
  readBody.mockReset()
  getRouterParam.mockReset()
  create.mockClear()
  findOneAndUpdate.mockClear()
  sendTelegram.mockClear()
  useRuntimeConfig.mockImplementation(() => ({ telegram: { adminChatId: '714847253' } }))
  freshAddress()
})

describe('the first tap', () => {
  it('is stored on its own and returns the row id', async () => {
    const answer = await tap()
    expect(answer).toEqual({ ok: true, id: rows[0]!._id })
    expect(rows[0]).toMatchObject({ kind: 'micro', found: 'no', reasons: [], comment: '' })
    // No comment yet: nobody is notified.
    expect(sendTelegram).not.toHaveBeenCalled()
  })

  it('a suggestion-box answer stays whole and gets no id back', async () => {
    readBody.mockResolvedValueOnce({ kind: 'box', surface: 'directorio', comment: 'Más fotos' })
    expect(await post({})).toEqual({ ok: true })
    expect(sendTelegram).toHaveBeenCalledTimes(1)
  })

  it('a honeypot answer returns ok without writing', async () => {
    expect(await tap({ website: 'https://spam.example' })).toEqual({ ok: true })
    expect(create).not.toHaveBeenCalled()
  })
})

describe('the follow-up', () => {
  it('completes the same row from the same browser within 30 minutes, and notifies once', async () => {
    const { id } = await tap()
    const body = { clientId: browser, reasons: ['avisos-viejos'], comment: 'Ya no estaba' }
    expect(await complete(id!, body)).toEqual({ ok: true })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ reasons: ['avisos-viejos'], comment: 'Ya no estaba' })
    expect(sendTelegram).toHaveBeenCalledTimes(1)
    expect(String((sendTelegram.mock.calls[0] as unknown[])[1])).toContain('Faltó: Avisos que ya')
    // The same comment again (a double tap on "Enviar") does not notify twice.
    expect(await complete(id!, body)).toEqual({ ok: true })
    expect(sendTelegram).toHaveBeenCalledTimes(1)
  })

  it('is a 404 from another browser, on an old row, on a non-micro row or an unknown id', async () => {
    const { id } = await tap()
    await expect(
      complete(id!, { clientId: 'ffffffffffffffffffffffff', comment: 'hola' })
    ).rejects.toMatchObject({ statusCode: 404 })

    rows[0]!.createdAt = new Date(Date.now() - 31 * 60_000)
    await expect(complete(id!, { clientId: browser, comment: 'hola' })).rejects.toMatchObject({
      statusCode: 404,
    })

    rows[0]!.createdAt = new Date()
    rows[0]!.kind = 'box'
    await expect(complete(id!, { clientId: browser, comment: 'hola' })).rejects.toMatchObject({
      statusCode: 404,
    })

    await expect(
      complete('not-an-id', { clientId: browser, comment: 'hola' })
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(rows[0]!.comment).toBe('')
  })

  it('refuses a follow-up that adds nothing', async () => {
    const { id } = await tap()
    await expect(
      complete(id!, { clientId: browser, reasons: ['inventado'] })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('a honeypot follow-up returns ok without writing', async () => {
    const { id } = await tap()
    expect(await complete(id!, { clientId: browser, comment: 'x', website: 'spam' })).toEqual({
      ok: true,
    })
    expect(findOneAndUpdate).not.toHaveBeenCalled()
    expect(rows[0]!.comment).toBe('')
  })
})

describe('per-IP limits', () => {
  it('apply to the answer: the sixth in a minute is refused', async () => {
    for (let index = 0; index < 5; index++) await tap()
    await expect(tap()).rejects.toMatchObject({ statusCode: 429 })
  })

  it('apply to the follow-up too', async () => {
    const { id } = await tap()
    freshAddress()
    for (let index = 0; index < 5; index++) {
      await complete(id!, { clientId: browser, comment: `intento ${index}` })
    }
    await expect(complete(id!, { clientId: browser, comment: 'otro' })).rejects.toMatchObject({
      statusCode: 429,
    })
  })
})
