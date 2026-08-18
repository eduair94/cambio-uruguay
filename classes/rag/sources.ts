// Which URLs of the site go into the RAG index, and how deep.
//
// The sitemap publishes 4 631 URLs. Feeding all of them in at full text would be both slow and
// actively worse: 2 164 of them are the /en and /pt mirrors of pages the bot will never quote (it
// answers Spanish-speaking Uruguayan subreddits), and ~1 900 more are programmatic families —
// one page per branch, per casa×intent, per currency comparison — that share a template. Indexing
// 529 near-identical branch pages at full text buries the twenty editorial pages that actually
// explain something under a pile of boilerplate that all scores the same.
//
// So: three buckets. Excluded, stub (title + description, one chunk, enough to win "¿dónde cambio
// en Maldonado?"), and full (the pages written to be read).

/** Locale mirrors. The bot writes in Spanish; an English page is never the right link for r/uruguay. */
const LOCALE_PREFIXES = ["/en/", "/pt/"] as const;

/**
 * Never indexed at all.
 *
 * `/blog` is 125 auto-generated daily AI posts and `/newsletter` is the daily digest archive —
 * both are dated, both are machine-written, and dropping either one into a Reddit thread as "the
 * page that answers your question" is exactly the spammy non-answer this bot must not produce.
 * `/buscar` and `/mapa-del-sitio` are navigation surfaces with no content of their own.
 */
const EXCLUDED_PREFIXES = ["/blog", "/newsletter", "/buscar", "/mapa-del-sitio", "/conectar", "/mi-lista"] as const;

/**
 * Programmatic families: indexed as a single title+description chunk.
 *
 * These are real, useful landing pages — they are just templated, so their body text is nearly
 * identical across hundreds of siblings and only the title (the department, the casa, the currency
 * pair) carries the discriminating signal. One chunk of exactly that signal is both cheaper and
 * more accurate than eight chunks of shared boilerplate.
 */
const STUB_PREFIXES = [
  "/sucursal/",
  "/sucursales/",
  "/casa/",
  "/comparativas/",
  "/historico/",
  "/convertir/",
  "/cotizacion/",
  "/sillas-escritorio-uruguay/",
] as const;

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

export interface IndexTarget {
  path: string;
  tier: "full" | "stub";
  lastmod: string;
}

/** Strip the origin and any trailing slash; `/` stays `/`. */
export function normalisePath(loc: string): string {
  let path = loc.trim();
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch {
    /* keep the raw value; the prefix checks below still work on it */
  }
  if (!path.startsWith("/")) path = `/${path}`;
  // Collapse `//` and drop the trailing slash, so `/guias/` and `/guias` are one entry.
  path = path.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path || "/";
}

/** `true` for the locale mirrors and the pages listed as never-indexed. */
export function isExcluded(path: string): boolean {
  if (LOCALE_PREFIXES.some((p) => path.startsWith(p)) || path === "/en" || path === "/pt") return true;
  return EXCLUDED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** `full` unless the path belongs to a programmatic family. */
export function tierOf(path: string): "full" | "stub" {
  return STUB_PREFIXES.some((p) => path.startsWith(p)) ? "stub" : "full";
}

/**
 * The sitemap, filtered and classified. Deduplicates by path (the sitemap can list `/x` and `/x/`).
 *
 * The order is the priority order, because it is also the spending order: the indexer walks this
 * list and stops embedding when the daily budget runs out, so whatever sorts last waits for
 * tomorrow's run. Full-text pages first, so a run that dies halfway has still indexed what matters
 * most — then freshest first, so a page published today is not parked behind three hundred older
 * ones that have not changed since.
 */
export function selectTargets(entries: readonly SitemapEntry[]): IndexTarget[] {
  const byPath = new Map<string, IndexTarget>();
  for (const entry of entries) {
    if (!entry?.loc) continue;
    const path = normalisePath(entry.loc);
    if (isExcluded(path)) continue;
    const existing = byPath.get(path);
    const lastmod = entry.lastmod ?? "";
    // Keep the newest lastmod when the same path appears twice.
    if (existing && existing.lastmod >= lastmod) continue;
    byPath.set(path, { path, tier: tierOf(path), lastmod });
  }
  return [...byPath.values()].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier === "full" ? -1 : 1;
    // ISO dates compare correctly as strings, and a missing lastmod is "", which sorts last —
    // right, because a page the sitemap cannot date is the one we know least about.
    if (a.lastmod !== b.lastmod) return a.lastmod < b.lastmod ? 1 : -1;
    return a.path.localeCompare(b.path);
  });
}
