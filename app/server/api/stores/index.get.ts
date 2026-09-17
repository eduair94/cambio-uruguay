import { StoreProfileModel } from '../../models/StoreProfile'
import { connectDb } from '../../utils/db'
import { STORE_DIRECTORY } from '../../../utils/storeDirectory'
import { storeFreshSignals, type StorePublicProfile } from '../../../utils/storeProfiles'

/**
 * The hub card for /tiendas-online-uruguay: one row per curated store, whether or not the weekly
 * backend job (`sync_store_profiles.ts`) has written a profile for it yet. `since`/`trustpilot`/
 * `google`/`redditMentions`/`catalogOffers` come straight off the document's own signals — a `null`
 * here means "no data", never "no perfil en Trustpilot"; that distinction is the profile's job
 * (`undefined` vs `null` at write time, see `classes/stores/profile.ts`), and by the time a signal
 * reaches this route it is already collapsed to one or the other.
 */
export interface StoreCard {
  key: string
  name: string
  domain: string | null
  kind: string
  rubros: string[]
  since: string | null
  trustpilot: { score: number; reviews: number } | null
  google: { rating: number; reviews: number } | null
  redditMentions: number | null
  catalogOffers: number | null
  signals: number
  indexable: boolean
}

export interface StoresIndexResponse {
  stores: StoreCard[]
}

// Excludes the backend's own working state (never published, see StoreProfile.ts's header) and
// Mongo bookkeeping. All-exclusion projection, same shape as equipar/index.get.ts's `.select`.
const SELECT = {
  _id: 0,
  __v: 0,
  createdAt: 0,
  updatedAt: 0,
  toneCache: 0,
  redditMentions: 0,
  redditCursor: 0,
  redditTermsKey: 0,
}

export default defineEventHandler(async (event): Promise<StoresIndexResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
  )

  try {
    await connectDb()
    const now = new Date()
    const docs = (await StoreProfileModel.find({})
      .select(SELECT)
      .lean()) as unknown as StorePublicProfile[]
    const byKey = new Map(docs.map(doc => [doc.key, doc]))

    const stores: StoreCard[] = STORE_DIRECTORY.map(entry => {
      const profile = byKey.get(entry.key) ?? null
      return {
        key: entry.key,
        name: entry.name,
        domain: entry.domain,
        kind: entry.kind,
        rubros: entry.rubros,
        since: profile?.age?.since ?? null,
        trustpilot: profile?.trustpilot
          ? { score: profile.trustpilot.score, reviews: profile.trustpilot.reviews }
          : null,
        google: profile?.google
          ? { rating: profile.google.rating, reviews: profile.google.reviews }
          : null,
        redditMentions: profile?.reddit ? profile.reddit.mentions : null,
        catalogOffers: profile?.catalog ? profile.catalog.offers : null,
        signals: profile ? storeFreshSignals(profile, now) : 0,
        indexable: profile?.indexable ?? false,
      }
    })

    // Alphabetical (es), not the registry's own order: the registry is grouped by rubro, not by
    // what a reader scanning an A-Z directory expects.
    stores.sort((a, b) => a.name.localeCompare(b.name, 'es'))

    return { stores }
  } catch {
    // A database hiccup renders the hub's empty state, never a 500.
    return { stores: [] }
  }
})
