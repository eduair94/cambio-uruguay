import { createHash } from "node:crypto";
import { freshnessOf, priceInPesos, sameUnit, type RentalMatchCandidate } from "./dedupe";
import { mergeGuarantees } from "./guarantees";
import { matchText, rentalMatchHasConflicts } from "./matchEvidence";
import { inferPropertyType, parseAttributes } from "./normalize";
import { RENTAL_PROPERTY_TYPES, type RentalOffer, type RentalProperty } from "./types";

const offerId = (offer: Pick<RentalOffer, "source" | "listingId">) => `${offer.source}|${offer.listingId}`;
const knownNumber = (value: unknown) =>
  value === null || (typeof value === "number" && Number.isFinite(value));

/** Missing legacy identity is not filled from a property's canonical fields. */
export function offerMatchCandidate(offer: RentalOffer): RentalMatchCandidate | null {
  const identity = offer.identity;
  if (!identity || identity.version !== 1 || !RENTAL_PROPERTY_TYPES.includes(identity.propertyType))
    return null;
  if (
    ![
      identity.department,
      identity.neighborhood,
      identity.address,
      identity.street,
      identity.streetNumber,
    ].every((value) => typeof value === "string")
  )
    return null;
  if (![identity.bedrooms, identity.bathrooms, identity.area].every(knownNumber)) return null;
  if (identity.bedrooms !== null && (!Number.isInteger(identity.bedrooms) || identity.bedrooms < 0))
    return null;
  if (identity.bathrooms !== null && (!Number.isInteger(identity.bathrooms) || identity.bathrooms <= 0))
    return null;
  if (identity.area !== null && identity.area <= 0) return null;
  if (![identity.latitude, identity.longitude].every(knownNumber)) return null;
  if (
    (identity.latitude !== null && Math.abs(identity.latitude) > 90) ||
    (identity.longitude !== null && Math.abs(identity.longitude) > 180)
  )
    return null;
  return {
    source: offer.source,
    listingId: offer.listingId,
    title: offer.title,
    image: offer.image,
    parkingSpaces: offer.parkingSpaces,
    department: identity.department,
    neighborhood: identity.neighborhood,
    address: identity.address,
    street: identity.street,
    streetNumber: identity.streetNumber,
    propertyType: identity.propertyType,
    bedrooms: identity.bedrooms,
    bathrooms: identity.bathrooms,
    area: identity.area,
    priceUyu: offer.priceUyu,
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, field]) => [key, stableValue(field)]),
    );
  return value;
}

