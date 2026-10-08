// The coordinate of a property whose search card has none, from the map on its advert's own page.
//
// Two portals publish a usable pin only there: Mercado Libre (`currency-rentals-ml-detail`,
// mlDetail.ts) and Casasweb (`currency-rentals-casasweb-detail`, casaswebDetail.ts). Each job keeps
// what it read in its own collection, and the harvest puts the point back on every run, because the
// properties are rebuilt from the cards and the save would otherwise blank it. Both pins were
// measured before being believed — the Marketplace pin turned out to be a ~1 km grid, not the home
// (see docs/app/RENTALS.md).
//
// The point is only ever written on a property WITHOUT one: a coordinate another portal published
// (InfoCasas, El País) is never moved. And it is applied after the dedupe, never on the raw advert,
// where it would add completeness and change which advert is canonical in a multi-portal group.
//
// It also goes on the private `identity` of the advert whose page gave it, as the Facebook detail
// does. "La vida cerca de esta vivienda" only measures distances from a point that an advert of the
// property published (`rentalNearbyOrigin`, app/utils/propertyNearby.ts); without this the first
// 120 Mercado Libre properties placed on 2026-10-08 showed on the map and still said "this advert
// does not publish a location". Coordinates prove nothing about unit identity in the dedupe, so the
// field changes no merge.
import { appConnection } from "../appdb";
import type { RentalProperty, RentalSource } from "./types";

export interface RentalPin {
  latitude: number;
  longitude: number;
}

// The rectangle around Uruguay also holds Buenos Aires; south of -34.3 the Uruguayan coast ends at
// Colonia del Sacramento (-57.85), and anything further west is across the river.
export const inUruguay = (lat: number, lng: number): boolean =>
  lat >= -35.1 && lat <= -30 && lng >= -58.6 && lng <= -53 && (lat > -34.3 || lng >= -58);
/** Montevideo's department, with a margin: a pin outside it cannot be a Montevideo advert. */
const inMontevideo = (lat: number, lng: number): boolean => lat >= -34.96 && lat <= -34.69 && lng >= -56.45 && lng <= -56.0;

/** Whether a pin may locate a property of that department: Montevideo's must fall inside it. */
export function pinFits(pin: RentalPin, department: string): boolean {
  if (!inUruguay(pin.latitude, pin.longitude)) return false;
  return department !== "Montevideo" || inMontevideo(pin.latitude, pin.longitude);
}

/** The detail collections, in the order their pin wins when a property carries adverts of both. */
export const PIN_SOURCES: ReadonlyArray<{ source: RentalSource; collection: string }> = Object.freeze([
  { source: "mercadolibre", collection: "rentalmldetails" },
  { source: "casasweb", collection: "rentalcasaswebdetails" },
]);

/**
 * The pin of a property without a coordinate, from the pages of its adverts of one portal. With
 * several adverts of that portal (the dedupe found them to be one unit) the lowest listing id
 * decides, so the point does not hop between runs.
 */
export function pinFor(
  property: Pick<RentalProperty, "department" | "latitude" | "offers">,
  pins: ReadonlyMap<string, RentalPin>,
  source: RentalSource
): RentalPin | null {
  return pinOf(property, pins, source)?.pin ?? null;
}

function pinOf(
  property: Pick<RentalProperty, "department" | "latitude" | "offers">,
  pins: ReadonlyMap<string, RentalPin>,
  source: RentalSource
): { listingId: string; pin: RentalPin } | null {
  if (typeof property.latitude === "number") return null;
  const ids = property.offers
    .filter(offer => offer.source === source && pins.has(offer.listingId))
    .map(offer => offer.listingId)
    .sort();
  for (const listingId of ids) {
    const pin = pins.get(listingId)!;
    if (pinFits(pin, property.department)) return { listingId, pin };
  }
  return null;
}

/** Places the property and records the point on the identity of the advert that published it. */
export function placeProperty(property: Pick<RentalProperty, "latitude" | "longitude" | "offers">, listingId: string, pin: RentalPin): void {
  property.latitude = pin.latitude;
  property.longitude = pin.longitude;
  const identity = property.offers.find(offer => offer.listingId === listingId)?.identity;
  if (identity?.version === 1 && typeof identity.latitude !== "number") {
    identity.latitude = pin.latitude;
    identity.longitude = pin.longitude;
  }
}

/**
 * Puts a pin on the stored property right away — only when its coordinate is empty. The harvest
 * keeps it afterwards (`applyDetailPins`).
 */
export async function writeDetailPin(target: { key: string; department: string; listingId: string }, pin: RentalPin): Promise<boolean> {
  if (!pinFits(pin, target.department)) return false;
  const result = await appConnection()
    .collection("rentallistings")
    .updateOne(
      // The same point again completes an advert identity written before it carried the point.
      { key: target.key, $or: [{ latitude: null }, { latitude: pin.latitude, longitude: pin.longitude }] },
      {
        $set: {
          latitude: pin.latitude,
          longitude: pin.longitude,
          "offers.$[o].identity.latitude": pin.latitude,
          "offers.$[o].identity.longitude": pin.longitude,
        },
      },
      { arrayFilters: [{ "o.listingId": target.listingId, "o.identity.version": 1 }] }
    );
  return result.modifiedCount > 0;
}

/**
 * The harvest's half: properties are rebuilt from the search cards every run, and the cards carry
 * no coordinate, so without this the save would blank what the advert pages gave. Runs after the
 * dedupe. Returns how many properties each portal located.
 */
export async function applyDetailPins(properties: RentalProperty[]): Promise<Partial<Record<RentalSource, number>>> {
  const located: Partial<Record<RentalSource, number>> = {};
  for (const { source, collection } of PIN_SOURCES) {
    const ids = [
      ...new Set(
        properties
          .filter(property => typeof property.latitude !== "number")
          .flatMap(property => property.offers.filter(offer => offer.source === source).map(offer => offer.listingId))
      ),
    ];
    if (!ids.length) continue;
    const pins = new Map<string, RentalPin>();
    for (let i = 0; i < ids.length; i += 5_000) {
      const docs = await appConnection()
        .collection(collection)
        .find(
          { listingId: { $in: ids.slice(i, i + 5_000) }, latitude: { $type: "number" }, longitude: { $type: "number" } },
          { projection: { _id: 0, listingId: 1, latitude: 1, longitude: 1 } }
        )
        .toArray();
      for (const doc of docs) pins.set(String(doc.listingId), { latitude: Number(doc.latitude), longitude: Number(doc.longitude) });
    }
    for (const property of properties) {
      const found = pinOf(property, pins, source);
      if (!found) continue;
      placeProperty(property, found.listingId, found.pin);
      located[source] = (located[source] ?? 0) + 1;
    }
  }
  return located;
}
