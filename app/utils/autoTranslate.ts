/**
 * Machine translation of whole pages, at the HTML level. PURE (no Vue, no Nuxt, no DOM): the
 * server plugin, the browser plugin, the API and the translation job all share it.
 *
 * Why at the HTML level. Most of the site is Spanish written straight into ~300 page templates
 * (≈860.000 characters measured 2026-11-04) and ~12 MB of TypeScript content (guides, FAQs,
 * catalogues). Moving all of that into vue-i18n keys is a rewrite of the site; translating what
 * the page RENDERS is not. The unit is a DOM text node (or a translatable attribute), so the
 * server — which sees an HTML string — and the browser — which sees a DOM — cut the page into
 * exactly the same pieces and agree on every key.
 *
 * Numbers are not part of a key. "Hoy el dólar está a 40,63" and "… a 40,71" are one entry,
 * "Hoy el dólar está a {0}", and the live figure is put back into the translation. Without it,
 * every sentence carrying a rate would miss the memory each time the rate moved.
 */

import { EXTRA_LOCALE_CODES, LOCALE_PREFIX_RE, hasExtraLocales } from './locales'

/**
 * Locales whose pages are machine-translated in full (on top of their vue-i18n chrome): every
 * locale but Spanish, in the order the job fills them — the languages of who comes to Uruguay to
 * visit or to stay first (Brazil and Argentina speak Portuguese and Spanish; the rest by the
 * size of the communities and of the tourism). tests/unit/autoTranslate.test.ts checks that no
 * locale of utils/locales.ts is left out.
 */
export const AUTO_TRANSLATE_LOCALES: readonly string[] = Object.freeze([
  'en',
  'pt',
  'fr',
  'de',
  'it',
  'ru',
  'zh',
  'uk',
  'nl',
  'pl',
  'ja',
  'ko',
  'tr',
  'ca',
  'ro',
  'sv',
  'da',
  'no',
  'fi',
  'el',
  'cs',
  'sk',
  'hu',
  'bg',
  'hr',
  'sl',
  'lt',
  'lv',
  'et',
  'hi',
  'id',
  'ms',
  'vi',
  'th',
  'ar',
  'fa',
  'ur',
  'he',
])

/**
 * Share of a page's Spanish text (by characters) that must have a translation before the
 * translated page stops pointing its canonical at the Spanish URL and enters the sitemap.
 */
export const AUTO_TRANSLATE_THRESHOLD = 0.9

export function isAutoTranslateLocale(code: string | null | undefined): boolean {
  return !!code && AUTO_TRANSLATE_LOCALES.includes(code)
}

