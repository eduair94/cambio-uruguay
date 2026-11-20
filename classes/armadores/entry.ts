// Piezas comunes para armar una fila del directorio desde cualquier fuente.
import type { TextCoverage } from "./text";
import type { ArmadorBase, ArmadorCoverage, ArmadorEntry, ArmadorZone } from "./types";
import { zoneOfBarrio } from "./zones";

export const NO_BASE: ArmadorBase = Object.freeze({ barrio: null, zone: null, department: null, basis: null });

/** La cobertura declarada con las zonas que se deducen de sus barrios. */
export function withZones(coverage: TextCoverage): ArmadorCoverage {
  const zones: ArmadorZone[] = [];
  for (const barrio of coverage.barrios) {
    const zone = zoneOfBarrio(barrio);
    if (zone && !zones.includes(zone)) zones.push(zone);
  }
  return { allMontevideo: coverage.allMontevideo, barrios: [...coverage.barrios], zones, outside: [...coverage.outside] };
}

export function blankEntry(fields: Pick<ArmadorEntry, "id" | "source" | "kind" | "name" | "url">, day: string): ArmadorEntry {
  return {
    ...fields,
    summary: null,
    website: null,
    image: null,
    base: { ...NO_BASE },
    coverage: { allMontevideo: false, barrios: [], zones: [], outside: [] },
    services: ["armado"],
    prices: [],
    symbolicPrice: false,
    rating: null,
    placeId: null,
    contacts: [],
    storeOnly: false,
    sources: [],
    firstSeen: day,
    lastSeen: day,
  };
}
