// One profile per store for /tiendas-online-uruguay: the registry's identity plus the six dated
// signals, assembled once a week by sync_store_profiles.ts and stored in APP DB `storeprofiles`.
//
// The profile is where the `undefined`/`null` convention of classes/stores/signals/ pays off:
//   * `undefined` — the source could not be queried this week (crt.sh timed out, the Trustpilot
//     service was down). The last good value stays, WITH ITS OLD `checkedAt`, so the page can say
//     when it was true instead of pretending it was re-read today.
//   * `null` — the source answered and there is nothing (no Trustpilot page, no Maps listing whose
//     website is this domain). The old value goes: publishing it would contradict the source.
//
// A kept value does not live forever. `countFreshSignals` ignores anything checked more than
// STORE_SIGNAL_MAX_AGE_DAYS ago, so a source that stays down for two months stops counting towards
// `indexable` by itself — no one has to remember to expire it. The app mirrors the same 60 days
// (Task 8) so the page hides exactly what this stops counting.
//
// Reddit is the exception to "one value per signal": it is read incrementally (classes/stores/signals/
// reddit.ts), so the profile also keeps the mentions read so far (metadata only, never text or author),
// the cursor of where reading stands, and a fingerprint of the terms they were searched with. The signal
// is summarized over ALL stored mentions, and only once the 24-month backfill is complete: a count
// covering half the window would read as a fact about the store.
//
// No verdict lives here: `signals` is how many independent, dated facts we can show, never a score
// of how trustworthy the store is. `indexable` only decides whether a page has enough to say.
import type { StoreEntry, StoreKind, StoreRubro } from "./types";
import type { SiteSignal } from "./signals/site";
import type { AgeSignal } from "./signals/age";
import type { TrustpilotSignal } from "./signals/trustpilot";
import type { GoogleSignal } from "./signals/google";
import {
  mergeStoredMentions,
  redditTermsKey,
  summarizeMentions,
  type RedditCursor,
  type RedditMention,
  type RedditSignal,
  type StoredRedditMention,
} from "./signals/reddit";
import type { CatalogSignal } from "./signals/catalog";

export const STORE_SIGNAL_MAX_AGE_DAYS = 60;

/** A page with fewer fresh signals than this has too little to say to be worth indexing. */
const INDEXABLE_MIN_SIGNALS = 3;

/** If this many stores in a row, from the start of a run, got no fresh outside answer, sources are down. */
const EARLY_STOP_STORES = 10;

export type StoreSignalName = "site" | "age" | "trustpilot" | "google" | "reddit" | "catalog";

export const STORE_SIGNAL_NAMES: readonly StoreSignalName[] = ["site", "age", "trustpilot", "google", "reddit", "catalog"];

export interface StoreProfileDoc {
  key: string;
  name: string;
  domain: string | null;
  kind: StoreKind;
  rubros: StoreRubro[];
  aliases: string[];
  site: SiteSignal | null;
  age: AgeSignal | null;
  trustpilot: TrustpilotSignal | null;
  google: GoogleSignal | null;
  reddit: RedditSignal | null;
  catalog: CatalogSignal | null;
  /** Everything read from Reddit so far, newest first, at most 500 — metadata only. Never published. */
  redditMentions: StoredRedditMention[];
  /** Where Reddit reading stands; null when it never started (or the terms changed). Never published. */
  redditCursor: RedditCursor | null;
  /** `redditTermsKey` of the terms the stored mentions were searched with; null when Reddit does not apply. */
  redditTermsKey: string | null;
  signals: number;
  indexable: boolean;
  /** YYYY-MM-DD */
  firstSeen: string;
  /** YYYY-MM-DD */
  lastSeen: string;
}

type SignalFields = Pick<StoreProfileDoc, StoreSignalName>;

/**
 * `fetched === undefined` keeps `previous` (or `null` when there was none); anything else — a fresh
 * value or an explicit `null` — replaces it. Never returns `undefined`: what gets stored is always a
 * value or a deliberate absence.
 */
export function mergeSignal<T extends { checkedAt: string }>(
  previous: T | null | undefined,
  fetched: T | null | undefined
): T | null {
  if (fetched === undefined) return previous ?? null;
  return fetched;
}

