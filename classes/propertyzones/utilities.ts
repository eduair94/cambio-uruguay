import { CLAIM_CATEGORIES, type ClaimCounts } from "../utilities/claims/aggregate";
import type { ClaimsSnapshot } from "../utilities/claims/source";
import type { PowerDayDoc } from "../utilities/power/store";
import { publicZoneForEcse, uteLocalities } from "../utilities/power/zones";
import type { WaterNoticeDoc } from "../utilities/water/store";
import { ineCodesInText, OSE_MATCH_VERSION } from "../utilities/water/match";
import { INE_DISPLAY_NAMES } from "./names";

/**
 * The neighbourhood service layers: power (UTE ledger), water (OSE notices) and urban complaints
 * (IM SUR). Each carries its own period and source date; none is ever filled with a zero it did
 * not measure. See docs/app/PROPERTY_ZONE_SERVICES.md.
 */
export const POWER_WINDOW_DAYS = 90;
export const POWER_MIN_DAYS = 14;
export const POWER_MIN_COVERAGE = 0.85;
export const WATER_WINDOW_MONTHS = 24;
export const WATER_MAX_HOURS = 72;
const MONTH_MINUTES = 30 * 1440;
const DEPARTMENT_BY_ECSE_ID = ["Montevideo", "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida",
  "Lavalleja", "Maldonado", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres"];

export interface PowerMetric {
  name: string;
  department: string;
  customers: number;
  /** Minutes a customer spent without power per 30 days, unplanned cuts only. */
  unplannedMinutes: number;
  plannedMinutes: number;
  /** New incidents per 30 days per 1,000 customers (a lower bound: increases of open incidents). */
  cutsPerThousand: number;
  cutsPerMonth: number;
}
export interface PowerLayer {
  status: "ready" | "collecting";
  observedFrom: string | null;
  observedTo: string | null;
  observedDays: number;
  coverage: number;
  zones: Record<string, PowerMetric>;
  departments: Record<string, PowerMetric>;
}
export interface WaterMetric { notices: number; hours: number }
export interface WaterLayer {
  periodFrom: string;
  periodTo: string;
  fetchedAt: string | null;
  notices: number;
  /** Montevideo notices of the period, and how many named at least one INE barrio. */
  montevideoNotices: number;
  montevideoMatched: number;
  matchVersion: number;
  zones: Record<string, WaterMetric>;
  departments: Record<string, WaterMetric>;
}
export interface ClaimsMetric { counts: ClaimCounts; customers: number | null; perThousand: ClaimCounts | null }
export interface ClaimsLayer {
  periodFrom: string;
  periodTo: string;
  source: ClaimsSnapshot["source"];
  unassigned: number;
  zones: Record<string, ClaimsMetric>;
}
/** "denuncias" = crime reports per 1,000 UTE customers: a registered count, never a risk estimate. */
export const SERVICE_ATTRIBUTES = ["luz", "agua", "alumbrado", "saneamiento", "limpieza", "calles", "denuncias"] as const;
export type ServiceAttribute = typeof SERVICE_ATTRIBUTES[number];
export type ServiceLevel = "low" | "mid" | "high";
export interface ServiceLevels {
  thresholds: Partial<Record<ServiceAttribute, { low: number; high: number; zones: number }>>;
  byZone: Partial<Record<ServiceAttribute, Record<string, ServiceLevel>>>;
  /** The value each zone is ranked by, so readers can place a zone among the others. */
  values: Partial<Record<ServiceAttribute, Record<string, number>>>;
}
/** Mapped everyday services (OSM index) per km² of each INE barrio: more is better. */
export interface AmenityDensity {
  dataAsOf: string;
  perKm2: Record<string, number>;
}
export interface ZoneUtilityContext {
  version: 1;
  generatedAt: string;
  /** Display name per public zone id, and the interior localities UTE reports (for name matching). */
  names: Record<string, string>;
  localities: Record<string, { name: string; department: string; aliases: string[] }>;
  power: PowerLayer | null;
  water: WaterLayer | null;
  claims: ClaimsLayer | null;
  levels: ServiceLevels;
  /** Last day of the crime period the "denuncias" values come from. */
  crimePeriodTo?: string | null;
  amenities?: AmenityDensity | null;
}

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const dayOf = (iso: string) => iso.slice(0, 10);
const shiftDay = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Aggregates the ledger over the last POWER_WINDOW_DAYS; publishes figures only once enough was observed. */
export function buildPowerLayer(days: readonly PowerDayDoc[]): PowerLayer {
  const latest = days.reduce((max, doc) => (doc.day > max ? doc.day : max), "");
  const empty: PowerLayer = { status: "collecting", observedFrom: null, observedTo: null, observedDays: 0, coverage: 0, zones: {}, departments: {} };
  if (!latest) return empty;
  const from = shiftDay(latest, -(POWER_WINDOW_DAYS - 1));
  const perEcse = new Map<string, { name: string; type: string; covered: number; unplanned: number; planned: number; incidents: number; customerDays: number; customerSum: number; first: string }>();
  for (const doc of days) {
    if (doc.day < from || doc.day > latest) continue;
    let item = perEcse.get(doc.zone);
    if (!item) perEcse.set(doc.zone, item = { name: doc.name, type: doc.type, covered: 0, unplanned: 0, planned: 0, incidents: 0, customerDays: 0, customerSum: 0, first: doc.day });
    item.covered += doc.coveredMinutes; item.unplanned += doc.unplannedCustomerMinutes; item.planned += doc.plannedCustomerMinutes;
    item.incidents += doc.newIncidents; item.customerDays++; item.customerSum += doc.customers;
    if (doc.day < item.first) item.first = doc.day;
  }
  const reference = perEcse.get("d:1") || [...perEcse.values()].sort((a, b) => b.covered - a.covered)[0];
  if (!reference) return empty;
  const observedFrom = reference.first;
  const elapsed = (Date.parse(`${latest}T00:00:00Z`) - Date.parse(`${observedFrom}T00:00:00Z`)) / 60_000 + 1440;
  const observedDays = round(reference.covered / 1440, 1);
  const coverage = round(Math.min(1, reference.covered / elapsed), 3);
  const layer: PowerLayer = { status: observedDays >= POWER_MIN_DAYS && coverage >= POWER_MIN_COVERAGE ? "ready" : "collecting",
    observedFrom, observedTo: latest, observedDays, coverage, zones: {}, departments: {} };
  if (layer.status !== "ready") return layer;
  const localities = new Map(uteLocalities().map(item => [`ute:${item.id}`, item]));
  const grouped = new Map<string, { covered: number; unplanned: number; planned: number; incidents: number; customers: number }>();
  for (const [ecse, item] of perEcse) {
    const target = ecse.startsWith("d:") ? ecse : publicZoneForEcse(ecse);
    if (!target || !item.customerDays) continue;
    const group = grouped.get(target) || { covered: 0, unplanned: 0, planned: 0, incidents: 0, customers: 0 };
    group.covered = Math.max(group.covered, item.covered);
    group.unplanned += item.unplanned; group.planned += item.planned; group.incidents += item.incidents;
    group.customers += item.customerSum / item.customerDays;
    grouped.set(target, group);
  }
  for (const [target, group] of grouped) {
    if (group.customers < 100 || group.covered < POWER_MIN_DAYS * 1440 * POWER_MIN_COVERAGE) continue;
    const metric = (name: string, department: string): PowerMetric => ({
      name, department, customers: Math.round(group.customers),
      unplannedMinutes: round(group.unplanned / group.customers / group.covered * MONTH_MINUTES),
      plannedMinutes: round(group.planned / group.customers / group.covered * MONTH_MINUTES),
      cutsPerMonth: round(group.incidents / group.covered * MONTH_MINUTES, 1),
      cutsPerThousand: round(group.incidents / group.covered * MONTH_MINUTES / (group.customers / 1000), 3),
    });
    if (target.startsWith("d:")) {
      const department = DEPARTMENT_BY_ECSE_ID[Number(target.slice(2)) - 1];
      if (department) layer.departments[department] = metric(department, department);
    } else if (target.startsWith("mvd:")) layer.zones[target] = metric(INE_DISPLAY_NAMES[target.slice(4)], "Montevideo");
    else {
      const locality = localities.get(target);
      if (locality) layer.zones[target] = metric(locality.name, locality.department);
    }
  }
  return layer;
}

/** OSE notices of the last WATER_WINDOW_MONTHS by start date, named barrios in Montevideo, departments elsewhere. */
export function buildWaterLayer(notices: readonly WaterNoticeDoc[], now: Date): WaterLayer {
  const periodTo = now.toISOString();
  const start = new Date(now); start.setUTCMonth(start.getUTCMonth() - WATER_WINDOW_MONTHS);
  const periodFrom = start.toISOString();
  const zones: Record<string, WaterMetric> = {};
  for (const code of Object.keys(INE_DISPLAY_NAMES)) zones[`mvd:${code}`] = { notices: 0, hours: 0 };
  const departments: Record<string, WaterMetric> = {};
  let total = 0, montevideo = 0, matched = 0, fetchedAt: string | null = null;
  for (const notice of notices) {
    if (notice.lastSeenAt && (!fetchedAt || notice.lastSeenAt > fetchedAt)) fetchedAt = notice.lastSeenAt;
    if (notice.from < periodFrom || notice.from > periodTo) continue;
    const hours = Math.min(WATER_MAX_HOURS, Math.max(0, (Date.parse(notice.to) - Date.parse(notice.from)) / 3_600_000));
    total++;
    const department = departments[notice.department] ||= { notices: 0, hours: 0 };
    department.notices++; department.hours += hours;
    if (notice.department !== "Montevideo") continue;
    montevideo++;
    const codes = ineCodesInText(notice.zoneText);
    if (codes.length) matched++;
    for (const code of codes) { zones[`mvd:${code}`].notices++; zones[`mvd:${code}`].hours += hours; }
  }
  for (const metric of [...Object.values(zones), ...Object.values(departments)]) metric.hours = round(metric.hours, 1);
  return { periodFrom: dayOf(periodFrom), periodTo: dayOf(periodTo), fetchedAt, notices: total, montevideoNotices: montevideo,
    montevideoMatched: matched, matchVersion: OSE_MATCH_VERSION, zones, departments };
}

/** Complaints per 1,000 UTE customers of the same INE barrio (UTE's barrios are INE's, see zones.ts). */
export function buildClaimsLayer(claims: ClaimsSnapshot, customersByZone: Readonly<Record<string, number>>): ClaimsLayer {
  const zones: Record<string, ClaimsMetric> = {};
  for (const code of Object.keys(INE_DISPLAY_NAMES)) {
    const counts = { alumbrado: 0, saneamiento: 0, limpieza: 0, calles: 0, ...(claims.countsByOfficialCode[code] || {}) };
    const customers = customersByZone[`mvd:${code}`];
    const usable = typeof customers === "number" && customers >= 100;
    zones[`mvd:${code}`] = {
      counts, customers: usable ? Math.round(customers) : null,
      perThousand: usable ? Object.fromEntries(CLAIM_CATEGORIES.map(category => [category, round(counts[category] / customers * 1000, 1)])) as ClaimCounts : null,
    };
  }
  return { periodFrom: claims.periodFrom, periodTo: claims.periodTo, source: claims.source, unassigned: claims.unassigned, zones };
}

/** Linear-interpolated quantile of a sorted list. */
export function quantile(sorted: readonly number[], p: number): number {
  const position = (sorted.length - 1) * p, low = Math.floor(position), high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

/** Terciles among the zones that have the value; "low" is always the third with the fewest problems. */
export function buildLevels(values: Partial<Record<ServiceAttribute, Record<string, number>>>): ServiceLevels {
  const levels: ServiceLevels = { thresholds: {}, byZone: {}, values: {} };
  for (const attribute of SERVICE_ATTRIBUTES) {
    const entries = Object.entries(values[attribute] || {}).filter(([, value]) => Number.isFinite(value));
    if (entries.length < 9) continue;
    levels.values[attribute] = Object.fromEntries(entries.map(([zone, value]) => [zone, round(value, 2)]));
    const sorted = entries.map(([, value]) => value).sort((a, b) => a - b);
    const low = round(quantile(sorted, 1 / 3), 3), high = round(quantile(sorted, 2 / 3), 3);
    levels.thresholds[attribute] = { low, high, zones: entries.length };
    levels.byZone[attribute] = Object.fromEntries(entries.map(([zone, value]) => [zone, value <= low ? "low" : value > high ? "high" : "mid"]));
  }
  return levels;
}

/** The value each attribute is ranked by, per zone. */
export function levelValues(power: PowerLayer | null, water: WaterLayer | null, claims: ClaimsLayer | null,
  crimeRates?: Record<string, number> | null): Partial<Record<ServiceAttribute, Record<string, number>>> {
  const values: Partial<Record<ServiceAttribute, Record<string, number>>> = {};
  if (crimeRates && Object.keys(crimeRates).length) values.denuncias = { ...crimeRates };
  if (power?.status === "ready") values.luz = Object.fromEntries(Object.entries(power.zones).map(([zone, metric]) => [zone, metric.unplannedMinutes]));
  if (water) values.agua = Object.fromEntries(Object.entries(water.zones).map(([zone, metric]) => [zone, metric.notices]));
  if (claims) for (const category of CLAIM_CATEGORIES) {
    const entries = Object.entries(claims.zones).filter(([, metric]) => metric.perThousand).map(([zone, metric]) => [zone, metric.perThousand![category]]);
    if (entries.length) values[category] = Object.fromEntries(entries);
  }
  return values;
}

/** Mean daily UTE customers per public zone over the ledger, for complaint rates (needs no minimum window). */
export function customersByZone(days: readonly PowerDayDoc[]): Record<string, number> {
  const perEcse = new Map<string, { sum: number; n: number }>();
  for (const doc of days) {
    const item = perEcse.get(doc.zone) || { sum: 0, n: 0 };
    item.sum += doc.customers; item.n++;
    perEcse.set(doc.zone, item);
  }
  const result: Record<string, number> = {};
  for (const [ecse, item] of perEcse) {
    const target = publicZoneForEcse(ecse);
    if (target) result[target] = (result[target] || 0) + item.sum / item.n;
  }
  return result;
}

/** Labels of every public zone id: INE barrios ("mvd:<code>") and UTE localities ("ute:<id>"). */
export function zoneLabels(): Pick<ZoneUtilityContext, "names" | "localities"> {
  const names: Record<string, string> = {};
  for (const [code, name] of Object.entries(INE_DISPLAY_NAMES)) names[`mvd:${code}`] = name;
  const localities: ZoneUtilityContext["localities"] = {};
  for (const locality of uteLocalities()) {
    names[`ute:${locality.id}`] = locality.name;
    localities[`ute:${locality.id}`] = { name: locality.name, department: locality.department, aliases: [...locality.aliases] };
  }
  return { names, localities };
}

/** Crime reports per 1,000 UTE customers of the same INE barrio (12 months, attempts included). */
export function crimeRates(countsByOfficialCode: Readonly<Record<string, { total: number }>> | null | undefined,
  customers: Readonly<Record<string, number>>): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const [code, counts] of Object.entries(countsByOfficialCode || {})) {
    const total = customers[`mvd:${code}`];
    if (typeof total === "number" && total >= 100 && Number.isFinite(counts?.total)) rates[`mvd:${code}`] = round(counts.total / total * 1000, 1);
  }
  return rates;
}

