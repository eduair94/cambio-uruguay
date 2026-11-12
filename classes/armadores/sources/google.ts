// Negocios de armado con ficha en Google Maps, por el proxy de Places del VPS (`:2221`, el mismo
// que usan las tiendas y las reseñas de casas). Semanal: cada consulta cuesta cuota.
//
// Medido el 11/11/2026: el proxy NO reenvía `pagetoken` (la página 2 vuelve INVALID_REQUEST), así
// que cada consulta da como mucho 20 negocios. La cobertura sale de cruzar varias formulaciones
// con centros repartidos por la ciudad (`location` + `radius` sí llegan a Google). Juntos devuelven
// siempre el mismo puñado de nombres: Google tiene pocos armadores con ficha, y ese es el dato.
//
// Precisión: entra sólo lo que SE LLAMA armado/armador/desarmado/montaje. Una mueblería, un
// showroom o una carpintería genérica aparecen en las mismas búsquedas y no son armadores.
// Un negocio "de área de servicio" (dirección sin calle, "13000 Montevideo") publica una
// coordenada que no es un local: no se le asigna barrio.
import { blankEntry } from "../entry";
import { OTHER_OBJECT, servicesFromText } from "../text";
import type { ArmadorEntry } from "../types";
import { METRO_LOCALITIES, zoneOfBarrio, zoneOfIneLabel } from "../zones";

export interface GooglePlace {
  placeId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  count: number;
  status: string | null;
}

export interface GoogleSearch {
  query: string;
  lat: number;
  lng: number;
}

const WORDINGS = ["armado de muebles", "armador de muebles", "armadores de muebles a domicilio", "armado y desarmado de muebles", "montaje de muebles"];
/** Centros de búsqueda: uno por zona grande de la ciudad y dos del área metropolitana. */
const CENTERS: ReadonlyArray<[string, number, number]> = [
  ["Centro", -34.9055, -56.1913],
  ["Pocitos", -34.9105, -56.1500],
  ["Malvín", -34.8930, -56.1020],
  ["Carrasco", -34.8840, -56.0560],
  ["Unión", -34.8790, -56.1360],
  ["Prado", -34.8600, -56.2080],
  ["Cerro", -34.8826, -56.2600],
  ["Colón", -34.8030, -56.2230],
  ["Piedras Blancas", -34.8300, -56.1430],
  ["Ciudad de la Costa", -34.8200, -55.9500],
];
export const GOOGLE_RADIUS_M = 4_000;

export const GOOGLE_SEARCHES: readonly GoogleSearch[] = WORDINGS.flatMap(query =>
  CENTERS.map(([, lat, lng]) => ({ query, lat, lng })),
);

const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

export function placesFromTextSearch(body: unknown): { places: GooglePlace[]; status: string } {
  const data = (body && typeof body === "object" ? body : {}) as { status?: unknown; results?: unknown };
  const places: GooglePlace[] = [];
  for (const raw of Array.isArray(data.results) ? data.results : []) {
    const r = raw as Record<string, any>;
    const placeId = typeof r.place_id === "string" ? r.place_id : "";
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!placeId || !name) continue;
    places.push({
      placeId,
      name,
      address: typeof r.formatted_address === "string" ? r.formatted_address : null,
      lat: num(r.geometry?.location?.lat),
      lng: num(r.geometry?.location?.lng),
      rating: num(r.rating),
      count: num(r.user_ratings_total) ?? 0,
      status: typeof r.business_status === "string" ? r.business_status : null,
    });
  }
  return { places, status: typeof data.status === "string" ? data.status : "" };
}

type Fetcher = (url: string) => Promise<unknown | null>;

const defaultFetcher: Fetcher = async url => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

