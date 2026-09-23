// TikTok as a rental source: the adverts inmobiliarias and owners post as short videos, read
// from the CAPTION. Design and measurements: docs/superpowers/specs/2026-09-23-rentals-tiktok-design.md,
// docs/app/RENTALS.md ("TikTok").
//
// One full run:
//   1. videos a person handed us (`RENTALS_TIKTOK_VIDEOS`, short links welcome) over plain HTTP;
//   2. the account registry (seeds + every account that ever published an accepted advert), oldest
//      read first, within `RENTALS_TIKTOK_MAX_ACCOUNTS`;
//   3. one Chrome through the proxy: the hashtag pages, then the account pages;
//   4. every video once, newest first: caption → facts → offer, geocoding a corner ONCE per video;
//   5. the registry and the per-video memory are written; `complete` is true only when every
//      account tracked BEFORE this run was read to the end of its window — only then is a missing
//      video (deleted, or edited into "ALQUILADO") evidence that the flat is gone.
//
// The hourly run reads nothing: a Chrome per hour on the VPS is a risk this repo has already
// paid for once, and captions do not change hour to hour.
import fs from "node:fs";
import { INE_DISPLAY_NAMES } from "../../../propertyzones/names";
import { neighborhoodFromZoneLabel, pointContradictsBarrio } from "../../facebookDetailStore";
import { geocodeCandidates, type GeocodeOutcome } from "../../facebookGeocode";
import { isPlausibleRent } from "../../normalize";
import type { RawRental } from "../../types";
import type { RentalSourceResult } from "../types";
import { readTiktokLists, type ListPlan, type ListReader, type ListResults } from "./browser";
import { parseCaption } from "./caption";
import { readVideoPage, resolveTiktokUrl } from "./page";
import { postToRawRental, type PostGeo, type TiktokPost } from "./post";
import { appDbTiktokStore, type TiktokAccountRow, type TiktokPostRow, type TiktokStore } from "./store";

export interface HarvestTiktokDeps {
  readLists: ListReader;
  readVideo: (url: string) => Promise<TiktokPost | null>;
  resolveUrl: (url: string) => Promise<string | null>;
  geocode: (candidates: readonly string[], department: string, budget: { remaining: number }) => Promise<GeocodeOutcome>;
  /** The INE zone code a point falls in (Montevideo only), or null. */
  locateZone: (lng: number, lat: number) => string | null;
  store: TiktokStore;
  now: () => Date;
  env: NodeJS.ProcessEnv;
}

const DEFAULT_TAGS = "alquilermontevideo,alquileruruguay,alquileresmontevideo,alquilermvd,alquileresuruguay";
const DEFAULT_ACCOUNTS = "inmobiliariaalquilar";
/** Any public video page: it only exists to give the browser the origin's cookies before the tag list. */
const WARM_URL = "https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549";

