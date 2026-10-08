import { describe, expect, it } from "vitest";
import { rentalNearbyOrigin } from "../../app/utils/propertyNearby";
import { placeProperty } from "../../classes/rentals/detailPins";
import type { RentalOfferIdentity, RentalProperty } from "../../classes/rentals/types";

// The first 120 Mercado Libre properties placed on 2026-10-08 showed on the map and still said, in
// "La vida cerca de esta vivienda", that the advert published no location: the nearby block only
// measures from a point that an advert of the property published (its private identity).
const identity = (over: Partial<RentalOfferIdentity> = {}): RentalOfferIdentity => ({
  version: 1,
  propertyType: "apartamento",
  department: "Montevideo",
  neighborhood: "Pocitos",
  address: "Gabriel Pereira 3000 - 3300",
  street: "gabriel pereira 3000 - 3300",
  streetNumber: "",
  latitude: null,
  longitude: null,
  bedrooms: null,
  bathrooms: 1,
  area: 35,
  ...over,
});
const property = (offers: Array<{ listingId: string; identity?: RentalOfferIdentity }>) =>
  ({ latitude: null, longitude: null, offers }) as unknown as Pick<RentalProperty, "latitude" | "longitude" | "offers">;
const pin = { latitude: -34.9102673, longitude: -56.1471486 };

describe("a pin from an advert's page", () => {
  it("places the property on the point its advert published, so the nearby block can measure from it", () => {
    const row = property([{ listingId: "mercadolibre:MLU1", identity: identity() }]);
    expect(rentalNearbyOrigin(row)).toBeNull();
    placeProperty(row, "mercadolibre:MLU1", pin);
    expect(row.latitude).toBe(pin.latitude);
    expect(row.offers[0]!.identity).toMatchObject(pin);
    expect(rentalNearbyOrigin(row)).toMatchObject({ lat: pin.latitude, lng: pin.longitude });
  });

  it("writes only the identity of the advert that gave the point, and never a legacy one", () => {
    const row = property([
      { listingId: "infocasas:7", identity: identity() },
      { listingId: "mercadolibre:MLU1", identity: identity() },
      { listingId: "mercadolibre:MLU2" },
    ]);
    placeProperty(row, "mercadolibre:MLU1", pin);
    expect(row.offers[0]!.identity!.latitude).toBeNull();
    expect(row.offers[1]!.identity!.latitude).toBe(pin.latitude);
    expect(row.offers[2]!.identity).toBeUndefined();
  });
});
