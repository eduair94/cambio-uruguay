import { describe, expect, it, vi } from "vitest";
import { httpSiteApi, SiteError } from "../src/site";

function response(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("httpSiteApi", () => {
  it("caches GETs for their ttl", async () => {
    let t = 0;
    const fetch = vi.fn(async () => response(200, { ok: 1 }));
    const site = httpSiteApi("https://x.test/", { fetch, now: () => t });
    await site.get("/api/a", { q: "z" }, { ttlMs: 1000 });
    await site.get("/api/a", { q: "z" }, { ttlMs: 1000 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![0]).toBe("https://x.test/api/a?q=z");
    t = 2000;
    await site.get("/api/a", { q: "z" }, { ttlMs: 1000 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not cache without ttl, and dedupes in-flight requests", async () => {
    const fetch = vi.fn(async () => response(200, { ok: 1 }));
    const site = httpSiteApi("https://x.test", { fetch });
    await Promise.all([site.get("/api/b"), site.get("/api/b")]);
    expect(fetch).toHaveBeenCalledTimes(1);
    await site.get("/api/b");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("never caches POSTs and sends json with a user agent", async () => {
    const fetch = vi.fn(async () => response(200, { ok: 1 }));
    const site = httpSiteApi("https://x.test", { fetch });
    await site.post("/api/c", { a: 1 }, { ttlMs: 10_000 });
    await site.post("/api/c", { a: 1 }, { ttlMs: 10_000 });
    expect(fetch).toHaveBeenCalledTimes(2);
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"a":1}');
    expect((init.headers as Record<string, string>)["user-agent"]).toMatch(/^cambio-uruguay-mcp\/0\.2\.0/);
  });

  it("maps statuses to Spanish errors", async () => {
    const site = httpSiteApi("https://x.test", { fetch: async () => response(429) });
    await expect(site.get("/api/d")).rejects.toMatchObject({ status: 429, message: expect.stringContaining("reintentá en un minuto") });
    const missing = httpSiteApi("https://x.test", { fetch: async () => response(404) });
    await expect(missing.get("/api/e")).rejects.toThrow(/ya no está publicado/);
    await expect(missing.get("/api/e")).rejects.toBeInstanceOf(SiteError);
  });

  it("retries once on a gateway error", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(502)).mockResolvedValueOnce(response(200, { v: 2 }));
    const site = httpSiteApi("https://x.test", { fetch });
    await expect(site.get("/api/f")).resolves.toEqual({ v: 2 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry when told not to", async () => {
    const fetch = vi.fn(async () => response(503));
    const site = httpSiteApi("https://x.test", { fetch });
    await expect(site.get("/api/g", undefined, { retry: false })).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("turns network failures into a SiteError", async () => {
    const site = httpSiteApi("https://x.test", {
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    await expect(site.get("/api/h", undefined, { retry: false })).rejects.toMatchObject({ status: 503 });
  });

  it("sends absolute URLs to that host instead of the site", async () => {
    const fetch = vi.fn(async () => response(200, { ok: 1 }));
    const site = httpSiteApi("https://x.test", { fetch });
    await site.get("https://geo.test/geocode", { address: "a b" });
    expect(fetch.mock.calls[0]![0]).toBe("https://geo.test/geocode?address=a+b");
  });
});
