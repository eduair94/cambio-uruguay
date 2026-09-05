// One row per property, not per advert.
//
// This is the whole point of the directory. The same apartment is published by two inmobiliarias
// on InfoCasas and by one of them again on MercadoLibre; a list that shows it three times is worse
// than not having a list. But the opposite error is just as bad and much harder to notice: an
// eight-flat building has eight adverts at the same street number, and merging them hides seven
// real options behind one card.
//
// Evidence must identify a UNIT: exact published address + matching explicit unit, or exact
// original photo + specific identical title + complete matching specifications at that address.
// Barrio, coordinates, asking price and a building's floor plan cannot establish identity.
import { flatten, slugify } from "./normalize";
import { mergeGuarantees } from "./guarantees";
import {
  conflictingUnitEvidence,
  exactRentalAddress,
  matchText,
  rentalMatchHasConflicts,
  rentalUnitEvidence,
  sharesSpecificPhotoAndTitle,
  type RentalMatchCandidate,
} from "./matchEvidence";
import type { RawRental, RentalOffer, RentalProperty, RentalSource } from "./types";

export type { RentalMatchCandidate } from "./matchEvidence";

/** How complete a source's rows tend to be — used only to pick which row names the property. */
const SOURCE_RANK: Record<RentalSource, number> = {
  infocasas: 4,
  elpais: 3,
  mercadolibre: 2,
  casasweb: 2,
  facebook: 1,
};

export interface DedupeContext {
  usdUyu: number;
  /** ISO date of the run. */
  today: string;
  /** `listingId -> firstSeen`, so a re-seen advert keeps the day we first saw it. */
  offerFirstSeen: Map<string, string>;
  /** `property key -> firstSeen`, same idea one level up. */
  propertyFirstSeen: Map<string, string>;
  /**
   * `listingId -> property key` from the previous run. This is what keeps a property's identity
   * stable: the computed key is derived from the CANONICAL advert's fields, so the day the
   * InfoCasas row (with its m² and its street number) disappears and a thinner MercadoLibre row
   * becomes canonical, the computed key changes — and the directory would show the same flat twice
   * for the three weeks until the orphan is pruned. Inheriting the key from any advert the cluster
   * already had makes that impossible.
   */
  offerToProperty: Map<string, string>;
  /** A unique owner of each old canonical presentation; null means attribution is ambiguous. */
  propertyCanonicalOffer?: ReadonlyMap<string, string | null>;
}

export function priceInPesos(price: number, currency: string, usdUyu: number): number {
  return currency === "USD" ? Math.round(price * usdUyu) : Math.round(price);
}

const ratio = (a: number, b: number): number =>
  !Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0 ? 0 : Math.min(a, b) / Math.max(a, b);

interface Candidate extends RawRental {
  priceUyu: number;
}

/** The bucket key: only adverts sharing it are ever compared. */
export function bucketKey(listing: Candidate): string {
  const department = flatten(listing.department) || "sin-departamento";
  if (listing.street && listing.streetNumber) {
    return `addr|${department}|${flatten(listing.street)}|${listing.streetNumber}`;
  }
  // A whole barrio cannot identify a unit. Avoid quadratic comparisons of addressless adverts
  // which the identity predicate necessarily rejects; known IDs were deduplicated globally.
  return `solo|${listing.source}|${listing.listingId}`;
}

/**
 * A self-contained identity test, also usable when revalidating stored offers. A bucket or
 * previously shared property key is only a candidate search aid, never proof of a match.
 */
