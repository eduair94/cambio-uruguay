import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

const KEYS = [
  "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHANNEL_ID",
  "DISCORD_BOT_TOKEN", "DISCORD_APP_ID", "DISCORD_WEBHOOK_URL",
  "TWITTER_APP_KEY", "TWITTER_APP_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_SECRET",
  "MONGO_URI", "DEFAULT_BROADCAST_LANG", "REPORT_CURRENCIES", "ALERT_CURRENCIES",
  "ALERT_THRESHOLD_PCT", "ALERT_COOLDOWN_MIN", "DRY_RUN", "FORCE", "API_BASE_URL", "SITE_BASE_URL",
];

describe("loadConfig", () => {
  beforeEach(() => {
    for (const k of KEYS) delete process.env[k];
  });
  afterEach(() => {
    for (const k of KEYS) delete process.env[k];
  });

  it("leaves channels undefined when their creds are absent", () => {
    const cfg = loadConfig();
    expect(cfg.telegram).toBeUndefined();
    expect(cfg.discord).toBeUndefined();
    expect(cfg.twitter).toBeUndefined();
    expect(cfg.mongoUri).toBeUndefined();
  });

  it("applies sensible defaults", () => {
    const cfg = loadConfig();
    expect(cfg.defaultLang).toBe("es");
    expect(cfg.reportCurrencies).toEqual(["USD", "EUR", "ARS", "BRL"]);
    expect(cfg.alert.thresholdPct).toBe(1);
    expect(cfg.alert.cooldownMin).toBe(120);
    expect(cfg.alert.currencies).toEqual(["USD", "EUR", "ARS", "BRL"]);
    expect(cfg.dryRun).toBe(false);
    expect(cfg.apiBaseUrl).toBe("https://api.cambio-uruguay.com");
  });

  it("populates telegram only when both token and channel are set", () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    expect(loadConfig().telegram).toBeUndefined();
    process.env.TELEGRAM_CHANNEL_ID = "@chan";
    expect(loadConfig().telegram).toEqual({ token: "123:abc", channelId: "@chan" });
  });

  it("populates twitter only when all four keys are set", () => {
    process.env.TWITTER_APP_KEY = "k";
    process.env.TWITTER_APP_SECRET = "s";
    process.env.TWITTER_ACCESS_TOKEN = "t";
    expect(loadConfig().twitter).toBeUndefined();
    process.env.TWITTER_ACCESS_SECRET = "u";
    expect(loadConfig().twitter).toEqual({ appKey: "k", appSecret: "s", accessToken: "t", accessSecret: "u" });
  });

  it("parses CSV and numeric overrides", () => {
    process.env.REPORT_CURRENCIES = "USD, eur ,Brl";
    process.env.ALERT_THRESHOLD_PCT = "2.5";
    process.env.DRY_RUN = "1";
    const cfg = loadConfig();
    expect(cfg.reportCurrencies).toEqual(["USD", "EUR", "BRL"]);
    expect(cfg.alert.thresholdPct).toBe(2.5);
    expect(cfg.dryRun).toBe(true);
  });
});
