// Mirror of app/server/models/LrmSnapshot.ts, bound to the APP's Mongo (classes/appdb.ts) — NOT
// the backend's. `sync_lrm.ts` upserts the single `key:"uy"` document; /api/letras-regulacion-monetaria
// serves it to /letras-de-regulacion-monetaria-uruguay.
//
// Mixed on purpose, like VideosSnapshot: every row is re-derivable from the BCU's own spreadsheet,
// which carries the whole history in every download.
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { LrmSnapshot } from "../lrm/types";

const LrmSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    capturedAt: { type: Date, required: true },
    sources: { type: Schema.Types.Mixed, default: {} },
    latest: { type: [Schema.Types.Mixed], default: [] },
    recent: { type: [Schema.Types.Mixed], default: [] },
    treasury: { type: [Schema.Types.Mixed], default: [] },
    calendar: { type: Schema.Types.Mixed, default: null },
    counts: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const LrmSnapshotModel = appModel<LrmSnapshot>("LrmSnapshot", LrmSnapshotSchema, "lrmsnapshots");
