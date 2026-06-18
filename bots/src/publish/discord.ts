// Discord channel publishing via an incoming webhook (no gateway needed for
// posting). The interactive bot (discord.js gateway) is separate.

export interface DiscordPublisherCfg {
  webhookUrl?: string;
}

export interface DiscordPublisherOpts {
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
}

export class DiscordPublisher {
  private readonly webhookUrl?: string;
  private readonly dryRun: boolean;
  private readonly fetchImpl: typeof fetch;

  constructor(cfg: DiscordPublisherCfg, opts: DiscordPublisherOpts = {}) {
    this.webhookUrl = cfg.webhookUrl;
    this.dryRun = opts.dryRun ?? false;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  isConfigured(): boolean {
    return Boolean(this.webhookUrl);
  }

  /** Post a message to the webhook channel. `imageUrl` is appended (Discord unfurls it). */
  async postChannel(text: string, opts: { imageUrl?: string } = {}): Promise<void> {
    if (!this.webhookUrl) return;
    const content = opts.imageUrl ? `${text}\n${opts.imageUrl}` : text;
    if (this.dryRun) {
      console.log(`[DRY_RUN discord] ${content.slice(0, 80)}…`);
      return;
    }
    const res = await this.fetchImpl(this.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 2000), allowed_mentions: { parse: [] } }),
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`Discord webhook failed: ${res.status}`);
    }
  }
}
