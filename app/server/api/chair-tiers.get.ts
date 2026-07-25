import { ChairTierSnapshotModel } from '../models/ChairTierSnapshot'
import { connectDb } from '../utils/db'

export default defineEventHandler(async event => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=300, s-maxage=300, stale-while-revalidate=86400'
  )

  try {
    await connectDb()
    return await ChairTierSnapshotModel.findOne({ key: 'charruadevs-desktop-chairs' })
      .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
      .lean()
  } catch {
    return null
  }
})
