import type { PipelineStage } from 'mongoose'
import {
  RENTAL_COLLATION,
  RENTAL_STALE_DAYS,
  rentalCommonExpensesUyu,
  rentalPublicStages,
  totalMonthlyUyu,
  type RentalOffer,
  type RentalPublicProperty,
} from '../../utils/rentals'
import {
  RENTAL_BUDGET_BANDS,
  normalizeRentalBudgetQuery,
  type RentalBudgetAmount,
  type RentalBudgetProperty,
  type RentalBudgetQuery,
  type RentalBudgetResponse,
} from '../../utils/rentalBudget'
import { rentalEligibility } from '../../utils/rentalEligibility'
import {
  rentalAvailabilityAdvertId,
  rentalAvailabilityHidden,
} from '../../utils/rentalAvailability'
import { RentalListingModel } from '../models/RentalListing'
import { RentalMetaModel } from '../models/RentalMeta'
import { connectDb } from './db'
import { rentalPublicPropertyProjection } from './rentalDetail'
import {
  annotateRentalAvailability,
  loadRentalAvailabilityIndex,
  type RentalAvailabilityIndex,
} from './rentalAvailability'

interface BudgetRawOffer extends RentalOffer {
  identity?: { version?: number; propertyType?: string; description?: string }
}
interface BudgetRawProperty extends RentalPublicProperty {
  offers: BudgetRawOffer[]
}
export interface RentalBudgetCatalogue {
  generatedAt: string
  usdUyu: number
  properties: RentalPublicProperty[]
}
const MAX_ROWS = 25_000
const MAX_PRICE = 25_000
const fields = Object.keys(rentalPublicPropertyProjection)
const propertyFields = fields.filter(key => !key.includes('.') && key !== '_id')
const offerFields = fields.filter(key => key.startsWith('offers.')).map(key => key.slice(7))
const pick = (value: object, keys: string[]) =>
  Object.fromEntries(
    keys.filter(key => key in value).map(key => [key, (value as Record<string, unknown>)[key]])
  )
const folded = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLocaleLowerCase('es')
    .trim()

interface ExpenseEvidence {
  zero: boolean
  amounts: { amount: number; currency: 'UYU' | 'USD' | null }[]
}
function expenseEvidence(title: string, description: string): ExpenseEvidence {
  const own = folded(`${title}\n${description}`).replace(/\s+/g, ' ').slice(0, 30_000)
  const negated = (start: number) =>
    /\b(?:no|nunca|tampoco)(?: (?:es|son|esta|estan|se|ofrece|incluye|significa)){0,3} $/.test(
      own.slice(Math.max(0, start - 65), start)
    )
  const conditional = (tail: string) =>
    /^ ?\?/.test(tail) ||
    /^ ?(?:(?:por|durante) )?(?:(?:el|los) )?(?:primer(?:os)?|\d+) mes(?:es)?\b/.test(tail)
  const zeroPattern =
    /\b(?:sin|no (?:tiene|paga|lleva|hay)) (?:gastos? comunes?|g\.? ?c\.?)\b|\b(?:gastos? comunes?|g\.? ?c\.?) ?(?:[:=-] ?)?(?:no (?:tiene|paga|hay)|sin costo)\b/g
  let zero = false
  for (const match of own.matchAll(zeroPattern)) {
    const tail = own.slice((match.index || 0) + match[0].length)
    if (!negated(match.index || 0) && !conditional(tail)) zero = true
  }
  const amounts: ExpenseEvidence['amounts'] = []
  const pattern =
    /\b(?:gastos? comunes?|g\.? ?c\.?) ?(?:[:=-] ?)?(?:(?:aprox(?:imados?|imadamente)?\.?|mensuales?|estimados?|actuales?|de|son|es) ?(?:[:=-] ?)?)?(?:(uyu|\$u?|usd|u ?\$ ?s|us\$) ?)?(\d[\d.,]*)/g
  for (const match of own.matchAll(pattern)) {
    if (negated(match.index || 0)) continue
    const raw = match[2]!.replace(/[.,]+$/, '')
    const amount = /^\d{1,3}(?:[.,]\d{3})+$/.test(raw)
      ? Number(raw.replace(/[.,]/g, ''))
      : Number(raw.replace(',', '.'))
    if (!Number.isFinite(amount) || amount < 0) continue
    if (amount === 0 && conditional(own.slice((match.index || 0) + match[0].length))) continue
    const symbol = match[1]
    const currency = symbol ? (/usd|us\$|u ?\$ ?s/.test(symbol) ? 'USD' : 'UYU') : null
    amounts.push({ amount, currency })
    if (amount === 0) zero = true
  }
  return { zero, amounts }
}

/** An absent charge and an explicit zero are different facts, including in legacy documents. */
export function rentalBudgetExplicitNoExpenses(title: string, description: string): boolean {
  const evidence = expenseEvidence(title, description)
  return evidence.zero && !evidence.amounts.some(value => value.amount > 0)
}