export function sameUnit(a: RentalMatchCandidate, b: RentalMatchCandidate): boolean {
  if (a.propertyType !== b.propertyType) return false;
  if (a.department && b.department && matchText(a.department) !== matchText(b.department)) return false;
  if (a.street && b.street && matchText(a.street) !== matchText(b.street)) return false;
  if (a.streetNumber && b.streetNumber && a.streetNumber !== b.streetNumber) return false;

  // Dormitorios are the strongest cheap signal, and both portals publish them for real estate.
  // A disagreement is a different unit, full stop.
  if (a.bedrooms !== null && b.bedrooms !== null && a.bedrooms !== b.bedrooms) return false;
  // Los baños se leían y no se comparaban nunca. Es el mismo argumento que los dormitorios: si los
  // dos avisos dicen cuántos baños tiene y dicen distinto, se están describiendo a sí mismos y no
  // coinciden. Sólo descalifica cuando AMBOS lo publican; ausente no contradice nada.
  if (a.bathrooms !== null && b.bathrooms !== null && a.bathrooms !== b.bathrooms) return false;
  if (a.parkingSpaces != null && b.parkingSpaces != null && a.parkingSpaces !== b.parkingSpaces) return false;
  if (rentalMatchHasConflicts(a, b)) return false;
  const unitsA = rentalUnitEvidence(a);
  const unitsB = rentalUnitEvidence(b);
  if (conflictingUnitEvidence(unitsA, unitsB)) return false;
  const areaRatio = a.area != null && b.area != null ? ratio(a.area, b.area) : null;
  if (areaRatio !== null && areaRatio < 0.95) return false;
  if (ratio(a.priceUyu, b.priceUyu) < 0.93) return false;

  // Re-reading the SAME advert is not a cross-advert match. Contradictions still veto above.
  if (a.source === b.source && a.listingId && a.listingId === b.listingId) return true;
  if (a.propertyType === "otro") return false;
  const address = exactRentalAddress(a);
  if (!address || address !== exactRentalAddress(b)) return false;
  if (a.neighborhood && b.neighborhood && matchText(a.neighborhood) !== matchText(b.neighborhood))
    return false;

  const knowsBedrooms =
    Number.isInteger(a.bedrooms) && a.bedrooms! >= 0 && Number.isInteger(b.bedrooms) && b.bedrooms! >= 0;
  const knowsBathrooms =
    Number.isInteger(a.bathrooms) && a.bathrooms! > 0 && Number.isInteger(b.bathrooms) && b.bathrooms! > 0;
  const knowsArea = areaRatio !== null && areaRatio > 0;
  if (unitsA.units.length === 1 && unitsB.units.length === 1) {
    // Unit 301 in an unspecified tower is not proof of tower A's unit 301.
    return (
      unitsA.buildings.length === unitsB.buildings.length && (knowsBedrooms || knowsBathrooms || knowsArea)
    );
  }
  // The same model/facade photo or a generic agency title is not enough, even at one address.
  return (
    knowsBedrooms && knowsBathrooms && knowsArea && areaRatio! >= 0.98 && sharesSpecificPhotoAndTitle(a, b)
  );
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

function candidateSignature(listing: Candidate): string {
  // Resolve repeated snapshots independently of query order, including known amenities. This
  // compares the original fields only and does not blend two differing physical specifications.
  return JSON.stringify(
    Object.keys(listing)
      .sort()
      .map((key) => [key, listing[key as keyof Candidate]]),
  );
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
 * A candidate id, not proof that a stored property is the same unit. The prior advert mapping is
 * what preserves identity across edits; an unknown repost must not reuse another unit's URL.
 * When there is no address (Marketplace), the earliest advert id is folded in
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
    [canonical.department, canonical.neighborhood || canonical.propertyType, canonical.street]
      .filter(Boolean)
      .join(" "),
  );
  return `${slug || "uy"}-${hash(parts.join("|"))}`;
}

/**
 * The key this cluster should keep. Inherited from the adverts it already contains when possible —
 * that is what survives a canonical row disappearing — and only computed from scratch for a
 * property nobody has seen before.
 */
export function resolveKey(
  canonical: Candidate,
  cluster: Candidate[],
  context: DedupeContext,
  claimed: Set<string>,
  reserved: ReadonlySet<string> = new Set([
    ...context.propertyFirstSeen.keys(),
    ...context.offerToProperty.values(),
    ...(context.propertyCanonicalOffer?.keys() ?? []),
  ]),
): string {
  // Which stored key do most of these adverts belong to? Counting (rather than taking the first)
  // matters when two properties merge for the first time: the bigger half keeps its identity.
  const votes = new Map<string, number>();
  const clusterIds = new Set(cluster.map((listing) => listing.listingId));
  for (const listing of cluster) {
    const previous = context.offerToProperty.get(listing.listingId);
    if (previous && context.propertyCanonicalOffer?.has(previous)) {
      const canonicalOwner = context.propertyCanonicalOffer.get(previous);
      // A split must not turn a known URL into a different unit merely because that unit's ID
      // sorts first. If attribution is ambiguous or its advert is absent, retain the reservation.
      if (!canonicalOwner || !clusterIds.has(canonicalOwner)) continue;
    }
    if (previous) votes.set(previous, (votes.get(previous) ?? 0) + 1);
  }
  const inherited = [...votes.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key]) => key)
    .find((key) => !claimed.has(key));
  if (inherited) return inherited;

  // An unseen advert can share the address/specification tuple with another unit, while its
  // price keeps the clusters correctly separate. It must not claim that unit's existing URL,
  // even when an hourly run does not include the owner of the URL at all.
  const available = (key: string): boolean => !claimed.has(key) && !reserved.has(key);
  const computed = propertyKey(canonical, cluster);
  if (available(computed)) return computed;
  // Two clusters computing the same key means the identity tuple did not tell them apart. Rather
  // than let one silently overwrite the other, give the second one its own row.
  const oldest = [...cluster].map((item) => item.listingId).sort()[0]!;
  const distinct = `${computed}-${hash(oldest)}`;
  if (available(distinct)) return distinct;
  let suffix = 2;
  while (!available(`${distinct}-${suffix}`)) suffix++;
  return `${distinct}-${suffix}`;
}

