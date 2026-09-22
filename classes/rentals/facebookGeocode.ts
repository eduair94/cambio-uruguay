// Corners and numbered addresses from a Facebook description → a coordinate, through the site's
// own Google Maps proxy (the one behind /api/rentals/geocode; no key travels from here).
//
// The proxy answers whatever Google answers, and Google answers SOMETHING for almost any text:
// the centroid of one street, a house number invented from a stray "2026". `acceptGeocode`
// (facebookDetail.ts) is the only thing standing between that and the map, so every result goes
// through it. A run has a budget of lookups (`RENTALS_FB_GEOCODE_MAX`), and an advert gets at
// most two: the first candidate that passes wins, the rest are never asked.
import { acceptGeocode, geocodeQuery, type GeocodePoint } from "./facebookDetail";

export const RENTALS_GEOCODER_URL = (process.env.RENTALS_GEOCODER_URL || "https://google-maps-proxy.checkleaked.cc").replace(/\/+$/, "");
const TIMEOUT_MS = 8_000;
const MAX_BODY = 256 * 1024;

export type GeocodeFetch = (query: string) => Promise<unknown>;

/** First Google result for the query, or null. Never throws: a geocoder outage is "no point". */
export const fetchGeocode: GeocodeFetch = async (query) => {
  const url = new URL("/geocode", RENTALS_GEOCODER_URL);
  url.search = new URLSearchParams({ address: query, components: "country:UY", language: "es", region: "uy" }).toString();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
    if (!response.ok) return null;
    const text = await response.text();
    if (text.length > MAX_BODY) return null;
    const body = JSON.parse(text) as { results?: unknown[] };
    return Array.isArray(body.results) ? body.results[0] ?? null : null;
  } catch {
    return null;
  }
};

export interface GeocodeBudget {
  remaining: number;
}

export interface GeocodeOutcome {
  point: GeocodePoint | null;
  query: string | null;
  tried: number;
}

/** Up to two candidates per advert, stopping at the first accepted point or when the budget is spent. */
export async function geocodeCandidates(
  candidates: readonly string[],
  department: string,
  budget: GeocodeBudget,
  fetchImpl: GeocodeFetch = fetchGeocode,
): Promise<GeocodeOutcome> {
  let tried = 0;
  let lastQuery: string | null = null;
  for (const candidate of candidates.slice(0, 2)) {
    if (budget.remaining <= 0) break;
    budget.remaining--;
    tried++;
    const query = geocodeQuery(candidate, department);
    lastQuery = query;
    const point = acceptGeocode(query, await fetchImpl(query));
    if (point) return { point, query, tried };
  }
  return { point: null, query: lastQuery, tried };
}
