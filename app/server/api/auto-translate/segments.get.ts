import {
  fillTemplate,
  htmlSegments,
  isTranslatable,
  normalizeText,
  segmentKey,
  type SegmentKey,
} from '../../../utils/autoTranslate'

const HEAD_TEXT = [
  /<title[^>]*>([^<]*)<\/title>/i,
  /<meta[^>]+name="description"[^>]+content="([^"]*)"/i,
  /<meta[^>]+property="og:title"[^>]+content="([^"]*)"/i,
  /<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i,
  /<meta[^>]+name="twitter:title"[^>]+content="([^"]*)"/i,
  /<meta[^>]+name="twitter:description"[^>]+content="([^"]*)"/i,
]

const decode = (text: string) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

/**
 * The Spanish segments of a page, as the translation job needs them: the page is rendered in
 * Spanish exactly as a visitor gets it and cut with the SAME code the server translates with
 * (utils/autoTranslate.ts), so every key the job stores is a key a render will look up.
 *
 * Only for scripts/i18n/autotranslate-job.mjs: `x-auto-translate-token` must equal the app's
 * admin token (NUXT_API_ADMIN_TOKEN). Unset token, closed route.
 */
export default defineEventHandler(async event => {
  const token = String(useRuntimeConfig().apiAdminToken || '')
  if (!token || getRequestHeader(event, 'x-auto-translate-token') !== token) {
    throw createError({ statusCode: 404 })
  }
  const path = String(getQuery(event).path ?? '')
  if (!path.startsWith('/') || /^\/(?:api|_)/.test(path) || path.length > 300) {
    throw createError({ statusCode: 400, statusMessage: 'path is required' })
  }
  let html: string
  try {
    html = await $fetch<string>(path, {
      headers: { accept: 'text/html' },
      responseType: 'text',
    })
  } catch (error) {
    const status = Number((error as { statusCode?: number })?.statusCode ?? 502)
    throw createError({ statusCode: status === 404 ? 404 : 502 })
  }
  const bodyStart = html.indexOf('<body')
  const headHtml = bodyStart === -1 ? '' : html.slice(0, bodyStart)
  const bodyHtml = bodyStart === -1 ? html : html.slice(bodyStart)
  const keys = new Map<string, SegmentKey>()
  for (const key of htmlSegments(bodyHtml)) keys.set(key.hash, key)
  for (const pattern of HEAD_TEXT) {
    const match = pattern.exec(headHtml)
    if (!match) continue
    const normalized = normalizeText(decode(match[1]!))
    if (!isTranslatable(normalized)) continue
    const key = segmentKey(normalized)
    keys.set(key.hash, key)
  }
  setResponseHeader(event, 'cache-control', 'no-store')
  return {
    path,
    // `x`: the segment as this render printed it, numbers included. Google orders a sentence
    // better around real figures than around placeholders ("pendant des heures 9"), so the job
    // translates `x` and turns the result back into a template.
    segments: [...keys.values()].map(key => ({
      h: key.hash,
      s: key.template,
      ...(key.numbers.length ? { x: fillTemplate(key.template, key.numbers) } : {}),
    })),
  }
})
