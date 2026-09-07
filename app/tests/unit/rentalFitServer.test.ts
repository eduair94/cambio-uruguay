import { createServer, request as httpRequest, type Server } from 'node:http'
import { once } from 'node:events'
import { createApp, toNodeListener, type H3Event } from 'h3'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RentalAvailabilityIndex } from '../../server/utils/rentalAvailabilityIndex'
import { rentalAvailabilityAdvertId } from '../../utils/rentalAvailability'
import { RentalListingModel } from '../../server/models/RentalListing'

const apiEvaluate = vi.hoisted(() => vi.fn())
vi.mock('../../server/utils/rentalFit', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/utils/rentalFit')>()),
  evaluateRentalFit: apiEvaluate,
}))
const {
  projectRentalFitCandidate,
  createRentalFitCatalogueLoader,
  currentRentalFitCandidates,
  createRentalFitService,
  RentalFitError,
} = await import('../../server/utils/rentalFit')
const { default: endpoint, readRentalFitBody } = await import('../../server/api/rentals/fit.post')

const now = Date.parse('2026-09-07T15:00:00.000Z')
const stamp = new Date(now).toISOString()
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(now)
})
afterEach(() => vi.restoreAllMocks())
const own = (id = '100', changes: Record<string, unknown> = {}) => ({
  source: 'infocasas',
  listingId: id,
  url: `https://www.infocasas.com.uy/qa/${id}`,
  title: 'Alquiler mensual apartamento unidad 101',
  price: 40_000,
  priceUyu: 40_000,
  currency: 'UYU',
  commonExpenses: 0,
  commonExpensesCurrency: 'UYU',
  sellerName: 'Agencia QA',
  sellerType: 'inmobiliaria',
  image: null,
  parkingSpaces: 1,
  petsAllowed: true,
  furnished: true,
  guarantees: ['anda'],
  firstSeen: stamp,
  lastSeen: stamp,
  publishedAt: null,
  identity: {
    version: 1,
    propertyType: 'apartamento',
    latitude: -34.9,
    longitude: -56.18,
    bedrooms: 2,
    area: 50,
    description: 'Alquiler mensual. Sin gastos comunes. PRIVATE_DESCRIPTION',
    secret: 'PRIVATE_IDENTITY',
  },
  details: { description: 'PRIVATE_DETAILS', images: ['PRIVATE_GALLERY'] },
  rawPhone: 'PRIVATE_PHONE',
  privateContact: 'PRIVATE_CONTACT',
  ...changes,
})
const property = (key = 'qa-home', offers = [own()], changes: Record<string, unknown> = {}) =>
  ({
    key,
    title: 'Apartamento QA',
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    address: 'PRIVATE_GROUP_ADDRESS',
    addressKey: 'PRIVATE_ADDRESS_KEY',
    latitude: -34.9,
    longitude: -56.18,
    bedrooms: 2,
    bathrooms: 1,
    area: 50,
    firstSeen: stamp,
    lastSeen: stamp,
    freshAt: stamp,
    offers,
    privateOwner: 'PRIVATE_OWNER',
    ...changes,
  }) as any
const input = (changes: Record<string, unknown> = {}) => ({
  people: [
    { id: 'person-1', label: 'PRIVATE_PERSON', incomeUyu: 90_000, remoteDays: 5, destinations: [] },
  ],
  housingBudgetUyu: 60_000,
  ...changes,
})
const summary = (count = 0) => ({
  count,
  lastReportedAt: count ? stamp : null,
  status: 'unconfirmed' as const,
})
const availability = (reported: string[] = []): RentalAvailabilityIndex => ({
  byAdvertId: new Map(reported.map(id => [id, summary(2)])),
  excludedAdvertIds: () => reported,
  summaryForOffers: offers =>
    summary(
      offers.some(offer =>
        reported.includes(rentalAvailabilityAdvertId(offer.source, offer.listingId)!)
      )
        ? 2
        : 0
    ),
})
const catalogue = (rows = [property()]) => ({
  generatedAt: stamp,
  usdUyu: 40,
  candidates: rows.map(row => projectRentalFitCandidate(row, now)!).filter(Boolean),
})
function cursor(rows: Iterable<any>) {
  return {
    async *[Symbol.asyncIterator]() {
      yield* rows
    },
    close: vi.fn(async () => undefined),
  }
}
const meta = async () => ({ generatedAt: stamp, usdUyu: 40 }) as any

