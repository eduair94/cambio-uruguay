import { describe, expect, it, vi } from "vitest";
import { DiscordPublisher } from "../src/publish/discord.js";

describe("DiscordPublisher", () => {
  it("is configured only with a webhook url", () => {
    expect(new DiscordPublisher({ webhookUrl: "https://wh" }).isConfigured()).toBe(true);
    expect(new DiscordPublisher({}).isConfigured()).toBe(false);
  });

  it("POSTs content to the webhook", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const p = new DiscordPublisher({ webhookUrl: "https://wh" }, { fetchImpl: fetchMock as unknown as typeof fetch });
    await p.postChannel("hello");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://wh");
    expect(JSON.parse((init as RequestInit).body as string).content).toBe("hello");
  });

  it("is a no-op in dry-run", async () => {
    const fetchMock = vi.fn();
    const p = new DiscordPublisher({ webhookUrl: "https://wh" }, { dryRun: true, fetchImpl: fetchMock as unknown as typeof fetch });
    await p.postChannel("hello");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
