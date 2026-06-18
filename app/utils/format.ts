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