describe('household catalogue evidence and privacy', () => {
  it('keeps homes above the economic catalogue price cap and explicitly projects every nested field', () => {
    const raw = property()
    raw.offers[0].guarantees = ['anda', 'deposito', 'unknown']
    raw.offers[0].agency = {
      version: 1,
      key: 'infocasas:123',
      name: 'Agencia QA',
      profileUrl: 'https://www.infocasas.com.uy/inmobiliarias/123-agencia',
      observedAt: stamp,
      secret: 'PRIVATE_AGENCY',
    }
    const result = projectRentalFitCandidate(raw, now)!
    expect(result.property.priceUyu).toBe(40000)
    expect(result.property.offers[0]!.commonExpenses).toBe(0)
    expect(result.property.offers[0]!.guarantees).toEqual(['anda'])
    expect(result.point).toEqual({ lat: -34.9, lng: -56.18 })
    expect(result.pointAdvertIds).toEqual(['rent:infocasas:100'])
    expect(JSON.stringify(result)).not.toContain('PRIVATE_')
    expect(result.property.offers[0]).not.toHaveProperty('identity')
    expect(result.property.offers[0]).not.toHaveProperty('details')
    expect(result.property.offers[0]).not.toHaveProperty('publicContact')
  })

  it.each([
    { identity: undefined },
    { identity: { version: 1, propertyType: 'oficina' } },
    { lastSeen: '2026-08-27T00:00:00Z' },
    { lastSeen: 'not-a-date' },
    { priceUyu: NaN },
    { url: 'javascript:alert(1)' },
    { title: 'Alquiler por día apartamento' },
  ])('rejects ineligible or expired own evidence: %j', patch => {
    expect(projectRentalFitCandidate(property('qa', [own('100', patch)]), now)).toBeNull()
  })

  it('never turns missing or contradictory expenses into zero', () => {
    const absent = own()
    absent.identity.description = 'Alquiler mensual apartamento'
    expect(
      projectRentalFitCandidate(property('qa', [absent]), now)!.property.offers[0]!.commonExpenses
    ).toBeNull()
    absent.identity.description = 'Sin gastos comunes. Gastos comunes $5000'
    expect(
      projectRentalFitCandidate(property('qa', [absent]), now)!.property.offers[0]!.commonExpenses
    ).toBeNull()
  })

  it('removes hidden, uncorroborated and conflicting group points without publishing coordinates elsewhere', () => {
    const hidden = own()
    hidden.identity = { ...hidden.identity, addressHidden: true } as any
    const different = own('101')
    different.identity.latitude = -34.95
    for (const rows of [[hidden], [different], [own(), different]]) {
      const result = projectRentalFitCandidate(property('qa', rows), now)!
      expect(result.point).toBeNull()
      expect(result.property.latitude).toBeNull()
      expect(result.property.longitude).toBeNull()
      expect(result.property.address).toBe('')
    }
  })

  it('does not use expired coordinates or conflicting specifications to satisfy household requirements', () => {
    const expired = own('100', { lastSeen: '2026-08-01' })
    const current = own('101')
    delete (current.identity as any).latitude
    expect(projectRentalFitCandidate(property('qa', [expired, current]), now)!.point).toBeNull()
    current.identity.bedrooms = 1
    current.identity.area = 40
    const result = projectRentalFitCandidate(property('qa', [current]), now)!
    expect(result.property).toMatchObject({ bedrooms: null, area: null })
  })

  it('refreshes advert-level reports and invalidates a point whose only corroborating advert is hidden', () => {
    const second = own('101')
    delete (second.identity as any).latitude
    const stored = catalogue([property('qa', [own(), second])])
    const latest = availability(['rent:infocasas:100'])
    const shown = currentRentalFitCandidates(stored, latest, false, now)[0]!
    expect(shown.property.offers.map(offer => offer.availability?.count)).toEqual([2, 0])
    const hidden = currentRentalFitCandidates(stored, latest, true, now)[0]!
    expect(hidden.point).toBeNull()
    expect(hidden.property.offers.map(offer => offer.listingId)).toEqual(['101'])
    expect(hidden.property.latitude).toBeNull()
    expect(JSON.stringify(hidden)).not.toContain('pointAdvertIds')
    expect(stored.candidates[0]!.property.offers).toHaveLength(2)
  })

  it('reevaluates freshness after midnight without waiting for the public cache to expire', () => {
    const stored = catalogue([property('qa', [own('100', { lastSeen: '2026-08-28T12:00:00Z' })])])
    expect(currentRentalFitCandidates(stored, availability(), false, now)).toHaveLength(1)
    expect(
      currentRentalFitCandidates(stored, availability(), false, now + 86_400_000)
    ).toHaveLength(0)
  })
})

