// Central env parsing + feature gates. Each channel object exists only when its
// required credentials are present, so callers gate behavior with a simple
// `if (cfg.telegram)`. Pure (reads process.env once) and unit-tested.

export interface TelegramConfig {
  token: string;
  channelId: string;
}
export interface DiscordConfig {
  botToken: string;
  appId: string;
  webhookUrl?: string;
}
export interface TwitterConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}
export interface AlertConfig {
  thresholdPct: number;
  cooldownMin: number;
  /** Same-direction re-alert (past cooldown) needs |pct| to grow by ≥ this. */
  reAlertDeltaPct: number;
  currencies: string[];
}
export interface BotConfig {
  apiBaseUrl: string;
  siteBaseUrl: string;
  appBaseUrl: string;
  accountSecret?: string;
  defaultLang: string;
  reportCurrencies: string[];
  alert: AlertConfig;
  telegram?: TelegramConfig;
  discord?: DiscordConfig;
  twitter?: TwitterConfig;
  mongoUri?: string;
  dryRun: boolean;
  force: boolean;
}

const DEFAULT_CURRENCIES = ["USD", "EUR", "ARS", "BRL"];

function csv(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const parts = value
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return parts.length ? parts : fallback;
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && value !== undefined && value !== "" ? n : fallback;
}

function bool(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
  const telegram =
    env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHANNEL_ID
      ? { token: env.TELEGRAM_BOT_TOKEN, channelId: env.TELEGRAM_CHANNEL_ID }
      : undefined;

  const discord =
    env.DISCORD_BOT_TOKEN && env.DISCORD_APP_ID
      ? { botToken: env.DISCORD_BOT_TOKEN, appId: env.DISCORD_APP_ID, webhookUrl: env.DISCORD_WEBHOOK_URL || undefined }
      : undefined;

  const twitter =
    env.TWITTER_APP_KEY && env.TWITTER_APP_SECRET && env.TWITTER_ACCESS_TOKEN && env.TWITTER_ACCESS_SECRET
      ? {
          appKey: env.TWITTER_APP_KEY,
          appSecret: env.TWITTER_APP_SECRET,
          accessToken: env.TWITTER_ACCESS_TOKEN,
          accessSecret: env.TWITTER_ACCESS_SECRET,
        }
      : undefined;

  return {
    apiBaseUrl: env.API_BASE_URL || "https://api.cambio-uruguay.com",
    siteBaseUrl: env.SITE_BASE_URL || "https://cambio-uruguay.com",
    appBaseUrl: env.APP_BASE_URL || env.SITE_BASE_URL || "https://cambio-uruguay.com",
    accountSecret: env.TELEGRAM_BOT_SECRET || undefined,
    defaultLang: (env.DEFAULT_BROADCAST_LANG || "es").toLowerCase(),
    reportCurrencies: csv(env.REPORT_CURRENCIES, DEFAULT_CURRENCIES),
    alert: {
      thresholdPct: num(env.ALERT_THRESHOLD_PCT, 1),
      cooldownMin: num(env.ALERT_COOLDOWN_MIN, 120),
      reAlertDeltaPct: num(env.ALERT_REALERT_DELTA_PCT, num(env.ALERT_THRESHOLD_PCT, 1)),
      currencies: csv(env.ALERT_CURRENCIES, DEFAULT_CURRENCIES),
    },
    telegram,
    discord,
    twitter,
    mongoUri: env.MONGO_URI || undefined,
    dryRun: bool(env.DRY_RUN),
    force: bool(env.FORCE),
  };
}
