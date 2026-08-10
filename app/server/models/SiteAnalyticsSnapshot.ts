import mongoose, { Schema, type Model } from 'mongoose'
import type { SiteAnalyticsSnapshot } from '../../utils/siteAnalytics'

// Written by the backend job `currency-site-analytics` (root `sync_site_analytics.ts`), read here.
// Field-for-field mirror of `classes/models/SiteAnalyticsSnapshot.ts` — the root suite's
// tests/appdb/schema_parity.test.ts fails if the two drift.
const SiteAnalyticsSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    propertyId: { type: String, default: '' },
    asOf: { type: String, required: true },
    timezone: { type: String, default: 'America/Montevideo' },
    range: { type: Schema.Types.Mixed, required: true },
    previousRange: { type: Schema.Types.Mixed, required: true },
    totals: { type: Schema.Types.Mixed, required: true },
    previousTotals: { type: Schema.Types.Mixed, required: true },
    daily: { type: [Schema.Types.Mixed], default: [] },
    topPages: { type: [Schema.Types.Mixed], default: [] },
    channels: { type: [Schema.Types.Mixed], default: [] },
    countries: { type: [Schema.Types.Mixed], default: [] },
    devices: { type: [Schema.Types.Mixed], default: [] },
    events: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

SiteAnalyticsSnapshotSchema.index({ key: 1 }, { unique: true })

export const SiteAnalyticsSnapshotModel: Model<SiteAnalyticsSnapshot> =
  (mongoose.models.SiteAnalyticsSnapshot as Model<SiteAnalyticsSnapshot>) ||
  mongoose.model<SiteAnalyticsSnapshot>('SiteAnalyticsSnapshot', SiteAnalyticsSnapshotSchema)
