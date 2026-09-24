// Minimal shapes of the site's rental API (`app/utils/rentals.ts` is the source of
// truth) plus the enum values its query normalizer accepts. Only the fields the
// tools read are typed; everything is optional because the site omits unknowns.

export const RENTAL_TYPES = [
  "vivienda",
  "apartamento",
  "casa",
  "habitacion",
  "local",
  "oficina",
  "garaje",
  "terreno",
  "otro",
] as const;
export type RentalType = (typeof RENTAL_TYPES)[number];

export const RENTAL_GUARANTEES = ["anda", "contaduria", "aseguradora", "propietaria", "deposito", "bhu", "aConvenir"] as const;
export type RentalGuarantee = (typeof RENTAL_GUARANTEES)[number];
export const GUARANTEE_LABEL: Record<string, string> = {
  anda: "ANDA",
  contaduria: "Contaduría General de la Nación",
  aseguradora: "seguro de alquiler (Porto, Sura, Mapfre…)",
  propietaria: "propietario fiador",
  deposito: "depósito",
  bhu: "BHU",
  aConvenir: "a convenir",
};

export const RENTAL_AMENITIES = [
  "gimnasio",
  "piscina",
  "parrillero",
  "ascensor",
  "aire",
  "balcon",
  "lavadero",
  "calefaccion",
  "jardin",
  "sauna",
  "salon",
] as const;

export const RENTAL_SOURCES = ["mercadolibre", "infocasas", "facebook", "elpais", "casasweb", "tiktok", "instagram", "facebookreels"] as const;
export const SOURCE_LABEL: Record<string, string> = {
  mercadolibre: "Mercado Libre",
  infocasas: "InfoCasas",
  facebook: "Facebook Marketplace",
  elpais: "Inmuebles El País",
  casasweb: "Casasweb",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebookreels: "Facebook Reels",
};

export const RENTAL_SORTS = ["recientes", "precio", "precio-desc", "total", "precio-m2", "metros", "distancia"] as const;

/** Neighbourhood-quality filters: the zone must rank well on that public-data layer. */
export const NEIGHBORHOOD_QUALITY = ["denuncias", "agua", "luz", "saneamiento", "limpieza", "alumbrado"] as const;
export const QUALITY_LABEL: Record<string, string> = {
  denuncias: "delitos denunciados",
  agua: "cortes de agua",
  luz: "cortes de luz",
  saneamiento: "reclamos de saneamiento",
  limpieza: "reclamos de limpieza",
  alumbrado: "reclamos de alumbrado",
  calles: "reclamos de calles",
  servicios: "servicios cercanos",
};

export interface RawAvailability {
  count?: number;
  status?: string;
  lastReportedAt?: string | null;
}

export interface RawOffer {
  source?: string;
  listingId?: string;
  url?: string;
  title?: string;
  price?: number;
  currency?: string;
  priceUyu?: number;
  commonExpenses?: number | null;
  commonExpensesCurrency?: string | null;
  sellerName?: string;
  sellerType?: string;
  publishedAt?: string | null;
  petsAllowed?: boolean | null;
  guarantees?: string[];
  firstSeen?: string;
  lastSeen?: string;
  availability?: RawAvailability;
  agency?: { name?: string; profileUrl?: string } | null;
  details?: {
    description?: string;
    builtArea?: number | null;
    totalArea?: number | null;
    amenities?: string[];
    guaranteeText?: string;
  };
}

export interface RawRental {
  key: string;
  title?: string;
  propertyType?: string;
  department?: string;
  neighborhood?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  parkingSpaces?: number | null;
  furnished?: boolean | null;
  petsAllowed?: boolean | null;
  guarantees?: string[];
  price?: number;
  priceUyu?: number;
  currency?: string;
  sources?: string[];
  offers?: RawOffer[];
  matchingOffer?: RawOffer;
  firstSeen?: string;
  lastSeen?: string;
  availability?: RawAvailability;
  officialZone?: { zone?: string; name?: string; department?: string } | null;
  distanceKm?: number | null;
}

export interface RawFacet {
  value: string;
  count: number;
}
