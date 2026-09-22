// Internal shapes of the used-car directory (/autos-usados-uruguay). Public wire shapes live in
// ./publicTypes.ts; nothing here is served as-is.
import type { CarBody } from "./bodyType";
import type { CarFuelEconomy } from "./fuelEconomy";
import type { CarPhotoVerdict } from "./llm/vision";
export type CarCurrency = "USD" | "UYU";
export type CarTransmission = "manual" | "automatica";
export type CarFuel = "nafta" | "diesel" | "electrico" | "hibrido" | "gnc";
export type CarSellerType = "dealer" | "private";
export type CarKmQuality = "ok" | "placeholder" | "unknown";
export type CarTextFlag = "damaged" | "financing" | "foreign_plate" | "paperwork" | "price_mismatch" | "recovered";
export type CarSource =
  | "mercadolibre" | "facebook" | "clasiautos" | "julio" | "shoppingdeautos" | "carper" | "fidocar" | "carone"
  | "motorlider" | "duenodirecto";

export interface RawCarListing {
  id: string;
  source: CarSource;
  brandId: string;
  brand: string;
  modelId: string;
  model: string;
  title: string;
  year: number;
  km: number | null;
  price: number;
  currency: CarCurrency;
  transmission: CarTransmission | null;
  fuel: CarFuel | null;
  neighborhood: string | null;
  department: string | null;
  sellerType: CarSellerType | null;
  sellerId: string | null;
  picture: string | null;
  pictureCount: number | null;
  permalink: string;
  observedAt: string;
  /** Private: version/engine words a structured source gives outside its title ("1.6 EXCLUSIVE"). */
  specText?: string | null;
  /** Commercial name of a dealer's own website (public). */
  dealerName?: string | null;
  /** The advert never states its currency; it was deduced against the same car's reference. */
  currencyInferred?: boolean;
}

export interface CarModelVocabulary {
  brandId: string;
  modelId: string;
  trims: string[];
}

export interface CarHarvestGap {
  brandId: string;
  brand: string;
  missing: number;
}

export interface CarSourceResult {
  source: CarSource;
  ok: boolean;
  /** The whole inventory was read without failures: only then may an unseen advert count as missing. */
  complete: boolean;
  listings: RawCarListing[];
  /** Keyed by car key (`<prefix>-<id>`). */
  details: Map<string, CarDetail>;
  requests: number;
  note: string | null;
  startedAt: string;
  finishedAt: string;
}

export interface CarHarvestResult {
  mode: "full" | "fast";
  startedAt: string;
  finishedAt: string;
  listings: RawCarListing[];
  vocabularies: CarModelVocabulary[];
  requests: number;
  pages: number;
  failedPages: number;
  rejectedCards: number;
  /** Times the harvest waited out a bridge outage before re-reading. */
  cooldowns: number;
  /** Brands whose every page answered. Only these may count an unseen advert as missing. */
  completeBrands: string[];
  gaps: CarHarvestGap[];
  reportedTotal: number | null;
  note: string | null;
}

export interface CarPricePoint {
  price: number;
  currency: CarCurrency;
  observedAt: string;
}

export interface CarDetail {
  readAt: string;
  price: number;
  currency: CarCurrency;
  active: boolean;
  brand: string | null;
  model: string | null;
  year: number | null;
  km: number | null;
  version: string | null;
  engineText: string | null;
  sellerName: string | null;
  bodyType: string | null;
  color: string | null;
  doors: number | null;
  /** Private: the advert's own photos, for the checks that need to look at them. */
  pictures?: string[];
  /**
   * Private: the advert's whole spec table as the page labels it ("Potencia" → "101 hp"). Missing
   * on pages read before 2026-09-22; `{}` on a page that had no table. What gets published is the
   * allowlisted rebuild in ./specs.ts.
   */
  specs?: Record<string, string>;
  flags: CarTextFlag[];
  /** Private: never projected to a public collection. */
  description: string;
}

export interface StoredCar {
  key: string;
  firstSeen: string;
  lastSeen: string;
  listing: RawCarListing;
  priceHistory: CarPricePoint[];
  retiredAt: string | null;
  missedFullSweeps: number;
  detail: CarDetail | null;
  /** Privado: qué se vio en las fotos del propio aviso (classes/autos/llm/vision.ts). */
  photoCheck?: CarPhotoVerdict | null;
}

export interface CarReference {
  priceUsd: number;
  basis: "version" | "year";
  updatedAt: string;
}

export interface CarListing extends RawCarListing {
  key: string;
  sourceName: string;
  reference: CarReference | null;
  brandSlug: string;
  modelSlug: string;
  marketSlug: string;
  engine: string | null;
  trim: string | null;
  trimLabel: string | null;
  kmQuality: CarKmQuality;
  flags: CarTextFlag[];
  priceUsd: number;
  priceConverted: boolean;
  /**
   * The number the portal lists, when it is NOT the car's price: the advert states a different cash
   * price ("US$12990 Contado") and `price` holds that one. Null when the listed number is the price.
   */
  listedPrice?: number | null;
  /** Litres per 100 km: what the advert states, else what sellers of the same model state (./fuelEconomy.ts). */
  fuelEconomy?: CarFuelEconomy | null;
  /** Carrocería: la de la ficha propia, la que nombra el título, o la de su modelo (./bodyType.ts). */
  body?: CarBody | null;
  /** Puertas y color, de la ficha propia y de ningún otro lado. */
  doors?: number | null;
  color?: string | null;
  firstSeen: string;
  lastSeen: string;
  priceDrop: { from: number; currency: CarCurrency; since: string } | null;
  detail: CarDetail | null;
  photoCheck?: CarPhotoVerdict | null;
}
