import { randomUUID } from 'node:crypto'
import { RentalAlertLeaseModel } from '../models/RentalAlertLease'
import { connectDb } from './db'

const LEASE_MS = 120_000
const leaseError = () =>
  Object.assign(new Error('Rental alert operation is already in progress'), { statusCode: 503 })

/** Shared by subscription edits and delivery. A lost owner never releases another worker's lease. */
export async function withRentalAlertLease<T>(
  key: string,
  fn: (assertOwned: () => Promise<void>) => Promise<T>
): Promise<T> {
  await connectDb()
  const owner = randomUUID()
  const now = new Date()
  let claim
  try {
    claim = await RentalAlertLeaseModel.findOneAndUpdate(
      { _id: key, expiresAt: { $lte: now } },
      { $set: { owner, expiresAt: new Date(now.getTime() + LEASE_MS) } },
      { upsert: true, new: true }
    ).lean()
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw leaseError()
    throw error
  }
  if (claim?.owner !== owner) throw leaseError()
  let lost = false
  const assertOwned = async () => {
    if (lost) throw leaseError()
    const clock = new Date()
    const result = await RentalAlertLeaseModel.updateOne(
      { _id: key, owner, expiresAt: { $gt: clock } },
      { $set: { expiresAt: new Date(clock.getTime() + LEASE_MS) } }
    )
    if (!result.matchedCount) {
      lost = true
      throw leaseError()
    }
  }
  const heartbeat = setInterval(() => {
    void assertOwned().catch(() => {
      lost = true
    })
  }, 30_000)
  heartbeat.unref?.()
  try {
    const result = await fn(assertOwned)
    await assertOwned()
    return result
  } finally {
    clearInterval(heartbeat)
    await RentalAlertLeaseModel.deleteOne({ _id: key, owner })
  }
}
