import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { SiteAnalyticsSnapshot } from "../site-analytics/types";

// Lives in the APP database (not `cambio-uy`): the only reader is the Nuxt route
// `/api/site-analytics`, which talks to its own Mongo. Mirrored field-for-field by
// `app/server/models/SiteAnalyticsSnapshot.ts` — tests/appdb/schema_parity.test.ts fails the build
// if the two drift.
const SiteAnalyticsSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    propertyId: { type: String, default: "" },
    asOf: { type: String, required: true },
    timezone: { type: String, default: "America/Montevideo" },
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
);

SiteAnalyticsSnapshotSchema.index({ key: 1 }, { unique: true });

export const SiteAnalyticsSnapshotModel = appModel<SiteAnalyticsSnapshot>(
  "SiteAnalyticsSnapshot",
  SiteAnalyticsSnapshotSchema,
  "siteanalyticssnapshots"
);
