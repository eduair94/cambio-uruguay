// Fan-out orchestrator: builds the configured publishers and pushes the daily
// report / alerts to every channel under Promise.allSettled, so one failing
// channel never blocks the others. Subscriber lists are passed in (resolved by
// the caller from the store) to keep this module free of Mongo.
import type { BotConfig } from "../config.js";
import { normalizeLang, type Lang } from "../format/i18n.js";
import {
  formatAlert,
  formatDailyDiscord,
  formatDailyTelegram,
  formatDailyTwitter,
} from "../format/messages.js";
import type { AlertData, DailyReportData } from "../report/types.js";
import { DiscordPublisher } from "./discord.js";
import { TelegramPublisher } from "./telegram.js";
import { TwitterPublisher } from "./twitter.js";

export interface SubscriberRef {
  chatId: string;
  language: string;
}

export interface ImageRef {
  /** Public URL used by Telegram/Discord. */
  url?: string;
  /** Raw bytes used by Twitter media upload. */
  buffer?: Buffer | null;
}

export interface PublishDailyInput {
  cfg: BotConfig;
  data: DailyReportData;
  /** AI summary text keyed by language (at least defaultLang). */
  aiByLang: Record<string, string>;
  /** Telegram subscribers to DM (already resolved + active). */
  telegramSubscribers?: SubscriberRef[];
  image?: ImageRef;
}

export interface PublishDailyResult {
  channels: string[];
  dmSent: number;
  deactivated: string[];
}

async function settle(label: string, p: Promise<unknown>): Promise<boolean> {
  try {
    await p;
    return true;
  } catch (err) {
    console.error(`publish:${label} failed:`, err);
    return false;
  }
}

export async function publishDaily(input: PublishDailyInput): Promise<PublishDailyResult> {
  const { cfg, data, aiByLang, image } = input;
  const lang = normalizeLang(cfg.defaultLang);
  const ai = aiByLang[lang] ?? aiByLang[cfg.defaultLang] ?? "";
  const channels: string[] = [];
  let dmSent = 0;
  const deactivated: string[] = [];

  const tasks: Promise<unknown>[] = [];

  if (cfg.telegram) {
    const tg = new TelegramPublisher(cfg.telegram, { dryRun: cfg.dryRun });
    tasks.push(
      settle("telegram-channel", tg.postChannel(formatDailyTelegram(data, ai, lang), { imageUrl: image?.url })).then(
        (ok) => ok && channels.push("telegram")
      )
    );
    if (input.telegramSubscribers?.length) {
      // Group subscribers by language so each gets a localized body.
      const byLang = new Map<Lang, SubscriberRef[]>();
      for (const s of input.telegramSubscribers) {
        const l = normalizeLang(s.language);
        (byLang.get(l) ?? byLang.set(l, []).get(l)!).push(s);
      }
      tasks.push(
        (async () => {
          const tgDm = new TelegramPublisher(cfg.telegram!, { dryRun: cfg.dryRun });
          for (const [l, subs] of byLang) {
            const body = formatDailyTelegram(data, aiByLang[l] ?? ai, l);
            const res = await tgDm.dmMany(
              subs.map((s) => ({ chatId: s.chatId, text: body })),
              { imageUrl: image?.url }
            );
            dmSent += res.sent;
            deactivated.push(...res.deactivated);
          }
        })()
      );
    }
  }

  if (cfg.discord?.webhookUrl) {
    const dc = new DiscordPublisher({ webhookUrl: cfg.discord.webhookUrl }, { dryRun: cfg.dryRun });
    tasks.push(
      settle("discord-channel", dc.postChannel(formatDailyDiscord(data, ai, lang), { imageUrl: image?.url })).then(
        (ok) => ok && channels.push("discord")
      )
    );
  }

  if (cfg.twitter) {
    const tw = new TwitterPublisher(cfg.twitter, { dryRun: cfg.dryRun });
    tasks.push(
      settle("twitter", tw.tweet(formatDailyTwitter(data, lang), image?.buffer)).then((ok) => ok && channels.push("twitter"))
    );
  }

  await Promise.allSettled(tasks);
  return { channels, dmSent, deactivated };
}

export interface PublishAlertInput {
  cfg: BotConfig;
  alert: AlertData;
  telegramSubscribers?: SubscriberRef[];
}

export async function publishAlert(input: PublishAlertInput): Promise<{ channels: string[]; deactivated: string[] }> {
  const { cfg, alert } = input;
  const lang = normalizeLang(cfg.defaultLang);
  const channels: string[] = [];
  const deactivated: string[] = [];
  const tasks: Promise<unknown>[] = [];

  if (cfg.telegram) {
    const tg = new TelegramPublisher(cfg.telegram, { dryRun: cfg.dryRun });
    tasks.push(
      settle("telegram-alert", tg.postChannel(formatAlert(alert, lang, "telegram"))).then((ok) => ok && channels.push("telegram"))
    );
    if (input.telegramSubscribers?.length) {
      tasks.push(
        (async () => {
          const res = await tg.dmMany(
            input.telegramSubscribers!.map((s) => ({
              chatId: s.chatId,
              text: formatAlert(alert, normalizeLang(s.language), "telegram"),
            }))
          );
          deactivated.push(...res.deactivated);
        })()
      );
    }
  }
  if (cfg.discord?.webhookUrl) {
    const dc = new DiscordPublisher({ webhookUrl: cfg.discord.webhookUrl }, { dryRun: cfg.dryRun });
    tasks.push(settle("discord-alert", dc.postChannel(formatAlert(alert, lang, "discord"))).then((ok) => ok && channels.push("discord")));
  }
  if (cfg.twitter) {
    const tw = new TwitterPublisher(cfg.twitter, { dryRun: cfg.dryRun });
    tasks.push(settle("twitter-alert", tw.tweet(formatAlert(alert, lang, "discord").replace(/[*_]/g, ""))).then((ok) => ok && channels.push("twitter")));
  }

  await Promise.allSettled(tasks);
  return { channels, deactivated };
}
