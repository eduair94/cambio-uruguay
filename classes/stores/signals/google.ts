// Signal for /tiendas-online-uruguay: a Google Maps rating, read from our own self-hosted Places
// proxy (the same service app/server/tasks/casas/refreshReviews.ts already reads for exchange
// houses via a PINNED place_id — see that file's header comment). A store in this registry has no
// hand-verified place_id yet, so this module resolves one by NAME instead — and a name search is
// exactly what makes domain validation mandatory: "Magic Center" can also match a same-named mall
// stall, a co-branded reseller, or an unrelated business a few doors down, none of which is the
// online store this signal is meant to describe. `sameSite` is the guard: a candidate only counts
// once the listing's OWN published `website` field resolves to the domain we already trust from
// the registry — never the listing's name, which is the one thing a name search cannot verify.
// Read once a week by the sync job (Task 6), and only for `kind === "tienda-uy"` (a marketplace or
// a foreign-purchase intermediary has no single Uruguayan storefront to look up on Maps at all —
// that filter is the caller's job, the same way classes/stores/signals/age.ts leaves the
// `tienda-uy` filter to its caller rather than encoding it here).
import { httpText } from "../net";

export interface GoogleSignal {
  rating: number;
  reviews: number;
  address: string | null;
  url: string;
  checkedAt: string;
}

const GOOGLE_TIMEOUT_MS = Number(process.env.STORES_GMAPS_TIMEOUT_MS || 20_000);
const MAX_CANDIDATES = 3;

/**
 * True when `website` is the store's own domain or a subdomain of it, ignoring scheme and a
 * leading "www." on either side (a store can publish "https://www.x.com.uy" while the registry
 * records the bare "x.com.uy", or vice versa). Anything else — a social profile, an unrelated
 * domain, a domain that merely CONTAINS the store's domain as a substring — is rejected: this is a
 * host match, never a text match.
 */
export function sameSite(website: string | null | undefined, domain: string): boolean {
  if (!website) return false;
  let host: string;
  try {
    host = new URL(website).hostname.toLowerCase();
  } catch {
    return false;
  }
  const stripWww = (value: string): string => value.replace(/^www\./, "");
  const normalizedHost = stripWww(host);
  const target = stripWww(String(domain || "").toLowerCase());
  if (!target) return false;
  return normalizedHost === target || normalizedHost.endsWith(`.${target}`);
}

/**
 * Accepts a Places "Place Details" payload only when it has a real review count AND its own
 * `website` field passes `sameSite` against the store's domain — never the listing's `name`, which
 * a text search can resolve to a co-branded or merely nearby business (see the module comment).
 */
export function parsePlaceDetails(json: unknown, domain: string, checkedAt: string): GoogleSignal | null {
  const root = (json ?? {}) as { status?: unknown; result?: unknown };
  if (root.status !== "OK" || !root.result || typeof root.result !== "object") return null;
  const result = root.result as Record<string, unknown>;

  const rating = result.rating;
  if (typeof rating !== "number" || !(rating >= 0 && rating <= 5)) return null;

  const reviews = result.user_ratings_total;
  if (typeof reviews !== "number" || !(reviews > 0)) return null;

  const website = typeof result.website === "string" ? result.website : null;
  if (!sameSite(website, domain)) return null;

  const address = typeof result.formatted_address === "string" ? result.formatted_address : null;
  const url = typeof result.url === "string" ? result.url : "";

  return { rating, reviews, address, url, checkedAt };
}

function extractCandidateIds(json: unknown): string[] | "zero_results" | null {
  const root = (json ?? {}) as { status?: unknown; candidates?: unknown };
  if (root.status === "ZERO_RESULTS") return "zero_results";
  if (root.status !== "OK" || !Array.isArray(root.candidates)) return null;
  const ids = root.candidates
    .slice(0, MAX_CANDIDATES)
    .map((candidate) => (candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>).place_id : null))
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  return ids;
}

/**
 * `undefined` only when the proxy itself could not be reached or answered with a server error
 * (network failure or 5xx); `null` when it answered but no candidate is both findable AND passes
 * domain validation (including a genuine ZERO_RESULTS); otherwise the first candidate whose Place
 * Details match the domain, checked in the order Google returned them.
 */
export async function fetchGoogle(name: string, domain: string): Promise<GoogleSignal | null | undefined> {
  const base = (process.env.STORES_GMAPS_URL || "http://127.0.0.1:2221").replace(/\/$/, "");

  const findUrl = `${base}/findPlaceFromText?input=${encodeURIComponent(`${name} Uruguay`)}&inputtype=textquery&fields=place_id,name`;
  const findRes = await httpText(findUrl, { timeoutMs: GOOGLE_TIMEOUT_MS });
  if (!findRes) return undefined;
  if (findRes.status >= 500) return undefined;

  let findParsed: unknown;
  try {
    findParsed = JSON.parse(findRes.body);
  } catch {
    return null;
  }
  const candidateIds = extractCandidateIds(findParsed);
  if (candidateIds === "zero_results" || candidateIds === null || candidateIds.length === 0) return null;

  const checkedAt = new Date().toISOString();
  for (const placeId of candidateIds) {
    const detailsFields = "place_id,name,rating,user_ratings_total,website,url,formatted_address";
    const detailsUrl = `${base}/placeDetails?place_id=${encodeURIComponent(placeId)}&fields=${detailsFields}`;
    const detailsRes = await httpText(detailsUrl, { timeoutMs: GOOGLE_TIMEOUT_MS });
    if (!detailsRes) return undefined;
    if (detailsRes.status >= 500) return undefined;

    let detailsParsed: unknown;
    try {
      detailsParsed = JSON.parse(detailsRes.body);
    } catch {
      continue;
    }
    const signal = parsePlaceDetails(detailsParsed, domain, checkedAt);
    if (signal) return signal;
  }
  return null;
}
