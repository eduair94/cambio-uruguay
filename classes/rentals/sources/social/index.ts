// The short-video networks as rental sources: TikTok, Instagram and Facebook Reels.
//
// Each network is read by its own harvester (../tiktok, ./instagram, ./facebookreels), in
// SEQUENCE — one Chrome at a time on the VPS — and each one fails alone: a network that throws is
// reported as down and the others still publish. Then the copy guard (copies.ts) sees every
// accepted post of every network at once and keeps one copy of each flat. The result is one
// RentalSourceResult per network, which is what the rest of the rental harvest expects.
// Design and measurements: docs/superpowers/specs/2026-09-24-rentals-social-design.md.
import type { RentalSourceResult } from "../types";
import { harvestTiktokRun } from "../tiktok";
import { entryFor, resolveCopies, type SocialEntry } from "./copies";
import { harvestFacebookReelsRun } from "./facebookreels";
import { harvestInstagramRun } from "./instagram";
import { SOCIAL_SOURCES, type SocialSource } from "./post";
import { envNumber, plural, type PlatformRun } from "./run";
import { mongoClaimStore, type ClaimStore, type SocialClaim } from "./store";

export interface HarvestSocialDeps {
  /** One harvester per network, in SOCIAL_SOURCES order. */
  runs: Array<(mode: "full" | "fast", usdUyu: number) => Promise<PlatformRun>>;
  claims: ClaimStore;
  now: () => Date;
  env: NodeJS.ProcessEnv;
}

const CLAIM_FORGET_DAYS = 60;

/**
 * How long a claim protects its flat after its owner was last seen: exactly as long as the
 * directory keeps showing an offer (`RENTAL_STALE_DAYS` in app/utils/rentals.ts, pinned by
 * tests/rentals/social-review.test.ts). Longer, and a flat the directory already hides stays
 * hidden in its copies too (the review found days 11–21 empty with the prune window); shorter,
 * and a copy is published next to an original the directory still shows.
 */
export const SOCIAL_CLAIM_DAYS = 10;

export const DEFAULT_SOCIAL_RUNS: HarvestSocialDeps["runs"] = [
  harvestTiktokRun,
  harvestInstagramRun,
  harvestFacebookReelsRun,
];

export async function harvestSocial(mode: "full" | "fast", usdUyu: number, overrides: Partial<HarvestSocialDeps> = {}): Promise<RentalSourceResult[]> {
  const deps: HarvestSocialDeps = { runs: DEFAULT_SOCIAL_RUNS, claims: mongoClaimStore, now: () => new Date(), env: process.env, ...overrides };

  const runs: PlatformRun[] = [];
  for (const [index, run] of deps.runs.entries()) {
    const source: SocialSource = SOCIAL_SOURCES[index] ?? "tiktok";
    try {
      runs.push(await run(mode, usdUyu));
    } catch (error) {
      // Only the error class: a message can carry a URL or a proxy.
      console.error(`[social] ${source} falló: ${String((error as Error)?.name || "Error")}`);
      runs.push({ result: { key: source, ok: false, complete: false, listings: [], note: `falla: ${String((error as Error)?.name || "Error")}` }, processed: [] });
    }
  }

  // The guard can only hide copies: if it fails, publishing every accepted advert is the lesser
  // harm next to failing the whole rental sync for every portal.
  try {
    return await guardCopies(runs, deps);
  } catch (error) {
    console.error(`[social] la guarda de copias falló, se publica sin ella: ${String((error as Error)?.name || "Error")}`);
    return runs.map(run => run.result);
  }
}

async function guardCopies(runs: PlatformRun[], deps: HarvestSocialDeps): Promise<RentalSourceResult[]> {
  const entries = runs.flatMap(run => run.processed.map(entryFor).filter((entry): entry is SocialEntry => !!entry));
  if (!entries.length) return runs.map(run => run.result);

  const now = deps.now();
  const claimDays = envNumber(deps.env.RENTALS_SOCIAL_CLAIM_DAYS, SOCIAL_CLAIM_DAYS);
  // A network that read everything today expires the offers it no longer saw after
  // RENTALS_STALE_OFFER_DAYS (sync_rentals.ts): its claims last as long, not longer.
  const staleOfferDays = envNumber(deps.env.RENTALS_STALE_OFFER_DAYS, 4);
  const complete = new Set(runs.filter(run => run.result.complete === true).map(run => run.result.key));
  const since = (days: number): string => new Date(now.getTime() - days * 86_400_000).toISOString();
  // Without the claims the guard still works within the run; it only loses the memory of who
  // published first, which costs at most one duplicate while the directory shows the older one.
  const loaded = await deps.claims.loadLiveClaims(since(claimDays)).catch((error: unknown) => {
    console.warn(`[social] no se pudieron leer los reclamos: ${String((error as Error)?.name || error)}`);
    return new Map<string, SocialClaim>();
  });
  const live = new Map([...loaded].filter(([, claim]) => !complete.has(claim.source) || claim.lastSeenAt >= since(staleOfferDays)));
  const resolution = resolveCopies(entries, live, now.toISOString());
  await deps.claims.saveClaims(resolution.claims).catch((error: unknown) => {
    console.warn(`[social] no se pudieron guardar los reclamos: ${String((error as Error)?.name || error)}`);
  });
  await deps.claims.pruneClaims(since(CLAIM_FORGET_DAYS)).catch(() => undefined);

  const kept = new Set(resolution.keep.map(entry => entry.listingId));
  const copies = new Map<string, number>();
  for (const copy of resolution.copies) copies.set(copy.entry.source, (copies.get(copy.entry.source) ?? 0) + 1);
  return runs.map(({ result }) => {
    const dropped = copies.get(result.key) ?? 0;
    return {
      ...result,
      listings: result.listings.filter(row => kept.has(row.listingId)),
      note: dropped ? `${result.note}; ${plural(dropped, "copia de un aviso ya publicado", "copias de avisos ya publicados")} (en esta u otra red)` : result.note,
    };
  });
}