/**
 * The date the directory calls "recent". InfoCasas states when an advert was published; MercadoLibre
 * and Marketplace do not, so for those the honest answer is the day it first appeared to US.
 */
export function freshnessOf(offers: RentalOffer[], fallback: string): string {
  const published = offers
    .map((offer) => offer.publishedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  if (published.length) return published[published.length - 1]!;
  const seen = offers
    .map((offer) => offer.firstSeen)
    .filter(Boolean)
    .sort();
  return seen[seen.length - 1] || fallback;
}

function toOffer(listing: Candidate, context: DedupeContext): RentalOffer {
  return {
    identity: {
      version: 1,
      department: listing.department,
      neighborhood: listing.neighborhood,
      address: listing.address,
      street: listing.street,
      streetNumber: listing.streetNumber,
      propertyType: listing.propertyType,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      area: listing.area,
      latitude: listing.latitude,
      longitude: listing.longitude,
    },
    parkingSpaces: listing.parkingSpaces ?? null,
    furnished: listing.furnished === true ? true : null,
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
    petsAllowed: listing.petsAllowed,
    guarantees: listing.guarantees,
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
    .map((listing) => ({
      ...listing,
      priceUyu: priceInPesos(listing.price, listing.currency, context.usdUyu),
    }))
    .sort(
      (a, b) =>
        a.listingId.localeCompare(b.listingId) ||
        a.source.localeCompare(b.source) ||
        completeness(b) - completeness(a) ||
        Number(b.petsAllowed === true) - Number(a.petsAllowed === true) ||
        Number(b.furnished === true) - Number(a.furnished === true) ||
        candidateSignature(a).localeCompare(candidateSignature(b)),
    );

  const buckets = new Map<string, Candidate[][]>();
  const seenOffers = new Set<string>();
  for (const listing of candidates) {
    // A portal can repeat one ID in two searches with different address completeness. Deduplicate
    // before bucketing, or the same advert would be emitted under two property keys.
    const offerId = `${listing.source}|${listing.listingId}`;
    if (seenOffers.has(offerId)) continue;
    seenOffers.add(offerId);
    const key = bucketKey(listing);
    const clusters = buckets.get(key) || [];
    const target = clusters.find((cluster) => cluster.every((member) => sameUnit(member, listing)));
    if (target) target.push(listing);
    else clusters.push([listing]);
    buckets.set(key, clusters);
  }

  const properties: RentalProperty[] = [];
  // A key may only be claimed once per run: if a property SPLITS (two adverts that used to merge
  // no longer do), both halves would otherwise inherit the same key and one would overwrite the
  // other on upsert.
  const claimed = new Set<string>();
  const reserved = new Set([
    ...context.propertyFirstSeen.keys(),
    ...context.offerToProperty.values(),
    ...(context.propertyCanonicalOffer?.keys() ?? []),
  ]);
  for (const clusters of buckets.values()) {
    for (const cluster of clusters) {
      const canonical = [...cluster].sort((a, b) => completeness(b) - completeness(a))[0]!;
      const offers = cluster
        .map((listing) => toOffer(listing, context))
        .sort((a, b) => a.priceUyu - b.priceUyu);
      const cheapest = offers[0]!;
      const key = resolveKey(canonical, cluster, context, claimed, reserved);
      claimed.add(key);
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
        parkingSpaces: cluster.map((item) => item.parkingSpaces).find((value) => value != null) ?? null,
        furnished: cluster.some((item) => item.furnished === true) ? true : null,
        // Basta con que UN portal lo publique. No es optimismo: la ausencia no es una negativa
        // —ningun portal publica "no acepta mascotas"— asi que un `null` no contradice a un `true`,
        // sólo dice que ese aviso no lo menciona.
        petsAllowed: cluster.some((item) => item.petsAllowed === true) ? true : null,
        // Union: que un aviso no nombre ANDA no dice que la inmobiliaria no la acepte.
        guarantees: mergeGuarantees(cluster.map((item) => item.guarantees)),
        priceUyu: cheapest.priceUyu,
        price: cheapest.price,
        currency: cheapest.currency,
        offers,
        sources,
        freshAt: freshnessOf(offers, context.propertyFirstSeen.get(key) || context.today),
        firstSeen:
          context.propertyFirstSeen.get(key) ||
          offers.map((offer) => offer.firstSeen).sort()[0] ||
          context.today,
        lastSeen: context.today,
      });
    }
  }

  return properties.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen) || a.priceUyu - b.priceUyu);
}
