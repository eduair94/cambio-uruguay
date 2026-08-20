// Shared shapes for the rental directory (/alquileres-uruguay).
//
// The unit the site publishes is a PROPERTY, not a listing: the same apartment is posted by three
// inmobiliarias on two portals, and showing it three times is the single thing that makes a rental
// aggregator useless. So a `RentalProperty` owns N `RentalOffer`s — one per (source, listingId) —
// exactly like the chair directory owns one product with many seller offers.
//
// Everything here is plain data (no mongoose, no Vue): the app mirrors these types in
// `app/utils/rentals.ts` and the parity test keeps the two schemas in step.

/** Portals we read. `gallito` is deliberately absent — see docs/app/RENTALS.md. */
export type RentalSource = "mercadolibre" | "infocasas" | "facebook";

export const RENTAL_SOURCES: readonly RentalSource[] = ["mercadolibre", "infocasas", "facebook"];

export const RENTAL_SOURCE_LABEL: Record<RentalSource, string> = {
  mercadolibre: "Mercado Libre",
  infocasas: "InfoCasas",
  facebook: "Facebook Marketplace",
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

/** One published advert. Several of these can point at the same physical property. */
export interface RentalOffer {
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
  firstSeen: string;
  lastSeen: string;
}

/** A physical property, as far as we can tell. One row on the site. */
export interface RentalProperty {
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
}

/** Per-source outcome of one run, published so the page can admit a portal is missing. */
export interface RentalSourceRun {
  key: RentalSource;
  ok: boolean;
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
