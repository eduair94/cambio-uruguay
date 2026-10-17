/**
 * Inventory and matching for the listing directories that are not rentals. Matching runs the
 * directory's own filter (freshness window included) restricted to the candidate keys, so an alert
 * never sends what the page would not show for the same search.
 */
import type { ListingAlertKind } from '../../utils/listingAlerts'
import type { RentalAlertCandidate, RentalAlertMoney } from '../../utils/rentalAlerts'
import { carKeyValid, carPath, carsMatch, normalizeCarsQuery } from '../../utils/cars'
import {
  MOTO_FRESH_DAYS_FALLBACK,
  MOTO_META_ID,
  motoCoverageOf,
  motoMatch,
  motoNormalizeQuery,
} from '../../utils/motos'
import {
  PROPERTY_SALES_COLLATION,
  normalizePropertySalesQuery,
  propertySalePath,
  propertySaleValidKey,
} from '../../utils/propertySales'
import { propertySalesStages } from '../../utils/propertySalesQuery'
import { CarCatalogModel } from '../models/CarCatalog'
import { CarCatalogMetaModel } from '../models/CarCatalogMeta'
import { MotoCatalogModel } from '../models/MotoCatalog'
import { MotoCatalogMetaModel } from '../models/MotoCatalogMeta'
import {
  PropertySaleCatalogMetaModel,
  PropertySaleCatalogModel,
} from '../models/PropertySaleCatalog'
import { connectDb } from './db'
import type { RentalAlertInventory } from './rentalAlertMatching'

type Row = Record<string, any>
const PAGE = 1000
const MATCH_CHUNK = 400
const number = new Intl.NumberFormat('es-UY')
const text = (value: unknown, max = 200) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

function money(amount: unknown, currency: unknown): RentalAlertMoney | null {
  return typeof amount === 'number' &&
    Number.isFinite(amount) &&
    amount > 0 &&
    (currency === 'UYU' || currency === 'USD')
    ? { amount, currency }
    : null
}

function candidate(
  id: string,
  row: Row,
  price: RentalAlertMoney,
  url: string,
  facts: Array<string | false | null | undefined>,
  extra: Partial<RentalAlertCandidate> = {}
): RentalAlertCandidate {
  return {
    id,
    propertyKey: id,
    title: text(row.title, 300) || id,
    url,
    price,
    expenses: null,
    department: text(row.department, 100),
    neighborhood: '',
    bedrooms: null,
    image: null,
    facts: facts.filter((fact): fact is string => typeof fact === 'string' && fact !== ''),
    ...extra,
  }
}

const year = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value > 1900 ? String(value) : null
const count = (value: unknown, unit: string) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? `${number.format(value)} ${unit}`
    : null

export function carAlertCandidate(row: Row): RentalAlertCandidate | null {
  const price = money(row.price, row.currency)
  if (typeof row.key !== 'string' || !carKeyValid(row.key) || !price) return null
  return candidate(`car:${row.key}`, row, price, carPath(row.key), [
    year(row.year),
    count(row.km, 'km'),
    text(row.department, 100),
  ])
}

/** Motos have no page per advert: link the original only when it is Mercado Libre Uruguay. */
const MOTO_PERMALINK = /^https:\/\/(?:[a-z0-9-]+\.)*mercadolibre\.com\.uy\/\S*$/i
export function motoAlertCandidate(row: Row): RentalAlertCandidate | null {
  const price = money(row.price, row.currency)
  if (typeof row.key !== 'string' || !/^[\w-]{1,80}$/.test(row.key) || !price) return null
  const permalink = typeof row.permalink === 'string' ? row.permalink : ''
  return candidate(
    `moto:${row.key}`,
    row,
    price,
    '/motos-usadas-uruguay',
    [year(row.year), count(row.displacement, 'cc'), text(row.department, 100)],
    MOTO_PERMALINK.test(permalink) && permalink.length <= 500 ? { link: permalink } : {}
  )
}

