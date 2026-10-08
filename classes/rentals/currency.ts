// A home advertised "in pesos" at a price no home in its zone could cost in pesos is, almost
// always, a dollar price the portal labelled as pesos.
//
// Facebook Marketplace writes every price as UYU unless the seller picks otherwise, and sellers in
// Punta del Este and Carrasco do not: measured 2026-10-07, "Alquiler en Carrasco 2 dormitorios
// amoblado Ventura Tower" at "$ 2.500" and "Pinares 4 dormitorios 4 baños piscina" at "$ 2.499"
// were public, and the directory sorted them first by price. InfoCasas and the low-price
// exception in eligibility.ts let a few more through ("Casa en Viñedos de la Tahona" at $ 4.750).
//
// A FIXED THRESHOLD DOES NOT WORK, in either direction. Houses in Carmelo really rent at
// $ 6.500–7.500 (the zone's p10 is $ 10.338), so "below $ 8.000 is dollars" would turn them into
// US$ 7.000. And the department is not a market: Maldonado mixes Punta del Este, priced in
// dollars, with Maldonado city, priced in pesos — "Apartamento Centro Maldonado Alquiler Anual" at
// $ 15.000 is a real peso rent that a department-wide band would have converted.
//
// So the price is read against the published market of the same zone (department, barrio,
// bedrooms — the most specific cohort with at least 8 homes), and BOTH readings must agree:
//   - as pesos it has to be absurd: under half the zone's 10th percentile;
//   - as dollars it has to be ordinary: between half the 10th percentile and 1.5× the 90th.
// Under $ 5.000 no home rents in pesos anywhere in Uruguay, so any cohort may decide. From $ 5.000
// to $ 12.000 only the barrio's own cohort can (the Maldonado case above). From $ 12.000 nothing
// changes. When neither reading is plausible ("Alquiler zona Centro 1 dormitorio" at $ 4.000) the
// advert stays as published: there is nothing to correct it TO.
//
// Rooms are excluded: a bed in a residence really costs $ 7.000. The correction is marked on the
// offer (`currencyInferred`), the page says so, and an inferred currency never counts as evidence
// elsewhere.

import { flatten, inferPropertyType } from "./normalize";
import type { RawRental } from "./types";

/** Under this, no home rents in pesos anywhere: any cohort may decide. */
export const RENT_PESOS_ABSURD_UYU = 5_000;
/** From here to this, only the barrio's own cohort may decide. */
export const RENT_PESOS_SUSPECT_UYU = 12_000;
export const RENT_COHORT_MIN = 8;
/** The market a fix is read against: homes at or above the peso floor for a home (normalize.ts). */
export const RENT_COHORT_FLOOR_UYU = 8_000;

export interface RentPriceRow {
  department: string;
  neighborhood: string;
  bedrooms: number | null;
  priceUyu: number;
}

interface CohortBand {
  key: string;
  /** Barrio-level: department + neighborhood, with or without bedrooms. */
  local: boolean;
  p10: number;
  p90: number;
}

export type RentPriceCohorts = ReadonlyMap<string, { p10: number; p90: number; n: number }>;

const bedroomBucket = (bedrooms: number | null) =>
  bedrooms === null || !Number.isFinite(bedrooms) ? null : bedrooms <= 1 ? "0-1" : bedrooms === 2 ? "2" : "3+";

function cohortKeys(department: string, neighborhood: string, bedrooms: number | null) {
  const d = flatten(department);
  const n = flatten(neighborhood);
  const b = bedroomBucket(bedrooms);
  if (!d) return [];
  return [
    n && b ? { key: `${d}|${n}|${b}`, local: true } : null,
    n ? { key: `${d}|${n}`, local: true } : null,
    b ? { key: `${d}|*|${b}`, local: false } : null,
    { key: d, local: false },
  ].filter((value): value is { key: string; local: boolean } => value !== null);
}

const quantile = (sorted: readonly number[], p: number) =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))]!;

