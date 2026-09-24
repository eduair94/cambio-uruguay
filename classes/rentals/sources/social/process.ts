// Posts → offers, the part every social network shares.
//
// Newest first, each post once: outside the publication window it is dropped; the caption becomes
// facts (caption.ts, precision over recall); a corner the caption names is geocoded ONCE per post
// — the answer, accepted or refused, is remembered in the post's memory row — and a point that
// falls in another INE barrio than the one named is refused; the facts become an offer
// (post.ts), which must be a plausible monthly rent at the run's rate.
import { INE_DISPLAY_NAMES } from "../../../propertyzones/names";
import { neighborhoodFromZoneLabel, pointContradictsBarrio } from "../../facebookDetailStore";
import type { GeocodeOutcome } from "../../facebookGeocode";
import { isPlausibleRent } from "../../normalize";
import type { RawRental } from "../../types";
import { parseCaption, type CaptionFacts } from "./caption";
import { postToRawRental, type PostGeo, type SocialPost } from "./post";
import type { SocialPostRow } from "./store";

export type GeocodeFn = (candidates: readonly string[], department: string, budget: { remaining: number }) => Promise<GeocodeOutcome>;
/** The INE zone code a point falls in (Montevideo only), or null. */
export type LocateZone = (lng: number, lat: number) => string | null;

export interface ProcessContext {
  usdUyu: number;
  observedAt: string;
  /** Unix seconds: posts older than this are outside the window. */
  minCreateTime: number;
  geocodeBudget: { remaining: number };
  geocode: GeocodeFn;
  locateZone: LocateZone;
  /**
   * Keep a memory row for posts outside the window too (row null, "fuera de la ventana"). Instagram
   * reads each post page by page, ~6 s each, and skips only what the memory has: without the row,
   * an account whose 12 latest posts are old would have all of them read again on every run.
   */
  rememberTooOld?: boolean;
}

export interface ProcessedPost {
  post: SocialPost;
  facts: CaptionFacts;
  /** The offer, or null when the caption was refused or the price is implausible. */
  row: RawRental | null;
  memory: SocialPostRow;
}

export interface ProcessCounts {
  tooOld: number;
  rejected: number;
  implausible: number;
  geocoded: number;
  contradicted: number;
}

let zoneLocator: LocateZone | null = null;
/** Loaded once per process, and only when a point actually needs a zone. */
export function defaultLocateZone(lng: number, lat: number): string | null {
  if (!zoneLocator) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { areaLocator } = require("../../../propertyzones/geo") as typeof import("../../../propertyzones/geo");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { loadOfficialPropertyZoneGeometry } = require("../../../propertyzones/sources/geometry") as typeof import("../../../propertyzones/sources/geometry");
    const zones = loadOfficialPropertyZoneGeometry().zones;
    zoneLocator = areaLocator(zones.map(zone => ({ id: zone.officialCode, geometry: zone.geometry })));
  }
  return zoneLocator(lng, lat);
}

export async function processPosts(
  posts: Iterable<SocialPost>,
  stored: ReadonlyMap<string, SocialPostRow>,
  ctx: ProcessContext,
): Promise<{ processed: ProcessedPost[]; counts: ProcessCounts }> {
  const counts: ProcessCounts = { tooOld: 0, rejected: 0, implausible: 0, geocoded: 0, contradicted: 0 };
  const processed: ProcessedPost[] = [];
  const unique = new Map<string, SocialPost>();
  for (const post of posts) unique.set(post.id, post);
  for (const post of [...unique.values()].sort((a, b) => b.createTime - a.createTime)) {
    const tooOld = post.createTime < ctx.minCreateTime;
    if (tooOld) {
      counts.tooOld++;
      if (!ctx.rememberTooOld) continue;
    }
    const facts = parseCaption(post.lines, post.hashtags);
    const previous = stored.get(post.id);
    let geo: PostGeo | null = previous && typeof previous.latitude === "number" && typeof previous.longitude === "number"
      ? { latitude: previous.latitude, longitude: previous.longitude, neighborhood: previous.geoNeighborhood || undefined }
      : null;
    let geocodeQuery = previous ? previous.geocodeQuery : null;
    let geocodeAddress = previous ? previous.geocodeAddress : null;
    let note: string | null = previous ? previous.note : null;
    // A corner is geocoded ONCE per post: the answer, accepted or refused, is remembered. A post
    // stored without a query was never tried (the budget ran out that run), so it is tried now.
    const neverTried = !previous || (previous.geocodeQuery == null && geo === null);
    if (!tooOld && !facts.rejected && neverTried && facts.addressCandidates.length && ctx.geocodeBudget.remaining > 0) {
      const outcome = await ctx.geocode(facts.addressCandidates, facts.department, ctx.geocodeBudget);
      geocodeQuery = outcome.query;
      geocodeAddress = outcome.point ? outcome.point.address : null;
      note = null;
      if (outcome.point) {
        const zone = ctx.locateZone(outcome.point.longitude, outcome.point.latitude);
        const zoneLabel = zone ? INE_DISPLAY_NAMES[zone] ?? null : null;
        if (pointContradictsBarrio(facts.neighborhood, zoneLabel)) {
          counts.contradicted++;
          note = `punto en ${zoneLabel} contradice el barrio nombrado (${facts.neighborhood}); se descarta`;
        } else {
          counts.geocoded++;
          const fromZone = facts.neighborhood ? "" : neighborhoodFromZoneLabel(zoneLabel);
          geo = { latitude: outcome.point.latitude, longitude: outcome.point.longitude, neighborhood: fromZone || undefined };
          if (fromZone) note = `barrio por coordenada (INE ${zoneLabel})`;
        }
      }
    }
    let row = tooOld ? null : postToRawRental(post, facts, geo, ctx.observedAt);
    let reason = tooOld ? "fuera de la ventana" : facts.rejected;
    if (row && !isPlausibleRent(row.currency === "USD" ? row.price * ctx.usdUyu : row.price, row.propertyType)) {
      reason = "precio inverosímil";
      counts.implausible++;
      row = null;
    }
    if (reason && !tooOld) counts.rejected++;
    processed.push({
      post,
      facts,
      row,
      memory: {
        listingId: `${post.source}:${post.id}`, id: post.id, uniqueId: post.author.uniqueId, createTime: post.createTime, readAt: ctx.observedAt,
        text: post.lines.join("\n").slice(0, 4_000), hashtags: post.hashtags.slice(0, 40), rejected: reason,
        price: row ? row.price : facts.price, currency: row ? row.currency : facts.currency,
        department: row ? row.department : facts.department, neighborhood: row ? row.neighborhood : facts.neighborhood,
        candidates: facts.addressCandidates, geocodeQuery, geocodeAddress,
        latitude: geo ? geo.latitude : null, longitude: geo ? geo.longitude : null, geoNeighborhood: geo && geo.neighborhood ? geo.neighborhood : null,
        note, url: post.url, authorName: post.author.nickname, image: post.cover,
        fetchedAt: post.fetchedAt || ctx.observedAt,
      },
    });
  }
  return { processed, counts };
}
