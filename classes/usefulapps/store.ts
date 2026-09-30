// One living document, upserted. No history: the stores ARE the archive, and every field can be
// re-read next week.
import { UsefulAppsSnapshotModel } from "../models/UsefulAppsSnapshot";
import { USEFUL_APPS_KEY, type UsefulAppsSnapshot } from "./types";

export async function saveUsefulApps(snapshot: UsefulAppsSnapshot): Promise<void> {
  await UsefulAppsSnapshotModel.updateOne(
    { key: USEFUL_APPS_KEY },
    { $set: { ...snapshot, key: USEFUL_APPS_KEY } },
    { upsert: true }
  );
}

/** El documento guardado, para fusionar y para comparar la corrida nueva. */
export async function loadUsefulApps(): Promise<UsefulAppsSnapshot | null> {
  return UsefulAppsSnapshotModel.findOne({ key: USEFUL_APPS_KEY }).lean<UsefulAppsSnapshot>().exec();
}
