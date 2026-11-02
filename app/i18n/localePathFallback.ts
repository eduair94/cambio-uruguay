import { useLocalePath as useI18nLocalePath } from '#i18n'
import { DEFAULT_LOCALE } from '../utils/locales'

/**
 * `useLocalePath()` for the whole app (auto-import swapped in by modules/extra-locales.ts).
 *
 * The extra locales exist only on a few routes (`EXTRA_LOCALE_ROUTES`), and @nuxtjs/i18n
 * answers `localePath('/guias')` from a French page with an EMPTY string when `/fr/guias`
 * does not exist — every header, footer and in-page link to a Spanish-only page would render
 * as `href=""`. Here a route with no page in the current locale resolves to its Spanish URL,
 * which is the page a French reader would land on anyway. Core locales always resolve, so
 * nothing changes for es, en and pt.
 */
export function useLocalePath(): ReturnType<typeof useI18nLocalePath> {
  const localePath = useI18nLocalePath()
  const withFallback: typeof localePath = (route, locale) =>
    localePath(route, locale) || localePath(route, DEFAULT_LOCALE)
  return withFallback
}
