// Durable store for refreshed Google-review snapshots of the exchange-house
// directory (filesystem-backed `casas-reviews` mount, same pattern as the
// courier rates store). The scheduled task writes here; /api/casas-reviews
// reads it; the page layers it over the static researched snapshot.
// Golden rule: only a fresh, plausible fetch overwrites a value (see
// utils/casasReviews.shouldAcceptReview) — anything else leaves the previous
// good value untouched.
import type { StoredCasaReview, StoredTrustpilot } from '../../utils/casasReviews'

const STORAGE = 'casas-reviews'
const KEY = 'reviews.json'

export interface CasasReviewsDoc {
  reviews: Record<string, StoredCasaReview>
  trustpilot: Record<string, StoredTrustpilot>
  updatedAt: string | null
}

export async function loadCasasReviews(): Promise<CasasReviewsDoc> {
  const doc = await useStorage(STORAGE).getItem<CasasReviewsDoc>(KEY)
  return doc ?? { reviews: {}, trustpilot: {}, updatedAt: null }
}

export async function saveCasasReviews(doc: CasasReviewsDoc): Promise<void> {
  await useStorage(STORAGE).setItem(KEY, doc)
}
