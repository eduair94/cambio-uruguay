import { describe, expect, it } from "vitest";
import { botConfig, type BotConfig } from "../../classes/redditbot/config";
import type { LedgerSnapshot } from "../../classes/redditbot/ledger";
import {
  authorAllowed,
  pageAllowed,
  remainingToday,
  runAllowed,
  shouldTrip,
  subAllowed,
} from "../../classes/redditbot/limits";

const NOW = Date.UTC(2026, 7, 17, 15, 0, 0);
const minutesAgo = (m: number): Date => new Date(NOW - m * 60_000);
const daysAgo = (d: number): Date => new Date(NOW - d * 24 * 60 * 60_000);

const cfg = (over: Partial<BotConfig> = {}): BotConfig => ({
  ...botConfig(),
  enabled: true,
  maxPerDay: 6,
  maxPerSubPerDay: 2,
  minGapMinutes: 25,
  authorCooldownDays: 7,
  pageCooldownDays: 3,
  breakerNegatives: 3,
  ...over,
});

const snapshot = (over: Partial<LedgerSnapshot> = {}): LedgerSnapshot => ({
  postedLast24h: [],
  lastPostedAt: null,
  recentNegatives: 0,
  pausedUntil: null,
  ...over,
});

const reply = (sub: string, minutes = 200, author = "x", pagePath = "/p"): LedgerSnapshot["postedLast24h"][number] => ({
  sub,
  author,
  pagePath,
  postedAt: minutesAgo(minutes),
});

describe("redditbot/limits — runAllowed", () => {
  it("refuses when the feature flag is off", () => {
    expect(runAllowed(cfg({ enabled: false }), snapshot(), NOW).reason).toBe("disabled");
  });

  it("allows a clean slate", () => {
    expect(runAllowed(cfg(), snapshot(), NOW).ok).toBe(true);
  });

  it("stops at the daily cap", () => {
    const full = snapshot({ postedLast24h: Array.from({ length: 6 }, () => reply("uruguay")) });
    expect(runAllowed(cfg(), full, NOW).reason).toBe("daily_cap");
  });

  it("waits out the gap between comments", () => {
    const recent = snapshot({ lastPostedAt: minutesAgo(10) });
    expect(runAllowed(cfg(), recent, NOW).reason).toBe("too_soon");
  });

  it("posts again once the gap has passed", () => {
    expect(runAllowed(cfg(), snapshot({ lastPostedAt: minutesAgo(40) }), NOW).ok).toBe(true);
  });

  it("stays silent while the breaker's pause is running", () => {
    const paused = snapshot({ pausedUntil: new Date(NOW + 60 * 60_000) });
    expect(runAllowed(cfg(), paused, NOW).reason).toBe("paused");
  });

  it("resumes after the pause expires", () => {
    const expired = snapshot({ pausedUntil: new Date(NOW - 60 * 60_000) });
    expect(runAllowed(cfg(), expired, NOW).ok).toBe(true);
  });
});

describe("redditbot/limits — per-subreddit cap", () => {
  it("counts only the sub in question", () => {
    const state = snapshot({ postedLast24h: [reply("uruguay"), reply("uruguay"), reply("Burises")] });
    expect(subAllowed(cfg(), state, "uruguay").reason).toBe("sub_cap");
    expect(subAllowed(cfg(), state, "Burises").ok).toBe(true);
  });

  it("matches the sub case-insensitively — Reddit is not consistent about it", () => {
    const state = snapshot({ postedLast24h: [reply("Uruguay"), reply("URUGUAY")] });
    expect(subAllowed(cfg(), state, "uruguay").reason).toBe("sub_cap");
  });
});

describe("redditbot/limits — cooldowns", () => {
  it("does not follow the same person around", () => {
    expect(authorAllowed(cfg(), daysAgo(2), NOW).reason).toBe("author_cooldown");
    expect(authorAllowed(cfg(), daysAgo(9), NOW).ok).toBe(true);
    expect(authorAllowed(cfg(), null, NOW).ok).toBe(true);
  });

  it("does not link the same page twice in three days — the pattern mods read as spam", () => {
    expect(pageAllowed(cfg(), daysAgo(1), NOW).reason).toBe("page_cooldown");
    expect(pageAllowed(cfg(), daysAgo(4), NOW).ok).toBe(true);
  });

  it("treats a cooldown of zero as disabled", () => {
    expect(authorAllowed(cfg({ authorCooldownDays: 0 }), daysAgo(0.1), NOW).ok).toBe(true);
    expect(pageAllowed(cfg({ pageCooldownDays: 0 }), daysAgo(0.1), NOW).ok).toBe(true);
  });
});

describe("redditbot/limits — the breaker", () => {
  it("trips at the configured number of bad outcomes", () => {
    expect(shouldTrip(cfg(), snapshot({ recentNegatives: 2 }))).toBe(false);
    expect(shouldTrip(cfg(), snapshot({ recentNegatives: 3 }))).toBe(true);
  });

  it("can be disabled by setting the threshold to zero", () => {
    expect(shouldTrip(cfg({ breakerNegatives: 0 }), snapshot({ recentNegatives: 99 }))).toBe(false);
  });
});

describe("redditbot/limits — remainingToday", () => {
  it("never goes negative", () => {
    const over = snapshot({ postedLast24h: Array.from({ length: 9 }, () => reply("uruguay")) });
    expect(remainingToday(cfg(), over)).toBe(0);
  });
});
