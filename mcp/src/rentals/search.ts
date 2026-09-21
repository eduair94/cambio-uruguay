// search_rentals + geocode_uy_address: the rental directory with every filter the
// site offers, and address/place → coordinates (Google Maps, IDE Uruguay as fallback).

import { fmt, money, siteUrl, type QueryValue } from "../format.js";
import { UserInputError, type ToolOutput } from "../output.js";
import { SiteError, TTL, type SiteApi } from "../site.js";
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
  /** Only adverts published in this currency (prices are still filtered in pesos). */
  listedCurrency?: "UYU" | "USD";
  priceMinUyu?: number;
  priceMaxUyu?: number;
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

export interface GeocodeItem {
  label: string;
  lat: number;
  lng: number;
  /** "exacta" (street number / building) or "aproximada" (street range, neighbourhood, area). */
  precision?: "exacta" | "aproximada";
}

export async function geocodeAddress(site: SiteApi, input: GeocodeInput): Promise<ToolOutput> {
  const { items, source } = await geocodeWithSource(site, input);
  if (!items.length) throw new UserInputError(`No se encontró "${input.address}". ${GEOCODE_ADVICE}`);
  const lines = items.map((i, n) => `${n + 1}. ${i.label} → ${i.lat}, ${i.lng}${i.precision ? ` (${i.precision})` : ""}`);
  lines.push(`Fuente: ${source}.`);
  return { text: lines.join("\n"), data: { items, source } };
}

/** Public Google Maps proxy (no key): places by name, neighbourhoods and addresses, ~0.4 s. */
export const GEOCODER_URL = (process.env.GEOCODER_URL || "https://google-maps-proxy.checkleaked.cc").replace(/\/$/, "");

const STREET_TYPE = /^(avenida|av\.?|bulevar|boulevard|bv\.?|bvar\.?|calle|camino|rambla)\s+/i;

/** Advice appended when no geocoder can place an address. */
export const GEOCODE_ADVICE =
  "Probá con calle y número de puerta, una esquina o el nombre del lugar (\"Facultad de Ingeniería\", \"Tres Cruces\") y el departamento. " +
  "Si igual no aparece, NO reintentes con variantes: pasá lat/lng aproximadas, que las distancias son en línea recta y 3 decimales alcanzan.";

interface GoogleGeocode {
  status?: string;
  results?: Array<{
    formatted_address?: string;
    types?: string[];
    geometry?: { location?: { lat: number; lng: number }; location_type?: string };
  }>;
}

const inUruguay = (lat: number, lng: number) => lat >= -35.5 && lat <= -30 && lng >= -58.6 && lng <= -53;

async function googleGeocode(site: SiteApi, input: GeocodeInput): Promise<GeocodeItem[]> {
  const address = input.address.trim().slice(0, 180);
  const withDepartment =
    input.department && !address.toLowerCase().includes(input.department.toLowerCase())
      ? `${address}, ${input.department}`
      : address;
  // Addresses are personal input: never cached.
  const res = await site.get<GoogleGeocode>(
    `${GEOCODER_URL}/geocode`,
    { address: withDepartment, components: "country:UY", language: "es", region: "uy" },
    { ttlMs: 0, timeoutMs: 10_000, retry: false }
  );
  return (res.results ?? [])
    .map((r) => ({ r, loc: r.geometry?.location }))
    .filter((x): x is { r: (typeof x)["r"]; loc: { lat: number; lng: number } } => !!x.loc && inUruguay(x.loc.lat, x.loc.lng))
    .slice(0, 5)
    .map(({ r, loc }) => ({
      label: r.formatted_address ?? address,
      lat: Math.round(loc.lat * 1e5) / 1e5,
      lng: Math.round(loc.lng * 1e5) / 1e5,
      precision: r.geometry?.location_type === "ROOFTOP" ? "exacta" : "aproximada",
    }));
}

async function ideGeocode(site: SiteApi, input: GeocodeInput): Promise<GeocodeItem[]> {
  const first = input.address.trim().slice(0, 180);
  const variants = [first];
  const stripped = first.replace(STREET_TYPE, "");
  if (stripped !== first && stripped.length >= 4) variants.push(stripped);
  for (const q of variants) {
    try {
      const res = await site.get<GeocodeResponse>("/api/rentals/geocode", { q, department: input.department }, { ttlMs: 0 });
      if (res.items?.length) return res.items.slice(0, 5);
    } catch (error) {
      // The limit is worth surfacing as is; any other failure just means "not found here".
      if (error instanceof SiteError && error.status === 429) throw error;
    }
  }
  return [];
}

/**
 * Google first: it knows places by name ("Facultad de Ingeniería"), neighbourhoods and addresses in
 * about 0.4 s. The official IDE geocoder (through the site) is only a fallback when Google is down:
 * it misses places and names with a "y", and took 25-50 s per lookup when it struggled.
 */
export async function geocodeWithSource(site: SiteApi, input: GeocodeInput): Promise<{ items: GeocodeItem[]; source: string }> {
  try {
    return { items: await googleGeocode(site, input), source: "Google Maps" };
  } catch {
    return { items: await ideGeocode(site, input), source: "IDE Uruguay (geocodificador oficial)" };
  }
}

export async function geocodeItems(site: SiteApi, input: GeocodeInput): Promise<GeocodeItem[]> {
  return (await geocodeWithSource(site, input)).items;
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
      `No se pudo ubicar "${near.address}". ${GEOCODE_ADVICE}`
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
    currency: input.listedCurrency,
    priceMin: input.priceMinUyu,
    priceMax: input.priceMaxUyu,
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
  // The site only SORTS by distance; the radius is applied here, so read the widest page.
  const params = rentalSearchParams(point?.radiusKm ? { ...input, perPage: 48 } : input, point);
  const res = await site.get<RentalsResponse>("/api/rentals", params, { ttlMs: TTL.search });
  const usdUyu = Number(res.meta?.usdUyu) || 0;
  const want = Math.max(1, Math.min(48, Math.round(input.perPage ?? 10)));
  let items: CompactRental[] = (res.items ?? []).map((p) => compactRental(p, usdUyu));
  const notes: string[] = [
    "El total mensual (alquiler + gastos comunes) sólo aparece cuando el mismo aviso publica sus gastos comunes; la mayoría no lo hace.",
    "Se muestran avisos vistos en los últimos 10 días; confirmá disponibilidad con el anunciante.",
  ];
  let withinRadius: number | undefined;
  if (point?.radiusKm) {
    const radius = point.radiusKm;
    items = items.filter((i) => i.distanceKm !== undefined && i.distanceKm <= radius);
    withinRadius = items.length;
    notes.push(
      `Radio de ${fmt(radius, 1)} km en línea recta desde ${point.label || "el punto"}: sólo cuentan avisos con ubicación propia (muchos no la publican).` +
        (withinRadius === (res.items ?? []).length ? " Puede haber más: pedí page=2." : "")
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

  const head =
    withinRadius !== undefined
      ? `${withinRadius === (res.items ?? []).length ? "Al menos " : ""}${fmt(withinRadius)} viviendas a menos de ${fmt(point!.radiusKm!, 1)} km de ${point!.label || "el punto"} (de ${fmt(total)} que cumplen los demás filtros), de la más cercana a la más lejana.`
      : "";
  const lines = [
    head ||
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
      withinRadius: withinRadius ?? null,
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
