// One living document, upserted. No history: YouTube's feeds ARE the archive, and every row here
// can be re-fetched, so unlike the prediction ledger nothing is lost by keeping only the latest.
import { VideosSnapshotModel } from "../models/VideosSnapshot";
import { VIDEOS_KEY } from "./types";
import type { VideosSnapshot } from "./types";

export async function saveVideos(snapshot: VideosSnapshot): Promise<void> {
  await VideosSnapshotModel.updateOne(
    { key: VIDEOS_KEY },
    { $set: { ...snapshot, key: VIDEOS_KEY } },
    { upsert: true }
  );
}

export async function loadVideos(): Promise<VideosSnapshot | null> {
  return VideosSnapshotModel.findOne({ key: VIDEOS_KEY }).lean<VideosSnapshot>().exec();
}

/**
 * How many videos the stored snapshot has, or 0 when there is none.
 *
 * Read before the write so {@link import("./refresh").snapshotIsThin} can compare a fresh run
 * against what is already serving — a projection, not the whole document, because the stored rows
 * themselves are never needed.
 */
export async function storedVideoCount(): Promise<number> {
  const doc = await VideosSnapshotModel.findOne({ key: VIDEOS_KEY })
    .select({ "counts.videos": 1 })
    .lean<{ counts?: { videos?: number } }>()
    .exec();
  return doc?.counts?.videos ?? 0;
}
