// search_rentals + geocode_uy_address: the rental directory with every filter the
// site offers, and address → coordinates through the IDE Uruguay lookup of the site.

import { fmt, money, siteUrl, type QueryValue } from "../format.js";
import { UserInputError, type ToolOutput } from "../output.js";
import { TTL, type SiteApi } from "../site.js";
import { compactRental, rentalLine, type CompactRental } from "./compact.js";
import type { RawFacet, RawRental } from "./types.js";

export interface NearInput {
  /** Street address or intersection ("18 de Julio y Ejido"); geocoded when lat/lng are missing. */
  address?: string;
  lat?: number;
  lng?: number;
  label?: string;
  /** Keep only homes within this straight-line distance (km). */
  radiusKm?: number;
}

export interface RentalSearchInput {
  department?: string;
  neighborhoods?: string[];
  types?: string[];
  bedrooms?: number;
  bedroomsExact?: boolean;
  bathrooms?: number;
  areaMin?: number;
  areaMax?: number;
  currency?: "UYU" | "USD";
  priceMin?: number;
  priceMax?: number;
  monthlyMaxUyu?: number;
  expensesMaxUyu?: number;
  pets?: boolean;
  parking?: boolean;
  furnished?: boolean;
  guarantees?: string[];
  amenities?: string[];
  ownerDirect?: boolean;
  agency?: string;
  source?: string;
  text?: string;
  near?: NearInput;
  neighborhoodQuality?: string[];
  hideReported?: "none" | "any" | "multiple";
  sort?: string;
  page?: number;
  perPage?: number;
}

interface RentalsResponse {
  meta?: { generatedAt?: string; usdUyu?: number } | null;
  items?: RawRental[];
  total?: number;
  page?: number;
  perPage?: number;
  medianUyu?: number;
  facets?: { neighborhoods?: RawFacet[]; departments?: RawFacet[]; types?: RawFacet[] };
}

interface GeocodeResponse {
  items?: Array<{ label: string; lat: number; lng: number }>;
  source?: string;
}

export interface GeocodeInput {
  address: string;
  department?: string;
}

export async function geocodeAddress(site: SiteApi, input: GeocodeInput): Promise<ToolOutput> {
  const items = await geocodeItems(site, input);
  if (!items.length)
    throw new UserInputError(
      `No se encontró "${input.address}". Probá con calle y número de puerta, o con una esquina ("Bulevar Artigas y Rivera"), y el departamento. Para un lugar conocido (facultad, shopping) usá su dirección.`
    );
  const lines = items.map((i, n) => `${n + 1}. ${i.label} → ${i.lat}, ${i.lng}`);
  lines.push("Fuente: IDE Uruguay (geocodificador oficial).");
  return { text: lines.join("\n"), data: { items, source: "IDE Uruguay" } };
}

export async function geocodeItems(site: SiteApi, input: GeocodeInput) {
  // Addresses are personal input: never cached.
  const res = await site.get<GeocodeResponse>(
    "/api/rentals/geocode",
    { q: input.address.slice(0, 180), department: input.department },
    { ttlMs: 0 }
  );
  return (res.items ?? []).slice(0, 5);
}

/** Resolve a `near` input to a point, geocoding the address when needed. */
export async function resolveNear(site: SiteApi, near: NearInput | undefined, department?: string) {
  if (!near) return undefined;
  if (typeof near.lat === "number" && typeof near.lng === "number")
    return { lat: near.lat, lng: near.lng, label: near.label ?? near.address ?? "", radiusKm: near.radiusKm };
  if (!near.address) throw new UserInputError("Para buscar cerca de un punto pasá `address` o `lat` y `lng`.");
  const [first] = await geocodeItems(site, { address: near.address, department });
  if (!first)
    throw new UserInputError(
      `No se pudo ubicar "${near.address}". Probá con calle y número o una esquina, o pasá lat/lng.`
    );
  return { lat: first.lat, lng: first.lng, label: near.label ?? first.label, radiusKm: near.radiusKm };
}

const AVAILABILITY: Record<string, string> = { any: "hide_any", multiple: "hide_multiple" };