describe('bounded full catalogue loading', () => {
  it('uses a bounded database cursor without a budget, sort or pagination slice', async () => {
    const reader = cursor([property()])
    const query = {
      collation: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      cursor: vi.fn(() => reader),
    }
    const aggregate = vi.spyOn(RentalListingModel, 'aggregate').mockReturnValue(query as any)
    const load = createRentalFitCatalogueLoader({ readMeta: meta, now: () => now })
    expect((await load()).candidates).toHaveLength(1)
    const stages = aggregate.mock.calls[0]![0] as Record<string, any>[]
    expect(stages[0]).toEqual({ $match: { propertyType: { $in: ['casa', 'apartamento'] } } })
    expect(stages.filter(stage => '$limit' in stage)).toEqual([{ $limit: 60_001 }])
    expect(stages.some(stage => '$skip' in stage || '$sort' in stage)).toBe(false)
    expect(JSON.stringify(stages)).not.toContain('25000')
    const projection = stages.at(-1)!.$project
    expect(projection['offers.identity.addressHidden']).toBe(1)
    expect(projection['offers.identity.latitude']).toBe(1)
    expect(projection['offers.identity.description']).toBe(1)
    expect(projection).not.toHaveProperty('offers.identity')
    expect(projection).not.toHaveProperty('offers.details')
    expect(projection).not.toHaveProperty('offers.rawPhone')
    expect(query.option).toHaveBeenCalledWith({ maxTimeMS: 20_000 })
    expect(query.cursor).toHaveBeenCalledWith({ batchSize: 500 })
    expect(reader.close).toHaveBeenCalledOnce()
  })

  it('coalesces loading and minute revalidation while retaining only the unchanged public snapshot', async () => {
    let clock = now
    const reader = cursor([property()])
    const openCursor = vi.fn(() => reader),
      readMeta = vi.fn(meta)
    const load = createRentalFitCatalogueLoader({ readMeta, openCursor, now: () => clock })
    const [a, b] = await Promise.all([load(), load()])
    expect(a).toBe(b)
    expect(openCursor).toHaveBeenCalledTimes(1)
    expect(reader.close).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(a)).not.toContain('PRIVATE_')
    clock += 59_999
    await load()
    expect(readMeta).toHaveBeenCalledTimes(1)
    clock += 2
    const [c, d] = await Promise.all([load(), load()])
    expect(readMeta).toHaveBeenCalledTimes(2)
    expect(c).toBe(a)
    expect(d).toBe(a)
    expect(openCursor).toHaveBeenCalledTimes(1)
  })

  it.each([
    { generatedAt: '2026-09-07T15:01:00.000Z', usdUyu: 40 },
    { generatedAt: stamp, usdUyu: 41 },
  ])('reloads when either metadata fingerprint field changes: %j', async changedMeta => {
    let clock = now
    const readMeta = vi.fn(meta)
    const openCursor = vi.fn(() => cursor([property()]))
    const load = createRentalFitCatalogueLoader({ readMeta, openCursor, now: () => clock })
    const first = await load()
    clock += 60_000
    readMeta.mockResolvedValue(changedMeta)
    const updated = await load()
    expect(updated).not.toBe(first)
    expect(updated).toMatchObject(changedMeta)
    expect(openCursor).toHaveBeenCalledTimes(2)
  })

  it('forces a full reread at ten minutes even immediately after unchanged metadata revalidation', async () => {
    let clock = now
    const openCursor = vi.fn(() => cursor([property()]))
    const load = createRentalFitCatalogueLoader({ readMeta: meta, openCursor, now: () => clock })
    const first = await load()
    clock += 10 * 60_000 - 1
    expect(await load()).toBe(first)
    expect(openCursor).toHaveBeenCalledTimes(1)
    clock++
    expect(await load()).not.toBe(first)
    expect(openCursor).toHaveBeenCalledTimes(2)
  })

  it('does not return a cached snapshot when metadata revalidation fails and retries the next call', async () => {
    let clock = now
    const readMeta = vi.fn(meta)
    const openCursor = vi.fn(() => cursor([property()]))
    const load = createRentalFitCatalogueLoader({ readMeta, openCursor, now: () => clock })
    const first = await load()
    clock += 60_000
    readMeta.mockRejectedValueOnce(new Error('PRIVATE_METADATA_FAILURE'))
    await expect(load()).rejects.toThrow()
    expect(await load()).toBe(first)
    expect(readMeta).toHaveBeenCalledTimes(3)
    expect(openCursor).toHaveBeenCalledTimes(1)
  })

  it('discards the old snapshot if a required full reload fails', async () => {
    let clock = now
    const readMeta = vi.fn(meta)
    const openCursor = vi.fn(() => cursor([property()]))
    const load = createRentalFitCatalogueLoader({ readMeta, openCursor, now: () => clock })
    const first = await load()
    clock += 60_000
    readMeta.mockResolvedValue({ generatedAt: stamp, usdUyu: 41 })
    openCursor.mockImplementationOnce(() => {
      throw new Error('PRIVATE_CURSOR_FAILURE')
    })
    await expect(load()).rejects.toThrow()
    expect(await load()).not.toBe(first)
    expect(openCursor).toHaveBeenCalledTimes(3)
  })

  it.each([{ maxRows: 1 }, { maxBytes: 1 }])(
    'refuses an incomplete catalogue instead of caching a truncated answer: %j',
    async limits => {
      const reader = cursor([property('a'), property('b')])
      const openCursor = vi.fn(() => reader)
      const load = createRentalFitCatalogueLoader({
        readMeta: meta,
        openCursor,
        now: () => now,
        ...limits,
      })
      await expect(load()).rejects.toMatchObject({ statusCode: 503 })
      await expect(load()).rejects.toMatchObject({ statusCode: 503 })
      expect(openCursor).toHaveBeenCalledTimes(2)
      expect(reader.close).toHaveBeenCalledTimes(2)
    }
  )

  it('streams beyond 25,000 rows and lets the final eligible home participate', async () => {
    function* rows() {
      for (let i = 0; i < 25_002; i++)
        yield property(`home-${i}`, [own(String(i), { price: 50_000, priceUyu: 50_000 })])
    }
    const reader = cursor(rows())
    const load = createRentalFitCatalogueLoader({
      readMeta: meta,
      openCursor: () => reader,
      now: () => now,
    })
    const result = await load()
    expect(result.candidates).toHaveLength(25_002)
    expect(result.candidates.at(-1)!.property.key).toBe('home-25001')
    expect(reader.close).toHaveBeenCalledOnce()
  }, 20_000)
})

