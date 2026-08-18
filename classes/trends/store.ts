// One living document, upserted. No history: the three feeds ARE the archive, and none of this is
// unrecomputable — unlike the prediction ledger, nothing is lost by keeping only the latest row.
import { TrendsSnapshotModel } from "../models/TrendsSnapshot";
import { TRENDS_KEY } from "./types";
import type { TrendsSnapshot } from "./types";

export async function saveTrends(snapshot: TrendsSnapshot): Promise<void> {
  await TrendsSnapshotModel.updateOne(
    { key: TRENDS_KEY },
    { $set: { ...snapshot, key: TRENDS_KEY } },
    { upsert: true }
  );
}

export async function loadTrends(): Promise<TrendsSnapshot | null> {
  return TrendsSnapshotModel.findOne({ key: TRENDS_KEY }).lean<TrendsSnapshot>().exec();
}
