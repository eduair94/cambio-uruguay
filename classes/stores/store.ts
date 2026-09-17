// Reading and writing store profiles in the APP database (`storeprofiles`).
//
// Two properties the job depends on:
//   * Nothing is ever deleted. A store removed from the registry keeps its last profile, and the app
//     decides what to show by `lastSeen` and by each signal's own `checkedAt`.
//   * Writes are an upsert per `key` with the WHOLE profile in `$set`: the carrying-over of old
//     signals already happened in classes/stores/profile.ts, so what gets written is exactly what the
//     page should show — plus the Reddit working state (`redditMentions`, `redditCursor`,
//     `redditTermsKey`), which the app API must never select.
//   * The job calls `saveStoreProfiles` once per store, right after reading it (and only when some
//     outside source answered), so an interrupted run keeps every store it finished — above all the
//     progress of a Reddit backfill that spans hours and several weekly runs.
//
// This module is the only writer. sync_store_profiles.ts loads it lazily and only outside
// `--dry-run`, so a dry run from a laptop (whose `.env` points at production) cannot reach it.
import { StoreProfileModel } from "../models/StoreProfile";
import type { StoreProfileDoc } from "./profile";

export async function loadStoreProfiles(): Promise<Map<string, StoreProfileDoc>> {
  const rows = (await StoreProfileModel.find({})
    .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
    .lean()) as unknown as StoreProfileDoc[];
  return new Map(rows.map((row) => [row.key, row]));
}

export async function saveStoreProfiles(docs: readonly StoreProfileDoc[]): Promise<void> {
  if (!docs.length) return;
  await StoreProfileModel.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { key: doc.key },
        // Cast: mongoose types `$set` as a dotted-path map, which a whole typed document does not
        // structurally satisfy even though replacing every field is exactly the intent.
        update: { $set: doc as unknown as Record<string, unknown> },
        upsert: true,
      },
    })) as any,
    { ordered: false }
  );
}
