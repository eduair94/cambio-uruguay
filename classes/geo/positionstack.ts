// The reverse geocoder behind GET /position_stack (the "where am I" of /avanzado). Pure on
// purpose: the endpoint in index.ts only adds the key and makes the request.
//
// HTTPS, not HTTP: the key and the visitor's coordinates used to cross the network in clear text.
// Measured on 2026-11-08 that the configured Positionstack plan answers over HTTPS.
export const POSITIONSTACK_REVERSE_URL = "https://api.positionstack.com/v1/reverse";

/** The site asks for one result; nobody needs more than a handful. */
const MAX_LIMIT = 10;

export interface ReverseGeocodeQuery {
  /** "<lat>,<lng>", rebuilt from the parsed numbers. */
  query: string;
  limit: number;
}

/**
 * Null when the query is not a point on Earth, so nothing is sent to the provider. The limit is
 * taken as a number only and clamped to 1..10.
 */
export function reverseGeocodeQuery(rawQuery: unknown, rawLimit: unknown): ReverseGeocodeQuery | null {
  if (typeof rawQuery !== "string") return null;
  const parts = rawQuery.split(",").map((part) => part.trim());
  if (parts.length !== 2 || parts.some((part) => part === "")) return null;
  const [lat, lng] = parts.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const asked = typeof rawLimit === "string" ? Number.parseInt(rawLimit, 10) : Number.NaN;
  const limit = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), MAX_LIMIT) : 1;
  return { query: `${lat},${lng}`, limit };
}
