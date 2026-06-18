// Twitter/X publishing via twitter-api-v2. Daily post is a single tweet, with an
// optional image (v1.1 media upload + v2 tweet). Formatting lives in messages.ts;
// this file stays a thin, feature-gated wrapper.
import { TwitterApi } from "twitter-api-v2";
import type { TwitterConfig } from "../config.js";

export interface TwitterPublisherOpts {
  dryRun?: boolean;
}

export class TwitterPublisher {
  private readonly cfg?: TwitterConfig;
  private readonly dryRun: boolean;
  private client?: TwitterApi;

  constructor(cfg: TwitterConfig | undefined, opts: TwitterPublisherOpts = {}) {
    this.cfg = cfg;
    this.dryRun = opts.dryRun ?? false;
    if (cfg) {
      this.client = new TwitterApi({
        appKey: cfg.appKey,
        appSecret: cfg.appSecret,
        accessToken: cfg.accessToken,
        accessSecret: cfg.accessSecret,
      });
    }
  }

  isConfigured(): boolean {
    return Boolean(this.cfg);
  }

  /** Post a tweet, optionally with a single image. */
  async tweet(text: string, imageBuffer?: Buffer | null): Promise<void> {
    if (this.dryRun || !this.client) {
      console.log(`[DRY_RUN twitter] ${text.replace(/\n/g, " ").slice(0, 100)}…`);
      return;
    }
    let mediaId: string | undefined;
    if (imageBuffer && imageBuffer.length > 0) {
      try {
        mediaId = await this.client.v1.uploadMedia(imageBuffer, { mimeType: "image/png" });
      } catch (err) {
        console.error("twitter media upload failed, tweeting text only:", err);
      }
    }
    await this.client.v2.tweet(text, mediaId ? { media: { media_ids: [mediaId] } } : undefined);
  }
}
