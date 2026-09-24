// TikTok as a rental source: the adverts inmobiliarias and owners post as short videos, read
// from the CAPTION. Design and measurements: docs/superpowers/specs/2026-09-23-rentals-tiktok-design.md,
// docs/app/RENTALS.md ("TikTok").
//
// One full run:
//   1. videos a person handed us (`RENTALS_TIKTOK_VIDEOS`, short links welcome) over plain HTTP;
//   2. the account registry (seeds + every account that ever published an accepted advert), oldest
//      read first, within `RENTALS_TIKTOK_MAX_ACCOUNTS`, each over plain HTTP from its creator
//      embed (embed.ts) — the browser never listed an account from this IP;
//   3. one Chrome through the proxy, only for the hashtag pages and the manual videos the WAF
//      challenged;
//   4. every video once, newest first: caption → facts → offer (../social/process.ts);
//   5. the registry and the per-video memory are written; `complete` is true only when every
//      account tracked BEFORE this run was read to the end of its window — only then is a missing
//      video (deleted, or edited into "ALQUILADO") evidence that the flat is gone.
//
// The hourly run reads nothing: a Chrome per hour on the VPS is a risk this repo has already
// paid for once, and captions do not change hour to hour. What gets PUBLISHED is decided one level
// up, in ../social/index.ts: the copy guard keeps one copy of a flat that other networks carry too.
import fs from "node:fs";
import { geocodeCandidates } from "../../facebookGeocode";
import type { RentalSourceResult } from "../types";
import { defaultLocateZone, processPosts, type GeocodeFn, type LocateZone } from "../social/process";
import { envList, envNumber, idleRun, plural, type PlatformRun } from "../social/run";
import { readTiktokLists, type ListPlan, type ListReader, type ListResults } from "./browser";
import { readCreatorEmbeds, type AccountReader, type CreatorRead } from "./embed";
import { readVideoPage, resolveTiktokUrl } from "./page";
import type { TiktokPost } from "./post";
import { appDbTiktokStore, type TiktokAccountRow, type TiktokStore } from "./store";

export interface HarvestTiktokDeps {
  readLists: ListReader;
  readAccounts: AccountReader;
  readVideo: (url: string) => Promise<TiktokPost | null>;
  resolveUrl: (url: string) => Promise<string | null>;
  geocode: GeocodeFn;
  locateZone: LocateZone;
  store: TiktokStore;
  now: () => Date;
  env: NodeJS.ProcessEnv;
}

const DEFAULT_TAGS = "alquilermontevideo,alquileruruguay,alquileresmontevideo,alquilermvd,alquileresuruguay";
const DEFAULT_ACCOUNTS = "inmobiliariaalquilar";
/** Any public video page: it only exists to give the browser the origin's cookies before the tag list. */
const WARM_URL = "https://www.tiktok.com/@inmobiliariaalquilar/video/7688511584326454549";

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

const EMPTY_LISTS: ListResults = { tags: new Map(), accounts: new Map(), videos: new Map(), launched: false, note: "" };

