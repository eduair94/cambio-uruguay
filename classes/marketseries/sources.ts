// Lee los tres catálogos PÚBLICOS que ya existen en la APP DB. Nunca toca una cosecha: lo que entra
// acá ya pasó las reglas del sitio (identidad v1 y elegibilidad de alquileres, ficha propia de ventas,
// moneda leída y banderas de autos). Un catálogo cuyo meta tiene más de 3 días no es el mercado de
// hoy, y ese mercado se saltea.
import { appConnection } from "../appdb";
import type { RentalZoneMarketObservation } from "../propertyzones/market";
import { isPlaceholderPrice } from "../pricehistory/placeholder";
import { projectZoneObservations, ZONE_RENTAL_PROJECTION } from "../propertyzones/project";
import { shiftDay } from "./log";
import type { MarketObservation, MarketVertical } from "./types";

const DAY = 86_400_000;
const META_MAX_AGE_DAYS = 3;
/** The rental directory's own window (propertyzones/market.ts). */
const RENTAL_FRESH_DAYS = 10;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KEY = /^[\w:.-]{1,160}$/;

export interface MarketRead {
  observations: MarketObservation[];
  /** Rows left out, by reason ("stale", "invalid", "placeholder", "currency", "flags"). */
  excluded: Record<string, number>;
  dataAsOf: string;
}

const NONE = {
  areaBuilt: null,
  department: null,
  neighborhood: null,
  propertyType: null,
  bedrooms: null,
  marketSlug: null,
  brand: null,
  model: null,
  year: null,
};

const cleanName = (value: unknown): string | null =>
  typeof value === "string" && value.length <= 120 && !/[\p{Cc}\p{Cf}<>]/u.test(value)
    ? value.normalize("NFC").trim().replace(/\s+/g, " ") || null
    : null;

/** The observation's calendar day when it lies inside the catalogue's own window; never the future. */
export function freshSeen(value: unknown, now: Date, days: number): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time > now.getTime() + 60_000) return null;
  const day = value.slice(0, 10);
  return day >= shiftDay(now.toISOString().slice(0, 10), -days) ? day : null;
}

export function rentalObservation(o: RentalZoneMarketObservation, now: Date): MarketObservation | string {
  const seenDay = freshSeen(o.lastSeen, now, RENTAL_FRESH_DAYS);
  if (!seenDay) return "stale";
  if (!(o.price > 0) || (o.currency !== "UYU" && o.currency !== "USD")) return "invalid";
  if (isPlaceholderPrice(o.price)) return "placeholder";
  return {
    ...NONE,
    vertical: "alquiler",
    advertId: o.advertId,
    groupKey: o.propertyKey,
    price: o.price,
    currency: o.currency,
    seenAt: o.lastSeen,
    seenDay,
    areaBuilt: o.areaBuilt,
    department: o.department,
    neighborhood: o.neighborhood,
    propertyType: o.propertyType,
    bedrooms: o.bedrooms,
  };
}

export function saleObservation(row: Record<string, any>, now: Date, freshDays: number): MarketObservation | string {
  const key = typeof row.key === "string" && KEY.test(row.key) ? row.key : null;
  const propertyType = row.propertyType === "apartamento" || row.propertyType === "casa" ? row.propertyType : null;
  const department = cleanName(row.department);
  const amount = row.price?.amount;
  const currency = row.price?.currency;
  if (
    !key ||
    !propertyType ||
    !department ||
    !(typeof amount === "number" && Number.isFinite(amount) && amount > 0) ||
    (currency !== "USD" && currency !== "UYU")
  )
    return "invalid";
  if (isPlaceholderPrice(amount)) return "placeholder";
  const seenDay = freshSeen(row.lastSeen, now, freshDays);
  if (!seenDay) return "stale";
  const built = row.areas?.built;
  return {
    ...NONE,
    vertical: "venta",
    advertId: key,
    groupKey: key,
    price: amount,
    currency,
    seenAt: row.lastSeen,
    seenDay,
    areaBuilt: typeof built === "number" && built >= 8 && built <= 100_000 ? built : null,
    department,
    neighborhood: cleanName(row.neighborhood),
    propertyType,
    bedrooms: Number.isInteger(row.bedrooms) && row.bedrooms >= 0 && row.bedrooms <= 20 ? row.bedrooms : null,
  };
}

