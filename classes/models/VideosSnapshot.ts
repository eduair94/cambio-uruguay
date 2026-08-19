// Mirror of app/server/models/VideosSnapshot.ts, bound to the APP's Mongo (classes/appdb.ts) — NOT
// the backend's. `sync_videos.ts` upserts the single `key:"uy"` document; /api/videos serves it to
// /videos-de-economia-uruguay and its per-topic pages.
//
// The arrays are Mixed on purpose: this is a cache of public YouTube feeds, every field of which is
// re-fetchable, so there is nothing here worth pinning field by field the way the prediction ledger
// is (that one cannot be recomputed; this one can, any hour).
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { VideosSnapshot } from "../videos/types";

const VideosSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    capturedAt: { type: Date, required: true },
    videos: { type: [Schema.Types.Mixed], default: [] },
    channels: { type: [Schema.Types.Mixed], default: [] },
    topicCounts: { type: Schema.Types.Mixed, default: {} },
    counts: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const VideosSnapshotModel = appModel<VideosSnapshot>(
  "VideosSnapshot",
  VideosSnapshotSchema,
  "videossnapshots"
);
