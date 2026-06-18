import { describe, it, expect, vi } from "vitest";
import { AppClient } from "../src/store/app_client.js";

describe("AppClient", () => {
  it("links with the secret header", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ ok: true, linked: true }) });
    const c = new AppClient("https://app", "sec", fetchImpl as any);
    const res = await c.link("ABC", "42");
    expect(res).toEqual({ ok: true, linked: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://app/api/telegram/link",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-telegram-secret": "sec" }),
      }),
    );
  });

  it("gets alerts with the secret header", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ linked: true, alerts: [] }) });
    const c = new AppClient("https://app", "sec", fetchImpl as any);
    await c.alerts("42");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://app/api/telegram/alerts?chatId=42",
      expect.objectContaining({ headers: { "x-telegram-secret": "sec" } }),
    );
  });
});
