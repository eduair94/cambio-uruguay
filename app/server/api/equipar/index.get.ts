import { EquiparItemModel } from '../../models/EquiparItem'
import { EquiparMetaModel } from '../../models/EquiparMeta'
import { connectDb } from '../../utils/db'
import type { EquiparItemDoc, EquiparMetaDoc, EquiparResponse } from '../../../utils/equipar'

/**
 * The household catalogue for /equipar-casa-uruguay.
 *
 * Returns everything in one payload: it is under a hundred rows, the page filters, re-prices and
 * re-plans them client-side without a round trip per keystroke, and the baskets are computed over
 * the whole set anyway.
 *
 * Rows whose prices stopped being observed are excluded by `lastSeen`. Their documents stay in
 * Mongo — the price history is the only record of what a 250-litre fridge used to cost here — but a
 * stale price is never shown as if it were today's. That is the pizarra lesson: the scraper works,
 * the source froze, and a "cheapest first" order puts the oldest number in the headline.
 */
const STALE_DAYS = 4

export default defineEventHandler(async (event): Promise<EquiparResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=900, s-maxage=900, stale-while-revalidate=86400'
  )

  try {
    await connectDb()
    const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString().slice(0, 10)

    const [meta, rows] = await Promise.all([
      EquiparMetaModel.findOne({ key: 'equipar-casa-uruguay' })
        .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
        .lean(),
      EquiparItemModel.find({ lastSeen: { $gte: cutoff } })
        // `history` is up to a year of daily points per row and the page draws none of it. Sending
        // it would multiply this payload for nothing.
        .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0, history: 0 })
        .lean(),
    ])

    return {
      meta: (meta as unknown as EquiparMetaDoc) ?? null,
      items: (rows as unknown as EquiparItemDoc[]) ?? [],
    }
  } catch {
    // A database hiccup renders the page's empty state, never a 500: the rest of the page (what to
    // buy, and why, in what order) is worth reading with no prices at all.
    return { meta: null, items: [] }
  }
})
