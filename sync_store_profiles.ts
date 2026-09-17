// Weekly store profiles for /tiendas-online-uruguay (plus a nightly `--reddit-only` mode, Task 13).
//
// For every store in the curated registry (classes/stores/registry.ts) this reads, one store at a
// time: its own homepage, how old its domain is, its Trustpilot page, its Google Maps listing (only
// if the listing's website IS the store's domain), how often it comes up on r/uruguay and
// r/montevideo, and whether it sells in our own price catalogues. The result is one profile per
// store in APP DB `storeprofiles`.
//
// Four deliberate properties:
//   * A source that fails keeps last week's value, with last week's date. Only a source that answers
//     "there is nothing" clears a value (classes/stores/profile.ts `mergeSignal`).
//   * Reddit is read incrementally from Arctic Shift (classes/stores/signals/reddit.ts): the first runs
//     backfill 24 months window by window, later runs only read what is new. All stores share one
//     budget of HTTP calls per run (`STORES_REDDIT_MAX_CALLS`, default 900); a store that runs out keeps
//     its cursor and continues next week.
//   * Each store is saved as soon as it is read, and only if at least one outside source (site, domain
//     age, Trustpilot, Google, Reddit) answered: a backfill that takes hours never loses what it did, and
//     a store nobody answered for keeps its stored profile untouched. If the first 10 stores all got no
//     answer, the sources are down: the job stops without writing anything and exits 1.
//   * `--dry-run` cannot write. The writer module is only loaded inside the non-dry branch, so a
//     laptop whose `.env` points at production can run the whole thing safely. It still reads our
//     own catalogues when an app database is configured (read-only); without one, that signal is
//     simply reported as not queried. It does not load the stored profiles either, so a dry run reads
//     Reddit as if from scratch (bounded by the same budget).
//   * `--reddit-only` (Task 13) narrows all of the above to Reddit alone: site/age/trustpilot/google
//     and the catalogue are never queried (their fetch functions are not even called), and the "save
//     only if something answered" rule tightens to "save only if Reddit itself progressed" — a
//     completed call that only re-confirms an already-covered window earns no write
//     (`classes/stores/profile.ts` `shouldQuerySignal`/`shouldLoadCatalog`/`shouldSaveStore`/
//     `redditProgressed`). Meant to run nightly on the same call budget as the weekly job, so the
//     24-month backfill finishes in ~8 nights instead of ~8 weeks (Task 12: ~90 calls/store, 900/week,
//     76 stores).
//   * Task 7: right after a Reddit read, `freshMentionsToClassify` narrows whatever mentions it fetched
//     this run down to the ones that will actually survive being merged into the stored list (their
//     raw text exists only in this run's memory — see classes/stores/signals/tone.ts's module header
//     on why that means classifying them THIS run or never), and `classifyMentions` classifies
//     whichever of those are not already in the profile's `toneCache` — batched, never inventing a
//     tone for a batch Gemini failed to answer. The published `RedditSignal.tone` is an aggregated
//     count, never a per-mention verdict; `toneCache` itself is never queried in either mode's
//     "answered?" bookkeeping and never published (Task 8 excludes it with `.select`).
//
// Flags: `--dry-run` (print, never write), `--only=<key,key>` (a subset of the registry), and
// `--reddit-only` (Task 13: ask Reddit only — every other source keeps last week's value untouched —
// meant to run nightly so the 24-month Reddit backfill finishes in ~8 nights instead of ~8 weeks).
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appDbConfigured } from "./classes/appdb";
import {
  buildProfile,
  carriedReddit,
  formatStoreLogLine,
  needsRedditBackfill,
  redditProgressed,
  shouldLoadCatalog,
  shouldQuerySignal,
  shouldSaveStore,
  shouldStopEarly,
  shouldStopForDeadline,
  storeSignalApplies,
  type FetchedSignals,
  type StoreProfileDoc,
  type StoreRunMode,
  type StoreSignalName,
} from "./classes/stores/profile";
import { STORES, STORE_BY_KEY } from "./classes/stores/registry";
import { fetchAge } from "./classes/stores/signals/age";
import { loadCatalogPresence, type CatalogSignal } from "./classes/stores/signals/catalog";
import { fetchGoogle } from "./classes/stores/signals/google";
import { fetchRedditIncrement, verifyLiveThreads, type RedditMention } from "./classes/stores/signals/reddit";
import { fetchSite } from "./classes/stores/signals/site";
import { classifyMentions, freshMentionsToClassify } from "./classes/stores/signals/tone";
import { fetchTrustpilot } from "./classes/stores/signals/trustpilot";
import type { StoreEntry } from "./classes/stores/types";

