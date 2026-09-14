import type { MovingReviewProfile } from './movingReviews'
import data from './movingReviewSourcesData.json'

// Each entry must have identity evidence from the provider's own publication and
// a matching destination. Names and nearby map locations alone are insufficient.
export const MOVING_REVIEW_SOURCES = data.google.map(({ id, ...profile }) => ({
  ...profile,
  key: id,
})) as MovingReviewProfile[]

export interface MovingReviewReference {
  key: string
  providerId: string
  platform: 'google' | 'facebook' | '1122' | 'homesolution'
  label: string
  profileUrl: string
  sourceUrl: string
  checkedAt: string
  live: boolean
}
export const MOVING_REVIEW_REFERENCES = data.references.map(({ id, ...reference }) => ({
  ...reference,
  key: id,
})) as MovingReviewReference[]