const SALE_TYPE: Record<string, string> = { casa: 'Casa', apartamento: 'Apartamento' }
export function saleAlertCandidate(row: Row): RentalAlertCandidate | null {
  const price = money(row.price?.amount, row.price?.currency)
  if (!propertySaleValidKey(row.key) || !price) return null
  const area = [row.areas?.built, row.areas?.total, row.areas?.reported].find(
    value => typeof value === 'number' && value > 0
  )
  const bedrooms =
    typeof row.bedrooms === 'number' && Number.isInteger(row.bedrooms) ? row.bedrooms : null
  const place = [text(row.neighborhood, 100) || text(row.locality, 100), text(row.department, 100)]
    .filter(Boolean)
    .join(', ')
  return candidate(
    `sale:${row.key}`,
    row,
    price,
    propertySalePath(row.key),
    [
      SALE_TYPE[row.propertyType],
      bedrooms === null ? null : bedrooms === 0 ? 'Monoambiente' : `${bedrooms} dorm.`,
      count(area, 'm²'),
      place,
    ],
    { neighborhood: text(row.neighborhood, 100), bedrooms }
  )
}

interface Source {
  prefix: string
  meta: () => Promise<Row | null>
  scan: (after: string) => Promise<Row[]>
  price: (row: Row) => RentalAlertMoney | null
  validKey: (key: string) => boolean
  match: (filters: Record<string, string>, keys: string[], now: number) => Promise<Row[]>
  build: (row: Row) => RentalAlertCandidate | null
}

const scanQuery = (after: string) => (after ? { key: { $gt: after } } : {})

const SOURCES: Record<ListingAlertKind, Source> = {
  'car-search': {
    prefix: 'car:',
    meta: async () =>
      (await CarCatalogMetaModel.findOne({ key: 'uy-cars' })
        .select({ _id: 0, generatedAt: 1, meta: 1 })
        .lean()) as Row | null,
    scan: async after =>
      (await CarCatalogModel.find(scanQuery(after))
        .select({ _id: 0, key: 1, price: 1, currency: 1, currencyInferred: 1 })
        .sort({ key: 1 })
        .limit(PAGE)
        .maxTimeMS(15_000)
        .lean()) as Row[],
    // A deduced currency (Facebook) never counts for opportunities and never makes a drop either.
    price: row => (row.currencyInferred === true ? null : money(row.price, row.currency)),
    validKey: carKeyValid,
    match: async (filters, keys, now) => {
      const meta = await SOURCES['car-search'].meta()
      const freshDays = Number(meta?.meta?.freshDays)
      if (!(freshDays > 0)) throw new Error('Car catalogue is unavailable')
      const filter = carsMatch(normalizeCarsQuery(filters), new Date(now), freshDays)
      return (await CarCatalogModel.find({ ...filter, key: { $in: keys } })
        .select({ _id: 0 })
        .maxTimeMS(15_000)
        .lean()) as Row[]
    },
    build: carAlertCandidate,
  },
  'moto-search': {
    prefix: 'moto:',
    meta: async () =>
      (await MotoCatalogMetaModel.findOne({ key: MOTO_META_ID })
        .select({ _id: 0, generatedAt: 1, meta: 1 })
        .lean()) as Row | null,
    scan: async after =>
      (await MotoCatalogModel.find(scanQuery(after))
        .select({ _id: 0, key: 1, price: 1, currency: 1, currencyInferred: 1 })
        .sort({ key: 1 })
        .limit(PAGE)
        .maxTimeMS(15_000)
        .lean()) as Row[],
    price: row => (row.currencyInferred === true ? null : money(row.price, row.currency)),
    validKey: key => /^[\w-]{1,80}$/.test(key),
    match: async (filters, keys, now) => {
      const meta = await SOURCES['moto-search'].meta()
      if (!meta) throw new Error('Moto catalogue is unavailable')
      const freshDays = motoCoverageOf(meta.meta ?? null)?.freshDays ?? MOTO_FRESH_DAYS_FALLBACK
      const filter = motoMatch(
        motoNormalizeQuery(filters),
        new Date(now).toISOString().slice(0, 10),
        freshDays
      )
      return (await MotoCatalogModel.find({ ...filter, key: { $in: keys } })
        .select({ _id: 0 })
        .maxTimeMS(15_000)
        .lean()) as Row[]
    },
    build: motoAlertCandidate,
  },
  'sale-search': {
    prefix: 'sale:',
    meta: async () =>
      (await PropertySaleCatalogMetaModel.findOne({ key: 'uy-sales' })
        .select({ _id: 0, generatedAt: 1, usdUyu: 1 })
        .lean()) as Row | null,
    scan: async after =>
      (await PropertySaleCatalogModel.find(scanQuery(after))
        .select({ _id: 0, key: 1, 'price.amount': 1, 'price.currency': 1 })
        .sort({ key: 1 })
        .limit(PAGE)
        .maxTimeMS(15_000)
        .lean()) as Row[],
    price: row => money(row.price?.amount, row.price?.currency),
    validKey: propertySaleValidKey,
    match: async (filters, keys, now) => {
      const meta = await SOURCES['sale-search'].meta()
      if (!meta) throw new Error('Sale catalogue is unavailable')
      // `keys` restricts the directory pipeline itself; the 48-key cap only exists in the URL parser.
      const query = { ...normalizePropertySalesQuery(filters), keys }
      return (await PropertySaleCatalogModel.aggregate(
        propertySalesStages(query, Number(meta.usdUyu) || 0, now)
      )
        .collation(PROPERTY_SALES_COLLATION)
        .option({ maxTimeMS: 15_000 })) as Row[]
    },
    build: saleAlertCandidate,
  },
}

