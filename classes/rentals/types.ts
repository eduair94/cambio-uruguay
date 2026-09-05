import type { RentalGuarantee } from "./guarantees";

// Shared shapes for the rental directory (/alquileres-uruguay).
//
// The unit the site publishes is a PROPERTY, not a listing: the same apartment is posted by three
// inmobiliarias on two portals, and showing it three times is the single thing that makes a rental
// aggregator useless. So a `RentalProperty` owns N `RentalOffer`s — one per (source, listingId) —
// exactly like the chair directory owns one product with many seller offers.
//
// Everything here is plain data (no mongoose, no Vue): the app mirrors these types in
// `app/utils/rentals.ts` and the parity test keeps the two schemas in step.

/** Portals we read. Coverage limitations are published in the per-source run note. */
export type RentalSource = "mercadolibre" | "infocasas" | "facebook" | "casasweb" | "elpais";

export const RENTAL_SOURCES: readonly RentalSource[] = ["mercadolibre", "infocasas", "facebook", "casasweb", "elpais"];

export const RENTAL_SOURCE_LABEL: Record<RentalSource, string> = {
  mercadolibre: "Mercado Libre",
  infocasas: "InfoCasas",
  facebook: "Facebook Marketplace",
  casasweb: "Casasweb",
  elpais: "Inmuebles El País",
};

/**
 * What kind of thing is being rented. Kept coarse on purpose: the portals disagree about the
 * long tail (`penthouse`, `dúplex`, `monoambiente`) and a filter nobody can reason about is worse
 * than no filter. `otro` is the honest bucket, never a guess.
 */
export type RentalPropertyType = "apartamento" | "casa" | "habitacion" | "local" | "oficina" | "terreno" | "otro";

export const RENTAL_PROPERTY_TYPES: readonly RentalPropertyType[] = [
  "apartamento",
  "casa",
  "habitacion",
  "local",
  "oficina",
  "terreno",
  "otro",
];

/** Who is publishing: an agency, a private owner, or unknown. */
export type RentalSellerType = "inmobiliaria" | "particular" | "desconocido";

export type RentalCurrency = "UYU" | "USD";

/** Original, per-advert facts. Never reconstructed from the merged property's attributes. */
export interface RentalOfferIdentity {
  version: 1;
  propertyType: RentalPropertyType;
  department: string;
  neighborhood: string;
  address: string;
  street: string;
  streetNumber: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
}

/** One published advert. Several of these can point at the same physical property. */
export interface RentalOffer {
  /** Absent on legacy records; absence cannot be used as evidence that two units match. */
  identity?: RentalOfferIdentity;
  /** Explicit count only; null means the publisher does not state it. */
  parkingSpaces: number | null;
  /** A positive published amenity; absence is not an unfurnished claim. */
  furnished: true | null;
  source: RentalSource;
  /** `<source>:<id>` — stable across runs, the upsert key inside a property. */
  listingId: string;
  url: string;
  title: string;
  price: number;
  currency: RentalCurrency;
  /** Rent expressed in pesos with the run's USD rate, so two portals can be compared. */
  priceUyu: number;
  /** Gastos comunes when the portal states them; `null` means "not published", never zero. */
  commonExpenses: number | null;
  commonExpensesCurrency: RentalCurrency | null;
  sellerName: string;
  sellerType: RentalSellerType;
  image: string | null;
  /** ISO date (YYYY-MM-DD) the portal says the advert was published, when it says so. */
  publishedAt: string | null;
  /**
   * Does the advert SAY pets are allowed?
   *
   * `true` only when the portal publishes it as STRUCTURED data: InfoCasas facility 222, or
   * MercadoLibre's IS_SUITABLE_FOR_PETS search filter. `null` is "the advert does not say", which
   * is most of them.
   *
   * The type is `true | null` and NOT `boolean | null` ON PURPOSE: no source publishes the
   * negative, so a `false` cannot be derived from any measurement.
   *   * InfoCasas: 44 distinct facilities observed over 210 adverts (2026-09-04) and none is a
   *     negative — the neighbour of 222 is 225 "Se aceptan grupos de jóvenes". And
   *     `facilitiesNotApply` does NOT negate it: it is an advert-level boolean, and 12 adverts
   *     carry it `true` AND carry facility 222.
   *   * MercadoLibre: the filter has ONE value (242085 = "Admite mascotas"). There is no opposite
   *     bucket.
   *   * Facebook: publishes no such field at all.
   * Leaving `false` out of the type turns writing it into a compile error instead of an invented
   * figure. The opposite of `true` here is "we do not know", and it has to be shown that way.
   */
  petsAllowed: true | null;
  /**
   * Tipos de garantía de alquiler que el aviso dice aceptar.
   *
   * Lista VACÍA = el aviso no lo dice, que es la mitad de ellos. NUNCA significa "no acepta
   * ninguna": ningún portal publica la negativa. Ver `guarantees.ts` para de dónde sale y por qué
   * se ancla en el sustantivo.
   */
  guarantees: RentalGuarantee[];
  firstSeen: string;
  lastSeen: string;
}

