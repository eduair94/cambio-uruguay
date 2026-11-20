/**
 * The `lastmod` of a sitemap entry says "the data behind this page changed that day". It is never
 * the instant the file was built: until 2026-11-20, 56.866 of the 89.385 lastmods of the language
 * sitemaps were their own file's build time (`new Date().toISOString()`), so they changed every
 * time a sitemap was rebuilt and taught crawlers to ignore the field — guides and blog posts with
 * a real date included.
 *
 * The exchange-rate rows are keyed by the Montevideo calendar day (classes/cambioInfo.ts), so the
 * day is that one, as a bare date: a page whose rows were rewritten today changed today, and
 * nothing more precise is known.
 */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

/** The Montevideo calendar day of `now`, as YYYY-MM-DD (same idiom as composables/useApiService). */
export function sitemapDay(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Montevideo' })
}

/**
 * The `count` Montevideo days before today, newest first. Counted on the calendar date with UTC
 * arithmetic, never by subtracting 24 h from `now`: the day is a label, not an instant.
 */
export function previousSitemapDays(count: number, now: Date = new Date()): string[] {
  const [year, month, day] = sitemapDay(now).split('-').map(Number) as [number, number, number]
  const days: string[] = []
  for (let back = 1; back <= count; back++) {
    days.push(new Date(Date.UTC(year, month - 1, day - back)).toISOString().slice(0, 10))
  }
  return days
}

/** A bare YYYY-MM-DD, the only shape a data source's own day may take to become a lastmod. */
export function isSitemapDay(value: unknown): value is string {
  return typeof value === 'string' && DAY_RE.test(value)
}
