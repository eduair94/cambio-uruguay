// One copy of a flat, whichever networks carry it.
//
// Measured 2026-09-24: the same inmobiliaria posts the same flat on TikTok, Instagram and Facebook
// ("Gaboto y La Paz, $22.000, 2 dormitorios" is on all three), and on Instagram twice — a carousel
// and a reel with the identical caption. Without this guard the directory shows it three or four
// times. The directory's own merge (dedupe.ts) cannot help: it joins adverts only on an exact
// address, and a corner is not one. So this guard publishes ONE and counts the rest.
//
// Two keys say "same flat":
//   * the facts: the first corner/address the caption names (streets in any order), currency,
//     price and bedrooms — all four, or no key at all;
//   * the text twin: a hash of the normalised caption, for the carousel and the reel of one
//     account, and for the caption an agency pastes on every network, even when they name no corner.
//
// And the choice is STABLE across runs. Instagram and Facebook Reels are never `complete`, so an
// offer that stops being emitted is not expired — the directory keeps showing it for
// RENTAL_STALE_DAYS (10) after it was last seen. If the kept copy moved from one network to another
// between runs, both would be on the site. So the first listing that published a key owns it
// (rentalsocialclaims) for exactly as long as the directory shows it (index.ts, SOCIAL_CLAIM_DAYS);
// an owner not seen today still blocks its copies, an owner seen today under other keys (an edited
// caption) keeps its old keys, and only when the claim lapses can a copy take over.
import { createHash } from "node:crypto";
import { flatten } from "../../normalize";
import type { RawRental } from "../../types";
import type { CaptionFacts } from "./caption";
import { SOCIAL_SOURCES, type SocialPost, type SocialSource } from "./post";
import type { ProcessedPost } from "./process";
import type { SocialClaim } from "./store";

export interface SocialEntry {
  source: SocialSource;
  listingId: string;
  row: RawRental;
  keys: string[];
  createTime: number;
}

export interface CopyResolution {
  keep: SocialEntry[];
  copies: Array<{ entry: SocialEntry; of: string }>;
  /** Every key of every published group, owned by the copy that was kept. */
  claims: SocialClaim[];
}

const CONNECTOR = /\s+(?:y|e|esq\.?|esquina|casi|entre)\s+/;
/**
 * Words before a street's name that do not name it: the address reader already drops a leading
 * article ("La Paz y Gaboto" comes back as "Paz y Gaboto"), and captions write "Av. Italia" and
 * "Avenida Italia", "Gral. Flores" and "Flores". Both copies must land on the same key.
 */
const STREET_PREFIX = /^(?:(?:la|el|los|las|de|del|av|avda|avenida|calle|bvar|bv|bulevar|boulevard|gral|general|dr|doctor|ing|ingeniero|pte|presidente|cno|camino)\s+)+/;

function streetKey(street: string): string {
  return street.replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().replace(STREET_PREFIX, "").trim();
}

export function factKey(facts: CaptionFacts): string | null {
  const corner = facts.addressCandidates[0];
  if (!corner || facts.price === null || !facts.currency || facts.bedrooms === null) return null;
  const streets = flatten(corner)
    .split(CONNECTOR)
    .map(streetKey)
    .filter(Boolean)
    .sort();
  if (!streets.length) return null;
  return `hechos:${streets.join("|")}:${facts.currency}${facts.price}:${facts.bedrooms}d`;
}

