import { describe, expect, it } from "vitest";
import { garageAfter, garageHash, garageSkipReason, makeGaragePlan } from "../../scripts/oneoff/backfill_rental_garages";

const row = () => ({
  key: "montevideo-cordon-one-garage", title: "Alquiler de garaje en Cordón", propertyType: "otro",
  bedrooms: null, bathrooms: null, firstSeen: "2026-08-20", lastSeen: "2026-09-07", freshAt: "2026-08-20",
  updatedAt: new Date("2026-09-07T06:00:00Z"),
  offers: [{ source: "infocasas", listingId: "infocasas:123", title: "Cochera en alquiler", firstSeen: "2026-08-20", lastSeen: "2026-09-07",
    identity: { version: 1, propertyType: "otro", bedrooms: null, bathrooms: null, description: "Cochera cubierta, lugar fijo" },
    publicContact: { telephone: "private-fixture" } }],
});

describe("reviewed historical garage classification", () => {
  it("changes exactly two type fields, preserving dates, contact, advert IDs and the original object", () => {
    const before = row();
    const after = garageAfter(before);
    expect(garageSkipReason(before)).toBeNull();
    expect(after.updatedAt).toEqual(before.updatedAt);
    expect(after.offers[0].lastSeen).toBe(before.offers[0].lastSeen);
    expect(after.offers[0].identity.propertyType).toBe("garaje");
    expect(before.offers[0].identity.propertyType).toBe("otro");
    const reversed = { ...after, propertyType: "otro", offers: [{ ...after.offers[0], identity: { ...after.offers[0].identity, propertyType: "otro" } }] };
    expect(reversed).toEqual(before);
    expect(garageHash(reversed)).toBe(garageHash(before));
  });

  it("requires both independent titles, one offer and its own versioned other-type evidence", () => {
    const before = row();
    for (const candidate of [
      { ...before, propertyType: "casa" }, { ...before, title: "Casa con garage" },
      { ...before, offers: [...before.offers, ...before.offers] },
      { ...before, offers: [{ ...before.offers[0], title: "Apartamento con garaje" }] },
      { ...before, offers: [{ ...before.offers[0], identity: undefined }] },
      { ...before, offers: [{ ...before.offers[0], identity: { ...before.offers[0].identity, propertyType: "casa" } }] },
    ]) expect(garageSkipReason(candidate)).not.toBeNull();
  });

  it("abstains on conflicting quantities, office/residential descriptions and amenities", () => {
    const before = row();
    for (const candidate of [
      { ...before, bedrooms: 1 }, { ...before, bathrooms: 1 }, { ...before, furnished: true },
      { ...before, offers: [{ ...before.offers[0], identity: { ...before.offers[0].identity, bedrooms: 2 } }] },
      { ...before, offers: [{ ...before.offers[0], details: { description: "Con cocina y living" } }] },
    ]) expect(garageSkipReason(candidate)).not.toBeNull();
  });

  it("binds the hash to the entire original record and identifies every skipped reason", () => {
    const first = row();
    const plan = makeGaragePlan([first, { ...row(), key: "another-home", bedrooms: 2 }]);
    expect(plan.before).toHaveLength(1);
    expect(plan.skipped).toEqual({ conflicting_bedrooms: 1 });
    expect(makeGaragePlan([{ ...first, lastSeen: "2026-09-08" }]).planHash).not.toBe(plan.planHash);
    expect(makeGaragePlan([{ ...first, offers: [{ ...first.offers[0], listingId: "changed" }] }]).planHash).not.toBe(plan.planHash);
  });
});
