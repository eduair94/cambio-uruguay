// One row per property, not per advert.
//
// This is the whole point of the directory. The same apartment is published by two inmobiliarias
// on InfoCasas and by one of them again on MercadoLibre; a list that shows it three times is worse
// than not having a list. But the opposite error is just as bad and much harder to notice: an
// eight-flat building has eight adverts at the same street number, and merging them hides seven
// real options behind one card.
//
// So the rule is EVIDENCE, not similarity:
//   * STRONG — same street and door number, same dormitorios, area within 15 %, price within 7 %.
//     Same address alone is never enough: that is the building, not the unit.
//   * MEDIUM — no street on either side (Marketplace rarely has one), but same barrio, same
//     dormitorios, area within 8 % and price within 5 %.
//   * otherwise the adverts stay apart. A visible duplicate is a nuisance; a swallowed listing is
//     a lie about what is on the market.
import { flatten, slugify } from "./normalize";
import type { RawRental, RentalOffer, RentalProperty, RentalPropertyType, RentalSource } from "./types";

/** How complete a source's rows tend to be — used only to pick which row names the property. */
const SOURCE_RANK: Record<RentalSource, number> = { infocasas: 3, mercadolibre: 2, facebook: 1 };

export interface DedupeContext {
  usdUyu: number;
  /** ISO date of the run. */
  today: string;
  /** `listingId -> firstSeen`, so a re-seen advert keeps the day we first saw it. */
  offerFirstSeen: Map<string, string>;
  /** `property key -> firstSeen`, same idea one level up. */
  propertyFirstSeen: Map<string, string>;
}

export function priceInPesos(price: number, currency: string, usdUyu: number): number {
  return currency === "USD" ? Math.round(price * usdUyu) : Math.round(price);
}

const ratio = (a: number, b: number): number => (a <= 0 || b <= 0 ? 0 : Math.min(a, b) / Math.max(a, b));

/** Types that are the same kind of thing for merging purposes. */
const TYPE_FAMILY: Record<RentalPropertyType, string> = {
  apartamento: "vivienda",
  casa: "vivienda",
  habitacion: "habitacion",
  local: "comercial",
  oficina: "comercial",
  terreno: "terreno",
  otro: "otro",
};

interface Candidate extends RawRental {
  priceUyu: number;
}

/** The bucket key: only adverts sharing it are ever compared. */
export function bucketKey(listing: Candidate): string {
  const department = flatten(listing.department) || "sin-departamento";
  if (listing.street && listing.streetNumber) {
    return `addr|${department}|${flatten(listing.street)}|${listing.streetNumber}`;
  }
  const neighborhood = flatten(listing.neighborhood);
  if (neighborhood) return `barrio|${department}|${neighborhood}|${TYPE_FAMILY[listing.propertyType]}`;
  return `depto|${department}|${TYPE_FAMILY[listing.propertyType]}`;
}

/**
 * Do these two adverts describe the same unit? Called only within a bucket, so the location half
 * of the evidence is already established; what is left is proving it is the same FLAT and not the
 * flat upstairs.
 */
export function sameUnit(a: Candidate, b: Candidate): boolean {
  if (TYPE_FAMILY[a.propertyType] !== TYPE_FAMILY[b.propertyType]) return false;

  // Dormitorios are the strongest cheap signal, and both portals publish them for real estate.
  // A disagreement is a different unit, full stop.
  if (a.bedrooms !== null && b.bedrooms !== null && a.bedrooms !== b.bedrooms) return false;

  const areaRatio = a.area !== null && b.area !== null ? ratio(a.area, b.area) : null;
  const priceRatio = ratio(a.priceUyu, b.priceUyu);

  const hasStreet = Boolean(a.street && a.streetNumber && b.street && b.streetNumber);
  if (hasStreet) {
    if (areaRatio !== null && areaRatio < 0.85) return false;
    if (priceRatio < 0.93) return false;
    // Same building, same size, same price, same dormitorios — and if BOTH sides left dormitorios
    // and area blank, all we really share is an address, which is not a unit.
    const knowsSomething =
      (a.bedrooms !== null && b.bedrooms !== null) || areaRatio !== null || priceRatio >= 0.99;
    return knowsSomething;
  }

  // No street on either side: the bar goes up, because the bucket is a whole barrio.
  if (a.bedrooms === null || b.bedrooms === null) return false;
  if (areaRatio !== null && areaRatio < 0.92) return false;
  return priceRatio >= 0.95;
}

function completeness(listing: Candidate): number {
  let score = SOURCE_RANK[listing.source];
  if (listing.street && listing.streetNumber) score += 6;
  if (listing.latitude !== null && listing.longitude !== null) score += 4;
  if (listing.area !== null) score += 2;
  if (listing.bedrooms !== null) score += 2;
  if (listing.neighborhood) score += 1;
  return score;
}

