// Optional read-only integration check of /api/rentals' two passes. $documents runs synthetic
// fixtures without creating a collection or writing anything. Set RENTALS_TEST_MONGO_URI to run it
// on MongoDB 6+ (never production: CI sets none, and production is 4.4, which has no $documents).
//
// What it proves: for every sort and a spread of filters, the page the route answers with its
// window pass + cards pass is deep-equal to the page today's single pass answers, on pages 1, 2 and
// the last. Both answers come from the ROUTE FILE itself, run in a VM with every Mongo call sent to
// the test server through the route's memo module (server/utils/rentalDirectoryData.ts, with a
// fresh memo per request): the window and the cards as the route issues them, and the single pass
// as its fallback.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import mongoose from 'mongoose'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import * as rentals from '../../utils/rentals'
import * as rentalDirectoryParts from '../../utils/rentalDirectoryParts'
import * as rentalDetail from '../../server/utils/rentalDetail'
import * as rentalDirectoryOrder from '../../server/utils/rentalDirectoryOrder'
import * as rentalGalleryPreview from '../../server/utils/rentalGalleryPreview'
import * as rentalMemo from '../../server/utils/rentalMemo'
import {
  createRentalDirectoryAggregate,
  createRentalDirectoryData,
  type RentalAggregateChain,
} from '../../server/utils/rentalDirectoryData'

type Stage = Record<string, any>
type Row = Record<string, any> & { key: string }

const uri = process.env.RENTALS_TEST_MONGO_URI
const compiled = ts.transpileModule(
  readFileSync(join(__dirname, '../../server/api/rentals/index.get.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
).outputText

const DAY = 86_400_000
const day = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10)
// Letters only: a fixture `key` with digits reads as a secret to the repository's scanner.
const name = (i: number) =>
  String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26))

/**
 * 40 properties built to make the sorts tie and the filters split: prices repeat every six homes
 * (the key decides), some areas and coordinates are missing (unknown-last), some homes have a
 * second portal (one in dollars, cheaper in pesos), one offer of each fifth home is stale, and
 * pets, owners, amenities, drops and publication days are spread over different homes.
 */
function fixtureDocuments() {
  const today = day(0)
  const base = Date.parse(`${today}T00:00:00Z`) / 1000
  return Array.from({ length: 40 }, (_, i) => {
    const department = i % 3 === 2 ? 'Canelones' : 'Montevideo'
    const neighborhood =
      department === 'Canelones' ? 'Atlántida' : ['Pocitos', 'Cordón', 'Centro'][i % 3]!
    const propertyType = ['apartamento', 'casa', 'apartamento', 'habitacion', 'oficina'][i % 5]!
    const key = `${department.toLowerCase()}-${neighborhood.toLowerCase()}-${name(i)}`
    const price = 20_000 + (i % 6) * 2_500
    const host: Record<string, string> = {
      infocasas: 'www.infocasas.com.uy',
      mercadolibre: 'articulo.mercadolibre.com.uy',
      casasweb: 'www.casasweb.com',
    }
    const offer = (source: string, changes: Record<string, unknown> = {}) => ({
      source,
      listingId: `${source}:${name(i)}`,
      url: `https://${host[source]}/${name(i)}`,
      title: propertyType === 'habitacion' ? 'Residencia estudiantil para estudiantes' : 'Alquiler',
      price,
      priceUyu: price,
      currency: 'UYU',
      commonExpenses: i % 3 === 0 ? null : 3_000 + (i % 4) * 500,
      commonExpensesCurrency: 'UYU',
      sellerType: i % 5 === 2 ? 'particular' : 'inmobiliaria',
      // The owner's own advert says so, with fresh evidence on that same page.
      ...(i % 5 === 2
        ? {
            ownerDirect: {
              declared: true,
              evidence: 'advert_text',
              observedAt: new Date().toISOString(),
              sourceUrl: `https://${host[source]}/${name(i)}`,
            },
          }
        : {}),
      petsAllowed: i % 3 === 1 ? true : null,
      furnished: null,
      parkingSpaces: null,
      lastSeen: today,
      firstSeen: day(i % 9),
      publishedAt: i % 2 ? day(i % 12) : null,
      details: {
        description: 'PRIVATE text',
        amenities: i % 4 === 0 ? ['Piscina', 'Gimnasio'] : ['Ascensor'],
      },
      ...changes,
    })
    const offers = [
      offer('infocasas'),
      ...(i % 3 === 0
        ? [
            offer('mercadolibre', {
              price: 600,
              priceUyu: price - 1_000,
              currency: 'USD',
              petsAllowed: true,
            }),
          ]
        : []),
      // Stale: it must not price, filter or count anything.
      ...(i % 5 === 0 ? [offer('casasweb', { priceUyu: 5_000, lastSeen: day(30) })] : []),
    ]
    const current = offers.filter(row => row.lastSeen === today)
    return {
      _id: mongoose.mongo.ObjectId.createFromTime(base + (i % 7) * 3_600 - 86_400 * (i % 2) + i),
      key,
      title: current[0]!.title,
      propertyType,
      department,
      neighborhood,
      bedrooms: i % 4,
      area: i % 7 === 0 ? null : 30 + ((i * 13) % 120),
      ...(i % 5 === 4
        ? {}
        : { latitude: -34.9 + (i % 10) * 0.003, longitude: -56.16 - (i % 7) * 0.004 }),
      lastSeen: today,
      firstSeen: day(i % 9),
      freshAt: [...current.map(row => row.publishedAt ?? row.firstSeen)].sort().at(-1),
      priceUyu: Math.min(...current.map(row => row.priceUyu)),
      price,
      currency: 'UYU',
      sources: [...new Set(offers.map(row => row.source))],
      ...(i % 4 === 1
        ? { priceDrop: { pct: (i % 3) * 5 + 5, at: today, listingId: `infocasas:${name(i)}` } }
        : {}),
      offers,
    }
  })
}