/** The published market, per zone. Rows are homes (casa/apartamento) with a peso-plausible price. */
export function rentPriceCohorts(rows: readonly RentPriceRow[]): RentPriceCohorts {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    if (!Number.isFinite(row.priceUyu) || row.priceUyu <= 0) continue;
    for (const { key } of cohortKeys(row.department, row.neighborhood, row.bedrooms)) {
      const list = groups.get(key);
      if (list) list.push(row.priceUyu);
      else groups.set(key, [row.priceUyu]);
    }
  }
  const cohorts = new Map<string, { p10: number; p90: number; n: number }>();
  for (const [key, prices] of groups) {
    if (prices.length < RENT_COHORT_MIN) continue;
    prices.sort((a, b) => a - b);
    cohorts.set(key, { p10: quantile(prices, 0.1), p90: quantile(prices, 0.9), n: prices.length });
  }
  return cohorts;
}

function cohortFor(cohorts: RentPriceCohorts, listing: Pick<RawRental, "department" | "neighborhood" | "bedrooms">): CohortBand | null {
  for (const { key, local } of cohortKeys(listing.department, listing.neighborhood, listing.bedrooms)) {
    const band = cohorts.get(key);
    if (band) return { key, local, p10: band.p10, p90: band.p90 };
  }
  return null;
}

// What a home's advert says about itself when the portal filed it as "otro".
const DWELLING_TITLE = /\b(?:alquiler anual|anual|dormitorios?|dorms?|monoambiente|mono ambiente|apto|apartamento|departamento|casa|chalet|duplex|torre|tower|penthouse)\b/;
// A bed or a room is cheap on purpose.
const ROOM_TITLE = /\b(?:residencias?|pension(?:es)?|hostel|hospedaje|compartid[oa]s?|habitacion(?:es)?|abitacion(?:es)?|piezas?|cuartos?|cama)\b/;

function isHomeAdvert(listing: Pick<RawRental, "propertyType" | "title" | "bedrooms">): boolean {
  const title = flatten(listing.title);
  if (inferPropertyType(listing.title) === "habitacion" || ROOM_TITLE.test(title)) return false;
  if (listing.propertyType === "casa" || listing.propertyType === "apartamento") return true;
  return listing.propertyType === "otro" && (listing.bedrooms !== null || DWELLING_TITLE.test(title));
}

export type RentCurrencyVerdict =
  | { kind: "unchanged" }
  | { kind: "usd"; cohort: string }
  /** Absurd as pesos AND as dollars: left as published, there is nothing to correct it to. */
  | { kind: "implausible"; cohort: string };

export function rentCurrencyVerdict(listing: RawRental, cohorts: RentPriceCohorts, usdUyu: number): RentCurrencyVerdict {
  if (listing.currency !== "UYU" || !Number.isFinite(listing.price) || listing.price <= 0) return { kind: "unchanged" };
  if (listing.price >= RENT_PESOS_SUSPECT_UYU || !(usdUyu > 0) || !isHomeAdvert(listing)) return { kind: "unchanged" };
  const band = cohortFor(cohorts, listing);
  if (!band) return { kind: "unchanged" };
  if (listing.price >= RENT_PESOS_ABSURD_UYU && !band.local) return { kind: "unchanged" };
  if (listing.price >= band.p10 * 0.5) return { kind: "unchanged" };
  const asDollars = listing.price * usdUyu;
  return asDollars >= band.p10 * 0.5 && asDollars <= band.p90 * 1.5
    ? { kind: "usd", cohort: band.key }
    : { kind: "implausible", cohort: band.key };
}

/** Re-reads misread peso prices as dollars. Returns new objects for the corrected adverts only. */
export function inferRentalCurrencies(
  listings: readonly RawRental[],
  cohorts: RentPriceCohorts,
  usdUyu: number
): { listings: RawRental[]; corrected: number } {
  let corrected = 0;
  const result = listings.map((listing) => {
    if (rentCurrencyVerdict(listing, cohorts, usdUyu).kind !== "usd") return listing;
    corrected++;
    return { ...listing, currency: "USD" as const, currencyInferred: true as const };
  });
  return { listings: result, corrected };
}
