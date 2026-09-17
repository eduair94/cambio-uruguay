// Signal 2 of 2 for /tiendas-online-uruguay: how old the domain is. Both crt.sh (earliest TLS
// certificate) and the Wayback Machine (first capture) are queried every time, but they are NOT
// symmetric (item 1 follow-up, controller review of 34b5daf0): Wayback failing to answer — even
// after its own retry — fails the whole signal closed, because crt.sh's date alone systematically
// understates an established store and cannot be trusted to stand in for "first seen" without
// Wayback's own check on it. Only once Wayback has actually answered (a date, or a confirmed "empty")
// does crt.sh's date get to matter. Both `earliestCertificate` and `waybackFirstCapture` are pure
// parsers exercised with the tiny literal payloads from the task brief — no fixture files needed for
// two-line arrays. `fetchAge` itself is exercised by mocking global `fetch`, per the project
// convention (see tests/rentals/net.test.ts) — never a real network call.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { earliestCertificate, parseWaybackAvailable, waybackFirstCapture } from "../../classes/stores/signals/age";

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

// Item H: the Availability API's own answer shape, live-verified 2026-09-17 for
// tiendainglesa.com.uy (`{"url":"tiendainglesa.com.uy","archived_snapshots":{"closest":{"status":
// "200","available":true,"url":"http://web.archive.org/web/20010201203000/...","timestamp":
// "20010201203000"}},"timestamp":"19900101"}`) while the CDX endpoint answered 503 in the same run.
describe("parseWaybackAvailable", () => {
  it("reads the closest capture's date from the documented shape (the live 2026-09-17 response)", () => {
    expect(
      parseWaybackAvailable({
        url: "tiendainglesa.com.uy",
        archived_snapshots: {
          closest: {
            status: "200",
            available: true,
            url: "http://web.archive.org/web/20010201203000/http://www.tiendainglesa.com.uy:80/",
            timestamp: "20010201203000",
          },
        },
        timestamp: "19900101",
      })
    ).toEqual({ kind: "date", since: "2001-02-01" });
  });

  it("is 'empty' (never 'invalid') for the documented 'never captured' shape — no archived_snapshots, url still present", () => {
    expect(parseWaybackAvailable({ url: "nunca-capturado.com.uy", timestamp: "19900101" })).toEqual({
      kind: "empty",
    });
  });

  it("is 'empty' when archived_snapshots has no closest at all", () => {
    expect(parseWaybackAvailable({ url: "x.com.uy", archived_snapshots: {} })).toEqual({ kind: "empty" });
  });

  it("is 'invalid', never 'empty', for a body with no top-level url string", () => {
    expect(parseWaybackAvailable({ archived_snapshots: {} })).toEqual({ kind: "invalid" });
    expect(parseWaybackAvailable({ url: 123, archived_snapshots: {} })).toEqual({ kind: "invalid" });
  });

  it("is 'invalid' for an array, null, a primitive, or any other unrelated JSON shape (item E's rule, item H)", () => {
    expect(parseWaybackAvailable([["timestamp"], ["20190305120000"]])).toEqual({ kind: "invalid" });
    expect(parseWaybackAvailable(null)).toEqual({ kind: "invalid" });
    expect(parseWaybackAvailable("no soy JSON útil")).toEqual({ kind: "invalid" });
    expect(parseWaybackAvailable({ error: "bad request" })).toEqual({ kind: "invalid" });
  });

  it("is 'invalid' when closest.available isn't literally true, even with a timestamp present", () => {
    expect(
      parseWaybackAvailable({
        url: "x.com.uy",
        archived_snapshots: { closest: { available: false, timestamp: "20190305120000" } },
      })
    ).toEqual({ kind: "invalid" });
  });

  it("is 'invalid' when closest.timestamp isn't a real 8-digit-prefixed date string", () => {
    expect(
      parseWaybackAvailable({
        url: "x.com.uy",
        archived_snapshots: { closest: { available: true, timestamp: 20190305120000 } },
      })
    ).toEqual({ kind: "invalid" });
    expect(
      parseWaybackAvailable({
        url: "x.com.uy",
        archived_snapshots: { closest: { available: true, timestamp: "not-a-date" } },
      })
    ).toEqual({ kind: "invalid" });
  });
});

