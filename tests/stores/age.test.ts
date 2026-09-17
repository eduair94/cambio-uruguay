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

/**
 * Item 1: both sources are queried every time now (`Promise.all`, no more crt.sh-primary
 * short-circuit), so tests that need to give crt.sh and Wayback DIFFERENT answers dispatch on the
 * URL instead of relying on call order. Each handler is invoked fresh per call (never a stored
 * `Response` instance), so a source retried more than once — crt.sh's one retry on failure — still
 * gets a body its own `.text()` hasn't already consumed.
 */
function urlFetch(handlers: { crt: () => Response; wayback: () => Response }) {
  return vi.fn(async (url: string) => {
    const href = String(url);
    if (href.includes("crt.sh")) return handlers.crt();
    if (href.includes("web.archive.org")) return handlers.wayback();
    throw new Error(`unexpected url in test: ${href}`);
  });
}

describe("fetchAge", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.STORES_AGE_RETRY_MS;
  });

  it("uses crt.sh's earliest certificate when it has rows and Wayback has none", async () => {
    const fetchAge = await freshFetchAge();
    vi.stubGlobal(
      "fetch",
      urlFetch({
        crt: () => jsonResponse([{ not_before: "2020-07-14T20:14:35" }, { not_before: "2023-01-01T00:00:00" }]),
        wayback: () => jsonResponse([["timestamp"]]),
      })
    );
    const signal = await fetchAge("expansionuy.com");
    expect(signal).toMatchObject({ since: "2020-07-14", source: "crt.sh" });
  });

  it("prefers Wayback's date when it is earlier than crt.sh's (item 1: the earlier date wins)", async () => {
    const fetchAge = await freshFetchAge();
    vi.stubGlobal(
      "fetch",
      urlFetch({
        crt: () => jsonResponse([{ not_before: "2020-07-14T20:14:35" }]),
        wayback: () => jsonResponse([["timestamp"], ["20150101000000"]]),
      })
    );
    const signal = await fetchAge("ejemplo.com");
    expect(signal).toMatchObject({ since: "2015-01-01", source: "wayback" });
  });

  it("prefers crt.sh's date on an exact tie with Wayback", async () => {
    const fetchAge = await freshFetchAge();
    vi.stubGlobal(
      "fetch",
      urlFetch({
        crt: () => jsonResponse([{ not_before: "2019-03-05T00:00:00" }]),
        wayback: () => jsonResponse([["timestamp"], ["20190305000000"]]),
      })
    );
    const signal = await fetchAge("ejemplo.com");
    expect(signal).toMatchObject({ since: "2019-03-05", source: "crt.sh" });
  });

  // Mirrors the live check done for this fix (2026-09-17): crt.sh answered tiendainglesa.com.uy
  // with 137 certificates (earliest 2019-09-30) while the same run's Wayback CDX call came back
  // with its "Internet Archive: Temporarily Offline" HTML page — a resolved date from one source
  // must not be thrown away just because the OTHER source failed to answer at all.
  it("uses crt.sh's date even when Wayback fails outright", async () => {
    const fetchAge = await freshFetchAge(5);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("crt.sh")) return jsonResponse([{ not_before: "2019-09-30T18:37:17" }]);
        throw new TypeError("fetch failed"); // Wayback: network failure
      })
    );
    const signal = await fetchAge("tiendainglesa.com.uy");
    expect(signal).toMatchObject({ since: "2019-09-30", source: "crt.sh" });
  }, 10_000);

  it("uses Wayback's date even when crt.sh fails outright", async () => {
    const fetchAge = await freshFetchAge(5);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("web.archive.org")) return jsonResponse([["timestamp"], ["20190305120000"]]);
        throw new TypeError("fetch failed"); // crt.sh: network failure, both attempts
      })
    );
    const signal = await fetchAge("ejemplo.com");
    expect(signal).toMatchObject({ since: "2019-03-05", source: "wayback" });
  }, 10_000);

  it("returns null when both sources answer with nothing", async () => {
    const fetchAge = await freshFetchAge();
    vi.stubGlobal(
      "fetch",
      urlFetch({
        crt: () => jsonResponse([]),
        wayback: () => jsonResponse([["timestamp"]]),
      })
    );
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
    // one crt.sh attempt + one retry + one wayback attempt, run concurrently
    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 10_000);

  it("treats a non-200 crt.sh status as a failure; still uses Wayback's date when it has one", async () => {
    const fetchAge = await freshFetchAge(5);
    vi.stubGlobal(
      "fetch",
      urlFetch({
        crt: () => new Response("bad gateway", { status: 502 }),
        wayback: () => jsonResponse([["timestamp"], ["20190305120000"]]),
      })
    );
    const signal = await fetchAge("ejemplo.com");
    expect(signal).toMatchObject({ since: "2019-03-05", source: "wayback" });
  }, 10_000);

  it("treats an unparseable Wayback body (HTML outage page) as a FAILURE, not 'no data' (item 8)", async () => {
    const fetchAge = await freshFetchAge();
    vi.stubGlobal(
      "fetch",
      urlFetch({
        crt: () => jsonResponse([]), // crt.sh: queried fine, nothing there
        wayback: () => new Response("<html>Internet Archive: Temporarily Offline</html>", { status: 200 }),
      })
    );
    // Previously asserted `null` here (a stored age would have been erased); now `undefined`, since
    // Wayback never actually answered "no capture on file" — it failed to answer at all.
    await expect(fetchAge("ejemplo.com")).resolves.toBeUndefined();
  });
});
