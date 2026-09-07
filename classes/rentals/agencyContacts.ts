import * as cheerio from "cheerio";
import { appConnection } from "../appdb";
import { contactFromVisibleHtml, publicAdvertiserFields, publicAgency } from "./advertiser";
import { fetchText } from "./net";
import type { RentalAdvertiserFields, RentalAgency, RentalPublicContact, RentalSource } from "./types";

const ORIGIN = "https://www.infocasas.com.uy";
const DAY = 86_400_000;
export interface AgencyContactRead {
  key: string;
  profileUrl: string;
  observedAt: string;
  publicContact: RentalPublicContact | null;
}
export interface AgencyContactCacheRow {
  _id: string;
  lastAttemptAt: string;
  read?: AgencyContactRead;
}
export interface AgencyContactCache {
  load(keys: string[]): Promise<AgencyContactCacheRow[]>;
  save(key: string, attemptedAt: string, read: AgencyContactRead | null): Promise<void>;
}

/** Native agency identity is corroborated; contact values come ONLY from visible branch HTML. */
export function readInfoCasasAgencyContact(html: string, agency: RentalAgency, observedAt: string): AgencyContactRead | null {
  const valid = publicAgency(agency, "infocasas", observedAt);
  if (!valid || !Number.isFinite(Date.parse(observedAt))) return null;
  const $ = cheerio.load(html), nativeId = valid.key.split(":")[1]!;
  if ($("link[rel=canonical]").attr("href")?.replace(/\/$/, "") !== valid.profileUrl.replace(/\/$/, "")) return null;
  try {
    const data = JSON.parse($("script#__NEXT_DATA__").text());
    const owner = data?.props?.pageProps?.apolloState?.[`RealEstateAgent:${nativeId}`];
    if (String(owner?.id) !== nativeId || owner?.__typename !== "RealEstateAgent" ||
      !["inmobiliaria", "constructora"].includes(String(owner?.type || "").toLowerCase())) return null;
  } catch { return null; }
  // Verified on the public agency profile, 2026-09-07. No header/footer, arbitrary description,
  // search JSON, masked_phone or subsidiary JSON is fed to the commercial-contact parser.
  const blocks = $(".subsidiary .info-inmob").map((_, el) => $(el).html() || "").get().join("\n");
  const publicContact = contactFromVisibleHtml(blocks, valid, valid.profileUrl, observedAt);
  return { key: valid.key, profileUrl: valid.profileUrl, observedAt: new Date(observedAt).toISOString(), publicContact };
}

