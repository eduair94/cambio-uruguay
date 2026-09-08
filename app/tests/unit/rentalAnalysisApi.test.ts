import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const { connect, metadata, rows, aggregate, cursor, close, headers, availability } = vi.hoisted(
  () => ({
    connect: vi.fn(),
    metadata: vi.fn(),
    rows: vi.fn(),
    aggregate: vi.fn(),
    cursor: vi.fn(),
    close: vi.fn(),
    headers: vi.fn(),
    availability: vi.fn(),
  })
)
vi.mock('../../server/utils/db', () => ({ connectDb: connect }))
vi.mock('../../server/models/RentalMeta', () => ({
  RentalMetaModel: {
    findOne: () => ({ select: () => ({ maxTimeMS: () => ({ lean: metadata }) }) }),
  },
}))
vi.mock('../../server/models/RentalListing', () => ({
  RentalListingModel: { aggregate },
}))
vi.mock('../../server/utils/rentalAvailability', () => ({
  loadRentalAvailabilityIndex: availability,
}))
vi.mock('h3', async importOriginal => ({
  ...(await importOriginal<typeof import('h3')>()),
  getQuery: () => ({ department: 'Montevideo' }),
  readBody: () => ({
    department: 'Montevideo',
    neighborhood: 'Cordón',
    type: 'apartamento',
    bedrooms: 1,
    bathrooms: 1,
    currency: 'UYU',
    area: 48,
    areaBasis: 'total',
  }),
  setResponseHeader: headers,
}))

const now = new Date('2026-09-07T12:00:00Z')
const event = {} as H3Event
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(now)
  connect.mockResolvedValue(undefined)
  metadata.mockResolvedValue({ generatedAt: '2026-09-07T04:00:00Z' })
  availability.mockResolvedValue({ excludedAdvertIds: () => [] })
  rows.mockImplementation(async function* () {})
  close.mockResolvedValue(undefined)
  cursor.mockImplementation(() => ({ close, [Symbol.asyncIterator]: () => rows() }))
  aggregate.mockReturnValue({ option: () => ({ cursor }) })
})
afterEach(() => vi.useRealTimers())

describe('rental analysis source freshness', () => {
  it('rejects a stale catalogue even when the fresh listing query is empty', async () => {
    metadata.mockResolvedValue({ generatedAt: '2026-08-20T10:00:00Z' })
    const { loadRentalAnalysisCatalogue } = await import('../../server/utils/rentalAnalysis')
    await expect(loadRentalAnalysisCatalogue()).rejects.toMatchObject({
      code: 'RENTAL_ANALYSIS_STALE',
      generatedAt: '2026-08-20T10:00:00Z',
    })
    expect(aggregate).not.toHaveBeenCalled()
  })

  it('accepts the calendar-day boundary used by rental observation freshness', async () => {
    metadata.mockResolvedValue({ generatedAt: '2026-08-28T00:00:00Z' })
    const { loadRentalAnalysisCatalogue } = await import('../../server/utils/rentalAnalysis')
    await expect(loadRentalAnalysisCatalogue()).resolves.toMatchObject({
      catalogueProperties: 0,
      listings: [],
    })
  })

  it.each([undefined, 'invalid', '2026-09-08T00:00:00Z'])(
    'rejects missing, invalid or future metadata without calling it a stale snapshot: %s',
    async generatedAt => {
      metadata.mockResolvedValue({ generatedAt })
      const { loadRentalAnalysisCatalogue, RentalAnalysisStaleError } = await import(
        '../../server/utils/rentalAnalysis'
      )
      const result = await loadRentalAnalysisCatalogue().catch(error => error)
      expect(result).toBeInstanceOf(Error)
      expect(result).not.toBeInstanceOf(RentalAnalysisStaleError)
      expect(aggregate).not.toHaveBeenCalled()
    }
  )

  it('retries failed stale reads so a refreshed source recovers immediately', async () => {
    metadata.mockResolvedValueOnce({ generatedAt: '2026-08-20T10:00:00Z' })
    const { loadRentalAnalysisCatalogue } = await import('../../server/utils/rentalAnalysis')
    await expect(loadRentalAnalysisCatalogue()).rejects.toMatchObject({
      code: 'RENTAL_ANALYSIS_STALE',
    })
    await expect(loadRentalAnalysisCatalogue()).resolves.toMatchObject({
      generatedAt: '2026-09-07T04:00:00Z',
    })
    expect(metadata).toHaveBeenCalledTimes(3)
  })
})

