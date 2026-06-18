import { describe, expect, it, vi } from "vitest";
import { TelegramPublisher } from "../src/publish/telegram.js";

const cfg = { token: "T", channelId: "@c" };

describe("TelegramPublisher", () => {
  it("is configured only with a token+channel", () => {
    expect(new TelegramPublisher(cfg).isConfigured()).toBe(true);
  });

  it("does not call the API in dry-run", async () => {
    const fetchMock = vi.fn();
    const p = new TelegramPublisher(cfg, { dryRun: true, fetchImpl: fetchMock, delayMs: 0 });
    await p.postChannel("hi");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deactivates recipients that return 403 and counts the rest", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? "{}");
      if (body.chat_id === "blocked") {
        return new Response(JSON.stringify({ ok: false, error_code: 403 }), { status: 403 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const p = new TelegramPublisher(cfg, { fetchImpl: fetchMock as unknown as typeof fetch, delayMs: 0 });
    const res = await p.dmMany([
      { chatId: "a", text: "x" },
      { chatId: "blocked", text: "x" },
      { chatId: "b", text: "x" },
    ]);
    expect(res.sent).toBe(2);
    expect(res.deactivated).toEqual(["blocked"]);
  });
});
