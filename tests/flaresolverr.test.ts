// Some casas sit behind Cloudflare bot-fight, which rejects the scraper on client
// fingerprint rather than on IP: measured 2026-08-13 against cambiopando.com.uy,
// every proxy tried returned 403 (8/8 SOCKS5, plus direct), because the block is
// on the TLS/browser fingerprint, not the address. Rotating proxies cannot fix
// that. FlareSolverr drives a real browser and returns the solved HTML.
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLARESOLVERR_BUDGET_MS, flaresolverrGet, flaresolverrNodes } from "../classes/flaresolverr";

const original = process.env.FLARESOLVERR_URLS;

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  if (original === undefined) delete process.env.FLARESOLVERR_URLS;
  else process.env.FLARESOLVERR_URLS = original;
});

const solved = (html: string) => ({ data: { status: "ok", solution: { status: 200, response: html } } });

describe("flaresolverrNodes", () => {
  it("reads a comma-separated node list from the environment", () => {
    // Node addresses are infrastructure, not code: this repo is public, so they
    // live in .env rather than in a committed constant.
    process.env.FLARESOLVERR_URLS = " http://a:8192/v1 , http://b:8192/v1 ,";

    expect(flaresolverrNodes()).toEqual(["http://a:8192/v1", "http://b:8192/v1"]);
  });

  it("is empty when unset, so callers can degrade instead of crashing", () => {
    delete process.env.FLARESOLVERR_URLS;

    expect(flaresolverrNodes()).toEqual([]);
  });
});

describe("flaresolverrGet", () => {
  it("returns the solved HTML", async () => {
    process.env.FLARESOLVERR_URLS = "http://a:8192/v1";
    vi.spyOn(axios, "post").mockResolvedValue(solved("<table>rates</table>") as any);

    expect(await flaresolverrGet("https://example.com")).toBe("<table>rates</table>");
  });

  it("moves on to another node when one fails", async () => {
    // Measured: of four nodes, one timed out on every attempt while three solved.
    process.env.FLARESOLVERR_URLS = "http://dead:8192/v1,http://live:8192/v1";
    const post = vi
      .spyOn(axios, "post")
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(solved("<table>rates</table>") as any);

    expect(await flaresolverrGet("https://example.com")).toBe("<table>rates</table>");
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("treats a non-ok solver status as a failure", async () => {
    process.env.FLARESOLVERR_URLS = "http://a:8192/v1";
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { status: "error", message: "Error solving the challenge. Timeout after 45.0 seconds." },
    } as any);

    expect(await flaresolverrGet("https://example.com")).toBeNull();
  });

  it("does not call out at all when no node is configured", async () => {
    delete process.env.FLARESOLVERR_URLS;
    const post = vi.spyOn(axios, "post");

    expect(await flaresolverrGet("https://example.com")).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it("bounds each solve so it cannot outlast the origin's slice", async () => {
    process.env.FLARESOLVERR_URLS = "http://a:8192/v1";
    const post = vi.spyOn(axios, "post").mockResolvedValue(solved("<html></html>") as any);

    await flaresolverrGet("https://example.com");

    const config = post.mock.calls[0][2] as any;
    expect(config?.timeout).toBeGreaterThan(0);
    expect(config?.signal).toBeInstanceOf(AbortSignal);
    expect(FLARESOLVERR_BUDGET_MS).toBeLessThan(45_000);
  });

  it("stops trying nodes once the budget is spent", async () => {
    // A solve takes 12-17s. Walking a long node list one by one would blow the
    // 45s origin cap and take the sync down with it, which is the failure this
    // whole area already had once.
    process.env.FLARESOLVERR_URLS = "http://a:8192/v1,http://b:8192/v1,http://c:8192/v1";
    const post = vi.spyOn(axios, "post").mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 60));
      throw new Error("timeout");
    });

    const html = await flaresolverrGet("https://example.com", { budgetMs: 100 });

    expect(html).toBeNull();
    expect(post.mock.calls.length).toBeLessThan(3);
  });
});