export function rentalBudgetOwnExpenses(
  offer: RentalOffer,
  description: string
): Pick<RentalOffer, 'commonExpenses' | 'commonExpensesCurrency'> {
  const evidence = expenseEvidence(offer.title, description)
  const unknown = { commonExpenses: null, commonExpensesCurrency: null }
  const published = offer.commonExpenses
  const positive = evidence.amounts.filter(row => row.amount > 0)
  if (evidence.zero) {
    if (positive.length || (typeof published === 'number' && published > 0)) return unknown
    return { commonExpenses: 0, commonExpensesCurrency: 'UYU' }
  }
  if (!(typeof published === 'number' && Number.isFinite(published) && published > 0))
    return unknown
  if (
    positive.some(
      row =>
        Math.abs(row.amount - published) > Math.max(1, published * 0.01) ||
        (row.currency !== null && offer.commonExpensesCurrency !== row.currency)
    )
  )
    return unknown
  return { commonExpenses: published, commonExpensesCurrency: offer.commonExpensesCurrency }
}

/** Own source evidence is used only for eligibility, then discarded before the cache or response. */
export function projectRentalBudgetProperty(row: BudgetRawProperty): RentalPublicProperty | null {
  const offers: RentalOffer[] = []
  for (const own of row.offers || []) {
    if (
      !(
        typeof own.priceUyu === 'number' &&
        Number.isFinite(own.priceUyu) &&
        own.priceUyu > 0 &&
        own.priceUyu <= MAX_PRICE
      )
    )
      continue
    if (!rentalAvailabilityAdvertId(own.source, own.listingId)) continue
    const identity = own.identity?.version === 1 ? own.identity : undefined
    const description = identity?.description || own.details?.description || ''
    if (
      !rentalEligibility({
        title: own.title,
        description,
        guaranteeText: own.details?.guaranteeText,
        currency: own.currency,
        price: own.price,
        propertyType: identity?.propertyType || '',
      }).eligible
    )
      continue
    const offer = pick(own, offerFields) as unknown as RentalOffer
    Object.assign(offer, rentalBudgetOwnExpenses(offer, description))
    offers.push(offer)
  }
  if (!offers.length) return null
  return { ...pick(row, propertyFields), offers } as unknown as RentalPublicProperty
}

