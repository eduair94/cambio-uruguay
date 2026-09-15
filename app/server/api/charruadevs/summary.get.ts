import { CharruaSnapshotModel } from '../../models/CharruaSnapshot'
import { connectDb } from '../../utils/db'
import type { CharruaSnapshot } from '../../../utils/charruadevs'

// El tablero de /mercado-it-uruguay. Lo escribe el job `currency-charruadevs` una vez por día, así
// que se lee de Mongo en cada pedido y se cachea en la capa HTTP: un cache de Nitro por proceso
// divergiría entre los dos workers del cluster.
export default defineEventHandler(async (event): Promise<CharruaSnapshot | null> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400'
  )
  try {
    await connectDb()
    const doc = await CharruaSnapshotModel.findOne({ key: 'snapshot' })
      .select({ _id: 0, data: 1 })
      .lean<{ data?: CharruaSnapshot }>()
    return doc?.data ?? null
  } catch {
    return null
  }
})