/** FNV-1a — a short, stable, dependency-free id for a cluster. */
function hash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * The property's stable id. Built from the identity we actually merged on, so it survives a price
 * change and a re-post. When there is no address (Marketplace), the earliest advert id is folded in
 * — without it every barrio would collapse into one key.
 */
export function propertyKey(canonical: Candidate, cluster: Candidate[]): string {
  const parts = [
    flatten(canonical.department),
    flatten(canonical.neighborhood),
    flatten(canonical.street),
    canonical.streetNumber,
    canonical.propertyType,
    canonical.bedrooms === null ? "" : String(canonical.bedrooms),
    canonical.area === null ? "" : String(canonical.area),
  ];
  const identifiable = Boolean(canonical.street && canonical.streetNumber);
  if (!identifiable) {
    const oldest = [...cluster].map((item) => item.listingId).sort()[0]!;
    parts.push(oldest);
  }
  const slug = slugify(
    [canonical.department, canonical.neighborhood || canonical.propertyType, canonical.street].filter(Boolean).join(" ")
  );
  return `${slug || "uy"}-${hash(parts.join("|"))}`;
}

function toOffer(listing: Candidate, context: DedupeContext): RentalOffer {
  return {
    source: listing.source,
    listingId: listing.listingId,
    url: listing.url,
    title: listing.title,
    price: Math.round(listing.price),
    currency: listing.currency,
    priceUyu: listing.priceUyu,
    commonExpenses: listing.commonExpenses === null ? null : Math.round(listing.commonExpenses),
    commonExpensesCurrency: listing.commonExpensesCurrency,
    sellerName: listing.sellerName,
    sellerType: listing.sellerType,
    image: listing.image,
    publishedAt: listing.publishedAt,
    firstSeen: context.offerFirstSeen.get(listing.listingId) || context.today,
    lastSeen: context.today,
  };
}

/**
 * Groups adverts into properties. Deterministic: the input is sorted before clustering so two runs
 * over the same market produce the same keys, which is what keeps `firstSeen` meaningful.
 */
export function buildRentalProperties(raw: RawRental[], context: DedupeContext): RentalProperty[] {
  const candidates: Candidate[] = raw
    .map((listing) => ({ ...listing, priceUyu: priceInPesos(listing.price, listing.currency, context.usdUyu) }))
    .sort((a, b) => a.listingId.localeCompare(b.listingId));

  const buckets = new Map<string, Candidate[][]>();
  for (const listing of candidates) {
    const key = bucketKey(listing);
    const clusters = buckets.get(key) || [];
    // Same advert id twice in one run (two queries hit it) is not a merge decision.
    const alreadyKnown = clusters.some((cluster) =>
      cluster.some((member) => member.listingId === listing.listingId)
    );
    if (alreadyKnown) continue;
    const target = clusters.find((cluster) => cluster.every((member) => sameUnit(member, listing)));
    if (target) target.push(listing);
    else clusters.push([listing]);
    buckets.set(key, clusters);
  }

  const properties: RentalProperty[] = [];
  for (const clusters of buckets.values()) {
    for (const cluster of clusters) {
      const canonical = [...cluster].sort((a, b) => completeness(b) - completeness(a))[0]!;
      const offers = cluster
        .map((listing) => toOffer(listing, context))
        .sort((a, b) => a.priceUyu - b.priceUyu);
      const cheapest = offers[0]!;
      const key = propertyKey(canonical, cluster);
      const sources = [...new Set(offers.map((offer) => offer.source))];

      properties.push({
        key,
        title: canonical.title,
        propertyType: canonical.propertyType,
        department: canonical.department,
        neighborhood: canonical.neighborhood,
        address: canonical.address,
        addressKey: bucketKey(canonical),
        latitude: canonical.latitude,
        longitude: canonical.longitude,
        bedrooms: cluster.map((item) => item.bedrooms).find((value) => value !== null) ?? null,
        bathrooms: cluster.map((item) => item.bathrooms).find((value) => value !== null) ?? null,
        area: cluster.map((item) => item.area).find((value) => value !== null) ?? null,
        priceUyu: cheapest.priceUyu,
        price: cheapest.price,
        currency: cheapest.currency,
        offers,
        sources,
        firstSeen: context.propertyFirstSeen.get(key) || offers.map((offer) => offer.firstSeen).sort()[0] || context.today,
        lastSeen: context.today,
      });
    }
  }

  return properties.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen) || a.priceUyu - b.priceUyu);
}
