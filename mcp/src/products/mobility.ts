// Search the same accepted adverts as the two public mobility directories. A
// category's cheapest offer cannot answer a request for a particular brand/model.
import { compact, fold, siteUrl } from "../format.js";
import { UserInputError } from "../output.js";
import { TTL, type SiteApi } from "../site.js";
import type { ProductRow, ProductSearchInput } from "./search.js";

const DIRECTORIES = {
  monopatines: { category: "monopatin-electrico", page: "/monopatines-electricos-uruguay" },
  "bicicletas-electricas": { category: "bicicleta-electrica", page: "/bicicletas-electricas-uruguay" },
} as const;

export type MobilityVertical = keyof typeof DIRECTORIES;

export const isMobilityVertical = (vertical: string): vertical is MobilityVertical => vertical in DIRECTORIES;

interface MobilityListing {
  listingId: string;
  title: string;
  brand?: string;
  category: string;
  variant?: string;
  condition: "new" | "used";
  sellerName?: string;
  price: number;
  currency: string;
  priceUyu: number;
  url: string;
  lastSeen?: string;
}

interface MobilityResponse {
  total: number;
  perPage: number;
  items: MobilityListing[];
}

export async function searchMobility(site: SiteApi, vertical: MobilityVertical, input: ProductSearchInput) {
  const directory = DIRECTORIES[vertical];
  const brand = input.brand ? fold(input.brand) : undefined;
  // The public API only accepts facet keys. Never silently drop a brand filter
  // (its normalizer otherwise ignores unsupported keys such as ones with spaces).
  if (brand && !/^[a-z0-9:_.-]{1,80}$/.test(brand)) {
    throw new UserInputError("Para buscar una marca con varias palabras, usá text en lugar de brand.");
  }
  const variant = input.variant ? fold(input.variant) : undefined;
  const seller = input.seller ? fold(input.seller) : undefined;
  if ([variant, seller].some((key) => key && !/^[a-z0-9:_.-]{1,80}$/.test(key))) {
    throw new UserInputError("variant y seller deben ser las claves de los filtros del buscador, no sus etiquetas.");
  }
  if ([input.minPriceUyu, input.maxPriceUyu].some((price) => price !== undefined && price < 1)) {
    throw new UserInputError("El presupuesto mínimo del buscador es de 1 peso uruguayo.");
  }
  const minPrice = input.minPriceUyu === undefined ? undefined : Math.ceil(input.minPriceUyu);
  const maxPrice = input.maxPriceUyu === undefined ? undefined : Math.floor(input.maxPriceUyu);
  // The directory discards the maximum when the range is crossed. Reject it
  // here so the assistant never receives adverts beyond the stated budget.
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new UserInputError("El precio mínimo no puede superar el máximo; indicá un rango en pesos enteros.");
  }
  const filters = compact({
    q: input.text?.trim() || undefined,
    marca: brand,
    variante: variant,
    vendedor: seller,
    fuente: input.source,
    condicion: input.condition === "new" ? "nuevo" : input.condition === "used" ? "usado" : undefined,
    // The directory accepts integer pesos; passing decimals would remove the
    // decimal separator and turn 15000.5 into 150005.
    precioMin: minPrice,
    precioMax: maxPrice,
  });
  const query = { ...filters, categoria: directory.category, orden: "precio_asc" };
  const searchUrl = siteUrl(directory.page, filters);
  const limit = Math.max(1, Math.min(30, input.limit ?? 12));
  const first = await site.get<MobilityResponse>("/api/movilidad/productos", query, { ttlMs: TTL.search });
  const listings = [...first.items];
  // The directory publishes 24 adverts per page, while the MCP allows up to 30.
  // Only fetch a second page when the requested shortlist actually needs it.
  if (listings.length < limit && first.total > listings.length && first.perPage > 0) {
    const next = await site.get<MobilityResponse>("/api/movilidad/productos", { ...query, page: 2 }, { ttlMs: TTL.search });
    listings.push(...next.items);
  }
  const rows: ProductRow[] = listings.slice(0, limit).map((listing) => compact({
    vertical,
    name: listing.title,
    brand: listing.brand || undefined,
    category: listing.category,
    variant: listing.variant,
    bestPriceUyu: listing.priceUyu,
    bestOffer: compact({
      seller: listing.sellerName,
      priceUyu: listing.priceUyu,
      price: listing.price,
      currency: listing.currency,
      url: listing.url,
      condition: listing.condition === "used" ? "usado" : "nuevo",
    }),
    lastSeen: listing.lastSeen,
    siteUrl: searchUrl,
  }));
  return { rows, total: first.total, searchUrl };
}