const list = (value: string | undefined, fallback: string): string[] =>
  String(value ?? fallback).split(",").map(item => item.trim().replace(/^[@#]/, "")).filter(Boolean);
const number = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** `RENTALS_TIKTOK_PROXY`, else the first line of `proxy.txt` (the one Prex already uses), else none. */
export function tiktokProxy(env: NodeJS.ProcessEnv, readFile: (path: string) => string = path => fs.readFileSync(path, "utf8")): string | null {
  const configured = String(env.RENTALS_TIKTOK_PROXY ?? "").trim();
  if (configured) return configured;
  try {
    return readFile("proxy.txt").split(/\r?\n/).map(line => line.trim()).find(Boolean) ?? null;
  } catch {
    return null;
  }
}

let zoneLocator: ((lng: number, lat: number) => string | null) | null = null;
/** Loaded once per process, and only when a point actually needs a zone. */
function defaultLocateZone(lng: number, lat: number): string | null {
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

const EMPTY_LISTS: ListResults = { tags: new Map(), accounts: new Map(), launched: false, note: "" };

export async function harvestTiktok(mode: "full" | "fast", usdUyu: number, overrides: Partial<HarvestTiktokDeps> = {}): Promise<RentalSourceResult> {
  const deps: HarvestTiktokDeps = {
    readLists: readTiktokLists, readVideo: readVideoPage, resolveUrl: resolveTiktokUrl, geocode: geocodeCandidates,
    locateZone: defaultLocateZone, store: appDbTiktokStore, now: () => new Date(), env: process.env,
    ...overrides,
  };
  const { env } = deps;
  if (env.RENTALS_TIKTOK_ENABLED === "0") return { key: "tiktok", ok: true, complete: false, listings: [], note: "deshabilitado por configuración" };
  if (mode === "fast") return { key: "tiktok", ok: true, complete: false, listings: [], note: "sólo en la corrida completa" };

  const now = deps.now();
  const observedAt = now.toISOString();
  const today = observedAt.slice(0, 10);
  const maxAgeDays = number(env.RENTALS_TIKTOK_MAX_AGE_DAYS, 45);
  const minCreateTime = Math.floor(now.getTime() / 1000) - maxAgeDays * 86_400;
  const proxy = tiktokProxy(env);
  const seeds = list(env.RENTALS_TIKTOK_ACCOUNTS, DEFAULT_ACCOUNTS);
  const tags = list(env.RENTALS_TIKTOK_TAGS, DEFAULT_TAGS);
  const maxAccounts = number(env.RENTALS_TIKTOK_MAX_ACCOUNTS, 60);
  const geocodeBudget = { remaining: number(env.RENTALS_TIKTOK_GEOCODE_MAX, 60) };

  // 1. Videos a person handed us: plain HTTP, no browser, no proxy.
  const manual: TiktokPost[] = [];
  let manualFailed = 0;
  for (const raw of list(env.RENTALS_TIKTOK_VIDEOS, "")) {
    const url = await deps.resolveUrl(raw);
    const post = url ? await deps.readVideo(url) : null;
    if (post) manual.push(post);
    else manualFailed++;
  }

  // 2. Who to read: the registry plus the seeds, never-read first, then oldest read, within budget.
  const known = new Map<string, TiktokAccountRow>((await deps.store.loadAccounts()).map(row => [row.uniqueId, row]));
  for (const uniqueId of seeds) {
    if (!known.has(uniqueId)) known.set(uniqueId, { uniqueId, secUid: "", nickname: uniqueId, firstSeen: today, lastReadAt: null, lastPostAt: null, published: 0, reads: 0, note: "semilla" });
  }
  const tracked = [...known.keys()];
  const accounts = [...known.values()]
    .sort((a, b) => (a.lastReadAt || "").localeCompare(b.lastReadAt || "") || a.uniqueId.localeCompare(b.uniqueId))
    .map(row => row.uniqueId)
    .slice(0, maxAccounts);

  // 3. The lists, through one browser.
  const plan: ListPlan = {
    tags, accounts,
    tagPages: number(env.RENTALS_TIKTOK_TAG_PAGES, 3),
    accountPages: number(env.RENTALS_TIKTOK_ACCOUNT_PAGES, 3),
    minCreateTime,
    gapMs: number(env.RENTALS_TIKTOK_GAP_MS, 2_000),
    budgetMs: number(env.RENTALS_TIKTOK_BROWSER_BUDGET_MS, 15 * 60_000),
    proxy,
    warmUrl: WARM_URL,
  };
  const lists = tags.length || accounts.length ? await deps.readLists(plan) : EMPTY_LISTS;

  // 4. Every video once, newest first: caption → facts → offer.
  const posts = new Map<string, TiktokPost>();
  for (const post of manual) posts.set(post.id, post);
  for (const read of [...lists.tags.values(), ...lists.accounts.values()]) for (const post of read.posts) posts.set(post.id, post);
  const stored = await deps.store.loadPosts([...posts.keys()]);
  const rows: TiktokPostRow[] = [];
  const listings: RawRental[] = [];
  const publishedBy = new Map<string, number>();
  const authors = new Map<string, TiktokPost["author"]>();
  let tooOld = 0, rejected = 0, implausible = 0, geocoded = 0, contradicted = 0;
  for (const post of [...posts.values()].sort((a, b) => b.createTime - a.createTime)) {
    if (post.createTime < minCreateTime) { tooOld++; continue; }
    const facts = parseCaption(post.lines, post.hashtags);
    const previous = stored.get(post.id);
    let geo: PostGeo | null = previous && typeof previous.latitude === "number" && typeof previous.longitude === "number"
      ? { latitude: previous.latitude, longitude: previous.longitude, neighborhood: previous.geoNeighborhood || undefined }
      : null;
    let geocodeQuery = previous ? previous.geocodeQuery : null;
    let geocodeAddress = previous ? previous.geocodeAddress : null;
    let note: string | null = null;
    // A corner is geocoded ONCE per video: the answer, accepted or refused, is remembered.
    if (!facts.rejected && !previous && facts.addressCandidates.length && geocodeBudget.remaining > 0) {
      const outcome = await deps.geocode(facts.addressCandidates, facts.department, geocodeBudget);
      geocodeQuery = outcome.query;
      geocodeAddress = outcome.point ? outcome.point.address : null;
      if (outcome.point) {
        const zone = deps.locateZone(outcome.point.longitude, outcome.point.latitude);
        const zoneLabel = zone ? INE_DISPLAY_NAMES[zone] ?? null : null;
        if (pointContradictsBarrio(facts.neighborhood, zoneLabel)) {
          contradicted++;
          note = `punto en ${zoneLabel} contradice el barrio nombrado (${facts.neighborhood}); se descarta`;
        } else {
          geocoded++;
          const fromZone = facts.neighborhood ? "" : neighborhoodFromZoneLabel(zoneLabel);
          geo = { latitude: outcome.point.latitude, longitude: outcome.point.longitude, neighborhood: fromZone || undefined };
          if (fromZone) note = `barrio por coordenada (INE ${zoneLabel})`;
        }
      }
    }
    const row = postToRawRental(post, facts, geo, observedAt);
    let reason = facts.rejected;
    if (row && !isPlausibleRent(row.currency === "USD" ? row.price * usdUyu : row.price, row.propertyType)) {
      reason = "precio inverosímil";
      implausible++;
    } else if (row) {
      listings.push(row);
      publishedBy.set(post.author.uniqueId, (publishedBy.get(post.author.uniqueId) ?? 0) + 1);
      authors.set(post.author.uniqueId, post.author);
    }
    if (reason) rejected++;
    rows.push({
      listingId: `tiktok:${post.id}`, id: post.id, uniqueId: post.author.uniqueId, createTime: post.createTime, readAt: observedAt,
      text: post.lines.join("\n").slice(0, 4_000), hashtags: post.hashtags.slice(0, 40), rejected: reason,
      price: row ? row.price : facts.price, currency: row ? row.currency : facts.currency,
      department: row ? row.department : facts.department, neighborhood: row ? row.neighborhood : facts.neighborhood,
      candidates: facts.addressCandidates, geocodeQuery, geocodeAddress,
      latitude: geo ? geo.latitude : null, longitude: geo ? geo.longitude : null, geoNeighborhood: geo && geo.neighborhood ? geo.neighborhood : null,
      note,
    });
  }

  // 5. The registry: every account read now, plus every author who published something.
  for (const [uniqueId, author] of authors) {
    if (!known.has(uniqueId)) {
      known.set(uniqueId, { uniqueId, secUid: author.secUid, nickname: author.nickname, firstSeen: today, lastReadAt: null, lastPostAt: null, published: 0, reads: 0, note: "descubierta por sus avisos" });
    } else {
      const row = known.get(uniqueId)!;
      if (author.secUid) row.secUid = author.secUid;
      if (author.nickname) row.nickname = author.nickname;
    }
  }
  for (const [uniqueId, read] of lists.accounts) {
    const row = known.get(uniqueId);
    if (!row) continue;
    if (read.failure && !read.posts.length) { row.note = read.failure; continue; }
    row.lastReadAt = observedAt;
    row.reads++;
    row.note = read.exhausted ? null : "lectura cortada por presupuesto";
    const newest = read.posts.reduce((max, post) => Math.max(max, post.createTime), 0);
    if (newest) row.lastPostAt = new Date(newest * 1000).toISOString();
  }
  for (const row of known.values()) row.published = publishedBy.get(row.uniqueId) ?? 0;
  await deps.store.savePosts(rows);
  await deps.store.saveAccounts([...known.values()]);

  // 6. Completeness: absence is evidence only if EVERY account tracked before this run was read to the end of its window.
  const unread = tracked.filter(uniqueId => !(lists.accounts.get(uniqueId) && lists.accounts.get(uniqueId)!.exhausted));
  const complete = tracked.length > 0 && unread.length === 0 && !lists.note;
  const emptyLists = [...lists.tags.values(), ...lists.accounts.values()].filter(read => read.failure).length;
  const ok = listings.length > 0 || (posts.size > 0 && emptyLists === 0);
  const note = `${plural(listings.length, "aviso", "avisos")} de ${plural(posts.size, "video", "videos")}`
    + ` (${rejected} rechazados, ${tooOld} fuera de la ventana de ${maxAgeDays} días, ${implausible} con precio inverosímil)`
    + `; ${plural(lists.tags.size, "hashtag", "hashtags")} y ${lists.accounts.size} de ${plural(known.size, "cuenta", "cuentas")} leídas`
    + (manual.length || manualFailed ? `; ${plural(manual.length, "video manual", "videos manuales")}${manualFailed ? `, ${manualFailed} sin leer` : ""}` : "")
    + `; ${plural(geocoded, "esquina ubicada", "esquinas ubicadas")}${contradicted ? `, ${contradicted} descartadas por contradecir el barrio` : ""}`
    + (proxy ? "" : "; sin proxy: TikTok no lista desde esta IP")
    + (emptyLists ? `; ${plural(emptyLists, "lista vacía", "listas vacías")}` : "")
    + (lists.note ? `; ${lists.note}` : "")
    + (complete ? "" : `; cobertura parcial (${plural(unread.length, "cuenta", "cuentas")} sin leer a fondo)`);
  return { key: "tiktok", ok, complete, listings, note };
}