/** Area of a lon/lat polygon in km², projected at its own latitude (barrio-sized, error well under 1 %). */
export function polygonAreaKm2(geometry: { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] }): number {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const ringArea = (ring: number[][], cos: number) => {
    let sum = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
      sum += (ring[j][0] * cos * 111.32) * (ring[i][1] * 110.574) - (ring[i][0] * cos * 111.32) * (ring[j][1] * 110.574);
    return Math.abs(sum) / 2;
  };
  let area = 0;
  for (const rings of polygons) {
    if (!rings[0]?.length) continue;
    const lat = rings[0].reduce((s, point) => s + point[1], 0) / rings[0].length;
    const cos = Math.cos((lat * Math.PI) / 180);
    area += ringArea(rings[0], cos) - rings.slice(1).reduce((s, hole) => s + ringArea(hole, cos), 0);
  }
  return area;
}

/** OSM service points per km² of each INE barrio (all mapped categories together). */
export function buildAmenityDensity(
  services: { dataAsOf: string; countsByOfficialCode: Record<string, Record<string, number>> } | null | undefined,
  zones: ReadonlyArray<{ officialCode: string; geometry: Parameters<typeof polygonAreaKm2>[0] }>,
): AmenityDensity | null {
  if (!services) return null;
  const perKm2: Record<string, number> = {};
  for (const zone of zones) {
    const counts = services.countsByOfficialCode[zone.officialCode];
    const area = polygonAreaKm2(zone.geometry);
    if (!counts || !(area > 0.05)) continue;
    const total = Object.values(counts).reduce((s, value) => s + (Number.isFinite(value) ? value : 0), 0);
    perKm2[`mvd:${zone.officialCode}`] = round(total / area, 1);
  }
  return Object.keys(perKm2).length ? { dataAsOf: services.dataAsOf, perKm2 } : null;
}
