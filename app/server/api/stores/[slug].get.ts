import { StoreProfileModel } from '../../models/StoreProfile'
import { connectDb } from '../../utils/db'
import { getRawCatalog } from '../../utils/bankos'
import { isStoreDirectoryKey, storeDirectoryEntry } from '../../../utils/storeDirectory'
import { reduceBrands, type BrandsRawData } from '../../../utils/bankosBrands'
import { buildBrandPageIndex, findBrandBySlug } from '../../../utils/bankosBrandPage'
import { slugifyText } from '../../../utils/longform'
import type { StorePublicProfile } from '../../../utils/storeProfiles'

export interface StoreDetailResponse {
  profile: StorePublicProfile
  /** The Bankos brand whose slug matches this store's name or one of its aliases; null when Bankos
   * has no such brand, or when the loader itself failed (never a 500 — see `findBankosBrandSlug`). */
  bankosBrandSlug: string | null
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
 * a store's own name or any of its registry aliases, slugified, matched against a Bankos brand's own
 * slug. Any failure of the loader — live and snapshot both down — degrades to `null`, never a 500:
 * the store page has plenty to say without this one cross-link.
 */
async function findBankosBrandSlug(
  name: string,
  aliases: readonly string[]
): Promise<string | null> {
  try {
    const { catalog } = await getRawCatalog()
    const raw = catalog.data as unknown as BrandsRawData
    const reduced = reduceBrands(raw, {})
    const index = buildBrandPageIndex(reduced.brands)
    const candidates = [...new Set([name, ...aliases].map(slugifyText).filter(Boolean))]
    for (const candidate of candidates) {
      const match = findBrandBySlug(index, candidate)
      if (match) return match.slug
    }
    return null
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
  const bankosBrandSlug = await findBankosBrandSlug(entry.name, entry.aliases)

  return { profile: doc, bankosBrandSlug }
})