const MAX_AGE_MS = STORE_SIGNAL_MAX_AGE_DAYS * 86_400_000;

function isRecent(checkedAt: string, now: Date): boolean {
  const at = Date.parse(checkedAt);
  if (Number.isNaN(at)) return false;
  return now.getTime() - at <= MAX_AGE_MS;
}

/**
 * How many signals a page can show today. A signal counts when it exists, is at most
 * STORE_SIGNAL_MAX_AGE_DAYS old, and actually says something: a site we could not read (blocked), a
 * Reddit search with zero mentions and a catalogue presence with zero offers are real, dated
 * answers, but none of them is a fact about the store worth a page.
 */
export function countFreshSignals(doc: SignalFields, now: Date): number {
  let count = 0;
  if (doc.site && doc.site.status === "ok" && isRecent(doc.site.checkedAt, now)) count++;
  if (doc.age && isRecent(doc.age.checkedAt, now)) count++;
  if (doc.trustpilot && isRecent(doc.trustpilot.checkedAt, now)) count++;
  if (doc.google && isRecent(doc.google.checkedAt, now)) count++;
  if (doc.reddit && doc.reddit.mentions > 0 && isRecent(doc.reddit.checkedAt, now)) count++;
  if (doc.catalog && doc.catalog.offers > 0 && isRecent(doc.catalog.checkedAt, now)) count++;
  return count;
}

/**
 * Whether a signal is meaningful for this store at all — the job only queries what applies, and
 * `buildProfile` clears what does not, so a registry edit (a store reclassified as `compra-exterior`,
 * Reddit terms dropped as too noisy, `trustpilotDomain: null`) removes the old value on the next run
 * instead of carrying it for 60 days.
 *   * site/age/trustpilot/google need the store's own domain;
 *   * age and Google Maps only mean something for a Uruguayan storefront (a marketplace's domain age
 *     or a Maps listing for amazon.com describes no seller here);
 *   * Trustpilot is off when the registry says `trustpilotDomain: null`;
 *   * Reddit is off when the name is too ambiguous to search (`redditTerms: []`);
 *   * the catalogue is our own data and always applies.
 */
export function storeSignalApplies(entry: StoreEntry, name: StoreSignalName): boolean {
  const hasDomain = Boolean(entry.domain);
  switch (name) {
    case "site":
      return hasDomain;
    case "age":
    case "google":
      return hasDomain && entry.kind === "tienda-uy";
    case "trustpilot":
      return hasDomain && entry.trustpilotDomain !== null;
    case "reddit":
      return entry.redditTerms.length > 0;
    case "catalog":
      return true;
  }
}

/** A fetched value is only trusted as a signal if it is an object carrying its own `checkedAt`;
 * anything else is read as "could not query" (`undefined`) so it never overwrites a good value. */
function asFetched(value: unknown): { checkedAt: string } | null | undefined {
  if (value === null) return null;
  if (value && typeof value === "object" && typeof (value as { checkedAt?: unknown }).checkedAt === "string") {
    return value as { checkedAt: string };
  }
  return undefined;
}

const stripWww = (host: string): string => host.trim().toLowerCase().replace(/^www\./, "");

/** The domain a Trustpilot page reviews, read off its `/review/<domain>` path; null if absent. */
function trustpilotReviewedDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const match = /\/review\/([^/?#]+)/.exec(new URL(url).pathname);
    return match ? stripWww(decodeURIComponent(match[1])) : null;
  } catch {
    return null;
  }
}

/**
 * The previous values that may still be carried for this store. Site, domain age, Google Maps and
 * Trustpilot are facts about a DOMAIN: when the registry changes the store's domain, what we had
 * describes another site, so none of it survives a week in which the new domain could not be read
 * (a fresh `undefined` then yields `null`, never the old domain's value). Trustpilot is also dropped
 * when its page reviews a different domain than the one now targeted (`trustpilotDomain ?? domain`),
 * or when the page does not say which domain it reviews. Our own catalogue is keyed by the store, not
 * by its domain, and carries over; Reddit is keyed by the store too, and follows its own rule
 * (`carriedReddit`: what changes it is the search terms, not the domain).
 */
