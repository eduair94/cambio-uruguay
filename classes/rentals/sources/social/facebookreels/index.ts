// Facebook Reels as a rental source: the reels inmobiliarias publish, read from the CAPTION,
// logged out. Design and measurements: docs/superpowers/specs/2026-09-24-rentals-social-design.md.
//
// Logged out, Facebook's video search and hashtag pages still embed the first results' whole
// stories (page.ts). Measured from the VPS on 2026-09-24: 8 pages → 24 unique stories, 23 reels,
// 6 from the last 45 days, 4 of them priced — and among them reels from the Dominican Republic and
// Colombia, which the caption parser's Uruguay-evidence guard refuses. A search is a sample, never
// the catalogue: `complete` is always false.
//
// The logged-in profile browser (whose session has been failing its health check since
// 2026-09-24 07:31 UTC) is NOT used: this is a headless Chrome of its own, with no session.
import { geocodeCandidates } from "../../../facebookGeocode";
import { RentalFacebookReelPostModel } from "../../../../models/RentalSocial";
import type { SocialPost } from "../post";
import { defaultLocateZone, processPosts, type GeocodeFn, type LocateZone } from "../process";
import { envList, envNumber, idleRun, plural, type PlatformRun } from "../run";
import { mongoPostStore, type SocialPostStore } from "../store";
import { readFacebookReels, type FacebookReelsReader } from "./browser";

export interface HarvestFacebookReelsDeps {
  readFacebookReels: FacebookReelsReader;
  posts: SocialPostStore;
  geocode: GeocodeFn;
  locateZone: LocateZone;
  now: () => Date;
  env: NodeJS.ProcessEnv;
}

const DEFAULT_QUERIES = [
  "alquiler montevideo", "alquiler apartamento montevideo", "alquilo apartamento", "alquiler casa montevideo",
  "alquiler canelones", "alquiler maldonado", "alquiler pocitos", "alquiler cordon", "alquiler centro montevideo",
  "alquiler buceo", "alquiler malvin", "alquiler punta del este",
].join(",");
const DEFAULT_TAGS = "alquilermontevideo,alquileruruguay";

export function facebookReelsPages(env: NodeJS.ProcessEnv): string[] {
  return [
    ...envList(env.RENTALS_FBREELS_QUERIES, DEFAULT_QUERIES).map(query => `https://www.facebook.com/watch/search/?q=${encodeURIComponent(query)}`),
    ...envList(env.RENTALS_FBREELS_TAGS, DEFAULT_TAGS).map(tag => `https://www.facebook.com/hashtag/${encodeURIComponent(tag)}`),
  ];
}

export async function harvestFacebookReelsRun(mode: "full" | "fast", usdUyu: number, overrides: Partial<HarvestFacebookReelsDeps> = {}): Promise<PlatformRun> {
  const deps: HarvestFacebookReelsDeps = {
    readFacebookReels,
    posts: mongoPostStore(RentalFacebookReelPostModel.collection.name),
    geocode: geocodeCandidates,
    locateZone: defaultLocateZone,
    now: () => new Date(),
    env: process.env,
    ...overrides,
  };
  const { env } = deps;
  if (env.RENTALS_FBREELS_ENABLED === "0") return idleRun("facebookreels", "deshabilitado por configuración");
  if (mode === "fast") return idleRun("facebookreels", "sólo en la corrida completa");

  const now = deps.now();
  const observedAt = now.toISOString();
  const maxAgeDays = envNumber(env.RENTALS_FBREELS_MAX_AGE_DAYS, 45);
  const minCreateTime = Math.floor(now.getTime() / 1000) - maxAgeDays * 86_400;
  const pages = facebookReelsPages(env);
  if (!pages.length) return idleRun("facebookreels", "ninguna búsqueda configurada");

  const results = await deps.readFacebookReels({
    pages,
    gapMs: envNumber(env.RENTALS_FBREELS_GAP_MS, 2_500),
    budgetMs: envNumber(env.RENTALS_FBREELS_BUDGET_MS, 6 * 60_000),
    proxy: String(env.RENTALS_FBREELS_PROXY || "").trim() || null,
  });

  const posts = new Map<string, SocialPost>();
  for (const read of results.pages.values()) for (const post of read.posts) posts.set(post.id, post);
  const stored = await deps.posts.loadPosts([...posts.keys()]);
  const { processed, counts } = await processPosts(posts.values(), stored, {
    usdUyu, observedAt, minCreateTime,
    geocodeBudget: { remaining: envNumber(env.RENTALS_FBREELS_GEOCODE_MAX, 30) },
    geocode: deps.geocode, locateZone: deps.locateZone,
  });
  const listings = processed.filter(p => p.row).map(p => p.row!);
  await deps.posts.savePosts(processed.map(p => p.memory));

  const read = [...results.pages.values()].filter(page => !page.failure).length;
  const failures = [...results.pages.values()].filter(page => page.failure);
  const note = `${plural(listings.length, "aviso", "avisos")} de ${plural(posts.size, "reel", "reels")}`
    + ` (${counts.rejected} rechazados, ${counts.tooOld} fuera de la ventana de ${maxAgeDays} días, ${counts.implausible} con precio inverosímil)`
    + `; ${read} de ${plural(pages.length, "página leída", "páginas leídas")}`
    + (failures.length ? `; ${plural(failures.length, "página fallida", "páginas fallidas")} (${failures[0]!.failure})` : "")
    + `; ${plural(counts.geocoded, "esquina ubicada", "esquinas ubicadas")}${counts.contradicted ? `, ${counts.contradicted} descartadas por contradecir el barrio` : ""}`
    + (results.note ? `; ${results.note}` : "")
    + "; cobertura parcial (una búsqueda sin sesión muestra los primeros resultados)";
  return { result: { key: "facebookreels", ok: results.launched && read > 0, complete: false, listings, note }, processed };
}
