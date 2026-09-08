import pinned from './ine2011.json';
import type { OfficialPropertyZone, PropertyZoneGeometry, PropertyZoneSource } from './types';

export const INE_GEOMETRY_URL = 'https://www.gub.uy/instituto-nacional-estadistica/datos-y-estadisticas/estadisticas/mapas-vectoriales-ano-2011';
export const INE_GEOMETRY_VERSION = `ine2011-wgs84-p9-v1-${pinned.shapeSha256}-${pinned.tableSha256}`;

/** Only case, accents, whitespace and punctuation are equivalent. No fuzzy or partial matches. */
export function officialZoneName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ').trim();
}

export function loadOfficialPropertyZoneGeometry(now = new Date()): { zones: OfficialPropertyZone[]; source: PropertyZoneSource } {
  return {
    zones: pinned.zones.map(zone => ({
      id: `uy-mo-barrio-${zone.officialCode}`,
      officialCode: zone.officialCode,
      name: zone.name,
      department: 'Montevideo',
      geometry: JSON.parse(JSON.stringify(zone.geometry)) as PropertyZoneGeometry,
    })),
    source: {
      name: 'INE · Aproximaciones a barrios de Montevideo (Censo 2011)',
      url: INE_GEOMETRY_URL,
      licenseUrl: INE_GEOMETRY_URL,
      dataAsOf: pinned.dataAsOf,
      fetchedAt: now.toISOString(),
      version: INE_GEOMETRY_VERSION,
    },
  };
}

export function officialCrimeNeighborhoodCodes(zones: OfficialPropertyZone[]): Map<string, string> {
  const codes = new Map<string, string>();
  for (const zone of zones) {
    const name = officialZoneName(zone.name);
    if (!name || codes.has(name)) throw new Error('Invalid official neighborhood names');
    codes.set(name, zone.officialCode);
  }
  // INE's 25-character DBF truncates this label. MI publishes the expanded spelling.
  // Both published tables are retained/documented; this is not a guessed portal alias.
  if (codes.get('VILLA GARCIA MANGA RUR') === '61') codes.set('VILLA GARCIA MANGA RURAL', '61');
  return codes;
}
