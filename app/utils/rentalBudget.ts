import {
  normalizeRentalAvailabilityFilter,
  type RentalAvailabilityFilter,
} from './rentalAvailability'
import type { RentalPublicProperty } from './rentals'

export const RENTAL_BUDGET_BANDS = [
  { id: 'under10000', minExclusive: 0, maxInclusive: 10_000 },
  { id: '10000_13000', minExclusive: 10_000, maxInclusive: 13_000 },
  { id: '13000_16000', minExclusive: 13_000, maxInclusive: 16_000 },
  { id: '16000_20000', minExclusive: 16_000, maxInclusive: 20_000 },
  { id: '20000_25000', minExclusive: 20_000, maxInclusive: 25_000 },
] as const
export type RentalBudgetBand = (typeof RENTAL_BUDGET_BANDS)[number]['id']
export interface RentalBudgetQuery {
  band: RentalBudgetBand
  basis: 'rent' | 'monthly'
  department: string
  neighborhood: string
  type: 'all' | 'casa' | 'apartamento'
  bedrooms: '' | number
  availability: RentalAvailabilityFilter
  page: number
  perPage: number
}
export interface RentalBudgetAmount {
  amountUyu: number
  rentUyu: number
  expensesUyu: number | null
  monthlyUyu: number | null
}
export type RentalBudgetProperty = RentalPublicProperty & { budget: RentalBudgetAmount }
export interface RentalBudgetResponse {
  generatedAt: string
  usdUyu: number
  query: RentalBudgetQuery
  total: number
  page: number
  pages: number
  items: RentalBudgetProperty[]
  bands: {
    id: RentalBudgetBand
    minExclusive: number
    maxInclusive: number
    count: number
    pendingExpensesCount: number
  }[]
  facets: { departments: string[]; neighborhoods: string[] }
  /** Properties whose cheapest base rent lies in the selected band but has unknown expenses. */
  pendingExpensesCount: number
}
const text = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 100) : '')
const integer = (value: unknown, fallback: number, max: number) => {
  const n =
    (typeof value === 'string' && /^\d+$/.test(value)) || typeof value === 'number'
      ? Number(value)
      : NaN
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback
}
export function normalizeRentalBudgetQuery(input: Record<string, unknown> = {}): RentalBudgetQuery {
  const bedrooms =
    (typeof input.bedrooms === 'string' && /^\d+$/.test(input.bedrooms)) ||
    typeof input.bedrooms === 'number'
      ? Number(input.bedrooms)
      : NaN
  return {
    band: RENTAL_BUDGET_BANDS.find(band => band.id === input.band)?.id || 'under10000',
    basis: input.basis === 'monthly' ? 'monthly' : 'rent',
    department: text(input.department),
    neighborhood: text(input.neighborhood),
    type: input.type === 'casa' || input.type === 'apartamento' ? input.type : 'all',
    bedrooms: Number.isInteger(bedrooms) && bedrooms >= 0 && bedrooms <= 10 ? bedrooms : '',
    availability: normalizeRentalAvailabilityFilter(input.availability),
    page: integer(input.page, 1, 10_000),
    perPage: integer(input.perPage, 24, 48),
  }
}
export function rentalBudgetQueryToParams(query: RentalBudgetQuery): Record<string, string> {
  const params: Record<string, string> = { band: query.band }
  if (query.basis !== 'rent') params.basis = query.basis
  if (query.department) params.department = query.department
  if (query.neighborhood) params.neighborhood = query.neighborhood
  if (query.type !== 'all') params.type = query.type
  if (query.bedrooms !== '') params.bedrooms = String(query.bedrooms)
  if (query.availability !== 'all') params.availability = query.availability
  if (query.page > 1) params.page = String(query.page)
  if (query.perPage !== 24) params.perPage = String(query.perPage)
  return params
}
