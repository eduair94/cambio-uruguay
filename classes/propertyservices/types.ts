export const SERVICE_CATEGORIES = ["supermarket", "grocery", "pharmacy", "healthcare", "transit", "education"] as const;
export type ServiceCategory = typeof SERVICE_CATEGORIES[number];
export interface ServicePoint {
  id: string;
  category: ServiceCategory;
  name: string | null;
  location: { type: "Point"; coordinates: [number, number] };
  pointKind: "node" | "area_center";
}
export interface ServiceSnapshot {
  version: 1;
  snapshotId: string;
  fetchedAt: string;
  dataAsOf: string;
  sourceUrl: string;
  sourceSha256: string;
  counts: Record<ServiceCategory, number>;
  points: ServicePoint[];
  diagnostics: { nodes: number; ways: number; missingWays: number; ignoredRelations: number };
}
export interface ServiceMeta extends Omit<ServiceSnapshot, "points"> {
  total: number;
  previousSnapshotId?: string | null;
}
// Geofabrik moved Uruguay's files (latest and the dated history) into their own folder,
// `/south-america/uruguay/`, in November 2026; the old `/south-america/uruguay-latest…` URL now
// answers 301 to this one. Measured 2026-11-23 (CAMBIO-URUGUAY-BACKEND-1S).
export const SERVICE_SOURCE = "https://download.geofabrik.de/south-america/uruguay/uruguay-latest.osm.pbf";
export const SERVICE_MAX_POINTS = 100_000;
export const SERVICE_MAX_BYTES = 120 * 1024 * 1024;
