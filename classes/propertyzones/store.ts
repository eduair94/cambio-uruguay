import { randomUUID } from "node:crypto";
import { appConnection } from "../appdb";
import type { PropertyZoneSources } from "./sources/types";
import type { PropertyZoneContextSnapshot } from "./context";
import type { RentalZoneMarketBucket } from "./market";

export const PROPERTY_ZONE_COLLECTION = "propertyzonesnapshots";
export interface PropertyZoneMarketSnapshot {
  version: 1;
  generatedAt: string;
  rentalDataAsOf: string;
  usdUyu: number;
  sampleMinimum: number;
  observations: number;
  scannedRows: number;
  buckets: RentalZoneMarketBucket[];
}
export const zoneCollection = () => appConnection().collection(PROPERTY_ZONE_COLLECTION);
export async function withZoneRefreshLease<T>(run: () => Promise<T>): Promise<T> {
  await appConnection().asPromise();
  const collection = zoneCollection(), owner = randomUUID(), now = new Date();
  let claim: any;
  try {
    claim = await collection.findOneAndUpdate({ _id: "refresh-lock" as any, expiresAt: { $lte: now } },
      { $set: { owner, expiresAt: new Date(now.getTime() + 30 * 60_000) } }, { upsert: true, returnDocument: "after" });
  } catch (error) {
    if ((error as any).code === 11000) throw new Error("Property zone refresh already running");
    throw error;
  }
  if (claim.value?.owner !== owner) throw new Error("Property zone refresh lease unavailable");
  try { return await run(); }
  finally { await collection.deleteOne({ _id: "refresh-lock" as any, owner }); }
}
export async function readZoneSnapshot<T>(id: "market" | "context" | "source-cache"): Promise<T | null> {
  return await zoneCollection().findOne({ _id: id as any }, { projection: { _id: 0 }, maxTimeMS: 5000 }) as T | null;
}
function bounded(snapshot: unknown): void {
  if (Buffer.byteLength(JSON.stringify(snapshot), "utf8") > 8 * 1024 * 1024) throw new Error("Property zone snapshot exceeds byte budget");
}
export function zoneMarketProblem(next: PropertyZoneMarketSnapshot, previous: PropertyZoneMarketSnapshot | null): string | null {
  if (next.version !== 1 || !Number.isFinite(Date.parse(next.generatedAt)) || !Number.isFinite(Date.parse(next.rentalDataAsOf)) ||
    !Number.isFinite(next.usdUyu) || next.usdUyu < 10 || next.usdUyu > 100 || !Number.isSafeInteger(next.observations) || !Number.isSafeInteger(next.scannedRows) ||
    next.observations < 200 || next.scannedRows < 200 || next.scannedRows > 100_000 || next.observations > next.scannedRows ||
    !Array.isArray(next.buckets) || next.buckets.length < 10 || next.buckets.length > 20_000 || next.sampleMinimum !== 8) return "Invalid or incomplete market capture";
  if (previous && next.generatedAt < previous.generatedAt) return "Newer market capture already published";
  if (previous && previous.observations >= 500 && next.observations < previous.observations * .4) return "Market coverage collapsed";
  return null;
}
export async function publishZoneMarket(snapshot: PropertyZoneMarketSnapshot): Promise<void> {
  const previous = await readZoneSnapshot<PropertyZoneMarketSnapshot>("market");
  const problem = zoneMarketProblem(snapshot, previous);
  if (problem) throw new Error(problem);
  bounded(snapshot);
  await zoneCollection().replaceOne({ _id: "market" as any }, { _id: "market" as any, ...snapshot }, { upsert: true });
}
export async function publishZoneContext(snapshot: PropertyZoneContextSnapshot, sources?: PropertyZoneSources): Promise<void> {
  if (snapshot.version !== 1 || snapshot.geometry.zones.length !== 62 || !Number.isFinite(Date.parse(snapshot.generatedAt)))
    throw new Error("Invalid official zone context");
  bounded(snapshot);
  // Every field carries its own data date. A successful rent refresh never renews the crime period.
  await zoneCollection().replaceOne({ _id: "context" as any }, { _id: "context" as any, ...snapshot }, { upsert: true });
  if (sources) {
    bounded(sources);
    await zoneCollection().replaceOne({ _id: "source-cache" as any }, { _id: "source-cache" as any, ...sources }, { upsert: true });
  }
}
