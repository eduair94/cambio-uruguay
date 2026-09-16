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
// No verdict lives here: `signals` is how many independent, dated facts we can show, never a score
// of how trustworthy the store is. `indexable` only decides whether a page has enough to say.
import type { StoreEntry, StoreKind, StoreRubro } from "./types";
import type { SiteSignal } from "./signals/site";
import type { AgeSignal } from "./signals/age";
import type { TrustpilotSignal } from "./signals/trustpilot";
import type { GoogleSignal } from "./signals/google";
import type { RedditSignal } from "./signals/reddit";
import type { CatalogSignal } from "./signals/catalog";

export const STORE_SIGNAL_MAX_AGE_DAYS = 60;

/** A page with fewer fresh signals than this has too little to say to be worth indexing. */
const INDEXABLE_MIN_SIGNALS = 3;

/** Below this share of stores with at least one fresh signal, a run is an outage, not a week. */
const THIN_RUN_MIN_SHARE = 0.4;

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

export function buildProfile(
  entry: StoreEntry,
  fetched: Partial<Record<StoreSignalName, unknown>>,
  previous: StoreProfileDoc | null,
  now: Date
): StoreProfileDoc {
  const signal = <K extends StoreSignalName>(name: K): StoreProfileDoc[K] => {
    if (!storeSignalApplies(entry, name)) return null;
    return mergeSignal(
      previous?.[name] as { checkedAt: string } | null | undefined,
      asFetched(fetched[name])
    ) as StoreProfileDoc[K];
  };

  const signals: SignalFields = {
    site: signal("site"),
    age: signal("age"),
    trustpilot: signal("trustpilot"),
    google: signal("google"),
    reddit: signal("reddit"),
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
    signals: count,
    indexable: count >= INDEXABLE_MIN_SIGNALS,
    firstSeen: previous?.firstSeen || today,
    lastSeen: today,
  };
}

/**
 * The job refuses to write a run in which fewer than 40 % of the stores it covered got at least one
 * fresh answer (not `undefined`) from an outside source — that is the network or a service being
 * down, not a quiet week. The first run is exempt: with nothing stored there is nothing to protect.
 */
export function isThinRun(input: { storesWithFreshSignal: number; stores: number; storedProfiles: number }): boolean {
  if (input.storedProfiles <= 0) return false;
  return input.storesWithFreshSignal < input.stores * THIN_RUN_MIN_SHARE;
}

/** `[tiendas] <key> señales=<n> sitio=<ok|blocked|->  tp=<score|->  g=<rating|->  reddit=<n|->  catálogo=<n|->` */
export function formatStoreLogLine(doc: StoreProfileDoc): string {
  const dash = (value: string | number | undefined): string => (value === undefined ? "-" : String(value));
  return (
    `[tiendas] ${doc.key} señales=${doc.signals}` +
    ` sitio=${dash(doc.site?.status)}` +
    `  tp=${dash(doc.trustpilot?.score)}` +
    `  g=${dash(doc.google?.rating)}` +
    `  reddit=${dash(doc.reddit?.mentions)}` +
    `  catálogo=${dash(doc.catalog?.offers)}`
  );
}
