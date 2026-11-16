import { setResponseHeader } from 'h3'
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
    // 301 and not 302 (2026-11-15). With a temporary redirect Google kept the /ru, /hi… URL in its
    // index as the page and ranked it for SPANISH queries: `/ru/cuando-se-cobra-el-aguinaldo-uruguay`
    // drew 230 impressions in 28 days against 66 for the Spanish URL it redirects to. Permanent
    // folds the URL into its target. It can still change: the day the page is translated into
    // that locale this branch stops firing and the URL answers 200 with its own canonical, so the
    // browser may keep the redirect only a day and the edge only a day too.
    setResponseHeader(event, 'cache-control', 'public, max-age=86400, s-maxage=86400')
    return sendRedirect(event, rawPath + query, 301)
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
