// Signal 2 of 2 for /tiendas-online-uruguay: how old the domain is. crt.sh (earliest TLS
// certificate) is the primary source; the Wayback Machine's first capture is the fallback when
// crt.sh has nothing or cannot be reached. Both `earliestCertificate` and `waybackFirstCapture` are
// pure parsers exercised with the tiny literal payloads from the task brief — no fixture files
// needed for two-line arrays. `fetchAge` itself is exercised by mocking global `fetch`, per the
// project convention (see tests/rentals/net.test.ts) — never a real network call.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { earliestCertificate, waybackFirstCapture } from "../../classes/stores/signals/age";

describe("earliestCertificate", () => {
  it("returns the date (YYYY-MM-DD) of the oldest not_before across all rows", () => {
    expect(
      earliestCertificate([{ not_before: "2026-07-28T11:53:21" }, { not_before: "2020-07-14T20:14:35" }])
    ).toBe("2020-07-14");
  });

  it("returns null for an empty result set", () => {
    expect(earliestCertificate([])).toBeNull();
  });

  it("ignores rows without a usable not_before", () => {
    expect(earliestCertificate([{}, { not_before: "2021-01-01T00:00:00" }])).toBe("2021-01-01");
  });
});

describe("waybackFirstCapture", () => {
  it("reads the timestamp from the CDX row after the header row", () => {
    expect(waybackFirstCapture([["timestamp"], ["20190305120000"]])).toBe("2019-03-05");
  });

  it("returns null when only the header row is present", () => {
    expect(waybackFirstCapture([["timestamp"]])).toBeNull();
  });

  it("never throws on an 'Internet Archive: Temporarily Offline' HTML body", () => {
    expect(() => waybackFirstCapture("<html><body>Internet Archive: Temporarily Offline</body></html>")).not.toThrow();
    expect(waybackFirstCapture("<html><body>Internet Archive: Temporarily Offline</body></html>")).toBeNull();
  });
});

// Every fetchAge scenario below sets STORES_AGE_RETRY_MS to a few ms before importing a fresh copy
// of the module: attemptCrt's one retry after a failure really does wait between attempts (10s in
// production, per the brief), and this repo prefers a configurable knob (see classes/precios/net.ts
// GAP_MS/RETRIES, classes/rentals/net.ts HOST_GAP_MS) over sinon fake timers faking AbortSignal too.
async function freshFetchAge(retryMs = 5) {
  vi.resetModules();
  process.env.STORES_AGE_RETRY_MS = String(retryMs);
  const mod = await import("../../classes/stores/signals/age");
  return mod.fetchAge;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("fetchAge", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.STORES_AGE_RETRY_MS;
  });

  it("uses crt.sh's earliest certificate when it has rows", async () => {
    const fetchAge = await freshFetchAge();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([{ not_before: "2020-07-14T20:14:35" }, { not_before: "2023-01-01T00:00:00" }]))
    );
    const signal = await fetchAge("expansionuy.com");
    expect(signal).toMatchObject({ since: "2020-07-14", source: "crt.sh" });
  });

  it("falls back to Wayback when crt.sh answers with no rows", async () => {
    const fetchAge = await freshFetchAge();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([])) // crt.sh: queried fine, nothing there
      .mockResolvedValueOnce(jsonResponse([["timestamp"], ["20190305120000"]])); // wayback
    vi.stubGlobal("fetch", fetchMock);
    const signal = await fetchAge("ejemplo.com");
    expect(signal).toMatchObject({ since: "2019-03-05", source: "wayback" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null when both sources answer with nothing", async () => {
    const fetchAge = await freshFetchAge();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([["timestamp"]]));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchAge("ejemplo.com")).toBeNull();
  });

  it("returns undefined when crt.sh fails twice (network) and Wayback also fails", async () => {
    const fetchAge = await freshFetchAge(5);
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    vi.stubGlobal("fetch", fetchMock);
    const signal = await fetchAge("ejemplo.com");
    expect(signal).toBeUndefined();
    // one crt.sh attempt + one retry + one wayback attempt
    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 10_000);

  it("treats a non-200 crt.sh status as a failure and still tries Wayback", async () => {
    const fetchAge = await freshFetchAge(5);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("bad gateway", { status: 502 }))
      .mockResolvedValueOnce(new Response("bad gateway", { status: 502 }))
      .mockResolvedValueOnce(jsonResponse([["timestamp"], ["20190305120000"]]));
    vi.stubGlobal("fetch", fetchMock);
    const signal = await fetchAge("ejemplo.com");
    expect(signal).toMatchObject({ since: "2019-03-05", source: "wayback" });
  }, 10_000);

  it("treats an unparseable Wayback body (HTML outage page) as no data, not a crash", async () => {
    const fetchAge = await freshFetchAge();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(new Response("<html>Internet Archive: Temporarily Offline</html>", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchAge("ejemplo.com")).resolves.toBeNull();
  });
});
