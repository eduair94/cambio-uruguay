import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createSharedLink,
  createSharedLinkLimiter,
  readSharedLink,
  readSharedLinkBody,
  sharedLinkText,
} from '../../server/utils/sharedLinks'

const mocks = vi.hoisted(() => ({
  connectDb: vi.fn(),
  init: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOne: vi.fn(),
  findById: vi.fn(),
  getHeader: vi.fn(),
  getRequestWebStream: vi.fn(),
}))
vi.mock('../../server/utils/db', () => ({ connectDb: mocks.connectDb }))
vi.mock('../../server/models/SharedLink', () => ({
  SharedLinkModel: {
    init: mocks.init,
    findOneAndUpdate: mocks.findOneAndUpdate,
    findOne: mocks.findOne,
    findById: mocks.findById,
  },
}))
vi.mock('h3', () => ({
  getHeader: mocks.getHeader,
  getRequestWebStream: mocks.getRequestWebStream,
}))

const doc = {
  _id: 'AbCd_0123-xy',
  path: '/comparar?moneda=USD',
  title: 'Dólar',
  description: 'Dos casas',
  targetHash: 'never-public',
  createdAt: new Date('2026-11-05'),
}
const query = (value: unknown) => ({ lean: () => ({ exec: async () => value }) })
const failedQuery = (error: unknown) => ({
  lean: () => ({
    exec: async () => {
      throw error
    },
  }),
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.connectDb.mockResolvedValue(undefined)
  mocks.init.mockResolvedValue(undefined)
  mocks.findOneAndUpdate.mockReturnValue(query(doc))
  mocks.findById.mockReturnValue(query(doc))
  mocks.getHeader.mockImplementation((_event, key) =>
    key === 'content-type' ? 'application/json' : undefined
  )
})

describe('durable shared links', () => {
  it('upserts by destination, writes immutable metadata and returns only public fields', async () => {
    const result = await createSharedLink({
      path: '/comparar?utm_source=x&moneda=USD',
      title: '<b>Dólar</b>',
      description: 'Dos casas',
    })
    expect(result).toMatchObject({
      id: doc._id,
      url: `https://cambio-uruguay.com/s/${doc._id}`,
      path: doc.path,
      description: 'Moneda: USD',
    })
    const [filter, update, options] = mocks.findOneAndUpdate.mock.calls[0]!
    expect(filter.targetHash).toMatch(/^[a-f0-9]{64}$/)
    expect(update.$setOnInsert._id).toMatch(/^[\w-]{12}$/)
    expect(update.$setOnInsert.path).toBe(doc.path)
    expect(update.$set).toBeUndefined()
    expect(options).toMatchObject({ upsert: true, new: true, runValidators: true })
    expect(mocks.init).toHaveBeenCalledOnce()
    await createSharedLink({ path: doc.path, title: 'Dólar', description: doc.description })
    expect(mocks.findOneAndUpdate.mock.calls[1]![0]).toEqual(filter)
    // The text the request carries is not the link's: another text is the same link.
    await createSharedLink({ path: doc.path, title: 'Otro texto', description: 'Otro' })
    expect(mocks.findOneAndUpdate.mock.calls[2]![0]).toEqual(filter)
  })

  // 2026-11-08: the request body used to write the card's title and description, so anyone could
  // mint a cambio-uruguay.com link whose branded page and card said whatever they typed.
  it('never publishes words from the request or from free-text filters', async () => {
    const result = await createSharedLink({
      path: '/alquileres-uruguay?q=Banco cerrado llame al 099 123 456&department=montevideo&bedrooms=2&neighborhood=Estafa',
      title: 'Aviso oficial: el BROU cerró',
      description: 'Llamá al 099 123 456',
    })
    const written = mocks.findOneAndUpdate.mock.calls[0]![1].$setOnInsert
    for (const text of [result.title, result.description, written.title, written.description]) {
      expect(text).not.toMatch(/BROU|099|Llam|Banco|Estafa/i)
    }
    // normalizeSharePath sorts the query, so the parts follow its order.
    expect(written.description).toBe('Dormitorios: 2 · Departamento: Montevideo')
    expect(written.title).not.toBe('Cambio Uruguay')
    // A stored row, whatever it says, is answered with text recomputed from its path.
    mocks.findById.mockReturnValueOnce(
      query({ ...doc, title: 'Texto inyectado', description: 'Inyectado' })
    )
    const read = await readSharedLink(doc._id)
    expect(read.title).not.toMatch(/inyectado/i)
    expect(read.description).toBe('Moneda: USD')
  })

  it('names the target by the site navigation, falling back to the closest listed page', () => {
    const listed = sharedLinkText('/alquileres-uruguay?bedrooms=1')
    expect(listed.title).not.toBe('Cambio Uruguay')
    expect(sharedLinkText('/en/alquileres-uruguay?bedrooms=1').title).toBe(listed.title)
    expect(sharedLinkText('/zzz-no-existe/abc?moneda=USD')).toEqual({
      title: 'Cambio Uruguay',
      description: 'Moneda: USD',
    })
    expect(sharedLinkText('/?from=USD').title).toBe('Cambio Uruguay')
  })

  it('resolves a concurrent identical insert without overwriting its ID', async () => {
    mocks.findOneAndUpdate.mockReturnValueOnce(failedQuery({ code: 11000 }))
    mocks.findOne.mockReturnValueOnce(query(doc))
    expect((await createSharedLink({ path: doc.path })).id).toBe(doc._id)
    expect(mocks.findOneAndUpdate).toHaveBeenCalledOnce()
  })

  it('retries the random ID when a collision belongs to different content', async () => {
    mocks.findOneAndUpdate.mockReturnValueOnce(failedQuery({ code: 11000 }))
    mocks.findOne.mockReturnValueOnce(query(null))
    expect((await createSharedLink({ path: doc.path })).id).toBe(doc._id)
    expect(mocks.findOneAndUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.findOneAndUpdate.mock.calls[0]![1].$setOnInsert._id).not.toBe(
      mocks.findOneAndUpdate.mock.calls[1]![1].$setOnInsert._id
    )
  })

  it.each([
    null,
    [],
    {},
    { path: '/cuenta' },
    { path: 'https://example.com' },
    { path: '/s/AbCd_0123-xy' },
  ])('rejects invalid and nested targets before database access', async body => {
    await expect(createSharedLink(body)).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.connectDb).not.toHaveBeenCalled()
  })

  it('validates IDs before lookup, and revalidates stored routes before publishing', async () => {
    await expect(readSharedLink('../cuenta')).rejects.toMatchObject({ statusCode: 404 })
    expect(mocks.connectDb).not.toHaveBeenCalled()
    mocks.findById.mockReturnValueOnce(query({ ...doc, path: 'https://evil.example/' }))
    await expect(readSharedLink(doc._id)).rejects.toMatchObject({ statusCode: 404 })
    mocks.findById.mockReturnValueOnce(query(null))
    await expect(readSharedLink(doc._id)).rejects.toMatchObject({ statusCode: 404 })
    expect(await readSharedLink(doc._id)).not.toHaveProperty('targetHash')
  })
})

