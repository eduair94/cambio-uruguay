// Small, pure number/currency formatters shared by the calculator and
// conversion pages. Kept framework-agnostic so they can be unit-tested and
// reused without pulling in any Vue/Nuxt runtime.

/** Format a value as Uruguayan pesos (UYU), e.g. `1234.5` -> `'$ 1.234,50'`. */
export function formatUYU(value: number | null | undefined, decimals = 2): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Format a value as US dollars (USD), e.g. `1234.5` -> `'US$ 1.234,50'`. */
export function formatUSD(value: number | null | undefined, decimals = 2): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Format a plain number with Uruguayan grouping, e.g. `1234.5` -> `'1.234,50'`. */
export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value.toLocaleString('es-UY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Map an i18n locale code to the BCP-47 tag to format dates/numbers with.
 *
 * This exists because `'es'` and `'es-UY'` are NOT interchangeable in ICU:
 * `new Date(...).toLocaleDateString('es', {month: 'long'})` renders
 * "septiembre", while the same call with `'es-UY'` renders "setiembre" --
 * the spelling Uruguay actually uses. The site's i18n `locale` is the bare
 * code (`'es'`, `'en'`, `'pt'`), so every date/number formatted from it must
 * go through this mapping first, or the month name silently regresses to
 * the Spain spelling. Do not "simplify" this away.
 */
export function dateLocale(locale: string): string {
  if (locale === 'es') return 'es-UY'
  if (locale === 'en') return 'en-US'
  if (locale === 'pt') return 'pt-BR'
  return locale
}

/** Format an ISO currency amount generically (any 3-letter code). */
export function formatCurrency(
  value: number | null | undefined,
  currency: string,
  decimals = 2
): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  try {
    return value.toLocaleString('es-UY', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  } catch {
    return `${formatNumber(value, decimals)} ${currency}`
  }
}
