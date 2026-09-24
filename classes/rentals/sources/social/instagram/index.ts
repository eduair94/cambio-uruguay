// Instagram as a rental source: the posts and reels inmobiliarias publish, read from the CAPTION,
// logged out. Design and measurements: docs/superpowers/specs/2026-09-24-rentals-social-design.md.
//
// There is no discovery without a session: hashtag pages redirect to login. So the source reads
// ACCOUNTS — the seeds (`RENTALS_INSTAGRAM_ACCOUNTS`) and, as candidates, the handles TikTok's
// registry already knows. A TikTok handle is not an Instagram account: `habitarte.inmobiliaria`
// is a Mexican agency there and `cap.propiedades` does not exist. So every candidate is judged by
// what it publishes — `activa` once an advert passes the parser (Uruguay evidence included),
// `descartada` after three posts and none — and `no existe`/`descartada` are looked at again only
// after 30 days.
//
// A profile shows its 12 latest posts. Only the codes the memory does not have are read (~6 s
// each); the known ones still listed are rebuilt from memory. What the profile no longer lists is
// not emitted and does not expire: 12 posts are not a catalogue, so `complete` is always false.
import { geocodeCandidates } from "../../../facebookGeocode";
import { RentalInstagramAccountModel, RentalInstagramPostModel, type RentalInstagramAccountDocument } from "../../../../models/RentalSocial";
import { appDbTiktokStore } from "../../tiktok/store";
import type { SocialPost } from "../post";
import { defaultLocateZone, processPosts, type GeocodeFn, type LocateZone } from "../process";
import { envList, envNumber, idleRun, plural, type PlatformRun } from "../run";
import { mongoAccountStore, mongoPostStore, type SocialAccountStore, type SocialPostStore } from "../store";
import { readInstagram, type InstagramReader } from "./browser";
import { postFromInstagramMemory } from "./page";

export type InstagramStatus = RentalInstagramAccountDocument["status"];
export type InstagramAccountRow = RentalInstagramAccountDocument;

export interface HarvestInstagramDeps {
  readInstagram: InstagramReader;
  accounts: SocialAccountStore<InstagramAccountRow>;
  posts: SocialPostStore;
  /** Handles TikTok's registry knows: Instagram candidates. */
  tiktokHandles: () => Promise<string[]>;
  geocode: GeocodeFn;
  locateZone: LocateZone;
  now: () => Date;
  env: NodeJS.ProcessEnv;
}

const DEFAULT_ACCOUNTS = "inmobiliariaalquilar";
const USERNAME = /^[\w.]{1,30}$/;
const RECHECK_DAYS = 30;
const DISCARD_AFTER = 3;

