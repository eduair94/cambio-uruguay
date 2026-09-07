import type { RentalAdvertiserFields, RentalSellerType } from "../rentals/types";
/** Public advert catalogue. One key means one source advert, never an inferred physical home. */
export interface PublicSaleListing extends RentalAdvertiserFields {
  sellerType: RentalSellerType;
  key: string;
  id: string;
  operation: "sale";
  source: "infocasas" | "casasweb";
  listingId: string;
  url: string;
  title: string;
  description: string;
  image: string | null;
  images: string[];
  sellerName: string;
  department: string;
  locality: string;
  neighborhood: string;
  propertyType: "apartamento" | "casa";
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  price: { amount: number; currency: "USD" | "UYU" };
  expenses: { amount: number; currency: "USD" | "UYU" } | null;
  areas: { built: number | null; total: number | null; land: number | null; terrace: number | null; reported: number | null };
  amenities: string[];
  furnished: true | null;
  geo: { lat: number; lng: number; precision: "approximate" } | null;
  conditions: ("occupied" | "needs_renovation" | "project" | "extra_purchase_costs" | "special_layout" | "optional_parking")[];
  lastSeen: string;
  publishedAt: string | null;
  firstSeen: string | null;
}

export interface PublicSaleCatalogMeta {
  key: "uy-sales";
  version: 1;
  generatedAt: string;
  lastSourceReadAt: string | null;
  usdUyu: number;
  total: number;
  freshDays: 21;
  sourceCoverage: "partial";
  sources: { key: "infocasas" | "casasweb"; listings: number; lastSeen: string; complete: false }[];
  inputCount: number;
  excludedCount: number;
}
