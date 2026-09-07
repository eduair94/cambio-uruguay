import {
  normalizeRentalQuery,
  rentalQueryToParams,
  RENTAL_GUARANTEE_PUBLISHED,
  RENTAL_SOURCE_LABEL,
  RENTAL_TYPE_LABEL,
} from './rentals'
import { normalizeOpportunityQuery } from './propertyOpportunityQuery'
import { MUTUALISTA_SEDES } from './mutualistaSedes'

export type RentalAlertKind = 'rental-search' | 'rental-opportunity'
export type RentalAlertFrequency = 'hourly' | 'daily'
export type RentalAlertLocale = 'es' | 'en' | 'pt'
export type RentalAlertFilters = Record<string, string>
export interface RentalAlertChannels {
  push: boolean
  email: boolean
}
export const RENTAL_ALERT_LIMIT = 10

export interface RentalAlertSubscription {
  id: string
  kind: RentalAlertKind
  name: string
  filters: RentalAlertFilters
  channels: RentalAlertChannels
  frequency: RentalAlertFrequency
  active: boolean
  locale: RentalAlertLocale
  createdAt: string
  updatedAt: string
  lastNotifiedAt: string | null
  searchUrl: string
}

export interface RentalAlertCapabilities {
  accountEligible: boolean
  emailAvailable: boolean
  emailVerified: boolean
  email: string | null
  pushAvailable: boolean
  pushRegistered: boolean
}

export interface RentalAlertsResponse {
  items: RentalAlertSubscription[]
  capabilities: RentalAlertCapabilities
  limit: number
}

export interface RentalAlertCreateInput {
  kind: RentalAlertKind
  name?: string
  filters: Record<string, unknown>
  channels: RentalAlertChannels
  frequency: RentalAlertFrequency
  locale: RentalAlertLocale
}

export interface RentalAlertCandidate {
  id: string
  propertyKey: string
  title: string
  url: string
  price: { amount: number; currency: 'UYU' | 'USD' }
  expenses: { amount: number; currency: 'UYU' | 'USD' } | null
  department: string
  neighborhood: string
  bedrooms: number | null
  image: string | null
  opportunityGapPct?: number
}

export class RentalAlertValidationError extends Error {
  readonly code: 'invalid_alert' | 'unsupported_filter'
  constructor(code: 'invalid_alert' | 'unsupported_filter') {
    super(code)
    this.code = code
  }
}

const presentation = new Set(['page', 'perPage', 'sort', 'view'])
const searchKeys = new Set([
  'availability',
  'q',
  'department',
  'neighborhood',
  'neighborhoods',
  'type',
  'source',
  'bedrooms',
  'bedroomsExact',
  'bathrooms',
  'areaMin',
  'areaMax',
  'currency',
  'priceMin',
  'priceMax',
  'monthlyMax',
  'expensesMax',
  'multi',
  'pets',
  'parking',
  'furnished',
  'garantia',
  'guarantees',
  'gc',
  'withExpenses',
  'dueno',
  'owner',
  'agency',
  'sedes',
  'radio',
  'radioKm',
])
const opportunityKeys = new Set([
  'availability',
  'operation',
  'department',
  'neighborhood',
  'type',
  'bedrooms',
  'maxPrice',
  'confidence',
  'evidence',
  'signal',
])
const arrayKeys = new Set(['neighborhoods', 'garantia', 'guarantees', 'sedes'])
const searchBooleans = new Set([
  'bedroomsExact',
  'multi',
  'pets',
  'parking',
  'furnished',
  'gc',
  'withExpenses',
  'dueno',
  'owner',
])
const searchNumbers = new Set([
  'bedrooms',
  'bathrooms',
  'areaMin',
  'areaMax',
  'priceMin',
  'priceMax',
  'monthlyMax',
  'expensesMax',
  'radio',
  'radioKm',
])
const knownSedes = new Set(MUTUALISTA_SEDES.map(sede => sede.osmId))

export function rentalAlertRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === 'object' && !Array.isArray(input)
}

function populated(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ''
}

