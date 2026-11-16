import type { Guide, GuideLink } from './guides'

/** Readable fragment IDs, including when headings repeat or contain only punctuation. */
export function guideSectionIds(sections: Pick<Guide['sections'][number], 'heading'>[]): string[] {
  const used = new Set<string>()
  return sections.map(section => {
    const words = section.heading
      .normalize('NFD')
      .replace(/[\u0300-\u036F]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const base = `guia-${words || 'seccion'}`
    let id = base
    for (let suffix = 2; used.has(id); suffix++) id = `${base}-${suffix}`
    used.add(id)
    return id
  })
}

/** A guide this long has its end-of-article recommendations many screens away. */
export const INLINE_NEXT_MIN_SECTIONS = 4
/** The inline block goes after this section (0-based): the answer and its first elaboration. */
export const INLINE_NEXT_AFTER_SECTION = 1
export const INLINE_NEXT_LIMIT = 2

/**
 * The guide's own first recommendations, repeated inside the article.
 *
 * Measured on 2026-11-16 (Uruguay, 28 days): guides are read (18 % bounce, 107 s) and left
 * (1.22 pages per session). The end-of-article list earns a click on 17 % of its exposures but
 * sits on phone screen 17, so it was seen 196 times against ~1,000 guide views. Same links,
 * earlier. Links the reader just walked past as chips of the first sections are not repeated,
 * and a short guide gets nothing: its list is already close.
 */
export function guideInlineNext(
  guide: Pick<Guide, 'sections'>,
  nextSteps: readonly GuideLink[]
): { afterSection: number; links: GuideLink[] } | null {
  if (guide.sections.length < INLINE_NEXT_MIN_SECTIONS) return null
  const justShown = new Set(
    guide.sections
      .slice(0, INLINE_NEXT_AFTER_SECTION + 1)
      .flatMap(section => section.links ?? [])
      .map(link => link.to)
  )
  const links = nextSteps.filter(link => !justShown.has(link.to)).slice(0, INLINE_NEXT_LIMIT)
  return links.length ? { afterSection: INLINE_NEXT_AFTER_SECTION, links } : null
}

/** Keep authored recommendations first; topic resources only fill guides with few of their own. */
export function guideNextSteps(
  guide: Guide,
  topicResources: readonly GuideLink[] = []
): GuideLink[] {
  const links: GuideLink[] = []
  const seen = new Set<string>([`/guias/${guide.slug}`])
  const append = (link: GuideLink) => {
    const path = link.to.split(/[?#]/)[0]?.replace(/\/+$/, '') || '/'
    if (!link.to.startsWith('/') || link.to.startsWith('//') || seen.has(path)) return
    seen.add(path)
    links.push(link)
  }
  for (const link of guide.related ?? []) append(link)
  // These destinations have already been explained in the article, so they are useful fallbacks
  // when a guide predates the explicit related list. Never inject a site-wide currency CTA.
  for (const section of guide.sections) {
    for (const link of section.links ?? []) {
      if (links.length >= 3) break
      append(link)
    }
  }
  for (const link of topicResources) {
    if (links.length >= 3) break
    append(link)
  }
  return links
}
