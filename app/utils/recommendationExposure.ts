export const RECOMMENDATION_AREAS = ['guide_next_steps', 'bank_decision'] as const
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
