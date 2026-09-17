import { PhoneModelModel } from '../../models/PhoneModel'
import { PhoneMetaModel } from '../../models/PhoneMeta'
import { connectDb } from '../../utils/db'
import {
  PHONE_LIST_PROJECTION,
  PHONE_META_KEY,
  phoneHubGroups,
  type PhoneHubResponse,
  type PhoneMetaDoc,
  type PhoneModelDoc,
} from '../../../utils/phones'

/**
 * The `/celulares-uruguay` hub: every model whose NEW price is currently publishable
 * (`phonePublishable` — a band, not ambiguous, not stale), grouped by brand in reading order.
 *
 * `history` (up to 365 daily points per model) never leaves this query — `PHONE_LIST_PROJECTION`
 * excludes it, matching `PhoneModel.ts`'s own doc comment and the equivalent equipar/cars index
 * routes, which drop the same kind of per-row history on their list endpoint. A single model's own
 * page (`./[modelo].get.ts`) is the one place that needs it.
 *
 * Error path deliberately does NOT reuse the success header: a database hiccup must never be cached
 * as if it were a legitimately empty directory for the next `max-age`, so it overwrites the
 * cache-control set at the top with `no-store` before returning the same empty shape a genuinely
 * quiet catalogue would have.
 */
export default defineEventHandler(async (event): Promise<PhoneHubResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=900, s-maxage=900, stale-while-revalidate=86400'
  )
  try {
    await connectDb()
    const [meta, rows] = await Promise.all([
      PhoneMetaModel.findOne({ key: PHONE_META_KEY }).select({ generatedAt: 1, usdUyu: 1 }).lean(),
      PhoneModelModel.find({}).select(PHONE_LIST_PROJECTION).lean(),
    ])
    const metaDoc = meta as unknown as Pick<PhoneMetaDoc, 'generatedAt' | 'usdUyu'> | null
    const today = new Date().toISOString().slice(0, 10)
    return {
      generatedAt: metaDoc?.generatedAt ?? '',
      usdUyu: metaDoc?.usdUyu ?? 0,
      brands: phoneHubGroups((rows ?? []) as unknown as PhoneModelDoc[], today),
    }
  } catch {
    // A database hiccup renders the page's empty state, never a 500 — but, unlike equipar's own
    // index route, this must NOT keep the public cache header set above: an empty directory cached
    // for 900s because Mongo blipped once would hide every model from readers for that whole window.
    setResponseHeader(event, 'cache-control', 'no-store')
    return { generatedAt: '', usdUyu: 0, brands: [] }
  }
})