export function selectRentalBudgetOffer(
  offers: RentalOffer[],
  basis: RentalBudgetQuery['basis'],
  usdUyu: number
): { offer: RentalOffer; budget: RentalBudgetAmount } | null {
  const candidates = offers
    .map(offer => {
      const expensesUyu = rentalCommonExpensesUyu(offer, usdUyu)
      const monthlyUyu = totalMonthlyUyu(offer, usdUyu)
      const amountUyu = basis === 'monthly' ? monthlyUyu : offer.priceUyu
      return amountUyu != null && Number.isFinite(amountUyu) && amountUyu > 0
        ? {
            offer,
            budget: { amountUyu, rentUyu: offer.priceUyu, expensesUyu, monthlyUyu },
          }
        : null
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
  candidates.sort(
    (a, b) =>
      a.budget.amountUyu - b.budget.amountUyu ||
      String(rentalAvailabilityAdvertId(a.offer.source, a.offer.listingId)).localeCompare(
        String(rentalAvailabilityAdvertId(b.offer.source, b.offer.listingId))
      )
  )
  return candidates[0] || null
}

export function queryRentalBudget(
  catalogue: RentalBudgetCatalogue,
  input: Record<string, unknown>,
  availability: RentalAvailabilityIndex,
  now = new Date()
): RentalBudgetResponse {
  const query = normalizeRentalBudgetQuery(input)
  const cutoff = new Date(now.getTime() - RENTAL_STALE_DAYS * 86_400_000).toISOString().slice(0, 10)
  const properties: RentalBudgetProperty[] = []
  const pending: { amount: number; department: string; neighborhood: string }[] = []
  for (const property of catalogue.properties) {
    if (query.type !== 'all' && property.propertyType !== query.type) continue
    if (query.bedrooms !== '' && property.bedrooms !== query.bedrooms) continue
    const offers = property.offers.filter(
      offer =>
        typeof offer.lastSeen === 'string' &&
        offer.lastSeen >= cutoff &&
        !rentalAvailabilityHidden(
          availability.byAdvertId.get(
            rentalAvailabilityAdvertId(offer.source, offer.listingId) || ''
          ),
          query.availability
        )
    )
    const base = selectRentalBudgetOffer(offers, 'rent', catalogue.usdUyu)
    if (base && base.budget.monthlyUyu === null && base.budget.amountUyu <= MAX_PRICE)
      pending.push({
        amount: base.budget.amountUyu,
        department: property.department,
        neighborhood: property.neighborhood,
      })
    const selected =
      query.basis === 'rent' ? base : selectRentalBudgetOffer(offers, 'monthly', catalogue.usdUyu)
    if (!selected || selected.budget.amountUyu > MAX_PRICE) continue
    properties.push({
      ...property,
      offers,
      matchingOffer: selected.offer,
      price: selected.offer.price,
      priceUyu: selected.offer.priceUyu,
      currency: selected.offer.currency,
      sources: [...new Set(offers.map(offer => offer.source))],
      budget: selected.budget,
    })
  }
  const locations = properties.filter(
    row => !query.department || folded(row.department) === folded(query.department)
  )
  const local = locations.filter(
    row => !query.neighborhood || folded(row.neighborhood) === folded(query.neighborhood)
  )
  const localPending = pending.filter(
    row =>
      (!query.department || folded(row.department) === folded(query.department)) &&
      (!query.neighborhood || folded(row.neighborhood) === folded(query.neighborhood))
  )
  const bands = RENTAL_BUDGET_BANDS.map(band => {
    const rows = local.filter(
      row => row.budget.amountUyu > band.minExclusive && row.budget.amountUyu <= band.maxInclusive
    )
    return {
      ...band,
      count: rows.length,
      pendingExpensesCount: localPending.filter(
        row => row.amount > band.minExclusive && row.amount <= band.maxInclusive
      ).length,
    }
  })
  const band = RENTAL_BUDGET_BANDS.find(band => band.id === query.band)!
  const selected = local
    .filter(
      row => row.budget.amountUyu > band.minExclusive && row.budget.amountUyu <= band.maxInclusive
    )
    .sort((a, b) => a.budget.amountUyu - b.budget.amountUyu || a.key.localeCompare(b.key))
  const pages = Math.ceil(selected.length / query.perPage),
    page = Math.min(query.page, Math.max(1, pages))
  const unique = (values: string[]) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
  return {
    generatedAt: catalogue.generatedAt,
    usdUyu: catalogue.usdUyu,
    query: { ...query, page },
    total: selected.length,
    page,
    pages,
    items: selected
      .slice((page - 1) * query.perPage, page * query.perPage)
      .map(row => annotateRentalAvailability(row, availability)),
    bands,
    facets: {
      departments: unique(properties.map(row => row.department)),
      neighborhoods: unique(locations.map(row => row.neighborhood)),
    },
    pendingExpensesCount: localPending.filter(
      row => row.amount > band.minExclusive && row.amount <= band.maxInclusive
    ).length,
  }
}

let cached: { signature: string; until: number; value: RentalBudgetCatalogue } | null = null
let loading: { signature: string; promise: Promise<RentalBudgetCatalogue> } | null = null
export async function loadRentalBudgetCatalogue(): Promise<RentalBudgetCatalogue> {
  await connectDb()
  const meta = await RentalMetaModel.findOne({ key: 'uy-rentals' })
    .select({ generatedAt: 1, usdUyu: 1, _id: 0 })
    .maxTimeMS(10_000)
    .lean()
  if (!meta?.generatedAt) throw new Error('Rental source metadata unavailable')
  const signature = `${meta.generatedAt}:${meta.usdUyu}`
  if (cached?.signature === signature && cached.until > Date.now()) return cached.value
  if (loading?.signature === signature) return loading.promise
  const promise = (async () => {
    // Bound the source universe, not the result page. Never publish a silently truncated band.
    const raw = await RentalListingModel.aggregate<BudgetRawProperty>([
      ...rentalPublicStages(
        { propertyType: { $in: ['casa', 'apartamento'] }, priceUyu: { $lte: MAX_PRICE } },
        RENTAL_STALE_DAYS
      ),
      { $limit: MAX_ROWS + 1 },
      {
        $project: {
          ...rentalPublicPropertyProjection,
          'offers.identity.version': 1,
          'offers.identity.propertyType': 1,
          'offers.identity.description': 1,
          'offers.details.description': 1,
          'offers.details.guaranteeText': 1,
        },
      },
    ] as PipelineStage[])
      .option({ maxTimeMS: 15_000 })
      .collation(RENTAL_COLLATION)
    if (raw.length > MAX_ROWS) throw new Error('Rental budget universe exceeds safe read budget')
    const properties = raw
      .map(projectRentalBudgetProperty)
      .filter((row): row is RentalPublicProperty => row !== null)
    const value = { generatedAt: meta.generatedAt, usdUyu: Number(meta.usdUyu) || 0, properties }
    cached = { signature, value, until: Date.now() + 60_000 }
    return value
  })()
  loading = { signature, promise }
  try {
    return await promise
  } finally {
    if (loading?.promise === promise) loading = null
  }
}

export async function loadRentalBudget(
  input: Record<string, unknown>
): Promise<RentalBudgetResponse> {
  const [catalogue, availability] = await Promise.all([
    loadRentalBudgetCatalogue(),
    loadRentalAvailabilityIndex(),
  ])
  return queryRentalBudget(catalogue, input, availability)
}
