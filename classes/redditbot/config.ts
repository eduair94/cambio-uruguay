// Every knob of the Reddit bot, read from the environment at call time.
//
// Read at call time, never at import: the sync entrypoints run `dotenv.config()` themselves and a
// module-scope constant would freeze the value from before that ran — the same trap classes/
// reddit.ts documents for its own credentials.
//
// TWO GATES, deliberately. `REDDIT_BOT_ENABLED` is separate from the credentials because the
// credentials will be on the VPS before the bot is calibrated, and the day this file deploys must
// not be the day it starts talking to strangers. Same reasoning as `CONTENT_PROMO_ENABLED` in
// bots/: one gate would mean shipping the code IS shipping the behaviour.

import dotenv from "dotenv";

dotenv.config();

const num = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
};

const list = (name: string, fallback: readonly string[]): string[] => {
  const raw = (process.env[name] || "").trim();
  if (!raw) return [...fallback];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * The subreddits worth watching, as chosen for this bot.
 *
 * `monte_video` and not `Montevideo`: the latter is private and answers 403 to everything, which
 * this repo already learned the hard way while harvesting. `CharruaDevs` is the IT/salary sub — the
 * natural home of the take-home-pay calculator, monotributo and invoicing pages.
 */
export const DEFAULT_SUBS = [
  "uruguay",
  "Burises",
  "UruguayFinanzas",
  "LegalUruguay",
  "AskUruguayan",
  "monte_video",
  "CharruaDevs",
] as const;

export interface BotConfig {
  enabled: boolean;
  dryRun: boolean;
  subs: string[];
  baseUrl: string;
  /** Posts fetched per subreddit per run. */
  fetchLimit: number;
  /**
   * How many screened threads may be embedded in one run.
   *
   * Query embeddings come out of the same daily Gemini allowance as the index (1 000 requests/day
   * on the free tier, measured). The bot fires 65 times a day, so an uncapped run on a busy morning
   * could spend the indexer's budget before lunch and leave the index permanently half-built. The
   * candidates that do not fit are picked by the lexical arm alone, which costs nothing, and the
   * rest simply wait for the next run twelve minutes later.
   */
  maxCandidatesPerRun: number;
  /**
   * Download and look at the image a post attached.
   *
   * On by default: a large share of these threads ARE the screenshot, and the title on those
   * ("me llegó esto, es normal?") carries almost nothing. Turn it off to save a vision call per
   * answer, at the cost of being blind to the actual question.
   */
  readImages: boolean;
  minAgeMinutes: number;
  maxAgeHours: number;
  maxPerDay: number;
  maxPerSubPerDay: number;
  minGapMinutes: number;
  authorCooldownDays: number;
  pageCooldownDays: number;
  /**
   * Best-chunk cosine the winning page must clear. This is the primary semantic gate: it is on a
   * 0..1 scale that means something on its own, unlike the fused RRF score.
   */
  minCosine: number;
  /**
   * How decisively the winner must beat the runner-up (score ratio).
   *
   * The absolute RRF score is NOT usable as a threshold and an early version of this config tried:
   * with k=60 the theoretical maximum for a page that tops both arms is 2/61 ≈ 0.033, so a
   * plausible-looking `0.034` would have silenced the bot permanently while looking like a tuned
   * value. What the fused score IS good for is comparison, so the gate compares: "did one page
   * clearly win, or did five pages tie?" A tie means the question is about a subject we cover
   * rather than a question we answer, which is exactly the case for a content gap.
   */
  minMargin: number;
  /** Judge confidence, 0..1. */
  minJudge: number;
  /** Consecutive bad outcomes within 24 h that trip the breaker. */
  breakerNegatives: number;
  breakerPauseHours: number;
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  userAgent: string;
}

export function botConfig(): BotConfig {
  const username = (process.env.REDDIT_BOT_USERNAME || "").trim();
  return {
    enabled: process.env.REDDIT_BOT_ENABLED === "1",
    // Default TRUE. An unset variable must mean "say nothing", never "post to r/uruguay".
    dryRun: process.env.REDDIT_BOT_DRY_RUN !== "0",
    subs: list("REDDIT_BOT_SUBS", DEFAULT_SUBS),
    baseUrl: (process.env.SITE_BASE_URL || "https://cambio-uruguay.com").replace(/\/+$/, ""),
    fetchLimit: num("REDDIT_BOT_FETCH_LIMIT", 50),
    maxCandidatesPerRun: num("REDDIT_BOT_MAX_CANDIDATES", 12),
    readImages: process.env.REDDIT_BOT_READ_IMAGES !== "0",
    minAgeMinutes: num("REDDIT_BOT_MIN_AGE_MIN", 15),
    maxAgeHours: num("REDDIT_BOT_MAX_AGE_HOURS", 8),
    maxPerDay: num("REDDIT_BOT_MAX_PER_DAY", 6),
    maxPerSubPerDay: num("REDDIT_BOT_MAX_PER_SUB_PER_DAY", 2),
    minGapMinutes: num("REDDIT_BOT_MIN_GAP_MIN", 25),
    authorCooldownDays: num("REDDIT_BOT_AUTHOR_COOLDOWN_DAYS", 7),
    pageCooldownDays: num("REDDIT_BOT_PAGE_COOLDOWN_DAYS", 3),
    minCosine: num("REDDIT_BOT_MIN_COSINE", 0.62),
    minMargin: num("REDDIT_BOT_MIN_MARGIN", 1.12),
    minJudge: num("REDDIT_BOT_MIN_JUDGE", 0.7),
    breakerNegatives: num("REDDIT_BOT_BREAKER_NEGATIVES", 3),
    breakerPauseHours: num("REDDIT_BOT_BREAKER_PAUSE_HOURS", 48),
    username,
    password: process.env.REDDIT_BOT_PASSWORD || "",
    clientId: (process.env.REDDIT_BOT_CLIENT_ID || "").trim(),
    clientSecret: (process.env.REDDIT_BOT_CLIENT_SECRET || "").trim(),
    refreshToken: (process.env.REDDIT_BOT_REFRESH_TOKEN || "").trim(),
    userAgent:
      (process.env.REDDIT_BOT_USER_AGENT || "").trim() ||
      `nodejs:cambio-uruguay-bot:v1.0 (by /u/${username || "cambio_uruguay"})`,
  };
}

/** True when the bot has what it needs to authenticate as a user and post. */
export function botCredentialsPresent(cfg: BotConfig = botConfig()): boolean {
  if (!cfg.clientId || !cfg.clientSecret) return false;
  return Boolean(cfg.refreshToken || (cfg.username && cfg.password));
}

/** True when the bot is allowed to actually send a comment. Everything else is a rehearsal. */
export function canPost(cfg: BotConfig = botConfig()): boolean {
  return cfg.enabled && !cfg.dryRun && botCredentialsPresent(cfg);
}
