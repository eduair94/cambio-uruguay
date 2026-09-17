// Internal shapes of the used-car directory (/autos-usados-uruguay). Public wire shapes live in
// ./publicTypes.ts; nothing here is served as-is.
export type CarCurrency = "USD" | "UYU";
export type CarTransmission = "manual" | "automatica";
export type CarFuel = "nafta" | "diesel" | "electrico" | "hibrido" | "gnc";
export type CarSellerType = "dealer" | "private";
export type CarKmQuality = "ok" | "placeholder" | "unknown";
export type CarTextFlag = "damaged" | "financing" | "foreign_plate" | "paperwork" | "price_mismatch" | "recovered";

export interface RawCarListing {
  id: string;
  source: "mercadolibre";
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
}

export interface CarListing extends RawCarListing {
  key: string;
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
  firstSeen: string;
  lastSeen: string;
  priceDrop: { from: number; currency: CarCurrency; since: string } | null;
  detail: CarDetail | null;
}