/** Keep the latest actual observation; a deterministic tie is independent of Mongo row order. */
function uniqueOffers(offers: readonly RentalOffer[]): RentalOffer[] {
  const ordered = [...offers].sort(
    (a, b) =>
      offerId(a).localeCompare(offerId(b)) ||
      (b.lastSeen || "").localeCompare(a.lastSeen || "") ||
      (a.firstSeen || "").localeCompare(b.firstSeen || "") ||
      JSON.stringify(stableValue(a)).localeCompare(JSON.stringify(stableValue(b))),
  );
  const seen = new Set<string>();
  return ordered.filter((offer) => {
    const id = offerId(offer);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** Lossless apart from repeated IDs: every distinct advert belongs to exactly one all-pairs group. */
export function partitionRentalOffers(offers: readonly RentalOffer[], usdUyu = 0): RentalOffer[][] {
  const groups: RentalOffer[][] = [];
  const candidates = new Map<RentalOffer, RentalMatchCandidate>();
  for (const offer of uniqueOffers(offers)) {
    const candidate = offerMatchCandidate(offer);
    if (!candidate) {
      groups.push([offer]);
      continue;
    }
    if (Number.isFinite(usdUyu) && usdUyu > 0)
      candidate.priceUyu = priceInPesos(offer.price, offer.currency, usdUyu);
    candidates.set(offer, candidate);
    const group = groups.find((members) =>
      members.every((member) => {
        const other = candidates.get(member);
        return other !== undefined && sameUnit(candidate, other);
      }),
    );
    if (group) group.push(offer);
    else groups.push([offer]);
  }
  return groups;
}

/** An advert's detached URL does not depend on someone else's address, price or canonical title. */
export function detachedRentalKey(offer: Pick<RentalOffer, "source" | "listingId">): string {
  return `rental-advert-${createHash("sha256")
    .update(JSON.stringify([offer.source, offer.listingId]))
    .digest("hex")}`;
}

function evidenceQuality(offer: RentalOffer): number {
  const identity = offerMatchCandidate(offer);
  if (!identity) return 0;
  return (
    20 +
    Number(Boolean(identity.address && identity.street && identity.streetNumber)) * 6 +
    Number(Boolean(identity.neighborhood)) * 2 +
    Number(identity.bedrooms !== null) * 2 +
    Number(identity.bathrooms !== null) +
    Number(identity.area !== null) +
    Number(offer.identity!.latitude !== null && offer.identity!.longitude !== null)
  );
}

/** Rebuild a previously partitioned property without changing observation dates or original evidence. */
export function propertyFromRentalOffers(
  key: string,
  offers: readonly RentalOffer[],
  usdUyu: number,
  previous?: RentalProperty,
): RentalProperty {
  if (!offers.length) throw new Error("Cannot reconstruct a rental property without adverts");
  const current = uniqueOffers(offers).map((offer) => ({
    ...offer,
    // Cleanup without a new rate preserves the observed conversion; a real rate re-expresses
    // every offer on that one basis, including peso rents whose historical field was wrong.
    priceUyu:
      Number.isFinite(usdUyu) && usdUyu > 0
        ? priceInPesos(offer.price, offer.currency, usdUyu)
        : offer.priceUyu,
  }));
  const byQuality = [...current].sort(
    (a, b) => evidenceQuality(b) - evidenceQuality(a) || offerId(a).localeCompare(offerId(b)),
  );
  const previousTitle = matchText(previous?.title || "");
  const previousOffers = Array.isArray(previous?.offers) ? previous.offers : [];
  const titleOwners = previousTitle
    ? current.filter((offer) => matchText(offer.title) === previousTitle)
    : [];
  const originalTitleOwners = previousTitle
    ? previousOffers.filter((offer) => matchText(offer.title) === previousTitle)
    : [];
  const retainedCanonical =
    titleOwners.length === 1 &&
    originalTitleOwners.length === 1 &&
    offerId(titleOwners[0]!) === offerId(originalTitleOwners[0]!)
      ? titleOwners[0]
      : undefined;
  // A complete actual identity outranks legacy presentation, even if the old title was preferred.
  const canonical =
    retainedCanonical && offerMatchCandidate(retainedCanonical) ? retainedCanonical : byQuality[0]!;
  const identity = offerMatchCandidate(canonical);
  // A previous cleanup may already have reduced a bad multi-offer merge to one advert. Even
  // singleton presentation must agree with that advert's title and explicit specifications.
  // This limited preservation never creates identity evidence or authorizes a future match.
  const previousPresentationAgrees =
    previous &&
    matchText(previous.title) === matchText(canonical.title) &&
    !rentalMatchHasConflicts({
      source: canonical.source,
      listingId: canonical.listingId,
      title: canonical.title,
      image: canonical.image,
      priceUyu: canonical.priceUyu,
      parkingSpaces: canonical.parkingSpaces,
      propertyType: previous.propertyType,
      department: previous.department,
      neighborhood: previous.neighborhood,
      address: previous.address,
      street: "",
      streetNumber: "",
      bedrooms: previous.bedrooms,
      bathrooms: previous.bathrooms,
      area: previous.area,
    });
  const safePrevious =
    !identity &&
    previousPresentationAgrees &&
    current.length === 1 &&
    previousOffers.length === 1 &&
    offerId(previousOffers[0]!) === offerId(canonical)
      ? previous
      : undefined;
  const parsed = parseAttributes([canonical.title]);
  const evidence = [canonical, ...byQuality.filter((offer) => offer !== canonical)]
    .map(offerMatchCandidate)
    .filter((value): value is RentalMatchCandidate => value !== null);
  const attribute = (name: "bedrooms" | "bathrooms" | "area") =>
    identity
      ? (evidence.find((value) => value[name] !== null)?.[name] ?? null)
      : (safePrevious?.[name] ?? parsed[name]);
  const firstSeen =
    [...current.map((offer) => offer.firstSeen), ...(previous?.key === key ? [previous.firstSeen] : [])]
      .filter(Boolean)
      .sort()[0] || "";
  const lastSeenDates = current
    .map((offer) => offer.lastSeen)
    .filter(Boolean)
    .sort();
  const lastSeen = lastSeenDates[lastSeenDates.length - 1] || "";
  const sortedOffers = [...current].sort((a, b) => {
    const priceA = Number.isFinite(a.priceUyu) && a.priceUyu > 0 ? a.priceUyu : Number.POSITIVE_INFINITY;
    const priceB = Number.isFinite(b.priceUyu) && b.priceUyu > 0 ? b.priceUyu : Number.POSITIVE_INFINITY;
    return priceA - priceB || offerId(a).localeCompare(offerId(b));
  });
  const cheapest = sortedOffers[0]!;
  const department = identity?.department ?? safePrevious?.department ?? "";
  const street = identity?.street ?? "";
  const number = identity?.streetNumber ?? "";
  return {
    key,
    title: canonical.title,
    propertyType: identity?.propertyType ?? safePrevious?.propertyType ?? inferPropertyType(canonical.title),
    department,
    neighborhood: identity?.neighborhood ?? safePrevious?.neighborhood ?? "",
    address: identity?.address ?? safePrevious?.address ?? "",
    addressKey:
      identity && street && number
        ? `addr|${matchText(department)}|${matchText(street)}|${number}`
        : (safePrevious?.addressKey ?? `solo|${offerId(canonical)}`),
    latitude: identity ? canonical.identity!.latitude : (safePrevious?.latitude ?? null),
    longitude: identity ? canonical.identity!.longitude : (safePrevious?.longitude ?? null),
    bedrooms: attribute("bedrooms"),
    bathrooms: attribute("bathrooms"),
    area: attribute("area"),
    parkingSpaces: current.find((offer) => offer.parkingSpaces != null)?.parkingSpaces ?? null,
    furnished: current.some((offer) => offer.furnished === true) ? true : null,
    petsAllowed: current.some((offer) => offer.petsAllowed === true) ? true : null,
    guarantees: mergeGuarantees(current.map((offer) => offer.guarantees)),
    priceUyu: cheapest.priceUyu,
    price: cheapest.price,
    currency: cheapest.currency,
    offers: sortedOffers,
    sources: [...new Set(sortedOffers.map((offer) => offer.source))],
    freshAt: freshnessOf(sortedOffers, firstSeen),
    firstSeen,
    lastSeen,
  };
}
