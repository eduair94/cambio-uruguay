import { StoreProfileModel } from '../../models/StoreProfile'
import { connectDb } from '../../utils/db'
import { getRawCatalog } from '../../utils/bankos'
import { isStoreDirectoryKey, storeDirectoryEntry } from '../../../utils/storeDirectory'
import { reduceBrands, type BrandsRawData } from '../../../utils/bankosBrands'
import { buildBrandPageIndex, findBrandBySlug } from '../../../utils/bankosBrandPage'
import { slugifyText } from '../../../utils/longform'
import {
  storeFreshSignals,
  storeIndexable,
  type StorePublicProfile,
} from '../../../utils/storeProfiles'

export interface StoreDetailResponse {
  profile: StorePublicProfile
  /** The Bankos brand whose slug matches this store's own canonical NAME; null when Bankos has no
   * such brand, or when the loader itself failed (never a 500 — see `findBankosBrandSlug`). */
  bankosBrandSlug: string | null
  /** ISO instant this response was computed (fix round F1, item 11): the page's own freshness
   * decisions (`storeSignalFresh` and everything built on it) must use THIS instant, never a fresh
   * client-side `new Date()` — a client hydrating long after the server rendered (a slow connection,
   * an edge cache serving this JSON itself, a resumed tab) would otherwise judge freshness against
   * the wrong "now" and could even disagree with what the server just rendered into the same page. */
  servedAt: string
}

// Same exclusions as the list route: never publish the backend's Reddit working state.
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

/**
 * Reuses the same cached catalogue and brand index as `/api/bankos/marca/<slug>` (see that route):
 * ONLY the store's own canonical NAME, slugified, matched against a Bankos brand's own slug — never
 * an alias (fix round F1, item 14). Several registry aliases are short, generic single words kept
 * for seller-name matching elsewhere ("Claro" for Tienda Claro, "Vigo" for World Vigo, "Tata" for
 * Ta-Ta, "Fama" for Fama Electrodomésticos...); matching those against Bankos' OWN brand list risked
 * cross-linking to a same-named but entirely unrelated company's discount page. The store's full
 * name is specific enough that a match on it is a real identity match. Any failure of the loader —
 * live and snapshot both down — degrades to `null`, never a 500: the store page has plenty to say
 * without this one cross-link.
 */
async function findBankosBrandSlug(name: string): Promise<string | null> {
  try {
    const { catalog } = await getRawCatalog()
    const raw = catalog.data as unknown as BrandsRawData
    const reduced = reduceBrands(raw, {})
    const index = buildBrandPageIndex(reduced.brands)
    const candidate = slugifyText(name)
    if (!candidate) return null
    const match = findBrandBySlug(index, candidate)
    return match ? match.slug : null
  } catch {
    return null
  }
}

export default defineEventHandler(async (event): Promise<StoreDetailResponse> => {
  const key = String(getRouterParam(event, 'slug') || '')
    .trim()
    .toLowerCase()

  // 404 BEFORE touching the database: a key outside the curated registry can never have a document,
  // and a store dropped from the registry must stop resolving even if its old profile is still there.
  if (!isStoreDirectoryKey(key)) {
    throw createError({ statusCode: 404, statusMessage: 'Tienda no encontrada' })
  }

  await connectDb()
  const doc = (await StoreProfileModel.findOne({ key })
    .select(SELECT)
    .lean()) as unknown as StorePublicProfile | null
  if (!doc) {
    throw createError({ statusCode: 404, statusMessage: 'Todavía no hay ficha para esta tienda' })
  }

  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
  )

  const entry = storeDirectoryEntry(key)!
  const bankosBrandSlug = await findBankosBrandSlug(entry.name)

  // `signals`/`indexable` are the same write-time snapshot the list route no longer trusts (fix
  // round 1, I2): recomputed against now, not against whenever the backend last wrote this doc.
  // This SAME instant is also what item 11 publishes as `servedAt`, so the page's own freshness
  // math matches exactly what this route just computed, not a client clock read later.
  const now = new Date()
  const profile: StorePublicProfile = {
    ...doc,
    signals: storeFreshSignals(doc, now),
    indexable: storeIndexable(doc, now),
  }

  return { profile, bankosBrandSlug, servedAt: now.toISOString() }
})
