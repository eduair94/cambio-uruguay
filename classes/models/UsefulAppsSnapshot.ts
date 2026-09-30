// Mirror of app/server/models/UsefulAppsSnapshot.ts, bound to the APP's Mongo (classes/appdb.ts) —
// NOT the backend's. `sync_useful_apps.ts` upserts the single `key:"uy"` document;
// /api/useful-apps/stores serves it (compacted) to /apps-utiles-uruguay. Mixed on purpose: every
// field is re-readable from a public store listing next week.
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { UsefulAppsSnapshot } from "../usefulapps/types";

const UsefulAppsSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    capturedAt: { type: Date, required: true },
    apps: { type: Schema.Types.Mixed, default: {} },
    counts: { type: Schema.Types.Mixed, default: {} },
    developerChanges: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

export const UsefulAppsSnapshotModel = appModel<UsefulAppsSnapshot>(
  "UsefulAppsSnapshot",
  UsefulAppsSnapshotSchema,
  "usefulappssnapshots"
);
