import { RENTAL_COLLATION, type RentalPublicProperty } from '../../utils/rentals'
import { RentalListingModel } from '../models/RentalListing'
import { RentalMetaModel } from '../models/RentalMeta'
import { connectDb, disconnectDbAfterPrerender } from './db'
import {
  rentalPageAmbiguousKeysStages,
  rentalPageSitemapStages,
  rentalPageSitemapUrls,
} from './rentalPage'

/** Stream full dossiers in small batches; retain only their public URL/image entries. */
export async function loadRentalSitemapUrls() {
  await connectDb()
  try {
    const [meta, ambiguous] = await Promise.all([
      RentalMetaModel.findOne({ key: 'uy-rentals' }).select({ usdUyu: 1 }).lean(),
      RentalListingModel.aggregate<{ key: string }>(rentalPageAmbiguousKeysStages())
        .collation(RENTAL_COLLATION)
        .option({ maxTimeMS: 45_000 }),
    ])
    const ambiguousKeys = new Set(ambiguous.map(row => row.key))
    const usdUyu = Number(meta?.usdUyu) || 0
    const cursor = RentalListingModel.aggregate<RentalPublicProperty>(rentalPageSitemapStages())
      .collation(RENTAL_COLLATION)
      .option({ maxTimeMS: 45_000 })
      .cursor({ batchSize: 64 })
    const urls: ReturnType<typeof rentalPageSitemapUrls> = []
    const seen = new Set<string>()
    try {
      for await (const property of cursor) {
        for (const entry of rentalPageSitemapUrls([property], usdUyu, ambiguousKeys)) {
          if (seen.has(entry.loc)) continue
          seen.add(entry.loc)
          urls.push(entry)
        }
      }
    } finally {
      await cursor.close()
    }
    return urls
  } finally {
    await disconnectDbAfterPrerender()
  }
}