/** Every key with its price, read between two identical catalogue versions. */
export async function readListingAlertInventory(
  kind: ListingAlertKind,
  guard: () => Promise<void> = async () => {}
): Promise<RentalAlertInventory> {
  await connectDb()
  const source = SOURCES[kind]
  const before = await source.meta()
  if (!before?.generatedAt) throw new Error(`${kind} inventory is unavailable`)
  const ids = new Set<string>()
  const prices = new Map<string, RentalAlertMoney>()
  let after = ''
  for (;;) {
    await guard()
    const rows = await source.scan(after)
    for (const row of rows) {
      if (typeof row.key !== 'string' || !source.validKey(row.key)) continue
      const id = `${source.prefix}${row.key}`
      ids.add(id)
      const price = source.price(row)
      if (price) prices.set(id, price)
    }
    if (rows.length < PAGE) break
    after = String(rows.at(-1)!.key)
  }
  const final = await source.meta()
  // Every publisher writes rows, prunes, and only then the meta: a moved version means a mixed read.
  if (before.generatedAt !== final?.generatedAt || !ids.size)
    throw new Error(`${kind} inventory changed during observation; retry later`)
  return {
    ids: [...ids].sort(),
    prices,
    algorithm: `${kind}-v1`,
    sourceVersion: String(before.generatedAt),
  }
}

export async function matchListingAlertCandidates(
  kind: ListingAlertKind,
  filters: Record<string, string>,
  candidateIds: string[],
  now = Date.now()
): Promise<RentalAlertCandidate[]> {
  const source = SOURCES[kind]
  const keys = [
    ...new Set(
      candidateIds
        .filter(id => id.startsWith(source.prefix))
        .map(id => id.slice(source.prefix.length))
        .filter(key => source.validKey(key))
    ),
  ]
  if (!keys.length) return []
  await connectDb()
  const result = new Map<string, RentalAlertCandidate>()
  for (let offset = 0; offset < keys.length; offset += MATCH_CHUNK)
    for (const row of await source.match(filters, keys.slice(offset, offset + MATCH_CHUNK), now)) {
      const built = source.build(row)
      if (built) result.set(built.id, built)
    }
  return [...result.values()]
}