/** 53-bit string hash (cyrb53), base 36. Sync and identical in Node and the browser. */
export function hashText(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

/** What a text node reads like once whitespace is collapsed — the DOM-independent form. */
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

const NUMBER = /\d+(?:[.,:/]\d+)*/g

/** Whether a normalized segment is prose worth translating. */
export function isTranslatable(text: string): boolean {
  if (text.length < 2 || text.length > 5000) return false
  // At least two letters, and at least one lowercase one: "USD", "BROU" or "$U 40,63" are not
  // sentences, and Google would only mangle them.
  const letters = text.match(/\p{L}/gu)
  if (!letters || letters.length < 2) return false
  if (!/\p{Ll}/u.test(text)) return false
  if (/^(?:https?:\/\/|www\.)\S+$/i.test(text)) return false
  if (/^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/.test(text)) return false
  return true
}

export interface SegmentKey {
  /** Hash of `template`: the memory's key. */
  hash: string
  /** The text with every number replaced by {0}, {1}… */
  template: string
  /** The numbers, in order, to put back into a translation. */
  numbers: string[]
}

export function segmentKey(normalized: string): SegmentKey {
  const numbers: string[] = []
  const template = normalized.replace(NUMBER, match => `{${numbers.push(match) - 1}}`)
  return { hash: hashText(template), template, numbers }
}

/** A stored translation with the live numbers back in; null when a placeholder is missing. */
export function fillTemplate(template: string, numbers: readonly string[]): string | null {
  let broken = false
  const out = template.replace(/\{(\d+)\}/g, (_, index: string) => {
    const value = numbers[Number(index)]
    if (value === undefined) broken = true
    return value ?? ''
  })
  return broken ? null : out
}

/** Translate one normalized text through a hash → template map; null when there is no entry. */
export function translateSegment(
  normalized: string,
  translations: ReadonlyMap<string, string> | Record<string, string>
): string | null {
  if (!isTranslatable(normalized)) return null
  const key = segmentKey(normalized)
  const stored =
    translations instanceof Map
      ? translations.get(key.hash)
      : (translations as Record<string, string>)[key.hash]
  if (typeof stored !== 'string') return null
  // A stored translation with brackets the Spanish lacks is Google filling a gap ("[link
  // missing]", "[inserir endereço de e-mail aqui]"): served in Spanish instead. The job refuses
  // them since 2026-11-08 (`bracketsKept` in scripts/i18n/lib/machine-translate.mjs); this check
  // also covers the ~1.000 rows it had already stored, from the first render after a deploy.
  if (addsBrackets(stored, key.template)) return null
  return fillTemplate(stored, key.numbers)
}

/** Whether `text` has more `[` or `]` than `source`. Same rule as the job's `bracketsKept`. */
export function addsBrackets(text: string, source: string): boolean {
  const count = (value: string, char: string) => value.split(char).length - 1
  return count(text, '[') > count(source, '[') || count(text, ']') > count(source, ']')
}

// ---------------------------------------------------------------------------------------------
// HTML (server side): Vue's SSR output, which escapes &, <, >, " and ' everywhere, so a tag
// never contains a raw '>' and text never contains a raw '<'.
// ---------------------------------------------------------------------------------------------

/** Attributes whose value a reader sees or hears. */
export const TRANSLATABLE_ATTRIBUTES: readonly string[] = Object.freeze([
  'title',
  'alt',
  'placeholder',
  'aria-label',
])

/** Elements whose content is code, data or another document — never prose to translate. */
const SKIP_ELEMENTS = new Set([
  'script',
  'style',
  'noscript',
  'textarea',
  'code',
  'pre',
  'kbd',
  'samp',
  'var',
  'svg',
  'math',
  'template',
])
/** Their content is raw text: the next '<' is not a tag until the matching close. */
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'noscript'])

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

/** CSS-free check, shared with the browser: an element that opts out of translation. */
export function optsOut(attributes: Record<string, string>): boolean {
  if (attributes.translate === 'no') return true
  if ('data-notranslate' in attributes) return true
  return /(?:^|\s)notranslate(?:\s|$)/.test(attributes.class ?? '')
}

const ENTITY: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : Number(body.slice(1))
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return ENTITY[body.toLowerCase()] ?? match
  })
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const ATTRIBUTE = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g

interface Piece {
  /** Position of the raw text (or attribute value) in the HTML string. */
  start: number
  end: number
  /** Decoded text as the DOM holds it. */
  text: string
  attribute: boolean
}

/** Every translatable text node and attribute value in an HTML fragment, in document order. */
export function scanHtml(html: string): Piece[] {
  const pieces: Piece[] = []
  // Open elements, each with whether it (or an ancestor) opts out of translation.
  const stack: Array<{ tag: string; skip: boolean }> = []
  const skipping = () => stack.length > 0 && stack[stack.length - 1]!.skip
  let index = 0
  while (index < html.length) {
    const lt = html.indexOf('<', index)
    const textEnd = lt === -1 ? html.length : lt
    if (textEnd > index && !skipping()) {
      const raw = html.slice(index, textEnd)
      if (/\S/.test(raw))
        pieces.push({ start: index, end: textEnd, text: decodeEntities(raw), attribute: false })
    }
    if (lt === -1) break
    if (html.startsWith('<!--', lt)) {
      const close = html.indexOf('-->', lt + 4)
      index = close === -1 ? html.length : close + 3
      continue
    }
    const gt = html.indexOf('>', lt)
    if (gt === -1) break
    const inner = html.slice(lt + 1, gt)
    if (inner.startsWith('/')) {
      const tag = inner.slice(1).trim().toLowerCase()
      const at = stack.map(entry => entry.tag).lastIndexOf(tag)
      if (at !== -1) stack.length = at
      index = gt + 1
      continue
    }
    if (inner.startsWith('!') || inner.startsWith('?')) {
      index = gt + 1
      continue
    }
    const nameMatch = /^([a-z][\w:-]*)/i.exec(inner)
    if (!nameMatch) {
      index = gt + 1
      continue
    }
    const tag = nameMatch[1]!.toLowerCase()
    const attributes: Record<string, string> = {}
    const valuePositions: Record<string, { start: number; end: number; raw: string }> = {}
    const attrSource = inner.slice(nameMatch[0].length)
    const attrOffset = lt + 1 + nameMatch[0].length
    ATTRIBUTE.lastIndex = 0
    for (let match = ATTRIBUTE.exec(attrSource); match; match = ATTRIBUTE.exec(attrSource)) {
      const name = match[1]!.toLowerCase()
      const raw = match[2] ?? match[3] ?? match[4] ?? ''
      attributes[name] = decodeEntities(raw)
      if (match[2] !== undefined || match[3] !== undefined) {
        const valueStart = attrOffset + match.index + match[0].length - raw.length - 1
        valuePositions[name] = { start: valueStart, end: valueStart + raw.length, raw }
      }
    }
    const skip = skipping() || SKIP_ELEMENTS.has(tag) || optsOut(attributes)
    if (!skip) {
      for (const name of TRANSLATABLE_ATTRIBUTES) {
        const position = valuePositions[name]
        if (position && /\S/.test(position.raw)) {
          pieces.push({
            start: position.start,
            end: position.end,
            text: attributes[name]!,
            attribute: true,
          })
        }
      }
    }
    const selfClosing = inner.endsWith('/')
    index = gt + 1
    if (VOID_ELEMENTS.has(tag) || selfClosing) continue
    if (RAW_TEXT_ELEMENTS.has(tag)) {
      const close = html.toLowerCase().indexOf(`</${tag}`, index)
      index = close === -1 ? html.length : close
      stack.push({ tag, skip: true })
      continue
    }
    stack.push({ tag, skip })
  }
  return pieces
}

