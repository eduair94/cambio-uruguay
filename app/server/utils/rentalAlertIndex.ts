import type { RentalAlertKind } from '../../utils/rentalAlerts'
import {
  RentalAlertEventModel,
  RentalAlertIndexModel,
  type RentalAlertEventDoc,
  type RentalAlertIndexDoc,
} from '../models/RentalAlertEvent'
import { connectDb } from './db'
import { withRentalAlertLease } from './rentalAlertLease'
import { readAlertInventory } from './rentalAlertCandidates'
import { planRentalAlertPrices, writeRentalAlertPrices } from './rentalAlertPrices'

export interface RentalAlertIndexResult {
  state: RentalAlertIndexDoc
  added: RentalAlertEventDoc[]
}

/** Strictly monotonic milliseconds make Date boundaries safe even for two runs in one clock tick. */
export function rentalAlertFrontier(previous: Date | undefined, now: number): Date {
  return new Date(Math.max(now, previous ? new Date(previous).getTime() + 1 : now))
}

export async function refreshRentalAlertIndex(
  kind: RentalAlertKind,
  options: { dryRun?: boolean } = {}
): Promise<RentalAlertIndexResult> {
  await connectDb()
  const run = async (guard: () => Promise<void> = async () => {}) => {
    const previous = await RentalAlertIndexModel.findById(kind).lean()
    const inventory = await readAlertInventory(kind, Date.now(), guard)
    const frontier = rentalAlertFrontier(previous?.scannedAt, Date.now())
    const baseline = !previous || previous.algorithm !== inventory.algorithm
    const added: RentalAlertEventDoc[] = []
    for (let offset = 0; offset < inventory.ids.length; offset += 500) {
      await guard()
      const ids = inventory.ids.slice(offset, offset + 500)
      const keys = ids.map(id => `${kind}:${id}`)
      const known = new Set(
        (
          await RentalAlertEventModel.find({ _id: { $in: keys } })
            .select({ _id: 1 })
            .lean()
        ).map(row => row._id)
      )
      const fresh = ids
        .filter(id => !known.has(`${kind}:${id}`))
        .map(candidateId => ({
          _id: `${kind}:${candidateId}`,
          kind,
          candidateId,
          discoveredAt: frontier,
          baseline,
        }))
      // Price drops become events in the same ledger, so they share cursor, baseline and outbox.
      const priced = inventory.prices
        ? await planRentalAlertPrices(kind, ids, inventory.prices, frontier, baseline)
        : { events: [], writes: [] }
      fresh.push(...priced.events)
      added.push(...fresh)
      if (!options.dryRun && fresh.length)
        await RentalAlertEventModel.bulkWrite(
          fresh.map(row => ({
            updateOne: { filter: { _id: row._id }, update: { $setOnInsert: row }, upsert: true },
          })),
          { ordered: true }
        )
      if (!options.dryRun && priced.writes.length) {
        await guard()
        await writeRentalAlertPrices(priced.writes)
      }
    }
    const state: RentalAlertIndexDoc = {
      _id: kind,
      scannedAt: frontier,
      baselineAt: baseline ? frontier : previous.baselineAt,
      algorithm: inventory.algorithm,
      sourceVersion: inventory.sourceVersion,
    }
    if (!options.dryRun) {
      await guard()
      await RentalAlertIndexModel.replaceOne({ _id: kind }, state, { upsert: true })
    }
    return { state, added }
  }
  // One lock per kind: events, prices and the index document are all per kind, and four catalogues
  // scanned under one lock made every new subscription of another kind wait or fail meanwhile.
  return options.dryRun ? run() : withRentalAlertLease(`index:${kind}`, run)
}

/** Called before subscription creation/resume: observe the existing inventory synchronously, silently for that subscriber. */
export async function prepareRentalAlertBaseline(kind: RentalAlertKind): Promise<Date> {
  return (await refreshRentalAlertIndex(kind)).state.scannedAt
}
