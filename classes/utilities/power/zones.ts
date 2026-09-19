import pinned from "./ute_zones.json";
import type { PropertyZoneGeometry } from "../../propertyzones/sources/types";

/**
 * How UTE's ECSE zones relate to the site's geography, pinned by scripts/oneoff/build_ute_zones.py.
 * The 63 UTE barrios are the 62 INE 2011 barrios plus PUERTO, which UTE carves out of Ciudad Vieja:
 * both map to INE code 1, so summing them reproduces the INE area.
 */
export interface UteLocality {
  id: string;
  name: string;
  department: string;
  aliases: string[];
  geometry: PropertyZoneGeometry | null;
}

export const UTE_ZONES_MEASURED_AT: string = pinned.measuredAt;
export const uteBarrioToIne: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(pinned.barrios.map(barrio => [barrio.code, barrio.ineCode])));

let localities: UteLocality[] | null = null;
export function uteLocalities(): UteLocality[] {
  localities ||= pinned.localities.map(item => ({
    id: item.id, name: item.name, department: item.department, aliases: [...item.aliases],
    geometry: item.geometry as PropertyZoneGeometry | null,
  }));
  return localities;
}

/**
 * Public zone id for an ECSE zone: "mvd:<INE code>" for Montevideo barrios, "ute:<locality id>" for
 * interior towns, null for departments (context only, never a neighborhood).
 */
export function publicZoneForEcse(zone: string): string | null {
  const [kind, id] = zone.split(":");
  if (kind === "b") return uteBarrioToIne[id] ? `mvd:${uteBarrioToIne[id]}` : null;
  if (kind === "l") return /^\d{1,6}$/.test(id || "") ? `ute:${id}` : null;
  return null;
}
