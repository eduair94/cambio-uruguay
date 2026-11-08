import { isAutoTranslateLocale, isEmbargoed, untranslatedRedirect } from '../../utils/autoTranslate'
import { splitLocalePath } from '../../utils/localizedRoutes'
import { embargoedRoutes, lookupTranslations, translatedLocales } from '../utils/autoTranslateStore'
import { rawRequestPath } from '../utils/rawRequestPath'

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
  const embargoed = isEmbargoed(path, routes)
  // An extra locale the page is not translated into: the Spanish page, without rendering this one.
  const target = untranslatedRedirect(locale, path, { translated, embargoed })
  if (target) {
    // `target` is the DECODED path (h3 decodes event.path): the Location is rebuilt from the
    // request as sent, minus the same locale prefix and trailing slash (server/utils/rawRequestPath).
    const raw = rawRequestPath(event)
    const queryAt = raw.indexOf('?')
    const rawUrl = queryAt === -1 ? raw : raw.slice(0, queryAt)
    const query = queryAt === -1 ? '' : raw.slice(queryAt)
    const rawPath = splitLocalePath(rawUrl).path.replace(/(.)\/+$/, '$1') || '/'
    return sendRedirect(event, rawPath + query, 302)
  }
  event.context.autoTranslate = {
    locale,
    path,
    translated,
    embargoed,
    lookup: hashes =>
      isAutoTranslateLocale(locale)
        ? lookupTranslations(locale, hashes)
        : Promise.resolve(new Map()),
  }
})