/** Longest matching rule for our identifying UA. A changed robots policy fails closed. */
export function agencyPathAllowed(robots: string, url: string): boolean {
  if (!robots.trim() || new URL(url).origin !== ORIGIN) return false;
  const groups: Array<{ agents: string[]; rules: Array<{ allow: boolean; path: string }> }> = [];
  let group = { agents: [] as string[], rules: [] as Array<{ allow: boolean; path: string }> };
  for (const raw of robots.split(/\r?\n/)) {
    const match = raw.replace(/#.*/, "").match(/^\s*(user-agent|disallow|allow)\s*:\s*(.*?)\s*$/i);
    if (!match) continue;
    if (match[1]!.toLowerCase() === "user-agent") {
      if (group.rules.length) { groups.push(group); group = { agents: [], rules: [] }; }
      group.agents.push(match[2]!.toLowerCase());
    } else if (group.agents.length && match[2]) group.rules.push({ allow: match[1]!.toLowerCase() === "allow", path: match[2]! });
  }
  groups.push(group);
  const specific = groups.filter(item => item.agents.some(agent => agent !== "*" && "cambiouruguaybot".startsWith(agent)));
  const selected = specific.length ? specific : groups.filter(item => item.agents.includes("*"));
  if (!selected.length) return false;
  let best = -1, allowed = true;
  for (const rule of selected.flatMap(item => item.rules)) {
    const pattern = rule.path.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    if (new RegExp(`^${pattern}`).test(new URL(url).pathname) && (rule.path.length > best || (rule.path.length === best && rule.allow))) {
      best = rule.path.length; allowed = rule.allow;
    }
  }
  return allowed;
}

const persistentCache: AgencyContactCache = {
  async load(keys) {
    return await appConnection().collection("propertyagencycontactreads").find({ _id: { $in: keys as any } }, {
      projection: { _id: 1, lastAttemptAt: 1, read: 1 }, maxTimeMS: 10_000,
    }).toArray() as unknown as AgencyContactCacheRow[];
  },
  async save(key, attemptedAt, read) {
    const collection = appConnection().collection("propertyagencycontactreads");
    // _id is unique even before index initialization. Concurrent rental/sale jobs cannot create
    // duplicate identities, and an older observation never overwrites a later contact removal.
    await collection.updateOne({ _id: key as any }, { $max: { lastAttemptAt: attemptedAt } }, { upsert: true });
    if (read) await collection.updateOne({ _id: key as any, $or: [{ "read.observedAt": { $exists: false } }, { "read.observedAt": { $lte: read.observedAt } }] }, { $set: { read } });
  },
};

/** One public profile per agency, shared across rent/sale; no requests per individual home. */
export async function enrichAgencyContacts<T extends RentalAdvertiserFields & { source: RentalSource; url: string }>(
  listings: T[], options: {
    cache?: AgencyContactCache; fetchPage?: (url: string) => Promise<string | null>;
    maxProfiles?: number; maxDurationMs?: number; now?: () => Date; enabled?: boolean; dryRun?: boolean;
  } = {},
): Promise<{ inspected: number; failed: number; linked: number }> {
  const result = { inspected: 0, failed: 0, linked: 0 };
  if (options.enabled === false || (options.enabled === undefined && process.env.RENTALS_CONTACTS_ENABLED === "0")) return result;
  const now = options.now || (() => new Date()), start = now().getTime();
  const agencies = new Map<string, RentalAgency>();
  for (const row of listings) {
    const agency = row.source === "infocasas" ? publicAgency(row.agency, row.source, now().toISOString()) : null;
    if (agency) agencies.set(agency.key, agency);
  }
  if (!agencies.size) return result;
  const cache = options.cache || persistentCache;
  let stored: Map<string, AgencyContactCacheRow>;
  try { stored = new Map((await cache.load([...agencies.keys()])).map(row => [row._id, row])); }
  catch { return { ...result, failed: 1 }; }
  const maxProfiles = Math.max(0, Math.min(120, Math.floor(options.maxProfiles ?? Number(process.env.RENTALS_CONTACTS_MAX_PROFILES || 80))));
  const budget = Math.max(1_000, Math.min(240_000, options.maxDurationMs || 180_000));
  const fetchPage = options.fetchPage || (url => fetchText(url, { timeoutMs: 15_000, retries: 0 }));
  const due = [...agencies.values()].filter(agency => {
    const cached = stored.get(agency.key);
    const observed = Date.parse(cached?.read?.observedAt || ""), attempted = Date.parse(cached?.lastAttemptAt || "");
    return (!cached?.read || !Number.isFinite(observed) || observed > start + 300_000 || cached.read.profileUrl !== agency.profileUrl || start - observed >= 7 * DAY) &&
      (!Number.isFinite(attempted) || attempted > start + 300_000 || start - attempted >= 6 * 3_600_000);
  }).sort((a, b) => (stored.get(a.key)?.lastAttemptAt || "").localeCompare(stored.get(b.key)?.lastAttemptAt || "") || a.key.localeCompare(b.key));
  let robots: string | null = null;
  if (due.length && maxProfiles > 0) try { robots = await fetchPage(`${ORIGIN}/robots.txt`); } catch { /* fail closed */ }
  for (const agency of due.slice(0, maxProfiles)) {
    if (now().getTime() - start >= budget) break;
    if (!robots || !agencyPathAllowed(robots, agency.profileUrl)) continue;
    const at = now().toISOString();
    let read: AgencyContactRead | null = null;
    try { const html = await fetchPage(agency.profileUrl); if (html) read = readInfoCasasAgencyContact(html, agency, at); } catch { /* retain prior dates */ }
    if (read) result.inspected++; else result.failed++;
    const previous = stored.get(agency.key);
    stored.set(agency.key, { _id: agency.key, lastAttemptAt: at, ...(read ? { read } : previous?.read ? { read: previous.read } : {}) });
    if (!(options.dryRun ?? process.argv.includes("--dry-run"))) try { await cache.save(agency.key, at, read); } catch { result.failed++; }
  }
  for (const row of listings) {
    const agency = row.agency, cached = agency && stored.get(agency.key)?.read;
    if (!agency || !cached || cached.key !== agency.key || cached.profileUrl !== agency.profileUrl ||
      !Number.isFinite(Date.parse(cached.observedAt)) || Date.parse(cached.observedAt) > start + 300_000 || start - Date.parse(cached.observedAt) > 21 * DAY) continue;
    const projected = publicAdvertiserFields({ agency, publicContact: cached.publicContact }, { source: row.source, url: row.url, now: now().toISOString() });
    row.publicContact = projected.publicContact ?? null;
    if (row.publicContact) result.linked++;
  }
  return result;
}