function carriedSignals(entry: StoreEntry, previous: StoreProfileDoc | null): Partial<SignalFields> {
  if (!previous) return {};
  const carried: Partial<SignalFields> = { ...previous };
  const domain = entry.domain ?? null;
  if ((previous.domain ?? null) !== domain) {
    carried.site = null;
    carried.age = null;
    carried.google = null;
    carried.trustpilot = null;
  }
  if (carried.trustpilot) {
    const target = entry.trustpilotDomain ?? domain;
    const reviewed = trustpilotReviewedDomain(carried.trustpilot.url);
    if (!target || !reviewed || reviewed !== stripWww(target)) carried.trustpilot = null;
  }
  return carried;
}

/**
 * What a store's previous profile may hand to this run for Reddit: the stored mentions, the cursor
 * the job resumes reading from, and the last signal. All of it is discarded — the reading starts over
 * — when the store's terms fingerprint (`redditTermsKey`) differs from the one they were stored with
 * (a profile without a fingerprint counts as different), or when Reddit no longer applies.
 */
export function carriedReddit(
  entry: StoreEntry,
  previous: StoreProfileDoc | null
): { signal: RedditSignal | null; mentions: StoredRedditMention[]; cursor: RedditCursor | null } {
  if (!previous || !storeSignalApplies(entry, "reddit") || previous.redditTermsKey !== redditTermsKey(entry)) {
    return { signal: null, mentions: [], cursor: null };
  }
  return {
    signal: previous.reddit ?? null,
    mentions: Array.isArray(previous.redditMentions) ? previous.redditMentions : [],
    cursor: previous.redditCursor ?? null,
  };
}

interface RedditIncrement {
  mentions: RedditMention[];
  cursor: RedditCursor;
  complete: boolean;
}

/** `fetchRedditIncrement`'s result, `null` (nothing to read), or `undefined` for anything else. */
function asRedditIncrement(value: unknown): RedditIncrement | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const increment = value as Partial<RedditIncrement>;
  const cursor = increment.cursor as Partial<RedditCursor> | undefined;
  if (
    !Array.isArray(increment.mentions) ||
    !cursor ||
    typeof cursor.backfillDone !== "boolean" ||
    typeof cursor.checkedUntilUtc !== "number" ||
    typeof cursor.backfillNextUtc !== "number" ||
    typeof cursor.backfillStartUtc !== "number"
  ) {
    return undefined;
  }
  return increment as RedditIncrement;
}

type RedditFields = Pick<StoreProfileDoc, "reddit" | "redditMentions" | "redditCursor" | "redditTermsKey">;

/**
 * The four Reddit fields of a profile:
 *   * `undefined` fetched (could not read) — stored mentions, cursor and signal stay as they were;
 *   * `null` fetched — cleared;
 *   * an increment — merged into the stored mentions (text dropped, capped at 500) with its cursor. The
 *     signal is summarized over everything stored, dated by how far the cursor got (`checkedUntilUtc`,
 *     which is now for a complete run), and only once the backfill is done; until then the previous
 *     signal, if any, stays.
 */
function redditFields(entry: StoreEntry, fetched: unknown, previous: StoreProfileDoc | null, now: Date): RedditFields {
  if (!storeSignalApplies(entry, "reddit")) {
    return { reddit: null, redditMentions: [], redditCursor: null, redditTermsKey: null };
  }

  const termsKey = redditTermsKey(entry);
  const carried = carriedReddit(entry, previous);
  const increment = asRedditIncrement(fetched);

  if (increment === undefined) {
    return { reddit: carried.signal, redditMentions: carried.mentions, redditCursor: carried.cursor, redditTermsKey: termsKey };
  }
  if (increment === null) {
    return { reddit: null, redditMentions: [], redditCursor: null, redditTermsKey: termsKey };
  }

  const merged = mergeStoredMentions(carried.mentions, increment.mentions);
  const reddit = increment.cursor.backfillDone
    ? summarizeMentions(merged.mentions, new Date(increment.cursor.checkedUntilUtc * 1000).toISOString(), now, merged.capped)
    : carried.signal;
  return { reddit, redditMentions: merged.mentions, redditCursor: increment.cursor, redditTermsKey: termsKey };
}

/**
 * `fetched.reddit` is what `fetchRedditIncrement` returned (see `redditFields`); every other signal is
 * the value its module returned, merged with `mergeSignal`.
 */
