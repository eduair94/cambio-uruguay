// Aligned macro-driver series (read-only). Cached; the daily task does the writes.
import { connectDb } from '../utils/db'
import { DriverSnapshotModel } from '../models/DriverSnapshot'
import { DRIVERS } from '../../utils/drivers/config'
import { snapshotsToDriverSeries, type DateValueMap } from '../../utils/drivers/pivot'

export default defineCachedEventHandler(
  async () => {
    await connectDb()
    const docs = await DriverSnapshotModel.find({}).lean()
    const snapshots: DateValueMap[] = docs.map(d => ({
      date: d.date,
      values: (d.values as unknown as Record<string, number>) ?? {},
    }))
    const series = snapshotsToDriverSeries(snapshots, DRIVERS)
    return {
      drivers: DRIVERS.map(d => ({ key: d.key, label: d.label, source: d.source })),
      series,
    }
  },
  { maxAge: 60 * 30, staleMaxAge: 60 * 60 * 6, name: 'drivers', getKey: () => 'all' }
)
