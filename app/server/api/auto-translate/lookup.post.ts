import { isAutoTranslateLocale, isEmbargoed } from '../../../utils/autoTranslate'
import { LOCALE_CODES } from '../../../utils/locales'
import {
  embargoedRoutes,
  lookupTranslations,
  translatedLocales,
} from '../../utils/autoTranslateStore'

const MAX_HASHES = 3000
const HASH = /^[0-9a-z]{1,12}$/

/**
 * What plugins/auto-translate.ts asks after a client-side navigation: the stored translations
 * of the segments the new page shows, and the page's translation state (hreflang, canonical,
 * language menu). Public and read-only — the translations are what the pages print anyway.
 */
export default defineEventHandler(async event => {
  const body = (await readBody(event).catch(() => null)) as {
    locale?: unknown
    path?: unknown
    hashes?: unknown
  } | null
  const locale = typeof body?.locale === 'string' ? body.locale : ''
  const path = typeof body?.path === 'string' ? body.path.slice(0, 300) : ''
  if (!LOCALE_CODES.includes(locale) || !path.startsWith('/')) {
    throw createError({ statusCode: 400, statusMessage: 'locale and path are required' })
  }
  const hashes = Array.isArray(body?.hashes)
    ? body.hashes.filter((hash): hash is string => typeof hash === 'string' && HASH.test(hash))
    : []
  const [found, translated, routes] = await Promise.all([
    isAutoTranslateLocale(locale) && hashes.length
      ? lookupTranslations(locale, hashes.slice(0, MAX_HASHES))
      : Promise.resolve(new Map<string, string>()),
    translatedLocales(path),
    embargoedRoutes(),
  ])
  setResponseHeader(event, 'cache-control', 'no-store')
  return {
    map: Object.fromEntries(found),
    translated,
    embargoed: isEmbargoed(path, routes),
  }
})
