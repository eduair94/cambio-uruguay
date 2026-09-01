import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { GscSnapshot } from "../gsc/types";

// Lives in the APP database, one living document. Mirrored field-for-field by
// `app/server/models/SearchConsoleSnapshot.ts` — tests/appdb/schema_parity.test.ts fails the build
// if the two drift.
//
// PRIVACY NOTE: this document holds the search queries people typed to reach the site. Search
// Console already anonymises rare queries (that is why the per-query totals never add up to the
// site total), but the collection is still the most sensitive one this repo writes, and the route
// that serves it is gated. Nothing here may be published on a public page.
const SearchConsoleSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    siteUrl: { type: String, default: "" },
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
);

SearchConsoleSnapshotSchema.index({ key: 1 }, { unique: true });

export const SearchConsoleSnapshotModel = appModel<GscSnapshot>(
  "SearchConsoleSnapshot",
  SearchConsoleSnapshotSchema,
  "searchconsolesnapshots"
);
