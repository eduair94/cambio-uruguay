// `related_pages` (the layout's "Seguí leyendo") joined on 2026-11-16: it had clicks but no
// exposures, so 34 clicks in 28 days could not be told apart from "nobody scrolls that far".
export const RECOMMENDATION_AREAS = [
  'guide_next_steps',
  'guide_inline_next',
  'related_inline',
  'related_pages',
  'bank_decision',
  // "Más sobre este tema" (TemaVecinos, layout tail) and the family bar (FamiliaNav, top of a
  // directory) joined on 2026-11-20 for the same reason: clicks (related_click), no exposure.
  // A link inside a closed <details> is not on screen, so the family bar on a phone (a menu) and
  // a topic's folded links only count once opened.
  'topic_neighbours',
  'family_nav',
] as const
export type RecommendationArea = (typeof RECOMMENDATION_AREAS)[number]

export function recommendationArea(value: string | undefined): RecommendationArea | null {
  return RECOMMENDATION_AREAS.includes(value as RecommendationArea)
    ? (value as RecommendationArea)
    : null
}

/** A module is exposed when an actual destination link is at least half visible. */
export function createRecommendationExposure() {
  let visitKey: string | null = null
  let contentPath: string | null = null
  const sent = new Set<RecommendationArea>()
  return {
    visit(key: string, path: string | null) {
      if (key === visitKey) return
      visitKey = key
      contentPath = path
      sent.clear()
    },
    observe(area: string | undefined, ratio: number, visible: boolean) {
      const linkArea = recommendationArea(area)
      if (
        !contentPath ||
        !linkArea ||
        !visible ||
        !Number.isFinite(ratio) ||
        ratio < 0.5 ||
        ratio > 1 ||
        sent.has(linkArea)
      )
        return null
      sent.add(linkArea)
      return { content_path: contentPath, link_area: linkArea, non_interaction: true }
    },
  }
}
