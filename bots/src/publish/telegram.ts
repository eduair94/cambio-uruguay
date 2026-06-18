// Telegram publishing over the stateless Bot API (sendMessage/sendPhoto). Used by
// the daily/alert jobs to post to a channel and DM subscribers. The interactive
// bot is separate (telegraf, long-poll) — only getUpdates must be single-instance.
import type { TelegramConfig } from "../config.js";

export interface TelegramPublisherOpts {
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  /** Delay between DM sends to respect Telegram's ~30 msg/s limit. */
  delayMs?: number;
}

export interface DmRecipient {
  chatId: string;
  text: string;
}

export interface DmResult {
  sent: number;
  deactivated: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class TelegramPublisher {
  private readonly cfg: TelegramConfig;
  private readonly dryRun: boolean;
  private readonly fetchImpl: typeof fetch;
  private readonly delayMs: number;

  constructor(cfg: TelegramConfig, opts: TelegramPublisherOpts = {}) {
    this.cfg = cfg;
    this.dryRun = opts.dryRun ?? false;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.delayMs = opts.delayMs ?? 40; // ~25 msg/s
  }

  isConfigured(): boolean {
    return Boolean(this.cfg.token && this.cfg.channelId);
  }

  private api(method: string): string {
    return `https://api.telegram.org/bot${this.cfg.token}/${method}`;
  }

  /** Post to the configured channel; sends a photo with caption when imageUrl is given. */
  async postChannel(text: string, opts: { imageUrl?: string } = {}): Promise<void> {
    await this.send(this.cfg.channelId, text, opts);
  }

  /** Send one message; returns the HTTP status so callers can detect 403 (blocked). */
  private async send(chatId: string, text: string, opts: { imageUrl?: string } = {}): Promise<number> {
    if (this.dryRun) {
      console.log(`[DRY_RUN telegram] -> ${chatId}: ${text.slice(0, 80)}…`);
      return 200;
    }
    const [method, payload] = opts.imageUrl
      ? ["sendPhoto", { chat_id: chatId, photo: opts.imageUrl, caption: text, parse_mode: "Markdown" }]
      : ["sendMessage", { chat_id: chatId, text, parse_mode: "Markdown", disable_web_page_preview: true }];
    const res = await this.fetchImpl(this.api(method as string), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.status;
  }

  /** DM many recipients, batched with a delay; reports chatIds that returned 403. */
  async dmMany(recipients: DmRecipient[], opts: { imageUrl?: string } = {}): Promise<DmResult> {
    let sent = 0;
    const deactivated: string[] = [];
    for (const r of recipients) {
      try {
        const status = await this.send(r.chatId, r.text, opts);
        if (status === 403) deactivated.push(r.chatId);
        else if (status >= 200 && status < 300) sent++;
      } catch (err) {
        console.error(`telegram dm ${r.chatId} failed:`, err);
      }
      if (this.delayMs > 0) await sleep(this.delayMs);
    }
    return { sent, deactivated };
  }
}