export function carObservation(row: Record<string, any>, now: Date, freshDays: number): MarketObservation | string {
  const key = typeof row.key === "string" && KEY.test(row.key) ? row.key : null;
  const marketSlug = typeof row.marketSlug === "string" && row.marketSlug.length <= 80 && SLUG.test(row.marketSlug) ? row.marketSlug : null;
  // Same floor as the Motorlider guard: under USD 1.000 it is a deposit, not a car.
  if (!key || !marketSlug || !(typeof row.price === "number" && row.price >= 1_000 && row.price <= 500_000)) return "invalid";
  if (isPlaceholderPrice(row.price)) return "placeholder";
  if (row.currency !== "USD" || row.currencyInferred === true) return "currency";
  // Every public flag (damaged, debt, foreign plate, recovered...) already keeps a car out of the model page.
  if (Array.isArray(row.flags) && row.flags.length) return "flags";
  const seenDay = freshSeen(row.lastSeen, now, freshDays);
  if (!seenDay) return "stale";
  const year = Number.isInteger(row.year) && row.year >= 1950 && row.year <= now.getUTCFullYear() + 1 ? (row.year as number) : null;
  return {
    ...NONE,
    vertical: "autos",
    advertId: key,
    groupKey: key,
    price: row.price,
    currency: "USD",
    seenAt: row.lastSeen,
    seenDay,
    marketSlug,
    brand: cleanName(row.brand),
    model: cleanName(row.model),
    year,
  };
}

function metaDate(value: unknown, now: Date): string {
  const time = typeof value === "string" ? Date.parse(value) : NaN;
  if (!Number.isFinite(time) || time > now.getTime() + 60_000 || now.getTime() - time > META_MAX_AGE_DAYS * DAY)
    throw new Error(`catálogo sin meta o con más de ${META_MAX_AGE_DAYS} días (${String(value)})`);
  return new Date(time).toISOString();
}

function collect(read: MarketRead, mapped: MarketObservation | string): void {
  if (typeof mapped === "string") read.excluded[mapped] = (read.excluded[mapped] ?? 0) + 1;
  else read.observations.push(mapped);
}

const freshDaysOf = (value: unknown, fallback: number): number =>
  Number.isInteger(value) && (value as number) > 0 && (value as number) <= 60 ? (value as number) : fallback;

export async function readRentals(now: Date): Promise<MarketRead> {
  const db = appConnection();
  const meta = await db.collection("rentalmetas").findOne({ key: "uy-rentals" }, { projection: { _id: 0, generatedAt: 1 }, maxTimeMS: 5000 });
  const read: MarketRead = { observations: [], excluded: {}, dataAsOf: metaDate(meta?.generatedAt, now) };
  const cutoff = shiftDay(now.toISOString().slice(0, 10), -RENTAL_FRESH_DAYS);
  const cursor = db.collection("rentallistings").find(
    { offers: { $elemMatch: { "identity.version": 1, "identity.propertyType": { $in: ["apartamento", "casa"] }, lastSeen: { $gte: cutoff } } } },
    { projection: ZONE_RENTAL_PROJECTION, batchSize: 200, maxTimeMS: 180_000 },
  );
  try {
    for await (const row of cursor) for (const o of projectZoneObservations(row)) collect(read, rentalObservation(o, now));
  } finally {
    await cursor.close();
  }
  return read;
}

export async function readSales(now: Date): Promise<MarketRead> {
  const db = appConnection();
  const meta = await db
    .collection("propertysalecatalogmetas")
    .findOne({ key: "uy-sales" }, { projection: { _id: 0, generatedAt: 1, freshDays: 1 }, maxTimeMS: 5000 });
  const read: MarketRead = { observations: [], excluded: {}, dataAsOf: metaDate(meta?.generatedAt, now) };
  const freshDays = freshDaysOf(meta?.freshDays, 21);
  const cursor = db.collection("propertysalecatalog").find(
    {},
    {
      projection: { _id: 0, key: 1, propertyType: 1, department: 1, neighborhood: 1, bedrooms: 1, price: 1, "areas.built": 1, lastSeen: 1 },
      batchSize: 500,
      maxTimeMS: 120_000,
    },
  );
  try {
    for await (const row of cursor) collect(read, saleObservation(row, now, freshDays));
  } finally {
    await cursor.close();
  }
  return read;
}

export async function readCars(now: Date): Promise<MarketRead> {
  const db = appConnection();
  const meta = await db
    .collection("carcatalogmetas")
    .findOne({ key: "uy-cars" }, { projection: { _id: 0, generatedAt: 1, "meta.freshDays": 1 }, maxTimeMS: 5000 });
  const read: MarketRead = { observations: [], excluded: {}, dataAsOf: metaDate(meta?.generatedAt, now) };
  const freshDays = freshDaysOf(meta?.meta?.freshDays, 4);
  const cursor = db.collection("carcatalog").find(
    {},
    {
      projection: { _id: 0, key: 1, marketSlug: 1, brand: 1, model: 1, year: 1, price: 1, currency: 1, currencyInferred: 1, flags: 1, lastSeen: 1 },
      batchSize: 1000,
      maxTimeMS: 120_000,
    },
  );
  try {
    for await (const row of cursor) collect(read, carObservation(row, now, freshDays));
  } finally {
    await cursor.close();
  }
  return read;
}

export const MARKET_READERS: Record<MarketVertical, (now: Date) => Promise<MarketRead>> = {
  alquiler: readRentals,
  venta: readSales,
  autos: readCars,
};
