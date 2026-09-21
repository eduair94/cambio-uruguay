// La base de teléfonos: un registro por AVISO publicado, nunca por persona. Qué entra:
//   * "advert_text": lo que el vendedor escribió en el título o la descripción pública de SU aviso;
//   * "dealer_site": el número comercial de la automotora, sólo si el aviso no trae uno propio.
// Facebook nunca (su texto se lee con sesión). Vence a los 21 días de su propia lectura, como en
// viviendas (docs/app/PROPERTY_ADVERTISERS.md). Ver docs/app/AUTOS_CONTACTOS.md.
import { CAR_SOURCES, safeSourcePermalink } from "../sources/registry";
import type { CarListing, CarSellerType, CarSource } from "../types";
import type { DealerContactRecord } from "./dealers";
import { carContactHash } from "./optout";
import { phonesInText, type CarPhone } from "./phones";

export const CAR_CONTACT_MAX_AGE_DAYS = 21;
const MAX_ADVERT_PHONES = 3;

export interface CarContactRecord {
  key: string;
  source: CarSource;
  sellerType: CarSellerType | null;
  origin: "advert_text" | "dealer_site";
  phones: CarPhone[];
  sourceUrl: string;
  observedAt: string;
}

export interface ContactOptions {
  now: Date;
  dealers: ReadonlyMap<CarSource, DealerContactRecord>;
  /** Hashes de los números cuya baja se pidió (./optout.ts). */
  optOuts: ReadonlySet<string>;
}

const fresh = (at: string | null | undefined, now: Date): at is string =>
  !!at && Number.isFinite(Date.parse(at)) && now.getTime() - Date.parse(at) <= CAR_CONTACT_MAX_AGE_DAYS * 86_400_000;

export function carContactFor(listing: CarListing, options: ContactOptions): CarContactRecord | null {
  if (listing.source === "facebook") return null;
  const permalink = safeSourcePermalink(listing.source, listing.permalink);
  if (!permalink) return null;
  const allowed = (phones: readonly CarPhone[]): CarPhone[] => phones.filter(phone => !options.optOuts.has(carContactHash(phone.value)));
  const base = { key: listing.key, source: listing.source, sellerType: listing.sellerType };
  // La descripción se fecha con la lectura de la ficha; el título, con la última lectura del aviso.
  const detail = listing.detail;
  const fromDescription = detail && fresh(detail.readAt, options.now) ? phonesInText(detail.description) : [];
  const fromTitle = fresh(listing.observedAt, options.now) ? phonesInText(listing.title) : [];
  const own = allowed([...new Map([...fromDescription, ...fromTitle].map(phone => [phone.value, phone])).values()])
    .slice(0, MAX_ADVERT_PHONES);
  if (own.length) {
    const observedAt = fromDescription.length ? detail!.readAt : listing.observedAt;
    return { ...base, origin: "advert_text", phones: own, sourceUrl: permalink, observedAt };
  }
  const contactPage = CAR_SOURCES[listing.source].contactPage;
  const dealer = options.dealers.get(listing.source);
  if (listing.sellerType !== "dealer" || !contactPage || dealer?.sourceUrl !== contactPage || !fresh(dealer.observedAt, options.now)) return null;
  const phones = allowed(dealer.phones);
  return phones.length ? { ...base, origin: "dealer_site", phones, sourceUrl: contactPage, observedAt: dealer.observedAt } : null;
}

export function buildCarContacts(listings: readonly CarListing[], options: ContactOptions): CarContactRecord[] {
  return listings
    .map(listing => carContactFor(listing, options))
    .filter((record): record is CarContactRecord => !!record)
    .sort((a, b) => a.key.localeCompare(b.key));
}