function captionHash(post: SocialPost): string | null {
  const normalized = flatten(post.lines.join(" ")).replace(/#\S+/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  if (normalized.length < 40) return null;
  return createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}

/**
 * The same caption, on any network and under any handle. Measured 2026-09-24 after the first
 * production run: an agency pastes the SAME caption on TikTok and Instagram ("¡MIRÁ ESTA
 * OPORTUNIDAD EN EUSKALERRIA! … $21.700", word for word, same handle) and names no corner, so no
 * fact key exists and the directory showed it twice; a third pair had the same caption under two
 * handles of one agency. Forty characters of identical text, price included, is one advert.
 */
export function textKey(post: SocialPost): string | null {
  const hash = captionHash(post);
  return hash ? `texto:${hash}` : null;
}

/**
 * The first text key (network + handle + hash). It still names the claims stored before the
 * cross-network key existed; kept so those claims keep their owners until they lapse
 * (SOCIAL_CLAIM_DAYS), after which it can go.
 */
export function legacyTextKey(post: SocialPost): string | null {
  const hash = captionHash(post);
  return hash ? `texto:${post.source}:${post.author.uniqueId}:${hash}` : null;
}

export function entryFor(processed: ProcessedPost): SocialEntry | null {
  if (!processed.row) return null;
  return {
    source: processed.post.source,
    listingId: processed.row.listingId,
    row: processed.row,
    keys: [factKey(processed.facts), textKey(processed.post), legacyTextKey(processed.post)].filter((key): key is string => !!key),
    createTime: processed.post.createTime,
  };
}

export function resolveCopies(entries: readonly SocialEntry[], live: ReadonlyMap<string, SocialClaim>, now: string): CopyResolution {
  // Union-find over shared keys: a carousel twinned by text with a reel that shares its corner
  // with a TikTok video is one flat.
  const parent = entries.map((_, index) => index);
  const find = (index: number): number => (parent[index] === index ? index : (parent[index] = find(parent[index]!)));
  const firstWithKey = new Map<string, number>();
  entries.forEach((entry, index) => {
    for (const key of entry.keys) {
      const other = firstWithKey.get(key);
      if (other === undefined) firstWithKey.set(key, index);
      else parent[find(index)] = find(other);
    }
  });
  const groups = new Map<number, SocialEntry[]>();
  entries.forEach((entry, index) => {
    const root = find(index);
    const members = groups.get(root);
    if (members) members.push(entry);
    else groups.set(root, [entry]);
  });

  const rank = (entry: SocialEntry): number => SOCIAL_SOURCES.indexOf(entry.source);
  // A stored claim is data from an earlier run: a missing field must not throw.
  const firstOf = (claim: SocialClaim): string => (typeof claim.firstPublishedAt === "string" ? claim.firstPublishedAt : "");
  const idOf = (claim: SocialClaim): string => (typeof claim.listingId === "string" ? claim.listingId : "");
  const seenToday = new Set(entries.map(entry => entry.listingId));
  const out: CopyResolution = { keep: [], copies: [], claims: [] };
  for (const members of groups.values()) {
    const keys = [...new Set(members.flatMap(member => member.keys))];
    const claimants = keys
      .map(key => live.get(key))
      .filter((claim): claim is SocialClaim => !!claim && !!idOf(claim))
      .sort((a, b) => firstOf(a).localeCompare(firstOf(b)) || idOf(a).localeCompare(idOf(b)));
    const ids = new Set(members.map(member => member.listingId));
    const seenClaimant = claimants.find(claim => ids.has(claim.listingId));
    let canonical: SocialEntry;
    if (seenClaimant) {
      canonical = members.find(member => member.listingId === seenClaimant.listingId)!;
    } else if (claimants.length) {
      // The flat is already on the site under a listing not in this group: nothing here replaces it.
      const owner = claimants[0]!;
      for (const member of members) out.copies.push({ entry: member, of: owner.listingId });
      // An owner seen TODAY under other keys (its caption was edited: a new price is a new fact
      // key) is still on the site, so its old keys stay claimed. Without this, the old claim would
      // lapse and this copy would be published next to the edited original.
      if (seenToday.has(owner.listingId)) {
        for (const key of keys) out.claims.push({ key, listingId: owner.listingId, source: owner.source, firstPublishedAt: firstOf(owner) || now, lastSeenAt: now });
      }
      continue;
    } else {
      canonical = [...members].sort((a, b) => rank(a) - rank(b) || a.createTime - b.createTime || a.listingId.localeCompare(b.listingId))[0]!;
    }
    out.keep.push(canonical);
    for (const member of members) if (member !== canonical) out.copies.push({ entry: member, of: canonical.listingId });
    const firstPublishedAt = claimants.filter(claim => claim.listingId === canonical.listingId).map(firstOf).filter(Boolean).sort()[0] || now;
    for (const key of keys) out.claims.push({ key, listingId: canonical.listingId, source: canonical.source, firstPublishedAt, lastSeenAt: now });
  }
  return out;
}
