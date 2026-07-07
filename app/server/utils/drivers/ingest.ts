import { connectDb } from '../db'
import { DriverSnapshotModel } from '../../models/DriverSnapshot'
import { DRIVERS, driversFor, type DriverDef } from '../../../utils/drivers/config'
import { fetchStooqSeries } from './fetchStooq'
import { fetchArgentinaSeries } from './fetchArgentina'
import type { SeriesPoint } from '../../../utils/rateStats'

async function fetchDriver(def: DriverDef, fromYmd?: string): Promise<SeriesPoint[]> {
  if (def.source === 'stooq') return fetchStooqSeries(def.symbol, fromYmd)
  return fetchArgentinaSeries(def.symbol)
}

/**
 * Fetch every driver relevant to the given currencies, pivot into per-date maps,
 * and upsert one DriverSnapshot per date (merging driver values). Idempotent.
 */
export async function ingestDrivers(
  currencies: string[] = ['USD']
): Promise<{ dates: number; drivers: number }> {
  await connectDb()

  const defs = currencies.length
    ? Array.from(new Map(currencies.flatMap(c => driversFor(c)).map(d => [d.key, d])).values())
    : DRIVERS

  // date -> { driverKey -> value }
  const byDate = new Map<string, Record<string, number>>()
  for (const def of defs) {
    const series = await fetchDriver(def)
    for (const point of series) {
      const row = byDate.get(point.date) ?? {}
      row[def.key] = point.value
      byDate.set(point.date, row)
    }
  }

  const ops = [...byDate.entries()].map(([date, values]) => ({
    updateOne: {
      filter: { date },
      // $set nested keys so we merge with any values already stored for that day.
      update: {
        $set: Object.fromEntries(Object.entries(values).map(([k, v]) => [`values.${k}`, v])),
      },
      upsert: true,
    },
  }))

  if (ops.length) await DriverSnapshotModel.bulkWrite(ops, { ordered: false })
  return { dates: byDate.size, drivers: defs.length }
}