describe('rental analysis complete streamed catalogue', () => {
  function streamProperties(count: number) {
    rows.mockImplementation(async function* () {
      for (let index = 0; index < count; index++) yield { key: `property-${index}`, offers: [] }
    })
  }

  it('accepts the observed population above 40,000 without sampling', async () => {
    streamProperties(51_017)
    const { loadRentalAnalysisCatalogue } = await import('../../server/utils/rentalAnalysis')
    await expect(loadRentalAnalysisCatalogue()).resolves.toMatchObject({
      catalogueProperties: 51_017,
      listings: [],
    })
    expect(cursor).toHaveBeenCalledWith({ batchSize: 500 })
    expect(aggregate).toHaveBeenCalledWith(expect.arrayContaining([{ $limit: 100_001 }]))
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('accepts exactly the hard cap but rejects its sentinel instead of caching a partial sample', async () => {
    streamProperties(100_001)
    const { loadRentalAnalysisCatalogue } = await import('../../server/utils/rentalAnalysis')
    await expect(loadRentalAnalysisCatalogue()).rejects.toThrow('complete read budget')
    expect(close).toHaveBeenCalledTimes(1)
    streamProperties(100_000)
    await expect(loadRentalAnalysisCatalogue()).resolves.toMatchObject({
      catalogueProperties: 100_000,
    })
    expect(close).toHaveBeenCalledTimes(2)
    expect(metadata).toHaveBeenCalledTimes(3)
  })

  it('normalizes each document before requesting the next raw document', async () => {
    const projected = vi.fn()
    rows.mockImplementation(async function* () {
      yield {
        key: 'property-1',
        get offers() {
          projected()
          return []
        },
      }
      expect(projected).toHaveBeenCalledOnce()
      yield { key: 'property-2', offers: [] }
    })
    const { loadRentalAnalysisCatalogue } = await import('../../server/utils/rentalAnalysis')
    await expect(loadRentalAnalysisCatalogue()).resolves.toMatchObject({ catalogueProperties: 2 })
    expect(close).toHaveBeenCalledOnce()
  })

  it('closes the cursor on a mid-stream failure and retries without exposing a partial cache', async () => {
    rows.mockImplementationOnce(async function* () {
      yield { key: 'property-1', offers: [] }
      throw new Error('cursor interrupted')
    })
    const { loadRentalAnalysisCatalogue } = await import('../../server/utils/rentalAnalysis')
    await expect(loadRentalAnalysisCatalogue()).rejects.toThrow('cursor interrupted')
    expect(close).toHaveBeenCalledOnce()
    await expect(loadRentalAnalysisCatalogue()).resolves.toMatchObject({ catalogueProperties: 0 })
    expect(close).toHaveBeenCalledTimes(2)
  })

  it('closes the cursor when own-offer projection fails', async () => {
    rows.mockImplementation(async function* () {
      yield {
        key: 'property-1',
        get offers() {
          throw new Error('document could not be normalized')
        },
      }
    })
    const { loadRentalAnalysisCatalogue } = await import('../../server/utils/rentalAnalysis')
    await expect(loadRentalAnalysisCatalogue()).rejects.toThrow('document could not be normalized')
    expect(close).toHaveBeenCalledOnce()
  })

  it('does not cache a completed stream when closing its cursor fails', async () => {
    close.mockRejectedValueOnce(new Error('cursor close failed'))
    const { loadRentalAnalysisCatalogue } = await import('../../server/utils/rentalAnalysis')
    await expect(loadRentalAnalysisCatalogue()).rejects.toThrow('cursor close failed')
    await expect(loadRentalAnalysisCatalogue()).resolves.toMatchObject({ catalogueProperties: 0 })
    expect(cursor).toHaveBeenCalledTimes(2)
  })

  it('shares one in-flight stream and serves the completed normalized cache until expiry', async () => {
    streamProperties(2)
    const { loadRentalAnalysisCatalogue } = await import('../../server/utils/rentalAnalysis')
    const [first, concurrent] = await Promise.all([
      loadRentalAnalysisCatalogue(),
      loadRentalAnalysisCatalogue(),
    ])
    expect(concurrent).toBe(first)
    expect(await loadRentalAnalysisCatalogue()).toBe(first)
    expect(cursor).toHaveBeenCalledOnce()
    vi.setSystemTime(now.getTime() + 60_001)
    await loadRentalAnalysisCatalogue()
    expect(cursor).toHaveBeenCalledOnce()
    vi.setSystemTime(now.getTime() + 600_001)
    await loadRentalAnalysisCatalogue()
    expect(cursor).toHaveBeenCalledTimes(2)
  })
})

describe('rental analysis cached responses keep availability current', () => {
  it('reuses aggregates only after checking reports and changes the key when hide_any changes', async () => {
    rows.mockImplementation(async function* () {
      yield {
        key: 'property-1',
        offers: [
          {
            source: 'infocasas',
            listingId: '123',
            title: 'Alquiler mensual apartamento',
            url: 'https://www.infocasas.com.uy/apartamento/123',
            price: 20000,
            currency: 'UYU',
            commonExpenses: null,
            commonExpensesCurrency: null,
            lastSeen: now.toISOString(),
            parkingSpaces: null,
            identity: {
              version: 1,
              propertyType: 'apartamento',
              department: 'Montevideo',
              neighborhood: 'Cordón',
              bedrooms: 1,
              bathrooms: 1,
              description: 'Alquiler mensual de vivienda.',
            },
          },
        ],
      }
    })
    const { loadRentalAnalysis } = await import('../../server/utils/rentalAnalysis')
    const first = await loadRentalAnalysis({ department: 'Montevideo' })
    expect(first.summary.count).toBe(1)
    expect(await loadRentalAnalysis({ department: 'Montevideo' })).toBe(first)
    expect(availability).toHaveBeenCalledTimes(2)
    availability.mockResolvedValueOnce({ excludedAdvertIds: () => ['rent:infocasas:123'] })
    expect((await loadRentalAnalysis({ department: 'Montevideo' })).summary.count).toBe(0)
    expect(await loadRentalAnalysis({ department: 'Montevideo' })).toBe(first)
    expect(cursor).toHaveBeenCalledOnce()
  })
  it('does not return a cached aggregate if availability cannot be validated', async () => {
    const { loadRentalAnalysis } = await import('../../server/utils/rentalAnalysis')
    await loadRentalAnalysis({})
    availability.mockRejectedValueOnce(new Error('reports unavailable'))
    await expect(loadRentalAnalysis({})).rejects.toThrow('reports unavailable')
  })
})

describe('rental analysis API unavailable responses', () => {
  it.each(['analysis', 'estimate'] as const)(
    'returns a non-cacheable 503 with the stale catalogue date for %s',
    async endpoint => {
      metadata.mockResolvedValue({ generatedAt: '2026-08-20T10:00:00Z' })
      const handler =
        endpoint === 'analysis'
          ? (await import('../../server/api/rentals/analysis.get')).default
          : (await import('../../server/api/rentals/estimate.post')).default
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 503,
        data: { code: 'RENTAL_ANALYSIS_STALE', generatedAt: '2026-08-20T10:00:00Z' },
      })
      expect(headers).toHaveBeenCalledWith(event, 'cache-control', 'no-store')
    }
  )

  it('does not expose arbitrary dependency failures as stale catalogue data', async () => {
    connect.mockRejectedValue(new Error('PRIVATE dependency details'))
    const handler = (await import('../../server/api/rentals/analysis.get')).default
    const error = await handler(event).catch(error => error)
    expect(error).toMatchObject({ statusCode: 503, data: undefined })
    expect(JSON.stringify(error)).not.toContain('PRIVATE')
  })

  it('retains a genuine empty 200 response when the catalogue metadata is current', async () => {
    const handler = (await import('../../server/api/rentals/analysis.get')).default
    await expect(handler(event)).resolves.toMatchObject({
      summary: { count: 0, rent: null },
      generatedAt: '2026-09-07T04:00:00Z',
    })
    expect(headers).toHaveBeenCalledWith(event, 'cache-control', 'public, max-age=30, s-maxage=60')
  })
})