/** The keys of every translatable segment in an HTML fragment (what the memory must hold). */
export function htmlSegments(html: string): SegmentKey[] {
  const seen = new Map<string, SegmentKey>()
  for (const piece of scanHtml(html)) {
    const normalized = normalizeText(piece.text)
    if (!isTranslatable(normalized)) continue
    const key = segmentKey(normalized)
    if (!seen.has(key.hash)) seen.set(key.hash, key)
  }
  return [...seen.values()]
}

export interface TranslatedHtml {
  html: string
  /** hash → stored translation, for every segment this page used (the browser needs them). */
  used: Record<string, string>
  /** Translatable characters on the page, and how many of them got a translation. */
  chars: number
  translatedChars: number
}

/** Replace every segment that has a translation; leading and trailing whitespace is kept. */
export function translateHtml(
  html: string,
  translations: ReadonlyMap<string, string>
): TranslatedHtml {
  const used: Record<string, string> = {}
  let out = ''
  let cursor = 0
  let chars = 0
  let translatedChars = 0
  for (const piece of scanHtml(html)) {
    const normalized = normalizeText(piece.text)
    if (!isTranslatable(normalized)) continue
    chars += normalized.length
    const key = segmentKey(normalized)
    const stored = translations.get(key.hash)
    if (stored === undefined) continue
    // Same rule as translateSegment: an invented "[link missing]" stays in Spanish.
    if (addsBrackets(stored, key.template)) continue
    const filled = fillTemplate(stored, key.numbers)
    if (filled === null) continue
    used[key.hash] = stored
    translatedChars += normalized.length
    const lead = piece.attribute ? '' : (/^\s*/.exec(piece.text)?.[0] ?? '')
    const trail = piece.attribute ? '' : (/\s*$/.exec(piece.text)?.[0] ?? '')
    out += html.slice(cursor, piece.start) + escapeHtml(lead + filled + trail)
    cursor = piece.end
  }
  return { html: out + html.slice(cursor), used, chars, translatedChars }
}

// ---------------------------------------------------------------------------------------------
// What a translated page may claim: canonical, hreflang, sitemap. One rule for the server, the
// browser and the sitemap, so the three never disagree.
// ---------------------------------------------------------------------------------------------

/**
 * Whether a Spanish path is reserved by a row of docs/seo/experiments.json still inside its
 * 28-day window (`routes` comes from the job, Spanish or locale-prefixed, with the semantics of
 * `routeMatches` in classes/revenueplan/experiments.ts: `*` = prefix, trailing `/` = family,
 * anything else exact). A reserved page is translated but keeps its canonical and hreflang, so
 * the row measuring it is not contaminated.
 */
export function isEmbargoed(path: string, routes: readonly string[]): boolean {
  const matcher = embargoMatcher(routes)
  if (matcher.exact.has(path)) return true
  for (const prefix of matcher.prefixes) if (path.startsWith(prefix)) return true
  for (const family of matcher.families) if (path.startsWith(family)) return true
  return false
}

