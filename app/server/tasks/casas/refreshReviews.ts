// Nitro scheduled task: refresh the Google-review (and Trustpilot) snapshots
// shown on /casas-de-cambio. Registered under `nitro.scheduledTasks` (weekly —
// review averages drift slowly). Backed by two self-hosted scraper services
// (the "trustpilot" monorepo), both optional and env-configured:
//
//   CASAS_REVIEWS_GMAPS_URL       Google Places proxy base (servers/google-maps-server.ts,
//                                 default port 2221) — /placeDetails by pinned place_id.
//   CASAS_REVIEWS_TRUSTPILOT_URL  Trustpilot API base (servers/index.ts, port 3029) —
//                                 /trustpilot/feedbacks?domain=…
//
// Google listings are read by PINNED place_id (CASAS_PLACE_IDS), never by text
// search — so a run always reads the exact listing that was human-verified, and
// can never drift onto a co-branded/nearby business. When an env is unset the
// corresponding half no-ops, so the page keeps serving the researched snapshot
// (2026-07-04). Implausible fetches never overwrite good data (shouldAcceptReview).
import {
  CASAS_PLACE_IDS,
  CASAS_TRUSTPILOT_DOMAINS,
  parsePlaceDetails,
  parseTrustpilotFeedbacks,
  shouldAcceptReview,
} from '../../../utils/casasReviews'
import { loadCasasReviews, saveCasasReviews } from '../../utils/casasReviewsStore'

const FIELDS = 'place_id,name,rating,user_ratings_total,url'

export default defineTask({
  meta: {
    name: 'casas:reviews',
    description: 'Refresh Google/Trustpilot review snapshots for the exchange-house directory',
  },
  async run() {
    // Runtime env is empty under pm2 on prod — read the .env-baked runtimeConfig.
    const { casasReviews } = useRuntimeConfig()
    const gmapsBase = (casasReviews?.gmapsUrl || '').replace(/\/$/, '')
    const tpBase = (casasReviews?.trustpilotUrl || '').replace(/\/$/, '')
    const doc = await loadCasasReviews()
    const now = new Date().toISOString()
    let updated = 0
    let rejected = 0
    let failed = 0

    if (gmapsBase) {
      for (const [code, placeId] of Object.entries(CASAS_PLACE_IDS)) {
        const prev = doc.reviews[code] ?? null
        let fetched = null
        try {
          const json = await $fetch(`${gmapsBase}/placeDetails`, {
            params: { place_id: placeId, fields: FIELDS },
            timeout: 20_000,
          })
          fetched = parsePlaceDetails(json)
        } catch {
          fetched = null
        }
        if (!fetched) {
          failed++
          continue
        }
        if (!shouldAcceptReview(prev, fetched)) {
          rejected++
          continue
        }
        doc.reviews[code] = {
          rating: fetched.rating,
          count: fetched.count,
          placeId,
          name: fetched.name ?? prev?.name ?? null,
          url: fetched.url ?? prev?.url ?? null,
          checkedAt: now,
        }
        updated++
      }
    }

    if (tpBase) {
      for (const [code, domain] of Object.entries(CASAS_TRUSTPILOT_DOMAINS)) {
        try {
          const json = await $fetch(`${tpBase}/trustpilot/feedbacks`, {
            params: { domain },
            timeout: 90_000,
          })
          const parsed = parseTrustpilotFeedbacks(json)
          if (!parsed) {
            rejected++
            continue
          }
          doc.trustpilot[code] = {
            score: parsed.score,
            count: parsed.count,
            url: `https://www.trustpilot.com/review/${domain}`,
            checkedAt: now,
          }
          updated++
        } catch {
          failed++
        }
      }
    }

    if (updated > 0) doc.updatedAt = now
    await saveCasasReviews(doc)
    return {
      result: {
        updated,
        rejected,
        failed,
        gmaps: Boolean(gmapsBase),
        trustpilot: Boolean(tpBase),
      },
    }
  },
})