export async function harvestTiktokRun(mode: "full" | "fast", usdUyu: number, overrides: Partial<HarvestTiktokDeps> = {}): Promise<PlatformRun> {
  const deps: HarvestTiktokDeps = {
    readLists: readTiktokLists, readAccounts: plan => readCreatorEmbeds(plan), readVideo: readVideoPage, resolveUrl: resolveTiktokUrl, geocode: geocodeCandidates,
    locateZone: defaultLocateZone, store: appDbTiktokStore, now: () => new Date(), env: process.env,
    ...overrides,
  };
  const { env } = deps;
  if (env.RENTALS_TIKTOK_ENABLED === "0") return idleRun("tiktok", "deshabilitado por configuración");
  if (mode === "fast") return idleRun("tiktok", "sólo en la corrida completa");

  const now = deps.now();
  const observedAt = now.toISOString();
  const today = observedAt.slice(0, 10);
  const maxAgeDays = envNumber(env.RENTALS_TIKTOK_MAX_AGE_DAYS, 45);
  const minCreateTime = Math.floor(now.getTime() / 1000) - maxAgeDays * 86_400;
  const proxy = tiktokProxy(env);
  const seeds = envList(env.RENTALS_TIKTOK_ACCOUNTS, DEFAULT_ACCOUNTS);
  const tags = envList(env.RENTALS_TIKTOK_TAGS, DEFAULT_TAGS);
  const maxAccounts = envNumber(env.RENTALS_TIKTOK_MAX_ACCOUNTS, 60);
  const geocodeBudget = { remaining: envNumber(env.RENTALS_TIKTOK_GEOCODE_MAX, 60) };

  // 1. Videos a person handed us: plain HTTP first (free when it works); the ones the WAF
  //    challenges go to the browser below, through the proxy.
  const manual: TiktokPost[] = [];
  const pendingVideos: string[] = [];
  let manualFailed = 0;
  for (const raw of envList(env.RENTALS_TIKTOK_VIDEOS, "")) {
    const url = await deps.resolveUrl(raw);
    if (!url) {
      // Even the redirect of a short link gets the WAF interstitial at times (the 14:15 UTC sweep
      // of 2026-09-23 read no manual video although the browser fallback was live). The browser
      // follows the redirect itself, so the short link goes there as it is.
      if (/^https:\/\/(?:[a-z]+\.)?tiktok\.com\//i.test(raw)) pendingVideos.push(raw);
      else manualFailed++;
      continue;
    }
    const post = await deps.readVideo(url);
    if (post) manual.push(post);
    else pendingVideos.push(url);
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

  // 3. The accounts over plain HTTP, then the hashtags and the challenged videos through one browser.
  const accountReads: Map<string, CreatorRead> = accounts.length
    ? await deps.readAccounts({
      accounts, minCreateTime,
      gapMs: envNumber(env.RENTALS_TIKTOK_EMBED_GAP_MS, 2_000),
      budgetMs: envNumber(env.RENTALS_TIKTOK_EMBED_BUDGET_MS, 6 * 60_000),
    })
    : new Map();
  const plan: ListPlan = {
    tags, accounts: [], videos: pendingVideos,
    tagPages: envNumber(env.RENTALS_TIKTOK_TAG_PAGES, 3),
    accountPages: envNumber(env.RENTALS_TIKTOK_ACCOUNT_PAGES, 3),
    minCreateTime,
    gapMs: envNumber(env.RENTALS_TIKTOK_GAP_MS, 2_000),
    budgetMs: envNumber(env.RENTALS_TIKTOK_BROWSER_BUDGET_MS, 15 * 60_000),
    proxy,
    warmUrl: WARM_URL,
  };
  const lists = tags.length || pendingVideos.length ? await deps.readLists(plan) : EMPTY_LISTS;
  for (const url of pendingVideos) {
    const post = lists.videos.get(url);
    if (post) manual.push(post);
    else manualFailed++;
  }

  // 4. Every video once, newest first: caption → facts → offer.
  const posts = new Map<string, TiktokPost>();
  for (const post of manual) posts.set(post.id, post);
  for (const read of [...lists.tags.values(), ...accountReads.values()]) for (const post of read.posts) posts.set(post.id, post);
  const stored = await deps.store.loadPosts([...posts.keys()]);
  const { processed, counts } = await processPosts(posts.values(), stored, {
    usdUyu, observedAt, minCreateTime, geocodeBudget, geocode: deps.geocode, locateZone: deps.locateZone,
  });
  const listings = processed.filter(p => p.row).map(p => p.row!);
  const publishedBy = new Map<string, number>();
  const authors = new Map<string, TiktokPost["author"]>();
  for (const p of processed) {
    if (!p.row) continue;
    publishedBy.set(p.post.author.uniqueId, (publishedBy.get(p.post.author.uniqueId) ?? 0) + 1);
    authors.set(p.post.author.uniqueId, p.post.author);
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
  for (const [uniqueId, read] of accountReads) {
    const row = known.get(uniqueId);
    if (!row) continue;
    if (read.exists === false) { row.note = "no existe en TikTok"; continue; }
    if (read.failure && !read.posts.length) { row.note = read.failure; continue; }
    if (read.nickname) row.nickname = read.nickname;
    row.lastReadAt = observedAt;
    row.reads++;
    row.note = read.exhausted ? null : "publicó más videos de los que muestra la inserción";
    const newest = read.posts.reduce((max, post) => Math.max(max, post.createTime), 0);
    if (newest) row.lastPostAt = new Date(newest * 1000).toISOString();
  }
  for (const row of known.values()) row.published = publishedBy.get(row.uniqueId) ?? 0;
  await deps.store.savePosts(processed.map(p => p.memory));
  await deps.store.saveAccounts([...known.values()]);

  // 6. Completeness: absence is evidence only if EVERY account tracked before this run was read to the end of its window.
  // A tag list the browser could not read does not make an account unread; the browser's own
  // trouble (budget, launch) only matters for the videos it was asked to fetch.
  const unread = tracked.filter(uniqueId => !(accountReads.get(uniqueId) && accountReads.get(uniqueId)!.exhausted));
  const complete = tracked.length > 0 && unread.length === 0;
  const emptyLists = lists.tags.size ? [...lists.tags.values()].filter(read => read.failure).length : 0;
  const accountFailures = [...accountReads.values()].filter(read => read.failure).length;
  const answered = [...accountReads.values()].filter(read => !read.failure).length;
  const ok = listings.length > 0 || (posts.size > 0 && emptyLists === 0 && accountFailures === 0);
  const note = `${plural(listings.length, "aviso", "avisos")} de ${plural(posts.size, "video", "videos")}`
    + ` (${counts.rejected} rechazados, ${counts.tooOld} fuera de la ventana de ${maxAgeDays} días, ${counts.implausible} con precio inverosímil)`
    + `; ${plural(lists.tags.size, "hashtag", "hashtags")} y ${answered} de ${plural(known.size, "cuenta", "cuentas")} leídas`
    + (accountFailures ? `, ${accountFailures} sin respuesta` : "")
    + (manual.length || manualFailed ? `; ${plural(manual.length, "video manual", "videos manuales")}${manualFailed ? `, ${manualFailed} sin leer` : ""}` : "")
    + `; ${plural(counts.geocoded, "esquina ubicada", "esquinas ubicadas")}${counts.contradicted ? `, ${counts.contradicted} descartadas por contradecir el barrio` : ""}`
    + (proxy || !tags.length ? "" : "; sin proxy: los hashtags no listan desde esta IP")
    + (emptyLists ? `; ${plural(emptyLists, "lista vacía", "listas vacías")}` : "")
    + (lists.note ? `; ${lists.note}` : "")
    + (complete ? "" : `; cobertura parcial (${plural(unread.length, "cuenta", "cuentas")} sin leer a fondo)`);
  return { result: { key: "tiktok", ok, complete, listings, note }, processed };
}

/** The TikTok result alone, without the copy guard (tests, and callers that only want TikTok). */
export async function harvestTiktok(mode: "full" | "fast", usdUyu: number, overrides: Partial<HarvestTiktokDeps> = {}): Promise<RentalSourceResult> {
  return (await harvestTiktokRun(mode, usdUyu, overrides)).result;
}
