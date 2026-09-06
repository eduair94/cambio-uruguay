import type {
  OpportunityArea,
  OpportunityMoney,
  OpportunityPublicListing,
} from './propertyOpportunities'

export const opportunitySourceLabels = {
  mercadolibre: 'Mercado Libre',
  infocasas: 'InfoCasas',
  facebook: 'Facebook Marketplace',
  casasweb: 'Casasweb',
  elpais: 'Inmuebles El País',
}

export function opportunityNumber(value: number, locale = 'es', digits = 0): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale === 'pt' ? 'pt-BR' : 'es-UY', {
    maximumFractionDigits: digits,
  }).format(value)
}

export function opportunityMoney(money: OpportunityMoney, locale = 'es'): string {
  return `${money.currency} ${opportunityNumber(money.amount, locale)}`
}

export function opportunityAreaKey(area: OpportunityArea): 'areaBuilt' | 'areaTotal' | 'area' {
  return area.basis === 'built' ? 'areaBuilt' : area.basis === 'total' ? 'areaTotal' : 'area'
}

export function opportunityRentalPath(listing: OpportunityPublicListing): string | null {
  return listing.operation === 'rent' &&
    listing.propertyKey &&
    /^[a-z0-9-]+$/.test(listing.propertyKey)
    ? `/alquileres/${listing.propertyKey}`
    : null
}

export function opportunityDate(value: string | null | undefined, locale = 'es'): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null
  const dayOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const parsed = new Date(value)
  if (dayOnly && parsed.toISOString().slice(0, 10) !== value) return null
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : locale === 'pt' ? 'pt-BR' : 'es-UY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    // A source calendar date is not a midnight reading: converting it shifts it back a day.
    timeZone: dayOnly ? 'UTC' : 'America/Montevideo',
  }).format(parsed)
}