// Every fetchAge scenario below sets STORES_AGE_RETRY_MS to a few ms before importing a fresh copy
// of the module: both attemptCrt's and attemptWayback's one retry after a failure really do wait
// between attempts (10s in production, per the brief), and this repo prefers a configurable knob
// (see classes/precios/net.ts GAP_MS/RETRIES, classes/rentals/net.ts HOST_GAP_MS) over sinon fake
// timers faking AbortSignal too.
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
function urlFetch(handlers: { crt: () => Response; wayback: () => Response; available?: () => Response }) {
  return vi.fn(async (url: string) => {
    const href = String(url);
    if (href.includes("crt.sh")) return handlers.crt();
    // `web.archive.org` (CDX) and `archive.org/wayback/available` (item H's fallback) are two
    // different hosts on purpose (see the module header) — checked separately so a test can give
    // each its own answer.
    if (href.includes("web.archive.org")) return handlers.wayback();
    if (href.includes("archive.org/wayback/available")) {
      if (handlers.available) return handlers.available();
      throw new Error(`unexpected call to the Availability API in a test with no 'available' handler: ${href}`);
    }
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
  // with its "Internet Archive: Temporarily Offline" HTML page. Item 1 follow-up (controller review
  // of 34b5daf0): crt.sh's date alone systematically understates an established store — publishing
  // it here would have republished 2019-09-30 as this chain's "en línea desde", which is almost
  // certainly wrong — so Wayback failing (even after its own retry) now fails the WHOLE signal
  // closed, regardless of what crt.sh found.
  it("fails closed (undefined) when Wayback fails outright, even though crt.sh has a real date", async () => {
    const fetchAge = await freshFetchAge(5);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("crt.sh")) return jsonResponse([{ not_before: "2019-09-30T18:37:17" }]);
        throw new TypeError("fetch failed"); // Wayback: network failure, both attempts
      })
    );
    await expect(fetchAge("tiendainglesa.com.uy")).resolves.toBeUndefined();
  }, 10_000);

  it("fails closed when Wayback answers its outage page, even though crt.sh has a real date", async () => {
    const fetchAge = await freshFetchAge();
    vi.stubGlobal(
      "fetch",
      urlFetch({
        crt: () => jsonResponse([{ not_before: "2019-09-30T18:37:17" }]),
        wayback: () => new Response("<html>Internet Archive: Temporarily Offline</html>", { status: 200 }),
      })
    );
    await expect(fetchAge("tiendainglesa.com.uy")).resolves.toBeUndefined();
  });

  it("retries Wayback once after a transient failure before declaring it failed", async () => {
    const fetchAge = await freshFetchAge(5);
    let waybackCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("crt.sh")) return jsonResponse([{ not_before: "2020-01-01T00:00:00" }]);
        waybackCalls++;
        if (waybackCalls === 1) return new Response("bad gateway", { status: 502 });
        return jsonResponse([["timestamp"], ["20150101000000"]]);
      })
    );
    const signal = await fetchAge("ejemplo.com");
    expect(waybackCalls).toBe(2);
    expect(signal).toMatchObject({ since: "2015-01-01", source: "wayback" });
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

  it("returns undefined when crt.sh fails twice (network) and both Wayback endpoints also fail twice", async () => {
    const fetchAge = await freshFetchAge(5);
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    vi.stubGlobal("fetch", fetchMock);
    const signal = await fetchAge("ejemplo.com");
    expect(signal).toBeUndefined();
    // crt.sh: one attempt + one retry; Wayback CDX: one attempt + one retry (item 1 follow-up:
    // Wayback now retries too); CDX failing outright then falls back to the Availability API (item
    // H), itself one attempt + one retry — 2 + 2 + 2 = 6.
    expect(fetchMock).toHaveBeenCalledTimes(6);
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

  // Item H: the Availability API fallback, tried only once CDX has failed outright.
  it("falls back to the Availability API when CDX fails outright, and uses its date as source 'wayback' (item H)", async () => {
    const fetchAge = await freshFetchAge();
    vi.stubGlobal(
      "fetch",
      urlFetch({
        crt: () => jsonResponse([{ not_before: "2019-09-30T18:37:17" }]), // matches the live case
        wayback: () => new Response("bad gateway", { status: 503 }), // the live 2026-09-17 CDX failure
        available: () =>
          jsonResponse({
            url: "tiendainglesa.com.uy",
            archived_snapshots: { closest: { available: true, timestamp: "20010201203000" } },
          }),
      })
    );
    const signal = await fetchAge("tiendainglesa.com.uy");
    // The fallback's earlier date wins over crt.sh's, same "earlier of the two" rule as any other
    // Wayback answer — this is still source "wayback", never a third value.
    expect(signal).toMatchObject({ since: "2001-02-01", source: "wayback" });
  }, 10_000);

  it("still fails closed (undefined) when BOTH Wayback endpoints fail, even with a real crt.sh date (item H)", async () => {
    const fetchAge = await freshFetchAge(5);
    vi.stubGlobal(
      "fetch",
      urlFetch({
        crt: () => jsonResponse([{ not_before: "2019-09-30T18:37:17" }]),
        wayback: () => new Response("bad gateway", { status: 503 }),
        available: () => new Response("bad gateway", { status: 503 }),
      })
    );
    await expect(fetchAge("tiendainglesa.com.uy")).resolves.toBeUndefined();
  }, 10_000);

  it("treats a non-conforming Availability body as a failure too, never a confirmed empty (item H, item E's rule)", async () => {
    const fetchAge = await freshFetchAge(5);
    vi.stubGlobal(
      "fetch",
      urlFetch({
        crt: () => jsonResponse([]),
        wayback: () => new Response("bad gateway", { status: 503 }),
        available: () => jsonResponse({ error: "bad request" }), // no top-level `url`: non-conforming
      })
    );
    // If this were misread as "empty", the result would be `null` (both sources confirmed nothing).
    // It must instead stay `undefined`: neither Wayback endpoint ever actually answered.
    await expect(fetchAge("ejemplo.com")).resolves.toBeUndefined();
  }, 10_000);

  it("never calls the Availability API when CDX already answered — including CDX's own confirmed empty", async () => {
    const fetchAge = await freshFetchAge();
    const available = vi.fn(() => jsonResponse({ url: "x", archived_snapshots: { closest: { available: true, timestamp: "20190101000000" } } }));
    vi.stubGlobal(
      "fetch",
      urlFetch({
        crt: () => jsonResponse([]),
        wayback: () => jsonResponse([["timestamp"]]), // CDX: queried fine, confirmed nothing on file
        available,
      })
    );
    expect(await fetchAge("ejemplo.com")).toBeNull();
    expect(available).not.toHaveBeenCalled();
  });
});
