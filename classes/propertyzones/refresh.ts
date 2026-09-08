import { appConnection } from "../appdb";
import { SERVICE_META_COLLECTION, SERVICE_META_KEY, SERVICE_POINTS_COLLECTION } from "../propertyservices/store";
import type { ServiceMeta, ServicePoint } from "../propertyservices/types";
import { buildRentalZoneMarket, type RentalZoneMarketObservation } from "./market";
import { projectZoneObservations, ZONE_RENTAL_PROJECTION } from "./project";
import { buildZoneServiceContext, type PropertyZoneContextSnapshot } from "./context";
import { loadOfficialPropertyZoneGeometry, loadPropertyZoneSources } from "./sources";
import type { PropertyZoneSources } from "./sources/types";
import { readZoneSnapshot, publishZoneMarket, publishZoneContext, zoneMarketProblem, type PropertyZoneMarketSnapshot } from "./store";

const MAX_ROWS = 100_000;
const MAX_OBSERVATIONS = 200_000;
const MAX_PROJECTED_BYTES = 128 * 1024 * 1024;

/** A complete bounded read, not an arbitrary sample of the catalog's first rows. */
export async function captureZoneMarket(now = new Date()): Promise<PropertyZoneMarketSnapshot> {
  const connection = appConnection();
  const meta = await connection.collection("rentalmetas").findOne({ key: "uy-rentals" },
    { projection: { _id: 0, generatedAt: 1, usdUyu: 1 }, maxTimeMS: 5000 });
  const generated = Date.parse(meta?.generatedAt);
  if (!Number.isFinite(generated) || generated > now.getTime() || now.getTime() - generated > 3 * 86_400_000 ||
    !Number.isFinite(meta?.usdUyu) || meta!.usdUyu < 10 || meta!.usdUyu > 100) throw new Error("Rental metadata unavailable or stale");
  const cutoff = new Date(now.getTime() - 10 * 86_400_000).toISOString().slice(0, 10);
  const cursor = connection.collection("rentallistings").find({ offers: { $elemMatch: {
    "identity.version": 1, "identity.propertyType": { $in: ["apartamento", "casa"] }, lastSeen: { $gte: cutoff },
  } } }, { projection: ZONE_RENTAL_PROJECTION, batchSize: 100, limit: MAX_ROWS + 1, maxTimeMS: 120_000 });
  const observations: RentalZoneMarketObservation[] = [];
  let scannedRows = 0, bytes = 0;
  try {
    for await (const row of cursor) {
      if (++scannedRows > MAX_ROWS) throw new Error("Rental market row budget exceeded; previous capture retained");
      const projected = projectZoneObservations(row);
      bytes += Buffer.byteLength(JSON.stringify(projected), "utf8");
      if (bytes > MAX_PROJECTED_BYTES || observations.length + projected.length > MAX_OBSERVATIONS)
        throw new Error("Rental market memory budget exceeded; previous capture retained");
      observations.push(...projected);
    }
  } finally { await cursor.close(); }
  const aggregate = buildRentalZoneMarket(observations, { now: now.getTime(), usdUyu: meta!.usdUyu });
  const snapshot: PropertyZoneMarketSnapshot = { version: 1, generatedAt: now.toISOString(),
    rentalDataAsOf: new Date(generated).toISOString(), usdUyu: meta!.usdUyu, scannedRows, ...aggregate };
  const problem = zoneMarketProblem(snapshot, await readZoneSnapshot<PropertyZoneMarketSnapshot>("market"));
  if (problem) throw new Error(problem);
  return snapshot;
}

async function captureServices(geometry: PropertyZoneSources["geometry"]): Promise<PropertyZoneContextSnapshot["services"]> {
  const connection = appConnection();
  const meta = await connection.collection(SERVICE_META_COLLECTION).findOne({ _id: SERVICE_META_KEY as any },
    { projection: { _id: 0 }, maxTimeMS: 5000 }) as unknown as ServiceMeta | null;
  if (!meta || !Number.isSafeInteger(meta.total) || meta.total < 100 || meta.total > 100_000) throw new Error("Services snapshot unavailable");
  const points = await connection.collection(SERVICE_POINTS_COLLECTION).find({ snapshotId: meta.snapshotId },
    { projection: { _id: 0, id: 1, category: 1, location: 1, pointKind: 1 }, limit: 100_001, maxTimeMS: 30_000 }).toArray();
  return buildZoneServiceContext(geometry, meta, points as unknown as ServicePoint[]);
}

/** Independent layers preserve their own timestamps when another source fails. */
export async function refreshPropertyZones(options: { dryRun?: boolean; forceSources?: boolean } = {}): Promise<{
  market: PropertyZoneMarketSnapshot | null; context: PropertyZoneContextSnapshot; errors: string[];
}> {
  await appConnection().asPromise();
  const errors: string[] = [];
  let market: PropertyZoneMarketSnapshot | null = null;
  try {
    market = await captureZoneMarket();
    if (!options.dryRun) await publishZoneMarket(market);
  } catch { market = null; errors.push("market: capture or publication failed; previous snapshot retained"); }
  const previous = await readZoneSnapshot<PropertyZoneContextSnapshot>("context");
  const cachedSources = await readZoneSnapshot<PropertyZoneSources>("source-cache");
  const geometry = loadOfficialPropertyZoneGeometry();
  let sources: PropertyZoneSources | undefined;
  let crime = previous?.crime || null;
  // Only reuse counts when their polygon version agrees with this build's boundaries.
  let services = previous?.geometry.source.version === geometry.source.version ? previous.services : null;
  if (previous?.geometry.source.version !== geometry.source.version) crime = null;
  try {
    sources = await loadPropertyZoneSources({ previous: cachedSources || undefined, force: options.forceSources });
    crime = sources.crime;
  } catch { errors.push("crime: official source unavailable or invalid; previous period retained when compatible"); }
  try { services = await captureServices(geometry); }
  catch { errors.push("services: snapshot unavailable or incomplete; previous snapshot retained when compatible"); }
  const context: PropertyZoneContextSnapshot = { version: 1, generatedAt: new Date().toISOString(), geometry, crime, services };
  if (!options.dryRun) await publishZoneContext(context, sources);
  return { market, context, errors };
}
