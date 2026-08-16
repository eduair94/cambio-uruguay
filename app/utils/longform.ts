// Shared content model for the long-form programmatic-SEO page families.
//
// `guias/[slug].vue` proved the shape: a catalogue of pure data objects, one
// dynamic page, a `validate` guard, an entry in the sitemap and one unit test.
// Every family added after it (comparativas, product-import sheets, question
// pages, locality pages, retailer guides, trámites) renders the SAME document
// shape, so the renderer, the JSON-LD and the SEO meta live in one place
// (`components/content/LongformArticle.vue` + `useLongformSeo`) instead of being
// copy-pasted seven times and drifting apart.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so vitest can
// exercise it in plain Node and the Nitro sitemap route can import it freely.
//
// The document BODIES are Spanish-only on purpose: the audience is Uruguay. The
// surrounding chrome (breadcrumbs, CTA, "última actualización") is i18n'd.

/** An optional comparison table rendered below a section's prose. */
export interface LongformTable {
  /** Column headers. The first column is the row label. */
  headers: string[]
  /** Each row has exactly `headers.length` cells. */
  rows: string[][]
}

/** A related internal link rendered as a chip. */
export interface LongformLink {
  /** Visible chip label. */
  label: string
  /** App-relative path (passed through `localePath`). */
  to: string
}

/** An external source backing a claim, rendered in a "Fuentes" card. */
export interface LongformSource {
  /** What the source says, in the reader's language. */
  label: string
  /** Absolute URL (http/https). */
  url: string
  /** Who publishes it, e.g. `'Dirección Nacional de Aduanas'`. */
  publisher?: string
}

/** A single titled section. `body` is plain prose (interpolated, never v-html). */
export interface LongformSection {
  /** Section heading, rendered as an `<h2>`. */
  heading: string
  /** Section prose. Plain text; may contain several sentences. */
  body: string
  /** Optional scannable bullet list rendered after the prose. */
  bullets?: string[]
  /** Optional comparison table rendered after the prose/bullets. */
  table?: LongformTable
  /**
   * Optional internal links rendered right under this section.
   *
   * The body is plain text, so a tool or page named in prose is NOT clickable.
   * Put the destination here and the reader can reach it where the paragraph
   * motivates it, instead of only from the chips at the very bottom.
   */
  links?: LongformLink[]
}

/** One step of a procedural document, emitted as HowToStep JSON-LD. */
export interface LongformStep {
  /** Short imperative step name. */
  name: string
  /** One-sentence explanation. */
  text: string
}

/** One question/answer pair, rendered as an FAQ block and emitted as FAQPage JSON-LD. */
export interface LongformFaq {
  q: string
  a: string
}

/** A complete long-form document, addressable at `/{family}/{slug}`. */
export interface LongformDoc {
  /** URL-safe identifier, unique within its family. */
  slug: string
  /** H1 / document title. */
  title: string
  /** One-line summary used for the meta description, cards and the OG subtitle. */
  description: string
  /** Short uppercase label shown on cards and the OG image (e.g. `'IMPORTAR'`). */
  tag: string
  /** ISO date (`YYYY-MM-DD`) of last review; drives `datePublished`/`dateModified`. */
  updatedAt: string
  /** Ordered body sections. */
  sections: LongformSection[]
  /** Optional ordered steps; when present the page also emits HowTo JSON-LD. */
  steps?: LongformStep[]
  /** Optional Q&A; when present the page renders an FAQ block and emits FAQPage JSON-LD. */
  faqs?: LongformFaq[]
  /** Optional primary sources, rendered as a "Fuentes" card. */
  sources?: LongformSource[]
  /** Optional extra related links, shown with the family defaults. */
  related?: LongformLink[]
  /** Search synonyms folded into the site-search haystack. */
  keywords?: readonly string[]
}

/** Strip diacritics, lowercase and hyphenate — the slug rule shared by every family. */
export function slugifyText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Build a `slug -> doc` map for O(1) lookups from a catalogue array. */
export function indexBySlug<T extends { slug: string }>(docs: readonly T[]): Map<string, T> {
  return new Map(docs.map(doc => [doc.slug, doc]))
}

/**
 * Slugs that appear more than once in a catalogue.
 *
 * Families are assembled from several chunk files authored independently, so a
 * duplicate slug is a realistic mistake: two chunks would fight over the same
 * URL and one page would silently become unreachable. Every family's unit test
 * asserts this returns `[]`.
 */
export function duplicateSlugs(docs: readonly { slug: string }[]): string[] {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const doc of docs) {
    if (seen.has(doc.slug)) dupes.add(doc.slug)
    seen.add(doc.slug)
  }
  return [...dupes].sort()
}