describe('private scenario evaluation and admission', () => {
  it('never caches the scenario or ranking and reloads report summaries for every evaluation', async () => {
    const loadCatalogue = vi.fn(async () => catalogue()),
      loadAvailability = vi.fn(async () => availability())
    const service = createRentalFitService({ loadCatalogue, loadAvailability, now: () => now })
    const first = await service(async () => input(), 'client')
    const second = await service(async () => input({ housingBudgetUyu: 30_000 }), 'client')
    expect(first.matched).toBe(1)
    expect(second.matched).toBe(0)
    expect(loadAvailability).toHaveBeenCalledTimes(2)
    expect(loadCatalogue.mock.calls).toEqual([[], []])
    expect(JSON.stringify(first)).not.toContain('PRIVATE_')
    expect(first).not.toHaveProperty('people')
  })

  it('rejects invalid or oversized scenarios before loading any catalogue and discards private causes', async () => {
    const loadCatalogue = vi.fn(async () => catalogue())
    const service = createRentalFitService({ loadCatalogue, now: () => now })
    await expect(
      service(async () => ({ people: 'PRIVATE_COORDINATES' }), 'client')
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(loadCatalogue).not.toHaveBeenCalled()
    const failing = createRentalFitService({
      loadCatalogue: async () => {
        throw new Error('PRIVATE_DB_INCOME')
      },
      loadAvailability: async () => availability(),
      now: () => now,
    })
    try {
      await failing(async () => input(), 'client')
      throw new Error('Expected failure')
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 503 })
      expect(error).not.toHaveProperty('cause')
      expect(String(error)).not.toContain('PRIVATE_')
    }
  })

  it('limits simultaneous work before even reading the scenario, then releases admission on failure', async () => {
    let release!: () => void
    const pending = new Promise<void>(resolve => {
      release = resolve
    })
    const service = createRentalFitService({
      loadCatalogue: async () => {
        await pending
        return catalogue()
      },
      loadAvailability: async () => availability(),
      now: () => now,
    })
    const active = Array.from({ length: 4 }, (_, i) => service(async () => input(), `client-${i}`))
    const read = vi.fn(async () => input())
    await expect(service(read, 'fifth')).rejects.toMatchObject({ statusCode: 429 })
    expect(read).not.toHaveBeenCalled()
    release()
    await Promise.all(active)
    await expect(service(read, 'fifth')).resolves.toHaveProperty('matched', 1)
  })

  it('bounds repeated requests per client, and the limit resets without retaining scenario content', async () => {
    let clock = now
    const service = createRentalFitService({
      loadCatalogue: async () => catalogue(),
      loadAvailability: async () => availability(),
      now: () => clock,
    })
    for (let i = 0; i < 10; i++) await service(async () => input(), 'client')
    await expect(service(async () => input(), 'client')).rejects.toMatchObject({ statusCode: 429 })
    clock += 60_000
    await expect(service(async () => input(), 'client')).resolves.toHaveProperty('matched', 1)
  })
})

