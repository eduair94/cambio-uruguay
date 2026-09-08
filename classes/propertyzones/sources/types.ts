export type PropertyZoneGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

export interface PropertyZoneSource {
  name: string;
  url: string;
  licenseUrl: string;
  dataAsOf: string;
  fetchedAt: string;
  version: string;
  resourceModified?: string;
}

export interface OfficialPropertyZone {
  id: string;
  officialCode: string;
  name: string;
  department: 'Montevideo';
  geometry: PropertyZoneGeometry;
}

export const CRIME_OFFENSES = ['hurto', 'rapina', 'lesiones', 'violencia-domestica', 'abigeato'] as const;
export type CrimeOffense = typeof CRIME_OFFENSES[number];
export interface CrimeCounts {
  total: number;
  byOffense: Record<CrimeOffense, number>;
}

export interface PropertyZoneCrime {
  periodFrom: string;
  periodTo: string;
  countsByOfficialCode: Record<string, CrimeCounts>;
  countsByDepartment: Record<string, CrimeCounts>;
  unassignedCount: number;
  /** These are recorded events, including attempts, not victims or estimated risk. */
  includesAttempts: true;
  source: PropertyZoneSource;
}

export interface PropertyZoneSources {
  geometry: { zones: OfficialPropertyZone[]; source: PropertyZoneSource };
  crime: PropertyZoneCrime;
}