/**
 * Structural problems in a catalogue, as human-readable strings.
 *
 * Shared by every family's unit test so a new page family inherits the same
 * quality floor: real slug, real title, a description long enough to serve as a
 * meta description, an ISO date, and sections with actual prose rather than a
 * heading and a stub. Thin pages are the failure mode of programmatic SEO — this
 * is the tripwire that keeps a family from shipping them.
 */
export function longformIssues(
  docs: readonly LongformDoc[],
  options: { minSections?: number; minBodyChars?: number; minDescriptionChars?: number } = {}
): string[] {
  const minSections = options.minSections ?? 3
  const minBodyChars = options.minBodyChars ?? 180
  const minDescriptionChars = options.minDescriptionChars ?? 70
  const issues: string[] = []

  for (const doc of docs) {
    const id = doc.slug || '(sin slug)'
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.slug)) issues.push(`${id}: slug no canónico`)
    if (doc.title.trim().length < 12) issues.push(`${id}: título demasiado corto`)
    if (doc.description.trim().length < minDescriptionChars) {
      issues.push(`${id}: descripción de ${doc.description.trim().length} caracteres`)
    }
    if (doc.description.trim().length > 300) issues.push(`${id}: descripción demasiado larga`)
    if (!doc.tag.trim()) issues.push(`${id}: falta tag`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.updatedAt) || Number.isNaN(Date.parse(doc.updatedAt))) {
      issues.push(`${id}: updatedAt inválido`)
    }
    if (doc.sections.length < minSections) {
      issues.push(`${id}: ${doc.sections.length} secciones (mínimo ${minSections})`)
    }
    for (const section of doc.sections) {
      if (!section.heading.trim()) issues.push(`${id}: sección sin encabezado`)
      if (section.body.trim().length < minBodyChars) {
        issues.push(`${id}: «${section.heading}» tiene ${section.body.trim().length} caracteres`)
      }
      for (const bullet of section.bullets ?? []) {
        if (!bullet.trim()) issues.push(`${id}: viñeta vacía en «${section.heading}»`)
      }
      if (section.table) {
        if (section.table.headers.length < 2) {
          issues.push(`${id}: tabla de una sola columna en «${section.heading}»`)
        }
        for (const row of section.table.rows) {
          if (row.length !== section.table.headers.length) {
            issues.push(`${id}: fila desalineada en «${section.heading}»`)
          }
        }
      }
      for (const link of section.links ?? []) {
        if (!link.to.startsWith('/')) issues.push(`${id}: enlace no relativo ${link.to}`)
        if (!link.label.trim()) issues.push(`${id}: enlace sin etiqueta`)
      }
    }
    for (const step of doc.steps ?? []) {
      if (!step.name.trim() || step.text.trim().length < 20) {
        issues.push(`${id}: paso «${step.name}» incompleto`)
      }
    }
    for (const faq of doc.faqs ?? []) {
      if (faq.q.trim().length < 10) issues.push(`${id}: pregunta demasiado corta`)
      if (faq.a.trim().length < 80) issues.push(`${id}: respuesta demasiado corta a «${faq.q}»`)
    }
    for (const source of doc.sources ?? []) {
      if (!/^https?:\/\//.test(source.url)) issues.push(`${id}: fuente sin URL absoluta`)
      if (!source.label.trim()) issues.push(`${id}: fuente sin etiqueta`)
    }
    for (const link of doc.related ?? []) {
      if (!link.to.startsWith('/')) issues.push(`${id}: related no relativo ${link.to}`)
    }
  }

  return issues
}

/**
 * Near-duplicate bodies across a catalogue, as `slugA ~ slugB` strings.
 *
 * Programmatic families are written from a template, so the real risk is not a
 * missing field but 200 pages that say the same thing with the noun swapped.
 * This compares the concatenated prose of each pair by word-set overlap
 * (Jaccard) and reports pairs above `threshold`.
 */
export function nearDuplicatePairs(docs: readonly LongformDoc[], threshold = 0.82): string[] {
  const bags = docs.map(doc => {
    const text = doc.sections
      .map(section => `${section.heading} ${section.body} ${(section.bullets ?? []).join(' ')}`)
      .join(' ')
    const words = slugifyText(text).split('-').filter(Boolean)
    return { slug: doc.slug, words: new Set(words) }
  })

  const pairs: string[] = []
  for (let i = 0; i < bags.length; i++) {
    for (let j = i + 1; j < bags.length; j++) {
      const a = bags[i]!
      const b = bags[j]!
      let shared = 0
      for (const word of a.words) if (b.words.has(word)) shared++
      const union = a.words.size + b.words.size - shared
      if (union === 0) continue
      if (shared / union >= threshold) pairs.push(`${a.slug} ~ ${b.slug}`)
    }
  }
  return pairs
}
