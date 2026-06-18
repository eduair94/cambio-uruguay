// Framework-agnostic shared helpers + metadata for the AI-generated daily blog
// (`/blog`, `/blog/[slug]`). PURE module (no Vue/Nuxt runtime, relative imports
// only) so it is shared by the server generator (`server/utils/blog.ts`), the
// pages, the sitemap route and unit tests.
//
// The blog publishes one post per category per day:
//  - `dolar-global`: world news that can move the US dollar (Fed, inflation,
//    global markets) and what it means for Uruguayans who hold/buy dollars.
//  - `dolar-uruguay`: local Uruguay news that can move the peso and the local
//    dollar price (BCU, economy, politics).

/** The two daily post streams. */
export type BlogCategory = 'dolar-global' | 'dolar-uruguay'

/** Display metadata for a blog category (no server-only fields like feeds). */
export interface BlogCategoryMeta {
  category: BlogCategory
  /** Short uppercase tag for cards / OG image. */
  tag: string
  /** Human label. */
  label: string
  /** One-line description for the hub + meta. */
  description: string
  /** MDI icon. */
  icon: string
}

/** Category metadata, in display order. */
export const BLOG_CATEGORY_META: Readonly<Record<BlogCategory, BlogCategoryMeta>> = Object.freeze({
  'dolar-global': {
    category: 'dolar-global',
    tag: 'DÓLAR GLOBAL',
    label: 'El dólar en el mundo',
    description:
      'Resumen diario de las noticias del mundo que pueden mover el dólar (Reserva Federal, inflación, mercados) y su impacto para Uruguay.',
    icon: 'mdi-earth',
  },
  'dolar-uruguay': {
    category: 'dolar-uruguay',
    tag: 'DÓLAR URUGUAY',
    label: 'El dólar y el peso en Uruguay',
    description:
      'Resumen diario de las noticias locales que pueden mover el peso uruguayo y la cotización del dólar en Uruguay.',
    icon: 'mdi-flag',
  },
})

/** Every category key, in display order. */
export function blogCategories(): BlogCategory[] {
  return Object.keys(BLOG_CATEGORY_META) as BlogCategory[]
}

/** True when `value` is a known category. */
export function isBlogCategory(value: string): value is BlogCategory {
  return value === 'dolar-global' || value === 'dolar-uruguay'
}

/** A stored/served blog post. `body` is sanitized Markdown. */
export interface BlogPost {
  /** URL slug: `${date}-${category}`, e.g. `2026-06-17-dolar-global`. */
  slug: string
  /** ISO date `YYYY-MM-DD` the post covers. */
  date: string
  /** Category stream. */
  category: BlogCategory
  /** H1 / title. */
  title: string
  /** One-line summary (meta description + card). */
  summary: string
  /** Markdown body. */
  body: string
  /** Source headlines the summary is grounded in. */
  headlines: Array<{ title: string; source: string; link: string }>
  /** ISO timestamp when generated. */
  createdAt: string
  /** AI model that produced the post (e.g. `wormv5.1`). */
  model?: string
}

/** Lightweight list item (no body) for the hub + sitemap. */
export type BlogPostSummary = Omit<BlogPost, 'body' | 'headlines'>

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Build the canonical slug for a date + category. */
export function blogSlug(date: string, category: BlogCategory): string {
  return `${date}-${category}`
}

/**
 * Parse a slug back into its date + category, or `null` when malformed or the
 * category is unknown. Accepts `YYYY-MM-DD-<category>`.
 */
export function parseBlogSlug(slug: string): { date: string; category: BlogCategory } | null {
  const m = slug.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/)
  if (!m) return null
  const date = m[1]
  const category = m[2]
  if (!date || !category) return null
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) return null
  if (!isBlogCategory(category)) return null
  return { date, category }
}

/** Today's date as `YYYY-MM-DD` in the Montevideo timezone (UTC-3, no DST). */
export function montevideoToday(now: Date = new Date()): string {
  // Uruguay is UTC-3 year-round; shift then take the UTC date part.
  const shifted = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}
