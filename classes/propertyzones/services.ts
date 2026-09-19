import { appConnection } from "../appdb";
import { buildZoneAssigner, type ListingLocation, type OfficialZone, type ZoneAlias } from "./assign";
import { INE_DISPLAY_NAMES } from "./names";
import type { OfficialPropertyZone, PropertyZoneCrime } from "./sources/types";
import { buildClaimsLayer, buildLevels, buildPowerLayer, buildWaterLayer, customersByZone, levelValues, type ZoneUtilityContext } from "./utilities";
import { buildPriceImpact, type ImpactAttribute, type PriceImpact } from "./impact";
import type { RentalZoneMarketObservation } from "./market";
import { areaLocator } from "./geo";
import { loadClaims, type ClaimsSnapshot } from "../utilities/claims/source";
import { readPowerDays } from "../utilities/power/store";
import { uteLocalities } from "../utilities/power/zones";
import { readWaterNotices } from "../utilities/water/store";
import { montevideoDay } from "../utilities/power/ledger";
import { WATER_WINDOW_MONTHS } from "./utilities";
import uteZones from "../utilities/power/ute_zones.json";

const LISTING_STALE_DAYS = 10;
const MAX_LISTINGS = 150_000;

/** UTE's own barrio labels are official spellings of the same INE areas ("CAPURRO BELLA VISTA"). */
function ineAliases(): Record<string, string[]> {
  const aliases: Record<string, string[]> = {};
  for (const barrio of uteZones.barrios) (aliases[barrio.ineCode] ||= []).push(barrio.name);
  delete aliases["1"]; // "PUERTO" is only part of INE's Ciudad Vieja.
  aliases["1"] = ["CIUDAD VIEJA"];
  return aliases;
}

/** Every current listing's location fields, bounded. */
export async function readListingLocations(now: Date): Promise<Array<ListingLocation & { current: OfficialZone | null | undefined }>> {
  const cutoff = new Date(now.getTime() - LISTING_STALE_DAYS * 86_400_000).toISOString().slice(0, 10);
  const cursor = appConnection().collection("rentallistings").find({ lastSeen: { $gte: cutoff } }, {
    projection: { _id: 0, key: 1, department: 1, neighborhood: 1, latitude: 1, longitude: 1, "offers.identity.locality": 1, officialZone: 1 },
    batchSize: 1000, limit: MAX_LISTINGS + 1, maxTimeMS: 120_000,
  });
  const rows: Array<ListingLocation & { current: OfficialZone | null | undefined }> = [];
  try {
    for await (const doc of cursor) {
      if (rows.length >= MAX_LISTINGS) throw new Error("Listing location budget exceeded");
      if (typeof doc.key !== "string" || typeof doc.department !== "string") continue;
      const locality = (Array.isArray(doc.offers) ? doc.offers : []).map((offer: any) => offer?.identity?.locality).find((value: unknown) => typeof value === "string" && value.trim());
      rows.push({ id: doc.key, department: doc.department, neighborhood: typeof doc.neighborhood === "string" ? doc.neighborhood : "",
        locality: locality || null, latitude: typeof doc.latitude === "number" ? doc.latitude : null,
        longitude: typeof doc.longitude === "number" ? doc.longitude : null, current: doc.officialZone });
    }
  } finally { await cursor.close(); }
  return rows;
}

const same = (a: OfficialZone | null | undefined, b: OfficialZone | null) =>
  a === undefined ? false : JSON.stringify(a ?? null) === JSON.stringify(b);

/**
 * Assigns every current listing and writes `officialZone` only where it changed (`$set`, which the
 * rentals store never unsets). Returns the assignment per property key for the price analysis.
 */
export async function assignListingZones({ ine, now, dryRun }: { ine: readonly OfficialPropertyZone[]; now: Date; dryRun?: boolean }): Promise<{
  zoneOf: Map<string, string>; aliases: Record<string, ZoneAlias>; written: number; assigned: number; total: number;
  byEvidence: Record<string, number>;
}> {
  const rows = await readListingLocations(now);
  const { assign, aliases } = buildZoneAssigner({ ine, localities: uteLocalities(), rows, ineAliases: ineAliases() });
  const zoneOf = new Map<string, string>();
  const byEvidence: Record<string, number> = {};
  const operations: any[] = [];
  let written = 0;
  const flush = async () => {
    if (!operations.length) return;
    if (!dryRun) await appConnection().collection("rentallistings").bulkWrite(operations.splice(0), { ordered: false });
    else operations.splice(0);
  };
  for (const row of rows) {
    const zone = assign(row);
    if (zone) { zoneOf.set(row.id, zone.zone); byEvidence[zone.evidence] = (byEvidence[zone.evidence] || 0) + 1; }
    if (same(row.current, zone)) continue;
    operations.push({ updateOne: { filter: { key: row.id }, update: { $set: { officialZone: zone, officialZoneAt: now.toISOString() } } } });
    written++;
    if (operations.length >= 1000) await flush();
  }
  await flush();
  return { zoneOf, aliases, written, assigned: zoneOf.size, total: rows.length, byEvidence };
}