/** A physical property, as far as we can tell. One row on the site. */
export interface RentalProperty {
  parkingSpaces: number | null;
  furnished: true | null;
  /** Deterministic id derived from the dedupe key — stable while the property stays published. */
  key: string;
  title: string;
  propertyType: RentalPropertyType;
  department: string;
  neighborhood: string;
  /** Street + number as published, normalised for display (never invented). */
  address: string;
  /** The normalised key the dedupe actually joined on — kept for debugging a bad merge. */
  addressKey: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  /** Built area in m². */
  area: number | null;
  /**
   * Does the advert SAY pets are allowed?
   *
   * `true` only when the portal publishes it as STRUCTURED data: InfoCasas facility 222, or
   * MercadoLibre's IS_SUITABLE_FOR_PETS search filter. `null` is "the advert does not say", which
   * is most of them.
   *
   * The type is `true | null` and NOT `boolean | null` ON PURPOSE: no source publishes the
   * negative, so a `false` cannot be derived from any measurement.
   *   * InfoCasas: 44 distinct facilities observed over 210 adverts (2026-09-04) and none is a
   *     negative — the neighbour of 222 is 225 "Se aceptan grupos de jóvenes". And
   *     `facilitiesNotApply` does NOT negate it: it is an advert-level boolean, and 12 adverts
   *     carry it `true` AND carry facility 222.
   *   * MercadoLibre: the filter has ONE value (242085 = "Admite mascotas"). There is no opposite
   *     bucket.
   *   * Facebook: publishes no such field at all.
   * Leaving `false` out of the type turns writing it into a compile error instead of an invented
   * figure. The opposite of `true` here is "we do not know", and it has to be shown that way.
   */
  petsAllowed: true | null;
  /**
   * Tipos de garantía de alquiler que el aviso dice aceptar.
   *
   * Lista VACÍA = el aviso no lo dice, que es la mitad de ellos. NUNCA significa "no acepta
   * ninguna": ningún portal publica la negativa. Ver `guarantees.ts` para de dónde sale y por qué
   * se ancla en el sustantivo.
   */
  guarantees: RentalGuarantee[];
  /** Cheapest offer, in pesos — what the list sorts and filters by. */
  priceUyu: number;
  /** The same price in the currency the cheapest offer was published in. */
  price: number;
  currency: RentalCurrency;
  offers: RentalOffer[];
  /** How many DIFFERENT portals publish it. `>1` is the dedupe payoff the page shows. */
  sources: RentalSource[];
  /**
   * The date "más recientes" sorts by: the portal's own publication date when any advert states
   * one, else the day we first saw it. Stored rather than computed at read time because sorting
   * tens of thousands of rows by a derived value is the one thing Mongo cannot index.
   */
  freshAt: string;
  firstSeen: string;
  lastSeen: string;
}

/**
 * One advert as a harvester read it, before anything is merged. Flat on purpose: the dedupe needs
 * the location parts beside the price, and a nested shape would only be unwrapped again.
 */
export interface RawRental {
  parkingSpaces: number | null;
  furnished: true | null;
  source: RentalSource;
  listingId: string;
  url: string;
  title: string;
  price: number;
  currency: RentalCurrency;
  commonExpenses: number | null;
  commonExpensesCurrency: RentalCurrency | null;
  sellerName: string;
  sellerType: RentalSellerType;
  image: string | null;
  publishedAt: string | null;
  propertyType: RentalPropertyType;
  department: string;
  neighborhood: string;
  address: string;
  street: string;
  streetNumber: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  /**
   * Does the advert SAY pets are allowed?
   *
   * `true` only when the portal publishes it as STRUCTURED data: InfoCasas facility 222, or
   * MercadoLibre's IS_SUITABLE_FOR_PETS search filter. `null` is "the advert does not say", which
   * is most of them.
   *
   * The type is `true | null` and NOT `boolean | null` ON PURPOSE: no source publishes the
   * negative, so a `false` cannot be derived from any measurement.
   *   * InfoCasas: 44 distinct facilities observed over 210 adverts (2026-09-04) and none is a
   *     negative — the neighbour of 222 is 225 "Se aceptan grupos de jóvenes". And
   *     `facilitiesNotApply` does NOT negate it: it is an advert-level boolean, and 12 adverts
   *     carry it `true` AND carry facility 222.
   *   * MercadoLibre: the filter has ONE value (242085 = "Admite mascotas"). There is no opposite
   *     bucket.
   *   * Facebook: publishes no such field at all.
   * Leaving `false` out of the type turns writing it into a compile error instead of an invented
   * figure. The opposite of `true` here is "we do not know", and it has to be shown that way.
   */
  petsAllowed: true | null;
  /**
   * Tipos de garantía de alquiler que el aviso dice aceptar.
   *
   * Lista VACÍA = el aviso no lo dice, que es la mitad de ellos. NUNCA significa "no acepta
   * ninguna": ningún portal publica la negativa. Ver `guarantees.ts` para de dónde sale y por qué
   * se ancla en el sustantivo.
   */
  guarantees: RentalGuarantee[];
}

/** Per-source outcome of one run, published so the page can admit a portal is missing. */
export interface RentalSourceRun {
  key: RentalSource;
  ok: boolean;
  /** An external directory without an authorized automated integration, not a transient outage. */
  access?: "external_only";
  listings: number;
  note: string;
}

/** One document: what the last run did. Mirrors ChairCatalogMeta. */
export interface RentalMeta {
  key: string;
  generatedAt: string;
  /** `full` walked every page; `fast` only read what the portals sort as newest. */
  mode: "full" | "fast";
  durationMs: number;
  usdUyu: number;
  properties: number;
  offers: number;
  /** Properties published by more than one portal — the headline dedupe number. */
  merged: number;
  sources: RentalSourceRun[];
}

export const RENTAL_META_KEY = "uy-rentals";
