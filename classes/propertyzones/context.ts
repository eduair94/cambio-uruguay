import type { PropertyZoneGeometry, PropertyZoneSources } from "./sources/types";
import type { ServiceMeta, ServicePoint } from "../propertyservices/types";
import { SERVICE_CATEGORIES } from "../propertyservices/types";

export interface ZoneServiceContext {
  dataAsOf: string;
  fetchedAt: string;
  sourceUrl: string;
  snapshotId: string;
  countsByOfficialCode: Record<string, Record<typeof SERVICE_CATEGORIES[number], number>>;
}
export interface PropertyZoneContextSnapshot {
  version: 1;
  generatedAt: string;
  geometry: PropertyZoneSources["geometry"];
  crime: PropertyZoneSources["crime"] | null;
  services: ZoneServiceContext | null;
}

function inRing(point: readonly number[], ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i], [px, py] = ring[j];
    if ((y > point[1]) !== (py > point[1]) && point[0] < (px - x) * (point[1] - y) / (py - y) + x) inside = !inside;
  }
  return inside;
}
export function zoneContainsPoint(geometry: PropertyZoneGeometry, point: readonly number[]): boolean {
  if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) return false;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(rings => !!rings[0] && inRing(point, rings[0]) && !rings.slice(1).some(ring => inRing(point, ring)));
}
function bbox(geometry: PropertyZoneGeometry): number[] {
  const points = geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of points) { bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y); bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y); }
  return bounds;
}

/** Count public OSM records within an official polygon, never distances from a neighborhood center. */
export function buildZoneServiceContext(
  geometry: PropertyZoneSources["geometry"],
  meta: ServiceMeta,
  points: readonly ServicePoint[]
): ZoneServiceContext {
  if (meta.version !== 1 || !Number.isFinite(Date.parse(meta.dataAsOf)) || !Number.isFinite(Date.parse(meta.fetchedAt)) || !meta.snapshotId ||
    points.length !== meta.total || points.length > 100_000) throw new Error("Incomplete services snapshot for zones");
  const areas = geometry.zones.map(zone => ({ zone, bounds: bbox(zone.geometry) }));
  const countsByOfficialCode: ZoneServiceContext["countsByOfficialCode"] = Object.fromEntries(areas.map(({ zone }) =>
    [zone.officialCode, Object.fromEntries(SERVICE_CATEGORIES.map(category => [category, 0]))])) as ZoneServiceContext["countsByOfficialCode"];
  const seen = new Set<string>();
  for (const point of points) {
    if (!point || typeof point.id !== "string" || !/^(?:node|way)\/[1-9]\d{0,19}$/.test(point.id) || seen.has(point.id) || !SERVICE_CATEGORIES.includes(point.category) ||
      point.location?.type !== "Point" || !Array.isArray(point.location.coordinates) || point.location.coordinates.length !== 2 || !point.location.coordinates.every(Number.isFinite)) continue;
    seen.add(point.id);
    const [x, y] = point.location.coordinates;
    const matches = areas.filter(({ zone, bounds: b }) => x >= b[0] && y >= b[1] && x <= b[2] && y <= b[3] && zoneContainsPoint(zone.geometry, [x, y]));
    // Ambiguous boundary overlaps are not counted in two areas.
    if (matches.length === 1) countsByOfficialCode[matches[0].zone.officialCode][point.category]++;
  }
  return { dataAsOf: meta.dataAsOf, fetchedAt: meta.fetchedAt, sourceUrl: meta.sourceUrl,
    snapshotId: meta.snapshotId, countsByOfficialCode };
}
