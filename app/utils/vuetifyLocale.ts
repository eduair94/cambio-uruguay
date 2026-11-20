/**
 * Which language Vuetify's own text speaks: the table footer ("Elementos por página:", "1-25 de
 * 185"), the "Ordenado por" of a sortable header, pagination and select aria-labels. PURE (no Nuxt,
 * no Vue), so the plugin and the tests read the same rule.
 *
 * Until 2026-11-20 every page ran Vuetify in 'en' with no messages, so the Spanish site printed
 * "Items per page:" in the server HTML and announced "Next page" to screen readers. The URL prefix
 * decides, like everything about the locale:
 * - no prefix is Spanish ('es');
 * - '/pt' is Portuguese, the other human-written locale;
 * - a right-to-left prefix keeps its own code, which is what makes Vuetify mirror its components
 *   (its messages stay the English fallback, exactly as before);
 * - every other prefix stays 'en', as before: those pages are machine-translated, and Vuetify's
 *   bundles for 35 languages would land in the entry chunk of every visitor.
 */
import { LOCALE_PREFIX_RE, RTL_LOCALE_CODES } from './locales'

/** The Vuetify message bundles the plugin imports. Each one is ~1 KB gzipped in the entry chunk. */
export const VUETIFY_MESSAGE_LOCALES = ['en', 'es', 'pt'] as const

/**
 * Vuetify locale → the tag its date adapter formats with (VDatePicker month and weekday names, the
 * first day of the week). Same tags as `dateLocale()` in utils/format.ts: plain 'es' writes
 * "septiembre", the Uruguayan spelling is "setiembre".
 */
export const VUETIFY_DATE_LOCALES: Readonly<Record<string, string>> = Object.freeze({
  es: 'es-UY',
  pt: 'pt-BR',
})

export function vuetifyLocaleFor(pathname: string): string {
  const prefix = pathname.match(LOCALE_PREFIX_RE)?.[1]
  if (!prefix) return 'es'
  if (prefix === 'pt') return 'pt'
  if (RTL_LOCALE_CODES.includes(prefix)) return prefix
  return 'en'
}

interface RouteHooks {
  afterEach(guard: (to: { path: string }, from: unknown, failure?: unknown) => unknown): unknown
}

/**
 * es ↔ en ↔ pt switch inside the SPA (vue-i18n changes the chrome without a reload), so the locale
 * Vuetify got at page load would stay behind: a Spanish table footer on an /en page. A navigation
 * that failed or was cancelled leaves the page where it was, and so the locale; the reload to or
 * from a machine-translated locale (plugins/auto-translate.ts) cancels it that way.
 */
export function followRouteLocale(router: RouteHooks, current: { value: string }): void {
  router.afterEach((to, _from, failure) => {
    if (failure) return
    const next = vuetifyLocaleFor(to.path)
    if (current.value !== next) current.value = next
  })
}