/** HTTP calls to Arctic Shift for the whole run, retries included. */
const REDDIT_MAX_CALLS = Number(process.env.STORES_REDDIT_MAX_CALLS || 900);

/** Fix round 1, ruling 2: wall-clock cap for `--reddit-only`, independent of the call budget above —
 * a night of retries and backoff can run long even within budget, and this run must still end before
 * the Sunday weekly job (07:17 UTC) might start. Only stops STARTING a new store; see
 * `shouldStopForDeadline`. */
const REDDIT_ONLY_MAX_MINUTES = Number(process.env.STORES_REDDIT_MAX_MINUTES || 150);

/** The signals read from outside this process. The catalogue is our own database: it answers
 * whenever Mongo does, so counting it would make every run look healthy during a network outage. */
const OUTSIDE_SIGNALS: readonly StoreSignalName[] = ["site", "age", "trustpilot", "google", "reddit"];

function parseOnly(argv: readonly string[]): string[] | null {
  const arg = argv.find((value) => value.startsWith("--only="));
  if (!arg) return null;
  return arg
    .slice("--only=".length)
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

interface StoreRun {
  doc: StoreProfileDoc;
  /** Outside signals that applied to this store. */
  queried: StoreSignalName[];
  /** Outside signals that applied but could not be queried (`undefined`). */
  failed: StoreSignalName[];
  /** At least one outside source answered: the only case in which the store is saved. */
  fresh: boolean;
  /** Reddit was not asked because the run's call budget was already spent. */
  redditNoBudget: boolean;
  /** Mentions read this run, WITH their text — kept in memory for the tone classifier (Task 7). */
  redditFetched: RedditMention[];
  /** How many of them were not stored before. */
  redditNew: number | undefined;
}

async function readStore(
  entry: StoreEntry,
  catalog: Map<string, CatalogSignal> | undefined,
  previous: StoreProfileDoc | null,
  redditBudget: { calls: number },
  mode: StoreRunMode,
  /** Item 7: `--reddit-only`'s wall-clock cap, threaded all the way into `fetchRedditIncrement` so
   * one slow store cannot itself run past it — `undefined` in `full` mode, which has no per-run
   * minute cap. */
  redditDeadlineAt?: number
): Promise<StoreRun> {
  const now = new Date();
  const fetched: FetchedSignals = {};
  const queried: StoreSignalName[] = [];
  const failed: StoreSignalName[] = [];

  const read = async (name: StoreSignalName, run: () => Promise<unknown>): Promise<void> => {
    if (!storeSignalApplies(entry, name)) {
      fetched[name] = null;
      return;
    }
    if (!shouldQuerySignal(entry, name, mode)) {
      // Applies to the store, but this run's mode does not ask it: not queried, not failed — the
      // store simply was not tested against this source tonight. `undefined` keeps last week's value.
      fetched[name] = undefined;
      return;
    }
    queried.push(name);
    let value: unknown;
    try {
      value = await run();
    } catch (error) {
      // The signal modules are written not to throw; if one does anyway, it is one store's one
      // source, and it must cost exactly that — never the rest of the run.
      console.warn(`[tiendas] ${entry.key} ${name} lanzó`, (error as Error)?.message || error);
      value = undefined;
    }
    fetched[name] = value;
    if (value === undefined) failed.push(name);
  };

  const domain = entry.domain as string;
  await read("site", () => fetchSite(domain));
  await read("age", () => fetchAge(domain));
  await read("trustpilot", () => fetchTrustpilot(entry.trustpilotDomain ?? domain));
  await read("google", () => fetchGoogle(entry.name, domain));

  // Reddit resumes from where the stored profile left it — or from scratch when the store's search
  // terms changed (`carriedReddit` then hands no cursor and no mentions).
  const stored = carriedReddit(entry, previous);
  let redditNoBudget = false;
  let redditFetched: RedditMention[] = [];
  let redditNew: number | undefined;
  await read("reddit", async () => {
    if (redditBudget.calls <= 0) {
      redditNoBudget = true;
      return undefined;
    }
    const increment = await fetchRedditIncrement(
      entry,
      stored.cursor,
      Math.floor(now.getTime() / 1000),
      redditBudget,
      redditDeadlineAt
    );
    if (increment) {
      const storedIds = new Set(stored.mentions.map((mention) => mention.id));
      redditFetched = increment.mentions;
      redditNew = increment.mentions.filter((mention) => !storedIds.has(mention.id)).length;
    }
    return increment;
  });

  // Task 7 (fix round 1, I2): an aggregated, automatic tone over Reddit mentions. Only the mentions
  // fetched THIS run carry `text` (in memory only — reddit.ts never stores it, and an already-read
  // window is never re-fetched), so a mention this run does not classify is unclassifiable forever
  // after. `freshMentionsToClassify` narrows `redditFetched` down to exactly the fresh mentions that
  // will actually survive being merged into the stored list (mirroring `mergeStoredMentions`'s own
  // 500-cap), newest first — never a mention this run is about to evict from storage anyway.
  // `classifyMentions` itself skips whatever is already a key of `stored.toneCache`, and both do
  // nothing (no network call) when `redditFetched` is empty. Runs in both `full` and `--reddit-only`
  // mode, right after the Reddit read and before `buildProfile`. A thrown error here is one store's
  // one source, same as every other `read()` above — it must never cost the rest of the run.
  try {
    const toClassify = freshMentionsToClassify(stored.mentions, redditFetched);
    fetched.toneCache = await classifyMentions(entry.name, toClassify, stored.toneCache);
  } catch (error) {
    console.warn(`[tiendas] ${entry.key} tono lanzó`, (error as Error)?.message || error);
  }

  // Not an outside source: the map was loaded once for the whole run. A store absent from a loaded
  // map sells nothing in our catalogues (`null`); no map at all means we could not look (`undefined`).
  fetched.catalog = storeSignalApplies(entry, "catalog")
    ? catalog === undefined
      ? undefined
      : catalog.get(entry.key) ?? null
    : null;

  const doc = buildProfile(entry, fetched, previous, now);

  // Item 5: re-verify the up-to-5 published thread links against Reddit's own live API right before
  // they are stored — see verifyLiveThreads's own header on why (Arctic Shift keeps what got
  // deleted) and its fail-closed behaviour (Reddit unreachable -> no titles this run, counts kept).
  if (doc.reddit && doc.reddit.threads.length) {
    const liveThreads = await verifyLiveThreads(doc.reddit.threads);
    doc.reddit = { ...doc.reddit, threads: liveThreads };
  }

  const progressed = redditProgressed({ redditNew, previousCursor: stored.cursor, nextCursor: doc.redditCursor });

  return {
    doc,
    queried,
    failed,
    fresh: shouldSaveStore({ mode, queried, failed, redditProgressed: progressed }),
    redditNoBudget,
    redditFetched,
    redditNew,
  };
}

function detailLine(doc: StoreProfileDoc): string {
  const parts: string[] = [];
  if (doc.site) {
    const contact = [doc.site.phone && "tel", doc.site.whatsapp && "whatsapp", doc.site.email && "mail"].filter(Boolean);
    parts.push(
      `sitio ${doc.site.finalHost} ${doc.site.platform}${doc.site.https ? " https" : ""}` +
        (contact.length ? ` (${contact.join("/")})` : "") +
        (doc.site.rut ? ` rut=${doc.site.rut}` : "")
    );
  }
  if (doc.age) parts.push(`desde ${doc.age.since} (${doc.age.source})`);
  if (doc.trustpilot) parts.push(`trustpilot ${doc.trustpilot.score} con ${doc.trustpilot.reviews} reseñas`);
  if (doc.google) parts.push(`google ${doc.google.rating} con ${doc.google.reviews} reseñas`);
  if (doc.reddit) {
    const years = Object.entries(doc.reddit.byYear)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, n]) => `${year}:${n}`)
      .join(" ");
    parts.push(
      `reddit ${doc.reddit.mentions}${doc.reddit.capped ? " o más" : ""}${years ? ` [${years}]` : ""}, ` +
        `${doc.reddit.threads.length} hilos, al ${doc.reddit.checkedAt.slice(0, 10)}`
    );
  } else if (doc.redditCursor && !doc.redditCursor.backfillDone) {
    const day = (utc: number): string => new Date(utc * 1000).toISOString().slice(0, 10);
    parts.push(
      `reddit leyendo ${day(doc.redditCursor.backfillStartUtc)}→${day(doc.redditCursor.backfillNextUtc)}, ` +
        `${doc.redditMentions.length} menciones hasta ahora (sin publicar)`
    );
  }
  if (doc.catalog) parts.push(`catálogo ${doc.catalog.verticals.map((v) => `${v.key}=${v.offers}`).join(" ")}`);
  return `           ${parts.join(" · ") || "sin datos"} → indexable=${doc.indexable}`;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const only = parseOnly(process.argv);
  const mode: StoreRunMode = process.argv.includes("--reddit-only") ? "reddit-only" : "full";

  // The app's own env calls this MONGO_URI; the root bridge insists on APP_MONGO_URI so a job can
  // never write the backend database by accident. Map it explicitly, like sync_equipar — but only
  // when there is a value: assigning `undefined` to process.env stores the string "undefined".
  const appUri = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  if (appUri) process.env.APP_MONGO_URI = appUri;
  if (!dryRun && !appDbConfigured()) {
    console.error("[tiendas] APP_MONGO_URI/MONGO_URI is missing — refusing to write the wrong DB");
    process.exit(1);
  }

  let stores: readonly StoreEntry[] = STORES;
  if (only) {
    const unknown = only.filter((key) => !STORE_BY_KEY.has(key));
    if (unknown.length || !only.length) {
      console.error(`[tiendas] --only= con claves que no están en el registro: ${unknown.join(", ") || "(vacío)"}`);
      process.exit(1);
    }
    stores = STORES.filter((store) => only.includes(store.key));
  }

  const startedAt = Date.now();
  // Item 7: the SAME wall-clock cap `--reddit-only` uses to stop BETWEEN stores, now also handed
  // into fetchRedditIncrement so a single slow store's own retries/splits can't run past it either.
  const redditDeadlineAt = mode === "reddit-only" ? startedAt + REDDIT_ONLY_MAX_MINUTES * 60_000 : undefined;
  const redditBudget = { calls: REDDIT_MAX_CALLS };
  console.log(
    `[tiendas] ${stores.length} tiendas, hasta ${REDDIT_MAX_CALLS} llamadas a Reddit` +
      `${mode === "reddit-only" ? " (--reddit-only: sólo Reddit, el resto conserva su valor)" : ""}` +
      `${dryRun ? " (dry run: no se escribe nada)" : ""}`
  );

  let previous = new Map<string, StoreProfileDoc>();
  let writer: typeof import("./classes/stores/store") | null = null;
  if (!dryRun) {
    writer = await import("./classes/stores/store");
    previous = await writer.loadStoreProfiles();
  }

  if (mode === "reddit-only") {
    // Fix round 1, ruling 3: a store whose 24-month backfill already finished has nothing left for
    // this mode to add — the weekly job keeps its signal fresh from there day by day. Filtering here
    // (not inside the loop) means a finished store never counts against the early-stop or wall-clock
    // budgets below either.
    const pending = stores.filter((entry) =>
      needsRedditBackfill(entry, carriedReddit(entry, previous.get(entry.key) ?? null).cursor)
    );
    console.log(
      `[tiendas] --reddit-only: ${pending.length}/${stores.length} tiendas con backfill pendiente` +
        " (el resto ya está al día y lo retoma la corrida semanal)"
    );
    stores = pending;
  }

  let catalog: Map<string, CatalogSignal> | undefined;
  if (!shouldLoadCatalog(mode)) {
    console.log("[tiendas] --reddit-only: catálogos propios sin consultar");
  } else if (appDbConfigured()) {
    try {
      catalog = await loadCatalogPresence(new Date().toISOString());
      console.log(`[tiendas] catálogos propios: ${catalog.size} tiendas con ofertas`);
    } catch (error) {
      console.warn("[tiendas] no se pudieron leer los catálogos propios — se conserva la señal anterior", (error as Error)?.message || error);
    }
  } else {
    console.log("[tiendas] sin APP_MONGO_URI: catálogos propios sin consultar");
  }

  const runs: StoreRun[] = [];
  let saved = 0;
  for (const entry of stores) {
    if (mode === "reddit-only" && shouldStopForDeadline(Date.now() - startedAt, REDDIT_ONLY_MAX_MINUTES)) {
      // Fix round 1, ruling 2: wall-clock cap, independent of the call budget. The store already
      // under way (if any — there is none: this check runs BETWEEN stores) always finishes; this
      // only stops the NEXT one from starting, and the run ends normally right after the loop.
      console.log(`[tiendas] --reddit-only: se cumplieron ${REDDIT_ONLY_MAX_MINUTES} minutos — se corta antes de la próxima tienda`);
      break;
    }
    const run = await readStore(entry, catalog, previous.get(entry.key) ?? null, redditBudget, mode, redditDeadlineAt);
    runs.push(run);

    const unanswered = run.failed.map((name) => (name === "reddit" && run.redditNoBudget ? "reddit(sin presupuesto)" : name));
    console.log(
      formatStoreLogLine(run.doc, run.redditNew) +
        (unanswered.length ? `  sin respuesta: ${unanswered.join(",")}` : "") +
        (run.fresh ? "" : "  (nada nuevo: no se guarda)")
    );
    if (dryRun) console.log(detailLine(run.doc));

    if (!dryRun) {
      if (run.fresh) {
        await writer!.saveStoreProfiles([run.doc]);
        saved++;
      }
    }

    const withFreshSignal = runs.filter((r) => r.fresh).length;
    if (shouldStopEarly({ processed: runs.length, withFreshSignal })) {
      console.error(
        `[tiendas] fuentes caídas: ninguna de las primeras ${runs.length} tiendas ` +
          `${mode === "reddit-only" ? "avanzó en Reddit" : "obtuvo una respuesta nueva"} — ` +
          "se corta la corrida sin escribir nada"
      );
      process.exit(1);
    }
  }

  const queriedStores = runs.filter((run) => run.queried.length > 0);
  const storesWithFreshSignal = runs.filter((run) => run.fresh).length;
  const failures = Object.fromEntries(
    OUTSIDE_SIGNALS.map((name) => [name, runs.filter((run) => run.failed.includes(name)).length])
  );
  const backfilling = runs.filter((run) => run.doc.redditCursor && !run.doc.redditCursor.backfillDone).length;
  const newMentions = runs.reduce((sum, run) => sum + (run.redditNew ?? 0), 0);
  console.log(
    `[tiendas] ${storesWithFreshSignal}/${queriedStores.length} tiendas con al menos una señal nueva; ` +
      `sin respuesta por fuente ${JSON.stringify(failures)}; ` +
      `reddit: ${REDDIT_MAX_CALLS - redditBudget.calls} llamadas, ${newMentions} menciones nuevas, ${backfilling} tiendas con backfill pendiente; ` +
      `${runs.filter((run) => run.doc.indexable).length} indexables; ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
  );
  if (!dryRun) console.log(`[tiendas] ${saved} perfiles guardados`);

  process.exit(0);
}

main().catch((error) => {
  console.error("[tiendas] fallo", error);
  process.exit(1);
});
