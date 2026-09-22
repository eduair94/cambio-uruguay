import { rentalListingIndexable } from '../../utils/rentalIndexHygiene'
import { rentalPropertyPath } from '../../utils/rentalPresentation'
import { RENTAL_COLLATION, type RentalPublicProperty } from '../../utils/rentals'
import { RentalListingModel } from '../models/RentalListing'
import { RentalMetaModel } from '../models/RentalMeta'
import { connectDb, disconnectDbAfterPrerender } from './db'
import { loadRentalIndexAllowlist } from './rentalIndexAllowlist'
import {
  rentalPageAmbiguousKeysStages,
  rentalPageSitemapStages,
  rentalPageSitemapUrls,
} from './rentalPage'

/** Stream full dossiers in small batches; retain only their public URL/image entries. */
export async function loadRentalSitemapUrls() {
  await connectDb()
  try {
    const [meta, ambiguous, allowlist] = await Promise.all([
      RentalMetaModel.findOne({ key: 'uy-rentals' }).select({ usdUyu: 1 }).lean(),
      RentalListingModel.aggregate<{ key: string }>(rentalPageAmbiguousKeysStages())
        .collation(RENTAL_COLLATION)
        .option({ maxTimeMS: 45_000 }),
      loadRentalIndexAllowlist(),
    ])
    const ambiguousKeys = new Set(ambiguous.map(row => row.key))
    const usdUyu = Number(meta?.usdUyu) || 0
    const now = Date.now()
    const cursor = RentalListingModel.aggregate<RentalPublicProperty>(rentalPageSitemapStages())
      .collation(RENTAL_COLLATION)
      .option({ maxTimeMS: 45_000 })
      .cursor({ batchSize: 64 })
    const urls: ReturnType<typeof rentalPageSitemapUrls> = []
    const seen = new Set<string>()
    try {
      for await (const property of cursor) {
        // Higiene del índice: la MISMA regla que la ficha aplica a su meta robots
        // (server/api/rentals/ficha). Una ficha vieja sin demanda medida es `noindex`, y un sitemap
        // que la siguiera listando le pediría a Google que rastree lo que la página le dice que
        // ignore. Se decide ANTES de armar el dossier: es la comprobación más barata del bucle.
        if (
          !rentalListingIndexable(
            { firstSeenAt: property.firstSeen, path: rentalPropertyPath(property.key) },
            allowlist,
            now
          )
        )
          continue
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