describe('POST transport privacy and byte limit', () => {
  let server: Server, base: string
  beforeAll(async () => {
    server = createServer(
      toNodeListener(createApp({ debug: false }).use('/api/rentals/fit', endpoint))
    )
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    base = `http://127.0.0.1:${(server.address() as any).port}/api/rentals/fit`
  })
  afterAll(async () => {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  })
  beforeEach(() => {
    apiEvaluate.mockReset().mockImplementation(async (read: () => Promise<unknown>) => {
      await read()
      return { matched: 0, results: [] }
    })
  })

  it.each([
    ['valid', JSON.stringify(input()), 200],
    ['malformed', '{"PRIVATE_INCOME":', 400],
    ['oversized', JSON.stringify({ private: 'x'.repeat(25 * 1024) }), 400],
  ] as const)(
    'keeps %s responses out of shared caches and never echoes the request',
    async (_label, body, status) => {
      const response = await fetch(base, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      })
      expect(response.status).toBe(status)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.text()).not.toContain('PRIVATE_')
    }
  )

  it('bounds chunked bodies even without a Content-Length header', async () => {
    const result = await new Promise<{ status: number; cache: unknown; body: string }>(
      (resolve, reject) => {
        const req = httpRequest(
          base,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'transfer-encoding': 'chunked' },
          },
          res => {
            let body = ''
            res.on('data', chunk => {
              body += chunk
            })
            res.on('end', () =>
              resolve({ status: res.statusCode!, cache: res.headers['cache-control'], body })
            )
          }
        )
        req.on('error', reject)
        req.write('{"private":"')
        req.write('x'.repeat(24 * 1024))
        req.end('"}')
      }
    )
    expect(result.status).toBe(400)
    expect(result.cache).toBe('no-store')
    expect(result.body).not.toContain('private')
  })

  it.each([429, 503] as const)('keeps %i errors private with no diagnostic cause', async status => {
    apiEvaluate.mockRejectedValueOnce(new RentalFitError(status))
    const response = await fetch(base, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input()),
    })
    expect(response.status).toBe(status)
    expect(response.headers.get('cache-control')).toBe('no-store')
    if (status === 429) expect(response.headers.get('retry-after')).toBe('60')
    expect(await response.text()).not.toContain('PRIVATE_')
  })

  it('does not publish an unexpected downstream error or its cause', async () => {
    apiEvaluate.mockRejectedValueOnce(
      new Error('PRIVATE_INCOME', { cause: new Error('PRIVATE_COORDINATES') })
    )
    const response = await fetch(base, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input()),
    })
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).not.toContain('PRIVATE_')
  })

  it('also releases web stream readers at the five-second deadline', async () => {
    vi.useFakeTimers()
    const cancel = vi.fn(() => new Promise<void>(() => {}))
    const stream = new ReadableStream({ cancel })
    const event = {
      method: 'POST',
      node: { req: { headers: { 'content-type': 'application/json' } } },
      web: { request: { body: stream } },
    } as unknown as H3Event
    try {
      const pending = expect(readRentalFitBody(event)).rejects.toMatchObject({ statusCode: 400 })
      await vi.advanceTimersByTimeAsync(5000)
      await pending
      expect(cancel).toHaveBeenCalledTimes(1)
      expect(stream.locked).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})