describe('share request bounds', () => {
  it('limits per-IP and total throughput, then admits again after the window', () => {
    let time = 0
    const take = createSharedLinkLimiter(() => time)
    for (let n = 0; n < 10; n++) take('one')
    expect(() => take('one')).toThrow()
    for (let n = 0; n < 50; n++) take(`other-${n}`)
    expect(() => take('another')).toThrow()
    time = 60_001
    expect(() => take('one')).not.toThrow()
  })

  const event = { web: { request: {} }, node: { req: {} } } as any
  const stream = (body: string) =>
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body))
        controller.close()
      },
    })

  it('reads JSON from a stream and rejects invalid JSON', async () => {
    mocks.getRequestWebStream.mockReturnValueOnce(stream('{"path":"/comparar"}'))
    expect(await readSharedLinkBody(event)).toEqual({ path: '/comparar' })
    mocks.getRequestWebStream.mockReturnValueOnce(stream('invalid'))
    await expect(readSharedLinkBody(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('bounds actual bytes without a declared content length', async () => {
    mocks.getRequestWebStream.mockReturnValueOnce(stream('x'.repeat(16 * 1024 + 1)))
    await expect(readSharedLinkBody(event)).rejects.toMatchObject({ statusCode: 413 })
  })

  it('times out a stalled stream without a reader lock failure', async () => {
    vi.useFakeTimers()
    try {
      mocks.getRequestWebStream.mockReturnValueOnce(
        new ReadableStream({
          pull: () => new Promise(() => {}),
        })
      )
      const result = readSharedLinkBody(event).catch(error => error)
      await vi.advanceTimersByTimeAsync(5001)
      expect(await result).toMatchObject({ statusCode: 400 })
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects non-JSON and oversized declared bodies before opening the stream', async () => {
    mocks.getHeader.mockReturnValueOnce('application/x-www-form-urlencoded')
    await expect(readSharedLinkBody(event)).rejects.toMatchObject({ statusCode: 400 })
    mocks.getHeader.mockImplementation((_event, key) =>
      key === 'content-type' ? 'application/json' : '999999'
    )
    await expect(readSharedLinkBody(event)).rejects.toMatchObject({ statusCode: 413 })
    expect(mocks.getRequestWebStream).not.toHaveBeenCalled()
  })
})
