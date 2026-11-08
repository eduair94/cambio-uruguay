/**
 * What the share card (components/OgImage/Cambio.vue) prints, decided here so it can be tested
 * without satori.
 *
 * The card was drawn for the exchange pages. Every other page that did not set a subtitle got
 * "Compará +40 casas de cambio en tiempo real" under its own title, the footer said "+40 casas de
 * cambio · actualizado cada 10 min" on every card, and the default card (app.vue) took the full
 * <title>, so "| Cambio Uruguay" sat under the logo that already says it. On 2026-11-08 that was
 * ~785 Spanish sitemap URLs (rentals by barrio, supermarket prices, car models, card discounts)
 * plus their /en and /pt copies, and six pages passed a `description` the card never declared.
 *
 * nuxt-og-image already hands every card the page's <meta name="description"> as
 * `props.description` when the page sets none (runtime/server/og-image/context.js), so declaring
 * the prop gives each of those pages its own sentence under its title with no per-page edit.
 */

/**
 * The og:image:alt every page starts with (app.vue). plugins/01.og-image-alt.ts replaces it with
 * the page's og:title; the pages that set their own alt keep it.
 */
export const OG_IMAGE_ALT_FLOOR =
  'Cambio Uruguay: cotización del dólar hoy y comparador de casas de cambio'

/** A meta description shown as the card's subtitle is cut at a word to this length, plus "…". */
export const OG_DESCRIPTION_MAX = 110

const BRAND_SUFFIX = /\s*[|·—–-]\s*Cambio Uruguay\s*$/i
/** Words a cut sentence must not end on: "…con gastos comunes y…" reads as a typo. */
const DANGLING = /\s+(?:[aeouy]|al|con|de|del|el|en|la|las|lo|los|para|por|que|sin|su|sus|un|una)$/i
const TRAILING_PUNCTUATION = /[\s,;:.·—–(-]+$/

const squash = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim()
const comparable = (text: string) =>
  squash(text)
    .toLocaleLowerCase('es')
    .replace(/[.…]+$/, '')

/** The title without a trailing " | Cambio Uruguay" (or "·", "—", "-"): the logo says it. */
export function ogCardTitle(title: string | null | undefined): string {
  const text = squash(title)
  return text.replace(BRAND_SUFFIX, '').trim() || text
}

/** `text` cut at a word boundary to at most `max` characters, plus "…" when it was cut. */
export function clipAtWord(text: string | null | undefined, max = OG_DESCRIPTION_MAX): string {
  const clean = squash(text)
  if (clean.length <= max) return clean
  const window = clean.slice(0, max + 1)
  const space = window.lastIndexOf(' ')
  // One word longer than half the budget is cut where it stands, not dropped whole.
  let head = space > max / 2 ? window.slice(0, space) : clean.slice(0, max)
  for (let pass = 0; pass < 3; pass++) {
    const next = head.replace(TRAILING_PUNCTUATION, '').replace(DANGLING, '')
    if (next === head) break
    head = next
  }
  return `${head.replace(TRAILING_PUNCTUATION, '')}…`
}

/**
 * The line under the title: the page's own subtitle when it sets one; on a rate card the localized
 * default ("Compará +40 casas de cambio…"), which is what that card is; anywhere else the page's
 * description, cut to fit (satori has no line clamp), unless it only repeats the title.
 */
export function ogCardSubtitle(card: {
  subtitle?: string | null
  description?: string | null
  board: boolean
  boardDefault: string
  title?: string
}): string {
  const subtitle = squash(card.subtitle)
  if (subtitle) return subtitle
  if (card.board) return card.boardDefault
  const description = clipAtWord(card.description)
  if (!description) return ''
  return card.title && comparable(description) === comparable(card.title) ? '' : description
}

export type OgCardFooter = 'exchange' | 'site'

/**
 * The footer line. The exchange one ("+40 casas de cambio · actualizado cada 10 min") belongs to
 * the rate cards; a page about exchange without rates can ask for it with `footer: 'exchange'`.
 * Every other card signs with the domain alone.
 */
export function ogCardFooter(footer: string | null | undefined, board: boolean): OgCardFooter {
  if (footer === 'exchange' || footer === 'site') return footer
  return board ? 'exchange' : 'site'
}

/** The part of an unhead tag `replaceFloorImageAlt` reads (the `tags:resolve` hook's tags). */
export interface OgHeadTag {
  tag: string
  textContent?: unknown
  props: Record<string, unknown>
}

const IMAGE_ALT = new Set(['og:image:alt', 'twitter:image:alt'])
const metaKey = (tag: OgHeadTag) =>
  tag.tag === 'meta' ? String(tag.props.property ?? tag.props.name ?? '') : ''

/**
 * Swap the floor og:image:alt / twitter:image:alt for the page's og:title (else twitter:title,
 * else <title> without the brand), in place. Only the exact floor sentence is touched: a page that
 * describes its own image keeps its words. On 49 of 56 pages sampled on 2026-11-08 the alt was
 * the floor, including English pages and the rental and car directories.
 */
export function replaceFloorImageAlt<T extends OgHeadTag>(tags: T[]): T[] {
  const content = (key: string) => {
    const value = tags.find(tag => metaKey(tag) === key)?.props.content
    return typeof value === 'string' ? squash(value) : ''
  }
  const documentTitle = tags.find(tag => tag.tag === 'title')?.textContent
  const title =
    content('og:title') ||
    content('twitter:title') ||
    (typeof documentTitle === 'string' ? ogCardTitle(documentTitle) : '')
  if (!title) return tags
  for (const tag of tags) {
    if (IMAGE_ALT.has(metaKey(tag)) && tag.props.content === OG_IMAGE_ALT_FLOOR) {
      tag.props.content = title
    }
  }
  return tags
}