/** Reject unsupported criteria instead of turning a narrow subscription into a broad one. */
export function normalizeRentalAlertFilters(
  kind: RentalAlertKind,
  input: unknown
): RentalAlertFilters {
  if (!rentalAlertRecord(input) || Object.keys(input).length > 45)
    throw new RentalAlertValidationError('invalid_alert')
  const allowed = kind === 'rental-search' ? searchKeys : opportunityKeys
  for (const [key, value] of Object.entries(input)) {
    if (presentation.has(key) || !populated(value)) continue
    if (!allowed.has(key)) throw new RentalAlertValidationError('unsupported_filter')
    const values = Array.isArray(value) ? value : [value]
    if (Array.isArray(value) && (!arrayKeys.has(key) || value.length > 20))
      throw new RentalAlertValidationError('unsupported_filter')
    if (
      values.some(
        v => !['string', 'number', 'boolean'].includes(typeof v) || String(v).length > 1600
      )
    )
      throw new RentalAlertValidationError('invalid_alert')
    if (
      kind === 'rental-search' &&
      searchBooleans.has(key) &&
      ![true, false, '1', '0', 1, 0].includes(value as string | number | boolean)
    )
      throw new RentalAlertValidationError('unsupported_filter')
    const numeric =
      kind === 'rental-search' ? searchNumbers.has(key) : ['bedrooms', 'maxPrice'].includes(key)
    if (numeric && (!/^\d+(?:\.\d+)?$/.test(String(value)) || !Number.isFinite(Number(value))))
      throw new RentalAlertValidationError('unsupported_filter')
  }
  let params: RentalAlertFilters
  if (
    populated(input.availability) &&
    !['all', 'hide_multiple', 'hide_any'].includes(String(input.availability))
  )
    throw new RentalAlertValidationError('unsupported_filter')
  if (kind === 'rental-search') {
    if (populated(input.type) && !Object.hasOwn(RENTAL_TYPE_LABEL, String(input.type)))
      throw new RentalAlertValidationError('unsupported_filter')
    if (populated(input.source) && !Object.hasOwn(RENTAL_SOURCE_LABEL, String(input.source)))
      throw new RentalAlertValidationError('unsupported_filter')
    if (populated(input.currency) && !['UYU', 'USD'].includes(String(input.currency).toUpperCase()))
      throw new RentalAlertValidationError('unsupported_filter')
    const guarantee = input.garantia ?? input.guarantees
    const guarantees = (Array.isArray(guarantee) ? guarantee : [guarantee])
      .flatMap(v => String(v ?? '').split(','))
      .filter(Boolean)
    if (guarantees.some(v => !RENTAL_GUARANTEE_PUBLISHED.includes(v as never)))
      throw new RentalAlertValidationError('unsupported_filter')
    const query = normalizeRentalQuery(input)
    for (const field of [
      'bedrooms',
      'bathrooms',
      'areaMin',
      'areaMax',
      'priceMin',
      'priceMax',
      'monthlyMax',
      'expensesMax',
    ] as const) {
      if (populated(input[field]) && query[field] === null)
        throw new RentalAlertValidationError('unsupported_filter')
    }
    if (populated(input.sedes)) {
      const raw = (Array.isArray(input.sedes) ? input.sedes : [input.sedes])
        .flatMap(v => String(v).split(','))
        .filter(Boolean)
      if (
        raw.some(
          v => !/^\d+$/.test(v) || !query.sedes.includes(Number(v)) || !knownSedes.has(Number(v))
        )
      )
        throw new RentalAlertValidationError('unsupported_filter')
    }
    if (populated(input.agency) && !query.agency)
      throw new RentalAlertValidationError('unsupported_filter')
    query.neighborhoods.sort((a, b) => a.localeCompare(b, 'es'))
    query.guarantees.sort()
    query.sedes.sort((a, b) => a - b)
    params = rentalQueryToParams({ ...query, page: 1, perPage: 24, sort: 'recientes' })
    if (!query.sedes.length) delete params.radio
  } else {
    if (populated(input.operation) && input.operation !== 'rent')
      throw new RentalAlertValidationError('unsupported_filter')
    for (const [key, values] of Object.entries({
      type: ['all', 'casa', 'apartamento'],
      confidence: ['all', 'supported', 'limited'],
      evidence: ['all', 'standard', 'exploratory'],
      signal: ['all', 'total_price', 'price_per_m2'],
    })) {
      if (populated(input[key]) && !values.includes(String(input[key])))
        throw new RentalAlertValidationError('unsupported_filter')
    }
    const query = normalizeOpportunityQuery({ ...input, operation: 'rent' })
    if (populated(input.bedrooms) && query.bedrooms === '')
      throw new RentalAlertValidationError('unsupported_filter')
    if (populated(input.maxPrice) && query.maxPrice === null)
      throw new RentalAlertValidationError('unsupported_filter')
    params = {}
    for (const field of [
      'department',
      'neighborhood',
      'type',
      'bedrooms',
      'maxPrice',
      'confidence',
      'evidence',
      'signal',
      'availability',
    ] as const) {
      const value = query[field]
      if (value !== '' && value !== null && value !== 'all') params[field] = String(value)
    }
  }
  return Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)))
}

export function rentalAlertSearchUrl(alert: {
  kind: RentalAlertKind
  filters: RentalAlertFilters
  locale?: string
}): string {
  const prefix = alert.locale === 'en' || alert.locale === 'pt' ? `/${alert.locale}` : ''
  const params = new URLSearchParams(alert.filters)
  const path =
    alert.kind === 'rental-opportunity'
      ? '/oportunidades-inmobiliarias-uruguay'
      : '/alquileres-uruguay'
  if (alert.kind === 'rental-opportunity') params.set('operation', 'rent')
  const query = params.toString()
  return `${prefix}${path}${query ? `?${query}` : ''}`
}

export function rentalAlertSignature(kind: RentalAlertKind, filters: RentalAlertFilters): string {
  return JSON.stringify([kind, Object.entries(filters).sort(([a], [b]) => a.localeCompare(b))])
}