/** Power, water and complaint layers. A failing source keeps its previous layer; the others still refresh. */
export async function buildUtilityContext({ previous, claimsCache, ine, now, forceSources }: {
  previous: ZoneUtilityContext | null;
  claimsCache: ClaimsSnapshot | null;
  ine: readonly OfficialPropertyZone[];
  now: Date;
  forceSources?: boolean;
}): Promise<{ utilities: ZoneUtilityContext; claims: ClaimsSnapshot | null; customers: Record<string, number>; errors: string[] }> {
  const errors: string[] = [];
  let power = previous?.power ?? null, water = previous?.water ?? null, claimsLayer = previous?.claims ?? null;
  let customers: Record<string, number> = {};
  try {
    const days = await readPowerDays(montevideoDay(new Date(now.getTime() - 95 * 86_400_000).toISOString()));
    power = buildPowerLayer(days);
    customers = customersByZone(days);
  } catch { errors.push("power: ledger unavailable; previous layer retained"); }
  try {
    const since = new Date(now); since.setUTCMonth(since.getUTCMonth() - WATER_WINDOW_MONTHS - 1);
    const notices = await readWaterNotices(since.toISOString());
    if (!notices.length) throw new Error("no notices");
    water = buildWaterLayer(notices, now);
  } catch { errors.push("water: notices unavailable; previous layer retained"); }
  let claims = claimsCache;
  try {
    const locate = areaLocator(ine.map(zone => ({ id: zone.officialCode, geometry: zone.geometry })));
    claims = await loadClaims({ previous: claimsCache, locate, force: forceSources, now });
  } catch { errors.push("claims: SUR archive unavailable; previous aggregate retained"); }
  if (claims) claimsLayer = buildClaimsLayer(claims, Object.keys(customers).length ? customers : Object.fromEntries(
    Object.entries(previous?.claims?.zones || {}).filter(([, metric]) => metric.customers).map(([zone, metric]) => [zone, metric.customers!])));
  const utilities: ZoneUtilityContext = { version: 1, generatedAt: now.toISOString(), power, water, claims: claimsLayer,
    levels: buildLevels(levelValues(power, water, claimsLayer)) };
  return { utilities, claims, customers, errors };
}

/** The stored price analysis, from the same observations as the market cohorts. */
export function buildZoneImpact({ observations, zoneOf, utilities, crime, customers, usdUyu, now, rentalDataAsOf }: {
  observations: RentalZoneMarketObservation[];
  zoneOf: Map<string, string>;
  utilities: ZoneUtilityContext;
  crime: PropertyZoneCrime | null;
  customers: Record<string, number>;
  usdUyu: number;
  now: Date;
  rentalDataAsOf: string;
}): PriceImpact {
  const values = levelValues(utilities.power, utilities.water, utilities.claims) as Partial<Record<ImpactAttribute, Record<string, number>>>;
  if (crime) {
    const rates: Record<string, number> = {};
    for (const [code, counts] of Object.entries(crime.countsByOfficialCode)) {
      const total = customers[`mvd:${code}`] ?? utilities.claims?.zones[`mvd:${code}`]?.customers;
      if (total && total >= 100) rates[`mvd:${code}`] = Math.round(counts.total / total * 1000 * 10) / 10;
    }
    values.denuncias = rates;
  }
  const names: Record<string, string> = Object.fromEntries(Object.entries(INE_DISPLAY_NAMES).map(([code, name]) => [`mvd:${code}`, name]));
  for (const locality of uteLocalities()) names[`ute:${locality.id}`] = locality.name;
  return buildPriceImpact({ observations, zoneOf: key => zoneOf.get(key) ?? null, names, attributes: values, usdUyu, now, rentalDataAsOf });
}

