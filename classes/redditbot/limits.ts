// The brakes. Pure functions over a snapshot of the ledger, so every one of them is testable
// without a database and none of them can be accidentally skipped by a code path that forgot to
// query something.
//
// The limits are low on purpose. Twelve comments a day sounds like a lot until you notice that the
// four subs this account can actually write in publish, between them, on the order of three hundred
// threads a week, of which the topic filter admits a few dozen — so the ceiling is roughly three a
// day per community, the rate at which a helpful regular participates rather than the rate at which
// a marketing account operates. The page cooldown matters more than the raw count: three answers in
// a row that all link the same page is the pattern a moderator recognises as promotion even when
// each individual answer was good, because from the outside it is indistinguishable from one.
//
// The ceiling that binds first is almost never `maxPerDay`. It is the retrieval gate and the judge:
// most money threads are not questions the site answers, and those cost nothing.

import type { BotConfig } from "./config";
import type { LedgerSnapshot } from "./ledger";

export type LimitReason =
  | "disabled"
  | "paused"
  | "quiet_hours"
  | "daily_cap"
  | "sub_cap"
  | "too_soon"
  | "author_cooldown"
  | "page_cooldown";

export interface LimitVerdict {
  ok: boolean;
  reason?: LimitReason;
  detail?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const OK: LimitVerdict = { ok: true };

/**
 * Limits that apply to the whole run, checked once before any thread is scored.
 *
 * Separated from the per-thread checks so a run that is capped out spends nothing at all: no
 * embeddings, no judge calls, no composer.
 */
export function runAllowed(cfg: BotConfig, snapshot: LedgerSnapshot, now: number = Date.now()): LimitVerdict {
  if (!cfg.enabled) return { ok: false, reason: "disabled" };

  if (snapshot.pausedUntil && snapshot.pausedUntil.getTime() > now) {
    return { ok: false, reason: "paused", detail: snapshot.pausedUntil.toISOString() };
  }

  // El horario, antes que los cupos: una corrida de madrugada no tiene que gastar ni una llamada.
  const hour = new Date(now).getUTCHours();
  if (cfg.quietHoursUtc.includes(hour)) {
    return { ok: false, reason: "quiet_hours", detail: `${hour}:00 UTC` };
  }

  if (snapshot.postedLast24h.length >= cfg.maxPerDay) {
    return { ok: false, reason: "daily_cap", detail: `${snapshot.postedLast24h.length}/${cfg.maxPerDay}` };
  }

  if (snapshot.lastPostedAt) {
    const minutes = (now - snapshot.lastPostedAt.getTime()) / 60000;
    if (minutes < cfg.minGapMinutes) {
      return { ok: false, reason: "too_soon", detail: `${Math.round(minutes)}min < ${cfg.minGapMinutes}min` };
    }
  }

  return OK;
}

/** Per-subreddit daily cap. Checked before scoring a thread of that sub. */
export function subAllowed(cfg: BotConfig, snapshot: LedgerSnapshot, sub: string): LimitVerdict {
  const lower = sub.toLowerCase();
  const count = snapshot.postedLast24h.filter((row) => row.sub.toLowerCase() === lower).length;
  if (count >= cfg.maxPerSubPerDay) {
    return { ok: false, reason: "sub_cap", detail: `${count}/${cfg.maxPerSubPerDay} en r/${sub}` };
  }
  return OK;
}

/** Author cooldown. Two answers to the same person in a week is following them around. */
export function authorAllowed(cfg: BotConfig, lastAt: Date | null, now: number = Date.now()): LimitVerdict {
  if (!lastAt || cfg.authorCooldownDays <= 0) return OK;
  const days = (now - lastAt.getTime()) / DAY_MS;
  if (days < cfg.authorCooldownDays) {
    return { ok: false, reason: "author_cooldown", detail: `hace ${days.toFixed(1)}d` };
  }
  return OK;
}

/** Page cooldown. See the note at the top of the file — this is the anti-pattern-recognition brake. */
export function pageAllowed(cfg: BotConfig, lastAt: Date | null, now: number = Date.now()): LimitVerdict {
  if (!lastAt || cfg.pageCooldownDays <= 0) return OK;
  const days = (now - lastAt.getTime()) / DAY_MS;
  if (days < cfg.pageCooldownDays) {
    return { ok: false, reason: "page_cooldown", detail: `hace ${days.toFixed(1)}d` };
  }
  return OK;
}

/** How many more comments this run may post before hitting the daily cap. */
export function remainingToday(cfg: BotConfig, snapshot: LedgerSnapshot): number {
  return Math.max(0, cfg.maxPerDay - snapshot.postedLast24h.length);
}

/**
 * Should the breaker trip?
 *
 * Auto-posting without this is the actual risk of the whole design: a miscalibrated threshold does
 * not produce one bad comment, it produces six a day until a human notices. `breakerNegatives`
 * removed-or-downvoted comments inside 24 h is the signal that the calibration is wrong, and the
 * response is to stop rather than to keep going more carefully.
 */
export function shouldTrip(cfg: BotConfig, snapshot: LedgerSnapshot): boolean {
  return cfg.breakerNegatives > 0 && snapshot.recentNegatives >= cfg.breakerNegatives;
}

/** Jitter for the gap between comments, so the posting times are not a metronome. */
export function jitterMinutes(base: number): number {
  return base + Math.floor(Math.random() * Math.max(1, Math.round(base * 0.4)));
}