export function buildProfile(
  entry: StoreEntry,
  fetched: Partial<Record<StoreSignalName, unknown>>,
  previous: StoreProfileDoc | null,
  now: Date
): StoreProfileDoc {
  const carried = carriedSignals(entry, previous);
  const signal = <K extends StoreSignalName>(name: K): StoreProfileDoc[K] => {
    if (!storeSignalApplies(entry, name)) return null;
    return mergeSignal(
      carried[name] as { checkedAt: string } | null | undefined,
      asFetched(fetched[name])
    ) as StoreProfileDoc[K];
  };

  const reddit = redditFields(entry, fetched.reddit, previous, now);
  const signals: SignalFields = {
    site: signal("site"),
    age: signal("age"),
    trustpilot: signal("trustpilot"),
    google: signal("google"),
    reddit: reddit.reddit,
    catalog: signal("catalog"),
  };

  const count = countFreshSignals(signals, now);
  const today = now.toISOString().slice(0, 10);

  return {
    key: entry.key,
    name: entry.name,
    domain: entry.domain ?? null,
    kind: entry.kind,
    rubros: [...entry.rubros],
    aliases: [...entry.aliases],
    ...signals,
    redditMentions: reddit.redditMentions,
    redditCursor: reddit.redditCursor,
    redditTermsKey: reddit.redditTermsKey,
    signals: count,
    indexable: count >= INDEXABLE_MIN_SIGNALS,
    firstSeen: previous?.firstSeen || today,
    lastSeen: today,
  };
}

/**
 * The job saves each store as soon as it is read (a long Reddit backfill must not lose what it did),
 * so an outage cannot be judged at the end of the run anymore. Instead: if the first 10 stores all got
 * no fresh answer from any outside source, the sources are down — the job stops there, having written
 * nothing (a store is only saved with at least one fresh answer), and exits 1.
 */
export function shouldStopEarly(input: { processed: number; withFreshSignal: number }): boolean {
  return input.processed >= EARLY_STOP_STORES && input.withFreshSignal === 0;
}

// --- Task 13: `--reddit-only` ------------------------------------------------------------------
//
// A nightly mode so Reddit's 24-month backfill finishes in ~8 nights instead of ~8 weeks (Task 12
// measured ~90 Arctic Shift calls per store, 900/week, 76 stores). Every other outside source must
// stay on the weekly cadence — Google Places costs money per call — so a reddit-only run must not
// touch them AT ALL, and a store is only worth writing again when Reddit itself moved.

export type StoreRunMode = "full" | "reddit-only";

/**
 * Which outside signals `sync_store_profiles.ts` is allowed to actually ask for THIS RUN, for one
 * store — narrower than `storeSignalApplies`, which is a fact about the store, not the run. In
 * `"reddit-only"` mode the fetch functions for site/age/trustpilot/google must never even be called:
 * their old value reaches `buildProfile` as `undefined` and is kept untouched, exactly like a source
 * that failed to answer.
 */
export function shouldQuerySignal(entry: StoreEntry, name: StoreSignalName, mode: StoreRunMode): boolean {
  if (!storeSignalApplies(entry, name)) return false;
  return mode === "full" || name === "reddit";
}

/**
 * The catalogue is not read through `storeSignalApplies`'s per-store loop — it is loaded once, for
 * the whole run, from our own database (`classes/stores/signals/catalog.ts`) — but a reddit-only
 * night must not touch it either: the mode exists only to let Reddit catch up, not to re-read
 * anything else, however cheap.
 */
export function shouldLoadCatalog(mode: StoreRunMode): boolean {
  return mode === "full";
}

/**
 * True when a Reddit read actually moved the store forward this run: a mention that was not stored
 * before, or the cursor landing somewhere it had not (a completed window, a day further into the
 * backfill, the backfill finishing). Two absent cursors — Reddit does not apply to this store, or
 * nothing was read this run — are not progress against each other.
 */