export async function harvestInstagramRun(mode: "full" | "fast", usdUyu: number, overrides: Partial<HarvestInstagramDeps> = {}): Promise<PlatformRun> {
  const deps: HarvestInstagramDeps = {
    readInstagram,
    accounts: mongoAccountStore<InstagramAccountRow>(RentalInstagramAccountModel.collection.name, "handle"),
    posts: mongoPostStore(RentalInstagramPostModel.collection.name),
    tiktokHandles: () => appDbTiktokStore.loadAccounts().then(rows => rows.map(row => row.uniqueId)),
    geocode: geocodeCandidates,
    locateZone: defaultLocateZone,
    now: () => new Date(),
    env: process.env,
    ...overrides,
  };
  const { env } = deps;
  if (env.RENTALS_INSTAGRAM_ENABLED === "0") return idleRun("instagram", "deshabilitado por configuración");
  if (mode === "fast") return idleRun("instagram", "sólo en la corrida completa");

  const now = deps.now();
  const observedAt = now.toISOString();
  const today = observedAt.slice(0, 10);
  const maxAgeDays = envNumber(env.RENTALS_INSTAGRAM_MAX_AGE_DAYS, 45);
  const minCreateTime = Math.floor(now.getTime() / 1000) - maxAgeDays * 86_400;
  const recheckBefore = new Date(now.getTime() - RECHECK_DAYS * 86_400_000).toISOString();

  // 1. The registry: seeds, then TikTok's handles as candidates.
  const registry = new Map<string, InstagramAccountRow>((await deps.accounts.loadAccounts()).map(row => [row.handle, row]));
  const fresh = (handle: string, status: InstagramStatus): InstagramAccountRow =>
    ({ handle, name: "", status, firstSeen: today, checkedAt: null, lastReadAt: null, lastPostAt: null, published: 0, evaluated: 0, reads: 0, note: null });
  for (const handle of envList(env.RENTALS_INSTAGRAM_ACCOUNTS, DEFAULT_ACCOUNTS).map(h => h.toLowerCase())) {
    if (USERNAME.test(handle) && !registry.has(handle)) registry.set(handle, fresh(handle, "semilla"));
  }
  const candidates = await deps.tiktokHandles().catch(() => [] as string[]);
  for (const handle of candidates.map(h => String(h || "").toLowerCase())) {
    if (USERNAME.test(handle) && !registry.has(handle)) registry.set(handle, fresh(handle, "candidata"));
  }

  // 2. Who is read: seeds and active accounts first (oldest read first), then candidates, then
  //    accounts that were missing or discarded more than 30 days ago.
  const eligible = [...registry.values()].filter(row =>
    row.status === "semilla" || row.status === "activa" || row.status === "candidata" || !row.checkedAt || row.checkedAt < recheckBefore);
  const tier = (row: InstagramAccountRow): number => (row.status === "semilla" || row.status === "activa" ? 0 : row.status === "candidata" ? 1 : 2);
  const accounts = eligible
    .sort((a, b) => tier(a) - tier(b)
      || (tier(a) === 0 ? (a.lastReadAt || "").localeCompare(b.lastReadAt || "") : a.firstSeen.localeCompare(b.firstSeen))
      || a.handle.localeCompare(b.handle))
    .slice(0, envNumber(env.RENTALS_INSTAGRAM_MAX_ACCOUNTS, 40))
    .map(row => row.handle);
  if (!accounts.length) return idleRun("instagram", "ninguna cuenta para leer");

  // 3. One browser: profiles, then only the codes the memory does not have.
  const stored = await deps.posts.loadPostsByAuthors(accounts);
  const results = await deps.readInstagram({
    accounts,
    known: new Set(stored.keys()),
    maxNewPerAccount: envNumber(env.RENTALS_INSTAGRAM_MAX_NEW_POSTS, 12),
    gapMs: envNumber(env.RENTALS_INSTAGRAM_GAP_MS, 2_500),
    budgetMs: envNumber(env.RENTALS_INSTAGRAM_BUDGET_MS, 12 * 60_000),
    proxy: String(env.RENTALS_INSTAGRAM_PROXY || "").trim() || null,
  });

  // 4. Posts: read today, plus the known ones the profile still lists.
  const posts = new Map<string, SocialPost>();
  let rebuilt = 0;
  for (const read of results.accounts.values()) {
    for (const post of read.posts) posts.set(post.id, post);
    for (const code of read.profile && read.profile.exists ? read.profile.codes : []) {
      if (posts.has(code)) continue;
      const row = stored.get(code);
      const post = row ? postFromInstagramMemory(row) : null;
      if (post) { posts.set(code, post); rebuilt++; }
    }
  }
  const { processed, counts } = await processPosts(posts.values(), stored, {
    usdUyu, observedAt, minCreateTime,
    geocodeBudget: { remaining: envNumber(env.RENTALS_INSTAGRAM_GEOCODE_MAX, 40) },
    geocode: deps.geocode, locateZone: deps.locateZone,
  });
  const listings = processed.filter(p => p.row).map(p => p.row!);

  // 5. The registry learns from what each account published.
  const evaluatedBy = new Map<string, number>();
  const acceptedBy = new Map<string, number>();
  for (const p of processed) {
    const handle = p.post.author.uniqueId.toLowerCase();
    evaluatedBy.set(handle, (evaluatedBy.get(handle) ?? 0) + 1);
    if (p.row) acceptedBy.set(handle, (acceptedBy.get(handle) ?? 0) + 1);
  }
  let answered = 0;
  for (const [handle, read] of results.accounts) {
    const row = registry.get(handle);
    if (!row) continue;
    if (!read.profile) { row.note = "perfil ilegible"; continue; }
    answered++;
    row.checkedAt = observedAt;
    if (!read.profile.exists) { row.status = "no existe"; row.note = null; continue; }
    row.name = read.profile.name || row.name;
    row.lastReadAt = observedAt;
    row.reads++;
    row.note = read.failures ? plural(read.failures, "post sin leer", "posts sin leer") : null;
    const newest = [...posts.values()].filter(post => post.author.uniqueId.toLowerCase() === handle).reduce((max, post) => Math.max(max, post.createTime), 0);
    if (newest) row.lastPostAt = new Date(newest * 1000).toISOString();
    // Only posts first judged today add to the tally: a post rebuilt from memory was counted when it was read.
    const judgedToday = read.posts.filter(post => post.createTime >= minCreateTime).length;
    row.evaluated += judgedToday;
    row.published = acceptedBy.get(handle) ?? 0;
    if (row.published > 0 && (row.status === "candidata" || row.status === "descartada" || row.status === "no existe")) row.status = "activa";
    else if (row.status === "candidata" && row.evaluated >= DISCARD_AFTER && row.published === 0) row.status = "descartada";
    else if (row.status === "descartada" && row.published === 0) row.note = "sigue sin avisos de Uruguay";
  }
  await deps.posts.savePosts(processed.map(p => p.memory));
  await deps.accounts.saveAccounts([...registry.values()]);

  const tally = (status: InstagramStatus): number => [...registry.values()].filter(row => row.status === status).length;
  const note = `${plural(listings.length, "aviso", "avisos")} de ${plural(posts.size, "post", "posts")}`
    + ` (${counts.rejected} rechazados, ${counts.tooOld} fuera de la ventana de ${maxAgeDays} días, ${counts.implausible} con precio inverosímil; ${rebuilt} desde la memoria)`
    + `; ${answered} de ${plural(accounts.length, "cuenta leída", "cuentas leídas")}`
    + ` (${tally("semilla") + tally("activa")} activas, ${tally("candidata")} candidatas, ${tally("descartada")} descartadas, ${tally("no existe")} sin perfil)`
    + `; ${plural(counts.geocoded, "esquina ubicada", "esquinas ubicadas")}${counts.contradicted ? `, ${counts.contradicted} descartadas por contradecir el barrio` : ""}`
    + (results.note ? `; ${results.note}` : "")
    + "; cobertura parcial (un perfil muestra sus 12 posts más recientes)";
  return { result: { key: "instagram", ok: results.launched && answered > 0, complete: false, listings, note }, processed };
}
