export type RankingTierId = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface RankingTierMeta {
  id: RankingTierId
  min: number
  blurb: string
}

/** Shared score bands for editorial product rankings across the site. */
export const RANKING_TIERS: readonly RankingTierMeta[] = Object.freeze([
  { id: 'S', min: 85, blurb: 'Excepcional para este uso.' },
  { id: 'A', min: 72, blurb: 'De las mejores opciones disponibles.' },
  { id: 'B', min: 64, blurb: 'Buena opción, con un pero claro.' },
  { id: 'C', min: 54, blurb: 'Cumple, pero conviene comparar.' },
  { id: 'D', min: 44, blurb: 'Solo para un caso muy específico.' },
  { id: 'F', min: 0, blurb: 'No la elegiríamos para este uso.' },
])

export function rankingTierForScore(score: number): RankingTierId {
  return RANKING_TIERS.find(tier => score >= tier.min)?.id ?? 'F'
}
