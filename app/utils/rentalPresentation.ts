import {
  normalizeRentalQuery,
  rentalQueryToParams,
  type RentalCurrency,
  type RentalOffer,
  type RentalPublicProperty,
} from './rentals'
import { rentalSavedSafeUrl } from './rentalSaved'

export const RENTAL_RETURN_STORAGE = 'cu_rental_return_v1'

export function rentalPropertyPath(key: string): string {
  return `/alquileres/${encodeURIComponent(key)}`
}

export function rentalNumberLocale(locale: string): string {
  return locale.startsWith('en') ? 'en-US' : locale.startsWith('pt') ? 'pt-BR' : 'es-UY'
}

export function rentalMoney(
  value: number,
  currency: RentalCurrency = 'UYU',
  locale = 'es'
): string {
  return `${currency === 'USD' ? 'U$S' : '$'} ${new Intl.NumberFormat(rentalNumberLocale(locale), { maximumFractionDigits: 0 }).format(value)}`
}

export function rentalDate(value: string | null | undefined, locale = 'es'): string | null {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  return new Intl.DateTimeFormat(rentalNumberLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'UTC' : 'America/Montevideo',
  }).format(date)
}

/** Some feeds put the advert headline into the address field. Never repeat that as a street. */
export function rentalStreet(property: RentalPublicProperty): string {
  const address = property.address?.trim() || ''
  const compare = new Intl.Collator('es', { sensitivity: 'base', ignorePunctuation: true })
  const titles = [property.title, ...property.offers.map(offer => offer.title)]
  return titles.some(
    title =>
      compare.compare(address.replace(/\s+/g, ' '), title?.trim().replace(/\s+/g, ' ') || '') === 0
  )
    ? ''
    : address
}

export function rentalPhotos(property: RentalPublicProperty) {
  const seen = new Set<string>()
  return property.offers.flatMap(offer => {
    const url = rentalSavedSafeUrl(offer.image)
    const sourceUrl = rentalSavedSafeUrl(offer.url)
    if (!url || !sourceUrl || seen.has(url) || seen.size >= 8) return []
    seen.add(url)
    return [{ url, sourceUrl, source: offer.source, title: offer.title }]
  })
}

export function rentalHasLocation(property: RentalPublicProperty): boolean {
  return (
    typeof property.latitude === 'number' &&
    Number.isFinite(property.latitude) &&
    property.latitude >= -35.5 &&
    property.latitude <= -30 &&
    typeof property.longitude === 'number' &&
    Number.isFinite(property.longitude) &&
    property.longitude >= -58.6 &&
    property.longitude <= -53
  )
}

/** Only directory URLs from this site survive a browser-storage round trip. */
export function rentalReturnPath(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 4096 || !input.startsWith('/')) return null
  try {
    const url = new URL(input, 'https://cambio-uruguay.com')
    if (
      url.origin !== 'https://cambio-uruguay.com' ||
      !/^\/(?:en\/|pt\/)?alquileres-uruguay$/.test(url.pathname)
    )
      return null
    const params = rentalQueryToParams(normalizeRentalQuery(Object.fromEntries(url.searchParams)))
    if (url.searchParams.get('view') === 'mapa') params.view = 'mapa'
    const query = new URLSearchParams(params).toString()
    return `${url.pathname}${query ? `?${query}` : ''}#rental-results`
  } catch {
    return null
  }
}

export function rememberRentalSearch(path: string): void {
  const safe = rentalReturnPath(path)
  if (!safe || typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(RENTAL_RETURN_STORAGE, safe)
  } catch {
    /* Navigation still works without storage. */
  }
}

/** Recalculate from original amounts; a stored UYU conversion may use an older exchange rate. */
export function rentalAmountUyu(
  value: number,
  currency: RentalCurrency,
  usdUyu: number
): number | null {
  if (!Number.isFinite(value) || value < 0) return null
  if (currency === 'UYU') return value
  return usdUyu > 0 && Number.isFinite(usdUyu) ? value * usdUyu : null
}

export function rentalBudget(
  offer: RentalOffer,
  usdUyu: number,
  extra: {
    expenses: number | null
    services: number | null
    entry: number | null
    budget: number | null
  }
) {
  const rent = rentalAmountUyu(offer.price, offer.currency, usdUyu)
  const publishedExpenses =
    offer.commonExpenses === 0
      ? 0
      : offer.commonExpenses !== null && offer.commonExpensesCurrency
        ? rentalAmountUyu(offer.commonExpenses, offer.commonExpensesCurrency, usdUyu)
        : null
  const valid = (value: number | null) =>
    value !== null && Number.isFinite(value) && value >= 0 && value <= 10_000_000
  const expenses = publishedExpenses ?? (valid(extra.expenses) ? extra.expenses : null)
  const monthly =
    rent !== null && expenses !== null
      ? rent + expenses + (valid(extra.services) ? extra.services! : 0)
      : null
  return {
    monthly,
    firstMonth: monthly !== null && valid(extra.entry) ? monthly + extra.entry! : null,
    remaining: monthly !== null && valid(extra.budget) ? extra.budget! - monthly : null,
    estimatedExpenses: publishedExpenses === null && expenses !== null,
  }
}