const SORTS = [
  'recientes',
  'baja',
  'precio',
  'precio-desc',
  'total',
  'precio-m2',
  'metros',
  'distancia',
] as const
const REFERENCE = { refLat: '-34.9058', refLng: '-56.1913' }
const FILTERS: Array<[string, Record<string, string>, { excluded?: string[] }?]> = [
  ['default', {}],
  ['a department', { department: 'Montevideo' }],
  ['a department and a barrio', { department: 'Montevideo', neighborhood: 'Pocitos' }],
  ['pets', { pets: '1' }],
  ['a price ceiling', { priceMax: '25000' }],
  ['published in 7 days', { dias: '7' }],
  ['a recent drop', { bajo: '1' }],
  ['an amenity', { comodidades: 'piscina' }],
  ['no shared living', { residencias: 'ocultar' }],
  ['the owner', { dueno: '1' }],
  ['a reference point', REFERENCE],
  // An advert someone reported as rented: hidden when they ask for available ones.
  ['a reported advert', { availability: 'hide_any' }, { excluded: ['rent:infocasas:ab'] }],
]

describe.skipIf(!uri)('/api/rentals window + cards against the single pass (read-only)', () => {
  let client: mongoose.mongo.MongoClient
  let documents: ReturnType<typeof fixtureDocuments>

  beforeAll(async () => {
    if (!/^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\//.test(uri || ''))
      throw new Error('This check requires an isolated localhost Mongo URI')
    client = new mongoose.mongo.MongoClient(uri!, { serverSelectionTimeoutMS: 8_000 })
    await client.connect()
    documents = fixtureDocuments()
  })
  afterAll(async () => client?.close())

  /** The route, every aggregation sent to the test server over the fixtures. */
  async function route(
    query: Record<string, string>,
    { singlePass = false, excluded = [] as string[] } = {}
  ) {
    const roles: string[] = []
    const start = (pipeline: Stage[]): RentalAggregateChain => {
      let role = ''
      let allowDiskUse = false
      const chain: RentalAggregateChain = {
        allowDiskUse: (value: boolean) => {
          allowDiskUse = value
          return chain
        },
        option: (value: { comment?: string }) => {
          role = String(value.comment).replace(/^rentals:/, '')
          return chain
        },
        collation: (collation: object) => {
          roles.push(role)
          // A failure that is not a timeout makes the route run today's single pass instead.
          if (singlePass && role === 'win') return Promise.reject(new Error('single pass'))
          return client
            .db()
            .aggregate([{ $documents: documents }, ...pipeline], {
              allowDiskUse,
              collation,
              maxTimeMS: 30_000,
            })
            .toArray()
        },
      }
      return chain
    }
    const data = createRentalDirectoryData({
      aggregate: createRentalDirectoryAggregate(start),
      // A fresh memo per request: each answer is read from the server, never from another one.
      memo: rentalMemo.createRentalMemo({ log: () => {}, schedule: () => () => {} }),
      io: {
        connect: async () => {},
        loadAvailability: async () =>
          ({
            excludedAdvertIds: (filter: string) => (filter === 'hide_any' ? excluded : []),
            byAdvertId: new Map(),
          }) as never,
        loadMeta: async () => ({ usdUyu: 40 }) as never,
        loadRentalServiceZoneIds: async () => [],
      },
    })
    const dependencies: Record<string, unknown> = {
      '../../models/RentalListing': {
        RentalListingModel: { find: () => ({ lean: () => Promise.resolve([]) }) },
      },
      '../../utils/cachedResponseHeader': { setHeaderUnlessSent: () => true },
      '../../utils/rentalDirectoryWarm': { rentalDirectoryCacheKey: () => 'default' },
      '../../utils/rentalDirectoryData': { rentalDirectoryData: data },
      '../../utils/rentalMemo': rentalMemo,
      '../../utils/rentalFlags': { rentalFlag: () => true },
      '../../utils/rentalDirectoryOrder': rentalDirectoryOrder,
      '../../utils/rentalDetail': rentalDetail,
      '../../utils/rentalGalleryPreview': rentalGalleryPreview,
      '../../utils/rentalAvailability': {
        annotateRentalAvailability: (property: unknown) => property,
      },
      '../../../utils/rentals': rentals,
      '../../../utils/rentalDirectoryParts': rentalDirectoryParts,
    }
    const module = { exports: {} as { default?: (event: unknown) => Promise<unknown> } }
    runInNewContext(compiled, {
      exports: module.exports,
      module,
      require: (id: string) => {
        if (!(id in dependencies)) throw new Error(`Unexpected route dependency: ${id}`)
        return dependencies[id]
      },
      defineEventHandler: (handler: unknown) => handler,
      defineCachedEventHandler: (handler: unknown) => handler,
      getQuery: () => query,
      process,
      createError: ({ statusMessage, cause }: { statusMessage: string; cause: unknown }) =>
        Object.assign(new Error(statusMessage), { cause }),
      console: { ...console, warn: () => {} },
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const response = (await module.exports.default!({ context: {} }).finally(() =>
      warn.mockRestore()
    )) as { items: Row[]; total: number | null }
    return { response, roles }
  }

  it('checks something: the filters select different, non-empty searches', async () => {
    const totals = new Map<string, number>()
    for (const [label, filter, options] of FILTERS) {
      const { response } = await route(filter, options)
      totals.set(label, response.total!)
    }
    expect(totals.get('default')).toBeGreaterThan(30)
    for (const [label, total] of totals) {
      expect(total, label).toBeGreaterThan(0)
      if (label !== 'default' && label !== 'a reference point')
        expect(total, label).toBeLessThan(totals.get('default')!)
    }
  })

  it.each(SORTS)(
    'sorted by %s, every page of the two passes is the single pass page',
    async sort => {
      for (const [label, filter, options] of FILTERS) {
        const query = {
          ...filter,
          sort,
          perPage: '6',
          ...(sort === 'distancia' ? REFERENCE : {}),
        }
        const whole = await route(query, options)
        const total = whole.response.total!
        const lastPage = Math.max(1, Math.ceil(total / 6))
        for (const page of [...new Set([1, 2, lastPage])]) {
          const paged = { ...query, page: String(page), parts: 'items' }
          const twoPasses = await route(paged, options)
          const singlePass = await route(paged, { ...options, singlePass: true })
          expect(twoPasses.roles, label).toEqual(['win', 'cards'])
          expect(singlePass.roles, label).toEqual(['win', 'legacy'])
          const rows = twoPasses.response.items
          expect(rows.length, `${label} page ${page}`).toBe(
            page < lastPage ? 6 : total - (lastPage - 1) * 6
          )
          // Same keys in the same order, and every card deep-equal: prices, offers, distance.
          expect(
            rows.map(row => row.key),
            `${label} page ${page}`
          ).toEqual(singlePass.response.items.map(row => row.key))
          expect(rows, `${label} page ${page}`).toEqual(singlePass.response.items)
          expect(JSON.stringify(rows)).not.toMatch(/_rental|PRIVATE/)
        }
        // The whole response pages exactly like the items-only one.
        expect(whole.roles).toContain('win')
        expect(whole.response.items).toEqual(
          (await route({ ...query, parts: 'items' }, options)).response.items
        )
      }
    }
  )
})
