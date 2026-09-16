// Weekly store profiles for /tiendas-online-uruguay.
//
// For every store in the curated registry (classes/stores/registry.ts) this reads, one store at a
// time: its own homepage, how old its domain is, its Trustpilot page, its Google Maps listing (only
// if the listing's website IS the store's domain), how often it comes up on r/uruguay and
// r/montevideo, and whether it sells in our own price catalogues. The result is one profile per
// store in APP DB `storeprofiles`.
//
// Three deliberate properties:
//   * A source that fails keeps last week's value, with last week's date. Only a source that answers
//     "there is nothing" clears a value (classes/stores/profile.ts `mergeSignal`).
//   * A run in which the outside sources mostly did not answer is an outage, not a week: when fewer
//     than 40 % of the stores got a single fresh answer and profiles already exist, nothing is
//     written and the job exits 1.
//   * `--dry-run` cannot write. The writer module is only loaded inside the non-dry branch, so a
//     laptop whose `.env` points at production can run the whole thing safely. It still reads our
//     own catalogues when an app database is configured (read-only); without one, that signal is
//     simply reported as not queried.
//
// Flags: `--dry-run` (print, never write) and `--only=<key,key>` (a subset of the registry).
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appDbConfigured } from "./classes/appdb";
import {
  buildProfile,
  formatStoreLogLine,
  isThinRun,
  storeSignalApplies,
  type StoreProfileDoc,
  type StoreSignalName,
} from "./classes/stores/profile";
import { STORES, STORE_BY_KEY } from "./classes/stores/registry";
import { fetchAge } from "./classes/stores/signals/age";
import { loadCatalogPresence, type CatalogSignal } from "./classes/stores/signals/catalog";
import { fetchGoogle } from "./classes/stores/signals/google";
import { fetchRedditMentions, summarizeMentions } from "./classes/stores/signals/reddit";
import { fetchSite } from "./classes/stores/signals/site";
import { fetchTrustpilot } from "./classes/stores/signals/trustpilot";
import type { StoreEntry } from "./classes/stores/types";

/** How far back Reddit mentions are counted. */
const REDDIT_WINDOW_DAYS = 3 * 365;

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
}

async function readStore(
  entry: StoreEntry,
  catalog: Map<string, CatalogSignal> | undefined,
  previous: StoreProfileDoc | null
): Promise<StoreRun> {
  const fetched: Partial<Record<StoreSignalName, unknown>> = {};
  const queried: StoreSignalName[] = [];
  const failed: StoreSignalName[] = [];

  const read = async (name: StoreSignalName, run: () => Promise<unknown>): Promise<void> => {
    if (!storeSignalApplies(entry, name)) {
      fetched[name] = null;
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
  await read("reddit", async () => {
    const sinceUtc = Math.floor(Date.now() / 1000) - REDDIT_WINDOW_DAYS * 86_400;
    const mentions = await fetchRedditMentions(entry, sinceUtc);
    return mentions === undefined ? undefined : summarizeMentions(mentions, new Date().toISOString());
  });

  // Not an outside source: the map was loaded once for the whole run. A store absent from a loaded
  // map sells nothing in our catalogues (`null`); no map at all means we could not look (`undefined`).
  fetched.catalog = storeSignalApplies(entry, "catalog")
    ? catalog === undefined
      ? undefined
      : catalog.get(entry.key) ?? null
    : null;

  return { doc: buildProfile(entry, fetched, previous, new Date()), queried, failed };
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
    parts.push(`reddit ${doc.reddit.mentions}${years ? ` [${years}]` : ""}, ${doc.reddit.threads.length} hilos`);
  }
  if (doc.catalog) parts.push(`catálogo ${doc.catalog.verticals.map((v) => `${v.key}=${v.offers}`).join(" ")}`);
  return `           ${parts.join(" · ") || "sin datos"} → indexable=${doc.indexable}`;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const only = parseOnly(process.argv);

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
  console.log(`[tiendas] ${stores.length} tiendas${dryRun ? " (dry run: no se escribe nada)" : ""}`);

  let previous = new Map<string, StoreProfileDoc>();
  let writer: typeof import("./classes/stores/store") | null = null;
  if (!dryRun) {
    writer = await import("./classes/stores/store");
    previous = await writer.loadStoreProfiles();
  }

  let catalog: Map<string, CatalogSignal> | undefined;
  if (appDbConfigured()) {
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
  for (const entry of stores) {
    const run = await readStore(entry, catalog, previous.get(entry.key) ?? null);
    runs.push(run);
    console.log(formatStoreLogLine(run.doc) + (run.failed.length ? `  sin respuesta: ${run.failed.join(",")}` : ""));
    if (dryRun) console.log(detailLine(run.doc));
  }

  const docs = runs.map((run) => run.doc);
  const queriedStores = runs.filter((run) => run.queried.length > 0);
  const storesWithFreshSignal = queriedStores.filter((run) => run.failed.length < run.queried.length).length;
  const storedProfiles = stores.filter((store) => previous.has(store.key)).length;
  const failures = Object.fromEntries(
    OUTSIDE_SIGNALS.map((name) => [name, runs.filter((run) => run.failed.includes(name)).length])
  );
  console.log(
    `[tiendas] ${storesWithFreshSignal}/${queriedStores.length} tiendas con al menos una señal nueva; ` +
      `sin respuesta por fuente ${JSON.stringify(failures)}; ` +
      `${docs.filter((doc) => doc.indexable).length} indexables; ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
  );

  if (!dryRun) {
    if (isThinRun({ storesWithFreshSignal, stores: queriedStores.length, storedProfiles })) {
      console.error(
        `[tiendas] corrida flaca: sólo ${storesWithFreshSignal} de ${queriedStores.length} tiendas respondieron — se conservan los ${storedProfiles} perfiles guardados`
      );
      process.exit(1);
    }
    await writer!.saveStoreProfiles(docs);
    console.log(`[tiendas] ${docs.length} perfiles guardados`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("[tiendas] fallo", error);
  process.exit(1);
});
