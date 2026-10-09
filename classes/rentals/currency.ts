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
// to $ 12.000 the department ALONE cannot (the Maldonado case above), but the barrio can, and so can
// the department's homes with the same bedrooms: "4 habitaciones 2 baños - Casa" at $ 5.500 is no
// peso rent anywhere in Maldonado, whose 3+ bedroom homes start at $ 74.430 (p10). That cohort still
// spans barrios, so its dollar reading must sit inside the market it shows (up to p90, not 1.5×):
// "1 habitación 2 baños Departamento" at US$ 5.400 and a "10 habitaciones 9 baños" house at
// US$ 6.500 — a pension by the room, most likely — stay as published. From $ 12.000 nothing
// changes. When neither reading is plausible ("Alquiler zona Centro 1 dormitorio" at $ 4.000) the
// advert stays as published: there is nothing to correct it TO.
//
// Rooms are excluded: a bed in a residence really costs $ 7.000. The correction is marked on the
// offer (`currencyInferred`), the page says so, and an inferred currency never counts as evidence
// elsewhere.

import { flatten, inferPropertyType, withoutRoomCounts } from "./normalize";
import type { RawRental, RentalOffer, RentalProperty } from "./types";

/** Under this, no home rents in pesos anywhere: any cohort may decide. */
export const RENT_PESOS_ABSURD_UYU = 5_000;
/** From here to this, the department alone may not decide: the barrio or the bedrooms must. */
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

/** How narrow a market the cohort is: the barrio's, the department's same-bedroom homes, or all of it. */
type CohortScope = "barrio" | "bedrooms" | "department";

interface CohortBand {
  key: string;
  scope: CohortScope;
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
    n && b ? { key: `${d}|${n}|${b}`, scope: "barrio" as const } : null,
    n ? { key: `${d}|${n}`, scope: "barrio" as const } : null,
    b ? { key: `${d}|*|${b}`, scope: "bedrooms" as const } : null,
    { key: d, scope: "department" as const },
  ].filter((value): value is { key: string; scope: CohortScope } => value !== null);
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
  for (const { key, scope } of cohortKeys(listing.department, listing.neighborhood, listing.bedrooms)) {
    const band = cohorts.get(key);
    if (band) return { key, scope, p10: band.p10, p90: band.p90 };
  }
  return null;
}

// What a home's advert says about itself when the portal filed it as "otro".
const DWELLING_TITLE = /\b(?:alquiler anual|anual|dormitorios?|dorms?|monoambiente|mono ambiente|apto|apartamento|departamento|casa|chalet|duplex|torre|tower|penthouse)\b/;
// A bed or a room is cheap on purpose.
const ROOM_TITLE = /\b(?:residencias?|pension(?:es)?|hostel|hospedaje|compartid[oa]s?|habitacion(?:es)?|abitacion(?:es)?|piezas?|cuartos?|cama)\b/;

function isHomeAdvert(listing: Pick<RawRental, "propertyType" | "title" | "bedrooms">): boolean {
  const title = flatten(listing.title);
  // "1 habitación 1 baño Departamento" COUNTS a room; only a room word left after the counts rents one.
  if (inferPropertyType(listing.title) === "habitacion" || ROOM_TITLE.test(withoutRoomCounts(title))) return false;
  if (listing.propertyType === "casa" || listing.propertyType === "apartamento") return true;
  return listing.propertyType === "otro" && (listing.bedrooms !== null || DWELLING_TITLE.test(title));
}

/** What the reading needs from an advert, fresh from a portal or already stored. */
export type RentCurrencySubject = Pick<
  RawRental,
  "currency" | "price" | "propertyType" | "title" | "bedrooms" | "department" | "neighborhood"
>;

export type RentCurrencyVerdict =
  | { kind: "unchanged" }
  | { kind: "usd"; cohort: string }
  /** Absurd as pesos AND as dollars: left as published, there is nothing to correct it to. */
  | { kind: "implausible"; cohort: string };

