import { areaLocator } from "./geo";
import { foldZoneName, INE_DISPLAY_NAMES } from "./names";
import type { OfficialPropertyZone } from "./sources/types";
import type { UteLocality } from "../utilities/power/zones";

/**
 * Which official area a listing is in, for the neighbourhood layers and the directory filter.
 *
 * The advertised barrio is not enough (measured 2026-09-19): "Parque Batlle", "Prado", "Pocitos
 * Nuevo" and "Puerto Buceo" match no INE name, and the portals' "La Blanqueada" lands in three INE
 * areas by its own coordinates. Evidence, in order:
 *
 * 1. the listing's own coordinate inside exactly one area (INE barrio in Montevideo, UTE urban area
 *    elsewhere) — unless five or more properties share that exact point, which is a centroid, not
 *    an address;
 * 2. the advertised name equal to an official one (INE, UTE) of the same department;
 * 3. a measured alias: an advertised name with at least ALIAS_MIN_LISTINGS geolocated listings of
 *    which at least ALIAS_MIN_SHARE fall in one area;
 * 4. otherwise nothing, and the listing enters no neighbourhood filter.
 */
export const SHARED_POINT_MIN = 5;
export const ALIAS_MIN_LISTINGS = 10;
export const ALIAS_MIN_SHARE = 0.85;

export interface ListingLocation {
  id: string;
  department: string;
  neighborhood: string;
  locality?: string | null;
  latitude: number | null;
  longitude: number | null;
}
export type ZoneEvidence = "coordinate" | "name" | "alias";
export interface OfficialZone {
  /** "mvd:<INE code>" or "ute:<UTE locality id>". */
  zone: string;
  name: string;
  department: string;
  evidence: ZoneEvidence;
}
export interface ZoneAlias {
  zone: string;
  n: number;
  share: number;
}

const inUruguay = (lat: unknown, lng: unknown): boolean =>
  typeof lat === "number" && typeof lng === "number" && lat >= -35.1 && lat <= -30 && lng >= -58.5 && lng <= -53;
const pointKey = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;
const nameKey = (department: string, name: string) => `${foldZoneName(department)}|${foldZoneName(name)}`;

export function buildZoneAssigner({ ine, localities, rows, ineAliases = {} }: {
  ine: readonly OfficialPropertyZone[];
  localities: readonly UteLocality[];
  rows: readonly ListingLocation[];
  /** Extra official spellings per INE code (UTE's barrio labels). */
  ineAliases?: Readonly<Record<string, readonly string[]>>;
}): { assign(row: ListingLocation): OfficialZone | null; aliases: Record<string, ZoneAlias> } {
  const labels = new Map<string, { name: string; department: string }>();
  const exact = new Map<string, string>();
  for (const zone of ine) {
    const id = `mvd:${zone.officialCode}`, name = INE_DISPLAY_NAMES[zone.officialCode] || zone.name;
    labels.set(id, { name, department: "Montevideo" });
    for (const spelling of [name, zone.name, ...(ineAliases[zone.officialCode] || [])]) exact.set(nameKey("Montevideo", spelling), id);
  }
  for (const locality of localities) {
    const id = `ute:${locality.id}`;
    labels.set(id, { name: locality.name, department: locality.department });
    for (const spelling of [locality.name, ...locality.aliases]) exact.set(nameKey(locality.department, spelling), id);
  }
  const ineLocate = areaLocator(ine.map(zone => ({ id: `mvd:${zone.officialCode}`, geometry: zone.geometry })));
  const uteLocate = areaLocator(localities.filter(item => item.geometry).map(item => ({ id: `ute:${item.id}`, geometry: item.geometry! })));

  const shared = new Map<string, number>();
  for (const row of rows) if (inUruguay(row.latitude, row.longitude)) {
    const key = pointKey(row.latitude!, row.longitude!);
    shared.set(key, (shared.get(key) || 0) + 1);
  }
  const byCoordinate = (row: ListingLocation): string | null => {
    if (!inUruguay(row.latitude, row.longitude) || (shared.get(pointKey(row.latitude!, row.longitude!)) || 0) >= SHARED_POINT_MIN) return null;
    const id = row.department === "Montevideo" ? ineLocate(row.longitude!, row.latitude!) : uteLocate(row.longitude!, row.latitude!);
    return id && labels.get(id)?.department === row.department ? id : null;
  };

  const tallies = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const id = byCoordinate(row);
    if (!id || !row.neighborhood) continue;
    const key = nameKey(row.department, row.neighborhood);
    if (exact.has(key)) continue;
    let tally = tallies.get(key);
    if (!tally) tallies.set(key, tally = new Map());
    tally.set(id, (tally.get(id) || 0) + 1);
  }
  const aliases: Record<string, ZoneAlias> = {};
  for (const [key, tally] of tallies) {
    const n = [...tally.values()].reduce((sum, value) => sum + value, 0);
    const [zone, top] = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (n >= ALIAS_MIN_LISTINGS && top / n >= ALIAS_MIN_SHARE) aliases[key] = { zone, n, share: Math.round((top / n) * 1000) / 1000 };
  }

  const zone = (id: string, evidence: ZoneEvidence): OfficialZone => ({ zone: id, ...labels.get(id)!, evidence });
  return {
    aliases,
    assign(row) {
      const coordinate = byCoordinate(row);
      if (coordinate) return zone(coordinate, "coordinate");
      for (const spelling of [row.neighborhood, row.department === "Montevideo" ? "" : row.locality || ""]) {
        if (!spelling) continue;
        const id = exact.get(nameKey(row.department, spelling));
        if (id) return zone(id, "name");
      }
      const alias = row.neighborhood ? aliases[nameKey(row.department, row.neighborhood)] : undefined;
      return alias ? zone(alias.zone, "alias") : null;
    },
  };
}