/** Tool input → the exact query names `/api/rentals` (and the /alquileres-uruguay page) accept. */
export function rentalSearchParams(
  input: RentalSearchInput,
  point?: { lat: number; lng: number; label?: string }
): Record<string, QueryValue> {
  const perPage = Math.min(48, Math.max(6, Math.round(input.perPage ?? 10)));
  const neighborhoods = (input.neighborhoods ?? []).map((n) => n.trim()).filter(Boolean);
  return {
    department: input.department,
    ...(neighborhoods.length === 1 ? { neighborhood: neighborhoods[0] } : { neighborhoods }),
    types: input.types,
    bedrooms: input.bedrooms,
    bedroomsExact: input.bedroomsExact,
    bathrooms: input.bathrooms,
    areaMin: input.areaMin,
    areaMax: input.areaMax,
    currency: input.currency,
    priceMin: input.priceMin,
    priceMax: input.priceMax,
    monthlyMax: input.monthlyMaxUyu,
    expensesMax: input.expensesMaxUyu,
    pets: input.pets,
    parking: input.parking,
    furnished: input.furnished,
    garantia: input.guarantees,
    comodidades: input.amenities,
    dueno: input.ownerDirect,
    agency: input.agency,
    source: input.source,
    q: input.text,
    servicios: input.neighborhoodQuality,
    availability: AVAILABILITY[input.hideReported ?? "multiple"],
    ...(point ? { refLat: point.lat, refLng: point.lng, refLabel: point.label?.slice(0, 60) } : {}),
    sort: point ? "distancia" : input.sort,
    page: input.page && input.page > 1 ? input.page : undefined,
    perPage,
  };
}

const SORT_LABEL: Record<string, string> = {
  recientes: "más recientes",
  precio: "precio de menor a mayor",
  "precio-desc": "precio de mayor a menor",
  total: "menor total mensual",
  "precio-m2": "menor precio por m²",
  metros: "más metros",
  distancia: "más cerca del punto",
};

export async function searchRentals(site: SiteApi, input: RentalSearchInput): Promise<ToolOutput> {
  const point = await resolveNear(site, input.near, input.department);
  const params = rentalSearchParams(input, point);
  const res = await site.get<RentalsResponse>("/api/rentals", params, { ttlMs: TTL.search });
  const usdUyu = Number(res.meta?.usdUyu) || 0;
  const want = Math.max(1, Math.min(48, Math.round(input.perPage ?? 10)));
  let items: CompactRental[] = (res.items ?? []).map((p) => compactRental(p, usdUyu));
  const notes: string[] = [
    "El total mensual (alquiler + gastos comunes) sólo aparece cuando el mismo aviso publica sus gastos comunes; la mayoría no lo hace.",
    "Se muestran avisos vistos en los últimos 10 días; confirmá disponibilidad con el anunciante.",
  ];
  if (point?.radiusKm) {
    const radius = point.radiusKm;
    const before = items.length;
    items = items.filter((i) => i.distanceKm !== undefined && i.distanceKm <= radius);
    notes.push(
      `Filtrado a ${fmt(radius, 1)} km en línea recta de ${point.label || "el punto"}: ${before - items.length} resultados de esta página quedaron fuera o no tienen ubicación exacta.`
    );
  }
  items = items.slice(0, want);
  const { page: _page, perPage: _perPage, ...pageParams } = params;
  const url = siteUrl("/alquileres-uruguay", pageParams);
  const total = Number(res.total) || 0;
  const page = Number(res.page) || 1;
  const perPage = Number(res.perPage) || want;
  const from = total ? (page - 1) * perPage + 1 : 0;
  const neighborhoods = (res.facets?.neighborhoods ?? []).slice(0, 8);
  const asOf = res.meta?.generatedAt?.slice(0, 10);
  const sortLabel = SORT_LABEL[String(params.sort ?? "recientes")] ?? String(params.sort);

  const lines = [
    `${fmt(total)} viviendas coinciden${total ? ` (desde la ${fmt(from)}, orden: ${sortLabel})` : ""}.` +
      (res.medianUyu ? ` Mediana del alquiler para esta búsqueda: ${money(res.medianUyu)}.` : ""),
    ...items.map((r, n) => `${n + 1}. ${rentalLine(r)}`),
  ];
  if (!items.length) lines.push("Sin resultados: probá ampliar barrios, precio o dormitorios.");
  if (neighborhoods.length && !input.neighborhoods?.length)
    lines.push(`Barrios con más resultados: ${neighborhoods.map((f) => `${f.value} (${fmt(f.count)})`).join(", ")}.`);
  lines.push(`Ver/guardar esta búsqueda o crear una alerta: ${url}`);
  if (asOf) lines.push(`Datos al ${asOf}.`);
  lines.push(...notes.map((n) => `Nota: ${n}`));

  return {
    text: lines.join("\n"),
    data: {
      total,
      page,
      medianRentUyu: res.medianUyu ?? null,
      usdUyu: usdUyu || null,
      items,
      topNeighborhoods: neighborhoods,
      reference: point ?? null,
      asOf: asOf ?? null,
      siteUrl: url,
      notes,
    },
  };
}
