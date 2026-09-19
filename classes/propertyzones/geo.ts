import { zoneContainsPoint } from "./context";
import type { PropertyZoneGeometry } from "./sources/types";

export interface IndexedArea {
  id: string;
  geometry: PropertyZoneGeometry;
}

function bounds(geometry: PropertyZoneGeometry): [number, number, number, number] {
  const points = geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of points) { box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y); }
  return box;
}

/**
 * Point → area id, only when exactly one area contains the point. A point on a shared border or
 * outside every area is `null`: nothing is attributed to two areas or guessed from the nearest one.
 */
export function areaLocator(areas: readonly IndexedArea[]): (lng: number, lat: number) => string | null {
  const indexed = areas.map(area => ({ area, box: bounds(area.geometry) }));
  return (lng, lat) => {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    let found: string | null = null;
    for (const { area, box } of indexed) {
      if (lng < box[0] || lat < box[1] || lng > box[2] || lat > box[3] || !zoneContainsPoint(area.geometry, [lng, lat])) continue;
      if (found !== null) return null;
      found = area.id;
    }
    return found;
  };
}
