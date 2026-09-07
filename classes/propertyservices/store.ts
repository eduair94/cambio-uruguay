import { randomUUID } from "node:crypto";
import { appConnection } from "../appdb";
import { serviceSnapshotProblem } from "./classify";
import { ServiceMeta, ServiceSnapshot } from "./types";

export const SERVICE_POINTS_COLLECTION = "propertyservicepoints";
export const SERVICE_META_COLLECTION = "propertyservicemetas";
export const SERVICE_META_KEY = "uy-property-services";
const db = () => appConnection();

export async function withServiceRefreshLease<T>(run: () => Promise<T>): Promise<T> {
  const connection = db();
  await connection.asPromise();
  const locks = connection.collection("propertyserviceleases");
  const owner = randomUUID(), now = new Date();
  let claim: any;
  try {
    claim = await locks.findOneAndUpdate({ _id: SERVICE_META_KEY as any, expiresAt: { $lte: now } },
      { $set: { owner, expiresAt: new Date(now.getTime() + 20 * 60_000) } }, { upsert: true, returnDocument: "after" });
  } catch (error) {
    if ((error as any).code === 11000) throw new Error("Property services refresh already running");
    throw error;
  }
  if (claim.value?.owner !== owner) throw new Error("Property services lease unavailable");
  try { return await run(); }
  finally { await locks.deleteOne({ _id: SERVICE_META_KEY as any, owner }); }
}

export async function publishServiceSnapshot(snapshot: ServiceSnapshot): Promise<{ total: number; changed: boolean }> {
  const connection = db();
  await connection.asPromise();
  const meta = connection.collection(SERVICE_META_COLLECTION);
  const points = connection.collection(SERVICE_POINTS_COLLECTION);
  const previous = await meta.findOne({ _id: SERVICE_META_KEY as any }) as unknown as ServiceMeta | null;
  const problem = serviceSnapshotProblem(snapshot, previous);
  if (problem) throw new Error(`Refusing OSM snapshot: ${problem}`);
  if (previous?.snapshotId === snapshot.snapshotId) return { total: previous.total, changed: false };
  await points.createIndex({ snapshotId: 1, location: "2dsphere" }, { name: "snapshot_location" });
  await points.createIndex({ snapshotId: 1, id: 1 }, { name: "snapshot_id", unique: true });
  // Bound abandoned staging from prior failed imports while retaining both readable generations.
  await points.deleteMany({ snapshotId: { $nin: [snapshot.snapshotId, previous?.snapshotId, previous?.previousSnapshotId].filter(Boolean) } });
  // Idempotent staging. Old active rows remain readable throughout a failed or interrupted import.
  for (let offset = 0; offset < snapshot.points.length; offset += 500) {
    await points.bulkWrite(snapshot.points.slice(offset, offset + 500).map(point => ({
      replaceOne: { filter: { snapshotId: snapshot.snapshotId, id: point.id },
        replacement: { ...point, snapshotId: snapshot.snapshotId }, upsert: true },
    })), { ordered: false });
  }
  const total = await points.countDocuments({ snapshotId: snapshot.snapshotId });
  if (total !== snapshot.points.length) throw new Error("OSM staged snapshot count mismatch");
  const { points: _points, ...publicMeta } = snapshot;
  // Compare-and-swap the sole pointer after all rows and the index are usable.
  const switched = await meta.updateOne({ _id: SERVICE_META_KEY as any, ...(previous ? { snapshotId: previous.snapshotId } : { snapshotId: { $exists: false } }) },
    { $set: { ...publicMeta, total, previousSnapshotId: previous?.snapshotId || null } }, { upsert: !previous });
  if (!switched.matchedCount && !switched.upsertedCount) throw new Error("OSM active snapshot changed during import");
  // Keep two complete generations. Readers with the prior pointer can finish safely after switch.
  await points.deleteMany({ snapshotId: { $nin: [snapshot.snapshotId, previous?.snapshotId].filter(Boolean) } });
  return { total, changed: true };
}
