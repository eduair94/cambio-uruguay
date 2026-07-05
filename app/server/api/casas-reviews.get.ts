// Public read model for the refreshed review snapshots that /casas-de-cambio
// layers over its researched reputation dataset. Cached briefly — the store
// only changes when the weekly task runs.
import { loadCasasReviews } from '../utils/casasReviewsStore'

export default defineEventHandler(async event => {
  const doc = await loadCasasReviews()
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
  return doc
})
