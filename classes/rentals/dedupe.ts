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
import { mergeGuarantees } from "./guarantees";
import type { RawRental, RentalOffer, RentalProperty, RentalPropertyType, RentalSource } from "./types";

/** How complete a source's rows tend to be — used only to pick which row names the property. */
const SOURCE_RANK: Record<RentalSource, number> = { infocasas: 4, elpais: 3, mercadolibre: 2, casasweb: 2, facebook: 1 };

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
}

export function priceInPesos(price: number, currency: string, usdUyu: number): number {
  return currency === "USD" ? Math.round(price * usdUyu) : Math.round(price);
}

const ratio = (a: number, b: number): number => (a <= 0 || b <= 0 ? 0 : Math.min(a, b) / Math.max(a, b));

/**
 * Types that are the same kind of thing for merging purposes.
 *
 * `casa` y `apartamento` estaban en la MISMA familia y no lo son. Auditando los merges reales del
 * 2026-09-03 apareció "ALQUILER CASA CARRASCO 3 DORMITORIOS, GRAN JARDÍN" unificada con "Alquiler
 * Apartamento Carrasco Norte 3 Dormitorios": mismo barrio, mismos dormitorios, precio parecido, y
 * dos propiedades distintas presentadas como una. Un aviso que dice casa y otro que dice
 * apartamento se están describiendo a sí mismos; discreparle es inventar.
 *
 * `local` y `oficina` sí siguen juntos: los portales los usan casi indistintamente para el mismo
 * inmueble comercial, y ahí el propio dato es ambiguo.
 */
const TYPE_FAMILY: Record<RentalPropertyType, string> = {
  apartamento: "apartamento",
  casa: "casa",
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
  // SIN barrio y SIN calle no hay dónde comparar: el balde queda por aviso.
  //
  // Antes era `depto|<departamento>|<familia>`, o sea TODO Montevideo en un solo balde, y con eso
  // alcanzaba que dos avisos coincidieran en dormitorios y precio para unirse. Auditado el
  // 2026-09-03: una sola fila juntaba NUEVE avisos —"Casa en alquiler con cochera 2 dormitorios",
  // "Apartamento 2 Dormitorios Malvín", "Alquiler apartamento 2 dormitorios La Unión", "…Buceo"—
  // que son nueve propiedades en barrios distintos. Un departamento entero no es una ubicación.
  return `solo|${listing.listingId}`;
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
  // Los baños se leían y no se comparaban nunca. Es el mismo argumento que los dormitorios: si los
  // dos avisos dicen cuántos baños tiene y dicen distinto, se están describiendo a sí mismos y no
  // coinciden. Sólo descalifica cuando AMBOS lo publican; ausente no contradice nada.
  if (a.bathrooms !== null && b.bathrooms !== null && a.bathrooms !== b.bathrooms) return false;
  if (a.parkingSpaces != null && b.parkingSpaces != null && a.parkingSpaces !== b.parkingSpaces) return false;

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

/**
 * The key this cluster should keep. Inherited from the adverts it already contains when possible —
 * that is what survives a canonical row disappearing — and only computed from scratch for a
 * property nobody has seen before.
 */
export function resolveKey(
  canonical: Candidate,
  cluster: Candidate[],
  context: DedupeContext,
  claimed: Set<string>
): string {
  // Which stored key do most of these adverts belong to? Counting (rather than taking the first)
  // matters when two properties merge for the first time: the bigger half keeps its identity.
  const votes = new Map<string, number>();
  for (const listing of cluster) {
    const previous = context.offerToProperty.get(listing.listingId);
    if (previous) votes.set(previous, (votes.get(previous) ?? 0) + 1);
  }
  const inherited = [...votes.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key]) => key)
    .find((key) => !claimed.has(key));
  if (inherited) return inherited;

  const computed = propertyKey(canonical, cluster);
  if (!claimed.has(computed)) return computed;
  // Two clusters computing the same key means the identity tuple did not tell them apart. Rather
  // than let one silently overwrite the other, give the second one its own row.
  const oldest = [...cluster].map((item) => item.listingId).sort()[0]!;
  return `${computed}-${hash(oldest)}`;
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
  const seen = offers.map((offer) => offer.firstSeen).filter(Boolean).sort();
  return seen[seen.length - 1] || fallback;
}

function toOffer(listing: Candidate, context: DedupeContext): RentalOffer {
  return {
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
  // A key may only be claimed once per run: if a property SPLITS (two adverts that used to merge
  // no longer do), both halves would otherwise inherit the same key and one would overwrite the
  // other on upsert.
  const claimed = new Set<string>();
  for (const clusters of buckets.values()) {
    for (const cluster of clusters) {
      const canonical = [...cluster].sort((a, b) => completeness(b) - completeness(a))[0]!;
      const offers = cluster
        .map((listing) => toOffer(listing, context))
        .sort((a, b) => a.priceUyu - b.priceUyu);
      const cheapest = offers[0]!;
      const key = resolveKey(canonical, cluster, context, claimed);
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
        firstSeen: context.propertyFirstSeen.get(key) || offers.map((offer) => offer.firstSeen).sort()[0] || context.today,
        lastSeen: context.today,
      });
    }
  }

  return properties.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen) || a.priceUyu - b.priceUyu);
}
