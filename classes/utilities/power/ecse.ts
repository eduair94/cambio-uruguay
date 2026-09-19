/**
 * UTE's ECSE service: the JSON behind the public UTEi map ("Mapa interactivo de la situación del
 * servicio eléctrico"). It is a snapshot, refreshed by UTE every ten minutes, with no history: the
 * frequency of cuts only exists if somebody keeps the snapshots. See docs/app/PROPERTY_ZONE_SERVICES.md.
 */
export const ECSE_API = "https://apps2.ute.com.uy/SioServEcse/api/Ecse";
export const ECSE_URBAN_URL = `${ECSE_API}/ObtenerAfectacionesUrbanas`;
export const ECSE_DEPARTMENT_URL = `${ECSE_API}/ObtenerAfectacionesZona?strZona=Departamento`;
export const ECSE_MAP_URL = "https://www.ute.com.uy/institucional/ute/utei/mapa-interactivo-de-la-situacion-del-servicio-electrico";

export type EcseZoneType = "barrio" | "localidad" | "departamento";
export interface EcseZone {
  /** "b:<UTE barrio code>", "l:<UTE locality id>" or "d:<department id>". */
  zone: string;
  name: string;
  type: EcseZoneType;
  customers: number;
  /** Customers affected by unplanned cuts ("afectados intempestivos"), capped at `customers`. */
  unplanned: number;
  /** Customers affected by announced works ("afectados por mejoras"). */
  planned: number;
  /** Incidents UTE has identified and are still open in the zone. */
  incidents: number;
  lat: number | null;
  lng: number | null;
}
export interface EcseSample {
  observedAt: string;
  zones: EcseZone[];
}

const TYPES: Record<string, EcseZoneType> = { Barrio: "barrio", Localidad: "localidad", Departamento: "departamento" };
const PREFIX: Record<EcseZoneType, string> = { barrio: "b", localidad: "l", departamento: "d" };

/** "19/09/2026 11:20:41" in Montevideo (UTC-3 all year since 2015) → ISO UTC, or null. */
export function ecseTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [day, month, year, hour, minute, second] = match.slice(1).map(Number);
  const time = Date.UTC(year, month - 1, day, hour + 3, minute, second);
  const check = new Date(time - 3 * 3_600_000);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day ||
    hour > 23 || minute > 59 || second > 59) return null;
  return new Date(time).toISOString();
}

const count = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 5_000_000)
    throw new Error("ECSE count out of range");
  return value;
};
const coordinate = (value: unknown, min: number, max: number): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;

/** Validates the whole payload; a changed format throws instead of writing a partial ledger. */
export function parseEcseRows(raw: unknown, kind: "urban" | "department"): EcseSample {
  if (!Array.isArray(raw) || raw.length > 1000) throw new Error("ECSE payload is not a list");
  const zones: EcseZone[] = [];
  const seen = new Set<string>();
  let observed = "";
  for (const item of raw) {
    if (!item || typeof item !== "object") throw new Error("ECSE row is not an object");
    const row = item as Record<string, unknown>;
    const type = TYPES[String(row.TIPO_ZONA)];
    const id = typeof row.ID_ZONA === "string" ? row.ID_ZONA.trim() : "";
    const name = typeof row.NOMBRE_ZONA === "string" ? row.NOMBRE_ZONA.normalize("NFC").trim().replace(/\s+/g, " ") : "";
    const at = ecseTime(row.FECHA);
    if (!type || !/^[A-Za-z0-9]{1,8}$/.test(id) || !name || name.length > 80 || !at) throw new Error("ECSE row has an unknown shape");
    if (kind === "urban" ? type === "departamento" : type !== "departamento") throw new Error("ECSE row of the wrong scope");
    const zone = `${PREFIX[type]}:${id}`;
    if (seen.has(zone)) throw new Error("ECSE zone repeated");
    seen.add(zone);
    const customers = count(row.TOTAL_CLIENTES_DE_ZONA);
    zones.push({
      zone, name, type, customers,
      unplanned: Math.min(customers, count(row.AFECTADOS_INTEMPESTIVOS)),
      planned: Math.min(customers, count(row.AFECTADOS_PROGRAMADOS)),
      incidents: count(row.INCIDENCIAS_EN_ZONA),
      lat: coordinate(row.LATITUD, -35.2, -30),
      lng: coordinate(row.LONGITUD, -58.6, -53),
    });
    if (at > observed) observed = at;
  }
  const barrios = zones.filter(zone => zone.type === "barrio").length;
  const localities = zones.filter(zone => zone.type === "localidad").length;
  if (kind === "urban" ? barrios !== 63 || localities < 60 : zones.length !== 19)
    throw new Error("ECSE payload does not cover the expected zones");
  return { observedAt: observed, zones };
}
