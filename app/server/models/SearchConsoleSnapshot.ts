import mongoose, { Schema, type Model } from 'mongoose'
import type { SearchConsoleSnapshot } from '../../utils/searchConsole'

// Written by the backend job `currency-gsc` (root `sync_gsc.ts`), read here.
// Field-for-field mirror of `classes/models/SearchConsoleSnapshot.ts` — the root suite's
// tests/appdb/schema_parity.test.ts fails if the two drift.
//
// NOT PUBLIC. Unlike the GA4 snapshot next door, this document holds the search queries people
// typed. `/api/search-console` gates it behind the owner's account; no page renders it for a
// visitor.
const SearchConsoleSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    siteUrl: { type: String, default: '' },
    asOf: { type: String, required: true },
    window: { type: Schema.Types.Mixed, required: true },
    previousWindow: { type: Schema.Types.Mixed, required: true },
    totals: { type: Schema.Types.Mixed, required: true },
    previousTotals: { type: Schema.Types.Mixed, required: true },
    daily: { type: [Schema.Types.Mixed], default: [] },
    topQueries: { type: [Schema.Types.Mixed], default: [] },
    topPages: { type: [Schema.Types.Mixed], default: [] },
    countries: { type: [Schema.Types.Mixed], default: [] },
    devices: { type: [Schema.Types.Mixed], default: [] },
    pageTypes: { type: [Schema.Types.Mixed], default: [] },
    ctrCurve: { type: [Schema.Types.Mixed], default: [] },
    opportunities: { type: [Schema.Types.Mixed], default: [] },
    zeroClickPool: { type: Schema.Types.Mixed, default: {} },
    alerts: { type: [Schema.Types.Mixed], default: [] },
    archivedDays: { type: Number, default: 0 },
    indexation: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

SearchConsoleSnapshotSchema.index({ key: 1 }, { unique: true })

export const SearchConsoleSnapshotModel: Model<SearchConsoleSnapshot> =
  (mongoose.models.SearchConsoleSnapshot as Model<SearchConsoleSnapshot>) ||
  mongoose.model<SearchConsoleSnapshot>('SearchConsoleSnapshot', SearchConsoleSnapshotSchema)