export function rentCurrencyVerdict(listing: RentCurrencySubject, cohorts: RentPriceCohorts, usdUyu: number): RentCurrencyVerdict {
  if (listing.currency !== "UYU" || !Number.isFinite(listing.price) || listing.price <= 0) return { kind: "unchanged" };
  if (listing.price >= RENT_PESOS_SUSPECT_UYU || !(usdUyu > 0) || !isHomeAdvert(listing)) return { kind: "unchanged" };
  const band = cohortFor(cohorts, listing);
  if (!band) return { kind: "unchanged" };
  const suspect = listing.price >= RENT_PESOS_ABSURD_UYU;
  if (suspect && band.scope === "department") return { kind: "unchanged" };
  if (listing.price >= band.p10 * 0.5) return { kind: "unchanged" };
  const asDollars = listing.price * usdUyu;
  // A bedroom cohort spans the department's barrios: in the suspect range its dollar reading has to
  // sit inside what that market shows, not beyond it.
  const ceiling = suspect && band.scope === "bedrooms" ? band.p90 : band.p90 * 1.5;
  return asDollars >= band.p10 * 0.5 && asDollars <= ceiling
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

type StoredProperty = Pick<RentalProperty, "title" | "propertyType" | "department" | "neighborhood" | "bedrooms" | "offers">;

/** What a stored advert says about itself; the property's fields fill what a legacy advert never recorded. */
function storedOfferSubject(offer: RentalOffer, property: StoredProperty): RentCurrencySubject {
  const own = offer.identity;
  return {
    currency: offer.currency,
    price: offer.price,
    title: offer.title || property.title,
    // Facebook's type is a function of the title alone (sources/facebook.ts): read it with today's rule,
    // not the one in force when the advert was stored.
    propertyType: offer.source === "facebook" ? inferPropertyType(offer.title || property.title) : own?.propertyType ?? property.propertyType,
    department: own?.department ?? property.department,
    neighborhood: own?.neighborhood ?? property.neighborhood,
    bedrooms: own ? own.bedrooms : property.bedrooms,
  };
}

/**
 * The same reading for adverts already stored. A run only rewrites the adverts its portals showed it
 * again, and Facebook's browser shows a slice: on 2026-10-08 the full run read 2.155 of the 7.025
 * live Marketplace adverts, so "Carrasco 2 dormitorios" at $ 2.500 would have stayed in pesos until it
 * expired. The advert's own identity speaks first; the property's fields fill what a legacy advert
 * never recorded. `priceUyu` is re-expressed with today's rate, as a fresh read would be.
 */
export function correctStoredRentCurrencies(
  property: StoredProperty,
  cohorts: RentPriceCohorts,
  usdUyu: number
): { offers: RentalOffer[]; corrected: number } {
  let corrected = 0;
  const offers = property.offers.map((offer) => {
    if (offer.currency !== "UYU" || offer.currencyInferred === true) return offer;
    if (rentCurrencyVerdict(storedOfferSubject(offer, property), cohorts, usdUyu).kind !== "usd") return offer;
    corrected++;
    return { ...offer, currency: "USD" as const, currencyInferred: true as const, priceUyu: Math.round(offer.price * usdUyu) };
  });
  return { offers, corrected };
}

// --- Per-night prices -----------------------------------------------------------------------------
//
// Punta del Este and José Ignacio publish summer stays in the monthly rental category, and the price
// is the NIGHT's: measured 2026-10-08, "Penthouse Península" at US$ 240 says "Costos por día para 4
// personas: DICIEMBRE U$S 270, ENERO U$S 310, FEBRERO U$S 240"; "Forest Tower" at US$ 350, "Disponible
// del 20 al 25 de Enero"; a 3-bedroom house in José Ignacio at US$ 195, where the cheapest tenth of
// the zone rents from $ 90.970 a month. The text cannot be the rule: 37 of the 66 cheapest dollar
// homes carry no description (MercadoLibre), and "capacidad para 6 personas" or "temporada" also
// sit on real US$ 1.500 winter and annual rents. The price against its own zone can: under half the
// zone's 10th percentile, a home's rent is rarely a month's. It is a FLAG, not a removal: a cheap
// winter rent in Punta del Este is real, and the reader decides (the page says why).

/** Under this share of the zone's 10th percentile, a home's rent is flagged as a possible stay price. */
export const RENT_STAY_SUSPECT_SHARE = 0.5;

// The advert itself offers a long stay: "Alquiler anual 3 dormitorios sin muebles" at US$ 2.600 in the
// Golf, or a winter rent, is cheap for its zone and still a month's price.
// "Anual" only next to the rent: "Gastos anuales de impuestos USD 480" sits in a summer stay's text.
const LONG_STAY = /\b(?:alquiler(?:es)?|alquilo|alquila|contrato|renta)\s+(?:[a-z]+\s+){0,2}(?:anual(?:es)?|mensual(?:es)?|invernal|de invierno)\b|\b(?:por|al) mes\b|\btodo el ano\b/;

/**
 * Is this home's DOLLAR rent so far under its zone that it is probably per night or per stay? Only
 * dollars: the stays are priced in dollars, and in pesos the same test flagged real cheap rents of
 * Maldonado city and Carrasco Norte (76 of 76 peso flags in the dry run, 2026-10-08).
 */
export function rentStayPriceSuspect(
  listing: RentCurrencySubject & { description?: string },
  cohorts: RentPriceCohorts,
  usdUyu: number
): boolean {
  if (listing.currency !== "USD" || !Number.isFinite(listing.price) || listing.price <= 0 || !(usdUyu > 0)) return false;
  if (!isHomeAdvert(listing)) return false;
  const band = cohortFor(cohorts, listing);
  if (!band) return false;
  const pesos = listing.price * usdUyu;
  // The department alone mixes markets (Maldonado city in pesos, Punta del Este in dollars).
  if (band.scope === "department" && pesos >= RENT_PESOS_ABSURD_UYU) return false;
  if (pesos >= band.p10 * RENT_STAY_SUSPECT_SHARE) return false;
  return !LONG_STAY.test(flatten(`${listing.title}\n${listing.description || ""}`));
}

/** Sets the flag on fresh adverts; the price they carry is the one the reading is about. */
export function flagRentalStayPrices(
  listings: readonly RawRental[],
  cohorts: RentPriceCohorts,
  usdUyu: number
): { listings: RawRental[]; flagged: number } {
  let flagged = 0;
  const result = listings.map((listing) => {
    const suspect = rentStayPriceSuspect(
      { ...listing, description: listing.description || listing.details?.description },
      cohorts,
      usdUyu
    );
    if (suspect) flagged++;
    if (suspect === (listing.stayPriceSuspect === true)) return listing;
    if (suspect) return { ...listing, stayPriceSuspect: true as const };
    const { stayPriceSuspect: _drop, ...rest } = listing;
    return rest;
  });
  return { listings: result, flagged };
}

/** The same flag on stored adverts, set AND cleared: the zone's market moves between runs. */
export function refreshStoredStayPriceFlags(
  property: StoredProperty,
  cohorts: RentPriceCohorts,
  usdUyu: number
): { offers: RentalOffer[]; changed: number } {
  let changed = 0;
  const offers = property.offers.map((offer) => {
    const description = offer.details?.description || offer.identity?.description;
    const suspect = rentStayPriceSuspect({ ...storedOfferSubject(offer, property), description }, cohorts, usdUyu);
    if (suspect === (offer.stayPriceSuspect === true)) return offer;
    changed++;
    if (suspect) return { ...offer, stayPriceSuspect: true as const };
    const { stayPriceSuspect: _drop, ...rest } = offer;
    return rest;
  });
  return { offers, changed };
}
