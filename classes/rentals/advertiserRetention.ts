import { publicAdvertiserFields } from "./advertiser";
import { matchText, rentalUnitEvidence } from "./matchEvidence";
import type { RentalAdvertiserFields, RentalOffer, RentalSellerType, RentalSource } from "./types";

export interface AdvertiserPhysicalEvidence {
  title: string; description?: string; address?: string; street?: string; streetNumber?: string;
  department?: string; locality?: string; neighborhood?: string; propertyType?: string;
  bedrooms?: number | null; bathrooms?: number | null; area?: number | null;
}

/** Same source ID is necessary, but explicit reuse for a different physical unit vetoes retention. */
export function compatibleAdvertiserEvidence(a: AdvertiserPhysicalEvidence | null, b: AdvertiserPhysicalEvidence | null): boolean {
  if (!a || !b) return false;
  for (const field of ["department", "locality", "neighborhood", "propertyType", "street", "streetNumber"] as const) {
    if (a[field] && b[field] && matchText(a[field]!) !== matchText(b[field]!)) return false;
  }
  for (const field of ["bedrooms", "bathrooms"] as const) if (a[field] != null && b[field] != null && a[field] !== b[field]) return false;
  if (a.area && b.area && Math.abs(a.area - b.area) > Math.max(2, Math.min(a.area, b.area) * 0.1)) return false;
  if (a.address && b.address && matchText(a.address) !== matchText(b.address) && (!a.street || !b.street || !a.streetNumber || !b.streetNumber)) return false;
  const first = rentalUnitEvidence({ title: `${a.title}\n${a.description || ""}`, address: a.address || "" });
  const second = rentalUnitEvidence({ title: `${b.title}\n${b.description || ""}`, address: b.address || "" });
  for (const field of Object.keys(first) as Array<keyof typeof first>) {
    const x = first[field], y = second[field];
    // Shared building amenities (e.g. ground-floor gym) must not mask third→fourth floor.
    if (x.length && y.length && x.some(value => !y.includes(value)) && y.some(value => !x.includes(value))) return false;
  }
  return true;
}

/** Undefined means uninspected; null means inspected and removed. No group-level inheritance. */
export function retainAdvertiserFields<T extends RentalAdvertiserFields & {
  source: RentalSource; listingId: string; url: string; sellerType?: RentalSellerType; sellerName?: string;
}>(previous: T | undefined, fresh: T, compatible: boolean): T {
  if (!previous || previous.source !== fresh.source || previous.listingId !== fresh.listingId || !compatible) return fresh;
  const sameNativeAgency = previous.agency?.key && previous.agency.key === fresh.agency?.key;
  // Sources without native agency IDs can change the advertiser of an unchanged dwelling.
  // The old telephone/owner declaration is not transferable just because its source ID survived.
  if (!sameNativeAgency && previous.sellerName && fresh.sellerName && matchText(previous.sellerName) !== matchText(fresh.sellerName)) return fresh;
  const next = { ...fresh };
  if (next.agency === undefined && previous.agency !== undefined) next.agency = previous.agency;
  const sameAgency = (next.agency?.key || null) === (previous.agency?.key || null);
  if (next.publicContact === undefined && previous.publicContact !== undefined) next.publicContact = sameAgency ? previous.publicContact : null;
  if (next.ownerDirect === undefined && previous.ownerDirect !== undefined) next.ownerDirect = next.agency || next.sellerType === "inmobiliaria" ? null : previous.ownerDirect;
  return { ...next, ...publicAdvertiserFields(next, { source: next.source, url: next.url, sellerType: next.sellerType }) };
}

export function retainRentalAdvertiser(previous: RentalOffer | undefined, fresh: RentalOffer): RentalOffer {
  const evidence = (row: RentalOffer | undefined): AdvertiserPhysicalEvidence | null => row?.identity?.version === 1
    ? { ...row.identity, title: row.title, description: row.identity.description || row.details?.description } : null;
  return retainAdvertiserFields(previous, fresh, compatibleAdvertiserEvidence(evidence(previous), evidence(fresh)));
}
