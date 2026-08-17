// Rebuild the RAG index of cambio-uruguay.com (pm2 app `currency-rag-index`).
//
// Crawls the public sitemap, extracts the readable text of every page worth indexing, and embeds
// the slices whose content changed since the last run. The index lives in the APP database — the
// Mongo on the deploy box — so it needs APP_MONGO_URI; without it the job refuses to run rather
// than writing the index into the wrong database.
//
// Incremental by content hash: a normal day re-crawls everything and re-embeds almost nothing.
import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import { appDbConfigured } from "./classes/appdb";
import { chunkPage } from "./classes/rag/chunk";
import { crawlAll } from "./classes/rag/crawl";
import { embeddingsConfigured, EMBED_DIMS, EMBED_MODEL } from "./classes/rag/embed";
import { selectTargets, type SitemapEntry } from "./classes/rag/sources";
import { loadHashes, pruneMissing, upsertPageChunks, type EmbedBudget } from "./classes/rag/store";
import { notifyAdmin } from "./classes/notify";

const BASE_URL = (process.env.SITE_BASE_URL || "https://cambio-uruguay.com").replace(/\/+$/, "");
/** The Nuxt sitemap module's own source route — the same list `/sitemap.xml` is projected from. */
const SITEMAP_URLS = `${BASE_URL}/api/__sitemap__/urls`;

/** A sitemap this much smaller than what we already indexed is a broken fetch, not a smaller site. */
const MIN_EXPECTED_URLS = 200;

/**
 * Embeddings this job may spend in one run.
 *
 * The Gemini embedding endpoint is metered PER DAY, and every item inside a batch counts as one
 * request — measured against the live API: `EmbedContentRequestsPerDayPerUserPerProjectPerModel-
 * FreeTier`, limit 1 000. The corpus is ~3 400 embeddable chunks, so a first build cannot finish in
 * one day on the free tier however it is paced; the honest options are to spend a budget and
 * converge over several days, or to hammer the quota and lose the rest of each run to 429s.
 *
 * 700 of the 1 000 leaves ~300 for the Reddit bot, which embeds one query per candidate thread out
 * of the same daily allowance. Raise both once the project has billing on for embeddings — the
 * whole corpus is ~1.5 M tokens, which is cents, and then the first build finishes in one pass.
 */
const DAILY_BUDGET = ((): number => {
  const raw = Number(process.env.RAG_EMBED_DAILY_BUDGET);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 700;
})();

async function fetchSitemap(): Promise<SitemapEntry[]> {
  const res = await axios.get(SITEMAP_URLS, {
    timeout: 60000,
    signal: AbortSignal.timeout(62000),
    headers: { "User-Agent": "CambioUruguayRagIndexer/1.0" },
  });
  const data = res.data;
  const rows: any[] = Array.isArray(data) ? data : Array.isArray(data?.urls) ? data.urls : [];
  return rows
    .map((row) => (typeof row === "string" ? { loc: row } : { loc: row?.loc ?? row?.url ?? "", lastmod: row?.lastmod }))
    .filter((row) => row.loc);
}

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error("[rag] APP_MONGO_URI no está seteada — el índice vive en la Mongo de la app; no corro a ciegas");
    process.exit(1);
  }
  if (!embeddingsConfigured()) {
    console.warn("[rag] sin GEMINI_API_KEY — no se puede embeber nada, el índice queda como está");
    process.exit(0);
  }

  let entries: SitemapEntry[] = [];
  try {
    entries = await fetchSitemap();
  } catch (e: any) {
    console.error("[rag] no pude leer el sitemap:", e?.message || e);
    process.exit(1);
  }

  if (entries.length < MIN_EXPECTED_URLS) {
    console.error(`[rag] el sitemap devolvió sólo ${entries.length} URLs — parece un fetch roto, no toco el índice`);
    process.exit(1);
  }

  const targets = selectTargets(entries);
  const full = targets.filter((t) => t.tier === "full").length;
  console.log(
    `[rag] sitemap: ${entries.length} URLs → ${targets.length} a indexar (${full} completas, ${targets.length - full} stub); ` +
      `modelo ${EMBED_MODEL} @ ${EMBED_DIMS}d`
  );

  const known = await loadHashes();
  const totals = { pages: 0, embedded: 0, reused: 0, removed: 0, failed: 0, lexicalOnly: 0, deferred: 0 };
  const budget: EmbedBudget = { remaining: DAILY_BUDGET };
  const started = Date.now();

  const { crawled, failed } = await crawlAll(targets, {
    baseUrl: BASE_URL,
    concurrency: 4,
    onPage: async (page) => {
      const chunks = chunkPage(page);
      if (!chunks.length) return;
      const result = await upsertPageChunks(page.path, chunks, known.get(page.path), page.crawledAt, budget);
      totals.pages++;
      totals.embedded += result.embedded;
      totals.reused += result.reused;
      totals.removed += result.removed;
      totals.failed += result.failed;
      totals.lexicalOnly += result.lexicalOnly;
      totals.deferred += result.deferred;
      if (totals.pages % 200 === 0) {
        console.log(
          `[rag] ${totals.pages}/${targets.length} páginas, ${totals.embedded} chunks embebidos, ` +
            `${budget.remaining} del presupuesto sin usar`
        );
      }
    },
  });

  const prune = await pruneMissing(new Set(targets.map((t) => t.path)));

  const seconds = Math.round((Date.now() - started) / 1000);
  const line =
    `[rag] listo en ${seconds}s: ${crawled} páginas crawleadas (${failed.length} fallaron), ` +
    `${totals.embedded} chunks embebidos, ${totals.reused} reusados, ${totals.lexicalOnly} sólo-léxicos, ` +
    `${totals.removed + prune.removed} borrados, ${totals.failed} embeddings fallidos`;
  console.log(line);
  if (failed.length) console.warn(`[rag] fallaron: ${failed.slice(0, 20).join(", ")}${failed.length > 20 ? "…" : ""}`);

  // An incomplete index is a normal state during the first few days, not an error — but it must be
  // stated, because "the bot never answers anything" and "the index is 40 % built" look identical
  // from the outside.
  if (totals.deferred) {
    console.warn(
      `[rag] ${totals.deferred} chunks quedaron sin embeber: se acabó el presupuesto diario ` +
        `(${DAILY_BUDGET}). El índice se completa en las próximas corridas; subí ` +
        `RAG_EMBED_DAILY_BUDGET si el proyecto tiene facturación habilitada para embeddings.`
    );
  }

  // Only shout when something is actually wrong: a silent daily success ping trains people to ignore
  // the channel, which is how the one that matters gets missed.
  if (totals.failed > 20 || failed.length > targets.length * 0.1 || prune.refused) {
    await notifyAdmin(`⚠️ *Índice RAG* con problemas\n${line}${prune.refused ? "\nPrune rechazado (sitemap sospechoso)" : ""}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("[rag] la indexación falló", e);
  process.exit(1);
});
