// Mirror of app/server/models/ArmadorSnapshot.ts, bound to the APP's Mongo (classes/appdb.ts) —
// NOT the backend's. `sync_armadores.ts` upserts the single `key:"mvd"` document; /api/armadores
// serves it (compacted) to /armadores-de-muebles-montevideo. Mixed on purpose: every row is
// re-read from its source every day (Google every week) and the shape lives in
// classes/armadores/types.ts.
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { ArmadorSnapshot } from "../armadores/types";

const ArmadorSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    capturedAt: { type: Date, required: true },
    googleAt: { type: String, default: null },
    editorialReviewedAt: { type: String, default: null },
    entries: { type: [Schema.Types.Mixed], default: [] },
    counts: { type: Schema.Types.Mixed, default: {} },
    notes: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const ArmadorSnapshotModel = appModel<ArmadorSnapshot>("ArmadorSnapshot", ArmadorSnapshotSchema, "armadorsnapshots");