interface EmbargoMatcher {
  exact: Set<string>
  families: string[]
  prefixes: string[]
}

const embargoMatchers = new WeakMap<readonly string[], EmbargoMatcher>()

/**
 * `routes` compiled once per array. Normalizing every route on every call (a regex over 35
 * locale prefixes, 256 routes) cost 42 µs a call, and a sitemap asks once per URL and per
 * alternate: ~45 s a sitemap (measured 2026-11-06).
 */
function embargoMatcher(routes: readonly string[]): EmbargoMatcher {
  let matcher = embargoMatchers.get(routes)
  if (matcher) return matcher
  matcher = { exact: new Set(), families: [], prefixes: [] }
  for (const raw of routes) {
    const route = raw.trim().replace(LOCALE_PREFIX_RE, '') || '/'
    if (route.endsWith('*')) {
      matcher.prefixes.push(route.slice(0, -1))
    } else if (route.endsWith('/') && route.length > 1) {
      matcher.exact.add(route.slice(0, -1))
      matcher.families.push(route)
    } else {
      matcher.exact.add(route)
    }
  }
  embargoMatchers.set(routes, matcher)
  return matcher
}

export interface PageTranslationState {
  /** Locales with ≥ AUTO_TRANSLATE_THRESHOLD of the page's Spanish text translated. */
  translated: readonly string[]
  embargoed: boolean
}

/**
 * The non-Spanish locales whose URL of this page may be announced (hreflang, language menu,
 * sitemap): English and Portuguese everywhere, as before; an extra locale where the page is
 * one of `EXTRA_LOCALE_ROUTES` or is translated.
 */
export function announcedLocales(path: string, state: PageTranslationState): string[] {
  const out = ['en', 'pt']
  for (const code of EXTRA_LOCALE_CODES) {
    if (hasExtraLocales(path) || (!state.embargoed && state.translated.includes(code)))
      out.push(code)
  }
  return out
}

/**
 * Where the canonical of `/<locale><path>` points:
 * - `self` when the page is translated into that locale (and not reserved);
 * - `spanish` for an extra locale on a page that has neither a translation nor vue-i18n copy —
 *   every page answers in every locale (compact routes), and a French URL around a Spanish body
 *   must not claim to be a page of its own;
 * - `keep` otherwise: whatever the page itself declared.
 */
export function canonicalTarget(
  locale: string,
  path: string,
  state: PageTranslationState
): 'self' | 'spanish' | 'keep' {
  if (locale === 'es') return 'keep'
  if (!state.embargoed && state.translated.includes(locale)) return 'self'
  if (EXTRA_LOCALE_CODES.includes(locale) && !hasExtraLocales(path)) return 'spanish'
  return 'keep'
}

/**
 * Where a page request in an extra locale goes INSTEAD of being rendered: the Spanish URL, when
 * the page is not announced in that locale (`canonicalTarget` would point there anyway). Null
 * means "render it".
 *
 * Every page answers in all 39 locales, and crawlers that do not stop at a canonical rendered
 * them all: 21.850 French, Japanese… car adverts in one day of log (2026-11-06), each a full SSR
 * of a noindex page with a Spanish body. A redirect costs nothing to serve. Visitors are not
 * affected: inside the site they move by client navigation, which never asks the server for
 * the page, and the language menu only offers the locales a page is announced in.
 * English and Portuguese keep answering: they always did, with their own chrome.
 */
export function untranslatedRedirect(
  locale: string,
  path: string,
  state: PageTranslationState
): string | null {
  if (!EXTRA_LOCALE_CODES.includes(locale)) return null
  return canonicalTarget(locale, path, state) === 'spanish' ? path : null
}

const EXTRA_OG_IMAGE = new RegExp(`/__og-image__/image/(?:${EXTRA_LOCALE_CODES.join('|')})(?=/)`)

/**
 * The share image of a page in an extra locale is the Spanish one: nuxt-og-image renders the
 * page's own props, which are Spanish, so `/__og-image__/image/de/x/og.png` came out byte for
 * byte the same as `/__og-image__/image/x/og.png` — and crawlers asked for all 36 copies, each a
 * fresh PNG render (~12 % of a worker's CPU on 2026-11-06). English and Portuguese keep their own.
 */
export function spanishOgImage(url: string): string {
  return url.replace(EXTRA_OG_IMAGE, '/__og-image__/image')
}
