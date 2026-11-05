import { isAutoTranslateLocale, isEmbargoed } from '../../utils/autoTranslate'
import { splitLocalePath } from '../../utils/localizedRoutes'
import { embargoedRoutes, lookupTranslations, translatedLocales } from '../utils/autoTranslateStore'

export interface AutoTranslateContext {
  locale: string
  /** The Spanish path of the page (no locale prefix, no trailing slash). */
  path: string
  translated: string[]
  embargoed: boolean
  /** hash → stored translation, for the current locale; empty for Spanish. */
  lookup: (hashes: readonly string[]) => Promise<Map<string, string>>
}

declare module 'h3' {
  interface H3EventContext {
    autoTranslate?: AutoTranslateContext
  }
}

/**
 * Attach what plugins/auto-translate.ts needs to render a page: which locales the page is
 * translated into (hreflang, canonical, language menu — for EVERY locale, Spanish included) and,
 * in a machine-translated locale, how to read the translation memory. Pages only: API routes,
 * assets and payloads skip it. Both reads are cached per worker (server/utils/autoTranslateStore).
 */
export default defineEventHandler(async event => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return
  const url = event.path.split('?')[0] || '/'
  if (/^\/(?:api|_nuxt|_i18n|__|i18n-messages)(?:\/|$)/.test(url)) return
  if (/\.[a-z0-9]{1,5}$/i.test(url)) return
  const accept = getRequestHeader(event, 'accept') ?? ''
  if (accept && !/text\/html|\*\/\*/.test(accept)) return

  const { locale, path: raw } = splitLocalePath(url)
  const path = raw.replace(/(.)\/+$/, '$1') || '/'
  const [translated, routes] = await Promise.all([translatedLocales(path), embargoedRoutes()])
  event.context.autoTranslate = {
    locale,
    path,
    translated,
    embargoed: isEmbargoed(path, routes),
    lookup: hashes =>
      isAutoTranslateLocale(locale)
        ? lookupTranslations(locale, hashes)
        : Promise.resolve(new Map()),
  }
})