export async function readGooglePlaces(options: {
  base: string;
  searches?: readonly GoogleSearch[];
  fetcher?: Fetcher;
  pageDelayMs?: number;
}): Promise<{ places: GooglePlace[]; calls: number; failed: number }> {
  const base = options.base.replace(/\/+$/, "");
  const fetcher = options.fetcher ?? defaultFetcher;
  const found = new Map<string, GooglePlace>();
  let calls = 0;
  let failed = 0;
  for (const search of options.searches ?? GOOGLE_SEARCHES) {
    if (calls && options.pageDelayMs !== 0) await new Promise(resolve => setTimeout(resolve, options.pageDelayMs ?? 400));
    const params = `query=${encodeURIComponent(search.query)}&location=${encodeURIComponent(`${search.lat},${search.lng}`)}&radius=${GOOGLE_RADIUS_M}&language=es&region=uy`;
    calls++;
    const body = await fetcher(`${base}/textsearch?${params}`);
    const { places, status } = placesFromTextSearch(body);
    if (!body || (status && status !== "OK" && status !== "ZERO_RESULTS")) {
      failed++;
      continue;
    }
    for (const place of places) if (!found.has(place.placeId)) found.set(place.placeId, place);
  }
  return { places: [...found.values()], calls, failed };
}

const fold = (text: string): string => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
// "desarm" a secas también es un desarmadero de autos; "montaje" y "ensamble" solos, industria.
const ASSEMBLY_NAME = /\barm(ado|ados|ador|adores|adora)\b|\bdesarm(ado|ados|ador|adores)\b|\bmontaje de muebles\b|\bensamblado de muebles\b/;
/** La misma lista que los avisos (classes/armadores/text.ts): una sola, para que no se separen. */
const NOT_FURNITURE = OTHER_OBJECT;

/** El nombre del negocio dice que arma muebles (o arma, sin decir otro objeto). */
export function isAssemblyBusinessName(name: string): boolean {
  const text = fold(name);
  return ASSEMBLY_NAME.test(text) && (/\bmuebles?\b/.test(text) || !NOT_FURNITURE.test(text));
}

/** Dirección con calle: la coordenada es un local. "13000 Montevideo" es un área de servicio. */
const hasStreet = (address: string): boolean => !/^\s*\d{5}\s/.test(address) && /[a-záéíóúñ]{3,}.*\d/i.test(address.split(",")[0] ?? "");

/**
 * Una fila desde una ficha de Google. `locate` traduce la coordenada al barrio INE de Montevideo
 * (o null fuera de los polígonos). Fuera de Montevideo sólo entra una localidad metropolitana.
 */
export function googleEntry(place: GooglePlace, locate: (lng: number, lat: number) => string | null, day: string): ArmadorEntry | null {
  if (place.status === "CLOSED_PERMANENTLY" || place.status === "CLOSED_TEMPORARILY") return null;
  if (!isAssemblyBusinessName(place.name)) return null;
  const address = place.address ?? "";
  const inMontevideo = /Departamento de Montevideo|\bMontevideo\b/.test(address) && !/Departamento de (?!Montevideo)/.test(address);
  const metro = METRO_LOCALITIES.find(name => fold(address).includes(fold(name)));
  if (!inMontevideo && !metro) return null;

  const entry = blankEntry({
    id: `g:${place.placeId}`,
    source: "google",
    kind: "empresa",
    name: place.name,
    url: `https://www.google.com/maps/place/?q=place_id:${place.placeId}`,
  }, day);
  if (inMontevideo) {
    const barrio = hasStreet(address) && place.lat !== null && place.lng !== null ? locate(place.lng, place.lat) : null;
    entry.base = barrio
      ? { barrio, zone: zoneOfIneLabel(barrio), department: "Montevideo", basis: "coordinates" }
      : { barrio: null, zone: null, department: "Montevideo", basis: null };
  } else if (metro) {
    entry.base = { barrio: metro, zone: zoneOfBarrio(metro), department: "Canelones", basis: "coordinates" };
  }
  entry.services = [...new Set<ArmadorEntry["services"][number]>(["armado", ...servicesFromText(place.name)])];
  entry.placeId = place.placeId;
  entry.rating = place.rating !== null && place.count > 0 ? { value: place.rating, count: place.count, observedAt: day } : null;
  entry.sources = [{ url: entry.url, consultedAt: day, label: "Google Maps" }];
  return entry;
}
