import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyAdmin } from "../classes/notify";

describe("notifyAdmin", () => {
  const saved = { t: process.env.TELEGRAM_BOT_TOKEN, c: process.env.TELEGRAM_ADMIN_CHAT_ID };

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = saved.t;
    process.env.TELEGRAM_ADMIN_CHAT_ID = saved.c;
    vi.restoreAllMocks();
  });

  it("returns false when unconfigured, without throwing", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_ADMIN_CHAT_ID;
    await expect(notifyAdmin("hi")).resolves.toBe(false);
  });

  it("posts to the Bot API when configured", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "t";
    process.env.TELEGRAM_ADMIN_CHAT_ID = "1";
    let hitUrl = "";
    const fake = (async (url: string) => {
      hitUrl = url;
      return { json: async () => ({ ok: true }) };
    }) as unknown as typeof fetch;
    await expect(notifyAdmin("hi", fake)).resolves.toBe(true);
    expect(hitUrl).toContain("/bott/sendMessage");
  });

  it("bounds the request so a silent Telegram cannot hang a job that is about to exit", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "t";
    process.env.TELEGRAM_ADMIN_CHAT_ID = "1";
    let signal: AbortSignal | null | undefined;
    const fake = (async (_url: string, init: RequestInit) => {
      signal = init.signal;
      return { json: async () => ({ ok: true }) };
    }) as unknown as typeof fetch;
    await expect(notifyAdmin("hi", fake)).resolves.toBe(true);
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);
  });

  it("returns false (never throws) when the API call errors", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "t";
    process.env.TELEGRAM_ADMIN_CHAT_ID = "1";
    const boom = (async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    await expect(notifyAdmin("hi", boom)).resolves.toBe(false);
  });
});
