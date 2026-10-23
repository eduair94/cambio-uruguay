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
