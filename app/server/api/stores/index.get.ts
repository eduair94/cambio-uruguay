import { StoreProfileModel } from '../../models/StoreProfile'
import { connectDb } from '../../utils/db'
import { STORE_DIRECTORY } from '../../../utils/storeDirectory'
import {
  storeFreshSignals,
  storeIndexable,
  storeSignalFresh,
  type StorePublicProfile,
} from '../../../utils/storeProfiles'

/**
 * The hub card for /tiendas-online-uruguay: one row per curated store, whether or not the weekly
 * backend job (`sync_store_profiles.ts`) has written a profile for it yet. `since`/`trustpilot`/
 * `google`/`redditMentions`/`catalogOffers` are only filled when their OWN signal is still within
 * `STORE_SIGNAL_MAX_AGE_DAYS` of now (fix round 1, C1) — a Trustpilot score the backend hasn't been
 * able to refresh in months must not sit on the hub looking current just because the field is still
 * there. A `null` here means "no fresh data", never "no perfil en Trustpilot"; that distinction is
 * the profile's job (`undefined` vs `null` at write time, see `classes/stores/profile.ts`), and by
 * the time a signal reaches this route it is already collapsed to one or the other.
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
  /** True when the stored mentions hit STORE_REDDIT_MAX_MENTIONS (fix round F1, item 2): the count
   * reads "500 or more", never a bare "500" that implies an exact tally. Meaningless (and always
   * `false`) when `redditMentions` is `null`. */
  redditMentionsCapped: boolean
  catalogOffers: number | null
  signals: number
  indexable: boolean
  /** Whether the backend has ever written a profile document for this store (Task 9). The detail
   * route 404s on a curated key with no document, so the hub links a row only when this is true. */
  hasProfile: boolean
}

export interface StoresIndexResponse {
  stores: StoreCard[]
  /** The newest `updatedAt` across every written profile — "when was this hub last revised" —
   * `null` when no profile exists yet. One page-wide date, never published per-store. */
  reviewedAt: string | null
}

// Excludes the backend's own working state (never published, see StoreProfile.ts's header) and
// Mongo bookkeeping. All-exclusion projection, same shape as equipar/index.get.ts's `.select`.
//
// `updatedAt` is deliberately kept (unlike the detail route's identical-looking SELECT): this route
// needs it to compute `reviewedAt` below, the only place that revision date is read from.
const SELECT = {
  _id: 0,
  __v: 0,
  createdAt: 0,
  toneCache: 0,
  redditMentions: 0,
  redditCursor: 0,
  redditTermsKey: 0,
}

type StoreDocWithMeta = StorePublicProfile & { updatedAt?: string | Date | null }

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
      .lean()) as unknown as StoreDocWithMeta[]
    const byKey = new Map(docs.map(doc => [doc.key, doc]))

    let reviewedAt: string | null = null
    for (const doc of docs) {
      if (!doc.updatedAt) continue
      const iso = new Date(doc.updatedAt).toISOString()
      if (!reviewedAt || iso > reviewedAt) reviewedAt = iso
    }

    const stores: StoreCard[] = STORE_DIRECTORY.map(entry => {
      const profile = byKey.get(entry.key) ?? null
      const freshAge = profile?.age && storeSignalFresh(profile.age.checkedAt, now)
      const freshTrustpilot =
        profile?.trustpilot && storeSignalFresh(profile.trustpilot.checkedAt, now)
      const freshGoogle = profile?.google && storeSignalFresh(profile.google.checkedAt, now)
      const freshReddit = profile?.reddit && storeSignalFresh(profile.reddit.checkedAt, now)
      const freshCatalog = profile?.catalog && storeSignalFresh(profile.catalog.checkedAt, now)
      return {
        key: entry.key,
        name: entry.name,
        domain: entry.domain,
        kind: entry.kind,
        rubros: entry.rubros,
        since: freshAge ? profile!.age!.since : null,
        trustpilot: freshTrustpilot
          ? { score: profile!.trustpilot!.score, reviews: profile!.trustpilot!.reviews }
          : null,
        google: freshGoogle
          ? { rating: profile!.google!.rating, reviews: profile!.google!.reviews }
          : null,
        redditMentions: freshReddit ? profile!.reddit!.mentions : null,
        redditMentionsCapped: freshReddit ? profile!.reddit!.capped : false,
        catalogOffers: freshCatalog ? profile!.catalog!.offers : null,
        signals: profile ? storeFreshSignals(profile, now) : 0,
        indexable: profile ? storeIndexable(profile, now) : false,
        hasProfile: Boolean(profile),
      }
    })

    // Alphabetical (es), not the registry's own order: the registry is grouped by rubro, not by
    // what a reader scanning an A-Z directory expects.
    stores.sort((a, b) => a.name.localeCompare(b.name, 'es'))

    return { stores, reviewedAt }
  } catch {
    // A database hiccup renders the hub's empty state, never a 500 — but the header set above this
    // try block was for the REAL 76-store response and told any edge to cache it for an hour. Left
    // as-is, a transient Mongo blip would get that empty fallback cached publicly for up to an hour
    // (fix round F1, item 13): overwrite it with `no-store` so the empty state is never cached.
    setResponseHeader(event, 'cache-control', 'no-store')
    return { stores: [], reviewedAt: null }
  }
})