export function redditProgressed(input: {
  redditNew: number | undefined;
  previousCursor: RedditCursor | null;
  nextCursor: RedditCursor | null;
}): boolean {
  if ((input.redditNew ?? 0) > 0) return true;
  const { previousCursor: a, nextCursor: b } = input;
  if (!a && !b) return false;
  if (!a || !b) return true;
  return (
    a.backfillStartUtc !== b.backfillStartUtc ||
    a.backfillNextUtc !== b.backfillNextUtc ||
    a.backfillDone !== b.backfillDone ||
    a.checkedUntilUtc !== b.checkedUntilUtc
  );
}

export interface StoreSaveDecision {
  mode: StoreRunMode;
  queried: readonly StoreSignalName[];
  failed: readonly StoreSignalName[];
  redditProgressed: boolean;
}

/**
 * Whether a store's run is worth writing.
 *   * `"full"` — unchanged from Task 6: saved when at least one queried outside source answered
 *     (`failed.length < queried.length`), so a long Reddit backfill never loses what it did even if
 *     every other source that week was down.
 *   * `"reddit-only"` — Reddit is the only thing this mode ever asks, so "it answered" is not a high
 *     enough bar: a completed call that only re-confirms a window already covered would rewrite the
 *     same document every night for no reason. Only real progress earns a write.
 */
export function shouldSaveStore(decision: StoreSaveDecision): boolean {
  if (decision.mode === "reddit-only") return decision.redditProgressed;
  return decision.failed.length < decision.queried.length;
}

// --- Fix round 1 (code review) ------------------------------------------------------------------

/**
 * Whether the nightly `--reddit-only` run should still hit Arctic Shift for this store, given the
 * cursor `carriedReddit` handed it (already resolved for terms changes and applicability — see
 * `carriedReddit`). A store whose 24-month backfill already finished has nothing left for THIS mode
 * to add: from there its Reddit signal only moves through the weekly job's day-by-day incremental
 * read, so asking again every night would spend the shared call budget for zero new data and take a
 * slot away from a store still catching up.
 */
export function needsRedditBackfill(entry: StoreEntry, cursor: RedditCursor | null): boolean {
  if (!storeSignalApplies(entry, "reddit")) return false;
  if (!cursor) return true;
  return !cursor.backfillDone;
}

/**
 * Whether the nightly `--reddit-only` run has been going long enough that it should stop STARTING
 * new stores. Independent of `STORES_REDDIT_MAX_CALLS`: that budget bounds cost per call, not how
 * long a night of retries and backoff can run (Arctic Shift's own timeout retries sleep for tens of
 * seconds each — see `classes/stores/signals/reddit.ts`). Checked BETWEEN stores, never mid-store, so
 * the one already under way always finishes and is saved normally; this only keeps the next one from
 * starting, and the run then ends the same way it always does (summary log, `process.exit(0)`) —
 * never a hard cutoff.
 */
export function shouldStopForDeadline(elapsedMs: number, maxMinutes: number): boolean {
  return elapsedMs >= maxMinutes * 60_000;
}

/**
 * `[tiendas] <key> señales=<n> sitio=<ok|blocked|->  tp=<score|->  g=<rating|->  reddit=<n|->[(+<new>)][ backfill <date>]  catálogo=<n|->`
 *
 * Reddit shows the published count, or while the backfill runs the mentions stored so far; `(+<new>)`
 * is how many of them this run added, and `backfill <date>` how far the backfill has read.
 */
export function formatStoreLogLine(doc: StoreProfileDoc, redditNew?: number): string {
  const dash = (value: string | number | undefined): string => (value === undefined ? "-" : String(value));
  const cursor = doc.redditCursor;
  let reddit = "-";
  if (doc.reddit || cursor) {
    reddit = String(doc.reddit ? doc.reddit.mentions : (doc.redditMentions ?? []).length);
    if (redditNew !== undefined) reddit += `(+${redditNew})`;
    if (cursor && !cursor.backfillDone) {
      reddit += ` backfill ${new Date(cursor.backfillNextUtc * 1000).toISOString().slice(0, 10)}`;
    }
  }
  return (
    `[tiendas] ${doc.key} señales=${doc.signals}` +
    ` sitio=${dash(doc.site?.status)}` +
    `  tp=${dash(doc.trustpilot?.score)}` +
    `  g=${dash(doc.google?.rating)}` +
    `  reddit=${reddit}` +
    `  catálogo=${dash(doc.catalog?.offers)}`
  );
}
