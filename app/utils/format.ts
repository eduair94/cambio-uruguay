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

/** Uruguay: UTC-3, without daylight saving since 2015. */
export const SITE_TIME_ZONE = 'America/Montevideo'

/**
 * The `timeZone` to format a date with, so the server and the reader's browser print the same.
 *
 * Without one, `toLocaleDateString` uses the zone of whoever runs it: the server (UTC) and the
 * browser (Uruguay, UTC-3). `new Date('2026-06-20')` is midnight UTC, so the server printed
 * "20 de junio" and the browser re-rendered it as "19 de junio" on hydration — a wrong date for
 * every reader in Uruguay plus a hydration mismatch (measured 2026-09-19 on 23 page families,
 * /terminos and /guias among them).
 *
 * A bare `YYYY-MM-DD` is a calendar day and is formatted in UTC, the zone `new Date` read it in:
 * the same day for every reader. So is exact midnight UTC (`…T00:00:00.000Z`, or a Date at it),
 * which is how a day comes back once it went through Mongo or JSON. Anything else is an instant
 * and is formatted in Uruguay's time.
 */
export function siteTimeZone(value: unknown): string {
  if (typeof value === 'string')
    return /^\d{4}-\d{2}-\d{2}(?:T00:00(?::00(?:\.0+)?)?(?:Z|\+00:00))?$/.test(value.trim())
      ? 'UTC'
      : SITE_TIME_ZONE
  if (value instanceof Date) return value.getTime() % 86_400_000 === 0 ? 'UTC' : SITE_TIME_ZONE
  return SITE_TIME_ZONE
}

/**
 * A date and a time in one label that reads the same on the server and in the browser:
 * "19 de setiembre, 15:26", in Uruguay's time unless `date.timeZone` says otherwise.
 *
 * One Intl call with both parts lets ICU choose the words between them, and ICU changed them: the
 * VPS's Node (ICU 76) writes "19 de setiembre, 15:26" and Chrome (ICU 78) "19 de setiembre a las
 * 15:26" — a hydration mismatch on every page that showed it (measured 2026-09-19 on
 * /videos-de-economia-uruguay, /tendencias-uruguay, /descuentos-con-tarjeta-uruguay/<banco>). Only
 * long month names are affected; each part alone formats the same in both versions.
 */
export function formatSiteDateTime(
  value: string | number | Date,
  locale: string,
  date: Intl.DateTimeFormatOptions
): string {
  const at = value instanceof Date ? value : new Date(value)
  const timeZone = date.timeZone ?? SITE_TIME_ZONE
  const day = at.toLocaleDateString(locale, { ...date, timeZone })
  const time = at.toLocaleTimeString(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${day}, ${time}`
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
