// One living document, upserted. No history of our own: the BCU's spreadsheet IS the archive and
// comes whole in every download.
import { LrmSnapshotModel } from "../models/LrmSnapshot";
import { LRM_KEY, type LrmSnapshot } from "./types";

export async function saveLrm(snapshot: LrmSnapshot): Promise<void> {
  await LrmSnapshotModel.updateOne({ key: LRM_KEY }, { $set: { ...snapshot, key: LRM_KEY } }, { upsert: true });
}

export async function loadLrm(): Promise<LrmSnapshot | null> {
  return LrmSnapshotModel.findOne({ key: LRM_KEY }).lean<LrmSnapshot>().exec();
}
