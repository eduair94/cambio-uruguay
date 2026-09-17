// One of two "third-party" signals for /tiendas-online-uruguay (the other is Google, in
// google.test.ts): what our own Trustpilot scraper service reports for a store's domain. The
// fixture below is the real shape measured 2026-09-16 against `:3029/trustpilot/feedbacks?domain=
// tiendamia.com` (see the task-3 brief) — the API nests everything that matters under
// `businessUnit`, not at the top level, which is the one easy mistake to make here.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTrustpilot, parseTrustpilot } from "../../classes/stores/signals/trustpilot";

const CHECKED_AT = "2026-09-16T00:00:00.000Z";

// Real payload from GET :3029/trustpilot/feedbacks?domain=tiendamia.com (2026-09-16), trimmed to
// the fields this module reads.
const REAL_RESPONSE = {
  domain: "tiendamia.com",
  pageUrl: "https://www.trustpilot.com/review/www.tiendamia.com",
  businessUnit: {
    id: "abc123",
    displayName: "Infotin S.A.",
    identifyingName: "www.tiendamia.com",
    numberOfReviews: 104,
    numberOfReviewsLast12Months: 12,
    trustScore: 1.4,
    stars: 1.5,
    isClaimed: true,
    isClosed: false,
    consumerAlert: null,
    consumerAlerts: [] as unknown[],
    websiteUrl: "https://www.tiendamia.com",
    countryCode: "US",
  },
};

describe("parseTrustpilot", () => {
  it("maps the real feedbacks shape to a TrustpilotSignal", () => {
    expect(parseTrustpilot(REAL_RESPONSE, CHECKED_AT)).toEqual({
      score: 1.4,
      reviews: 104,
      reviewsLast12m: 12,
      claimed: true,
      alerts: 0,
      url: "https://www.trustpilot.com/review/www.tiendamia.com",
      checkedAt: CHECKED_AT,
    });
  });

  it("returns null when the response has no businessUnit at all", () => {
    expect(parseTrustpilot({ domain: "x.com", pageUrl: "https://x" }, CHECKED_AT)).toBeNull();
  });

  it("returns null when numberOfReviews is 0 (page exists but is empty/unclaimed noise)", () => {
    const body = { ...REAL_RESPONSE, businessUnit: { ...REAL_RESPONSE.businessUnit, numberOfReviews: 0 } };
    expect(parseTrustpilot(body, CHECKED_AT)).toBeNull();
  });

  it.each([
    ["above 5", 5.5],
    ["negative", -1],
  ])("returns null when trustScore is outside 0-5 (%s)", (_label, trustScore) => {
    const body = { ...REAL_RESPONSE, businessUnit: { ...REAL_RESPONSE.businessUnit, trustScore } };
    expect(parseTrustpilot(body, CHECKED_AT)).toBeNull();
  });

  it("counts unresolved consumer alerts rather than just flagging their presence", () => {
    const body = {
      ...REAL_RESPONSE,
      businessUnit: { ...REAL_RESPONSE.businessUnit, consumerAlerts: [{ id: 1 }, { id: 2 }] },
    };
    expect(parseTrustpilot(body, CHECKED_AT)?.alerts).toBe(2);
  });
});

describe("fetchTrustpilot", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.STORES_TRUSTPILOT_URL;
  });

  it("queries the default service URL with the domain as a query param and parses a good reply", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(REAL_RESPONSE), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = await fetchTrustpilot("tiendamia.com");
    expect(signal?.score).toBe(1.4);
    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:3029/trustpilot/feedbacks?domain=tiendamia.com");
  });

  it("honors STORES_TRUSTPILOT_URL when set", async () => {
    process.env.STORES_TRUSTPILOT_URL = "https://tp.internal.example";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(REAL_RESPONSE), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await fetchTrustpilot("tiendamia.com");
    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://tp.internal.example/trustpilot/feedbacks?domain=tiendamia.com");
  });

  it("returns null on a 404 (no Trustpilot page for this domain)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
    expect(await fetchTrustpilot("nadie.com")).toBeNull();
  });

  it("returns null when the JSON has no business unit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ domain: "x.com" }), { status: 200 }))
    );
    expect(await fetchTrustpilot("x.com")).toBeNull();
  });

  it("returns undefined when the network itself fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      })
    );
    expect(await fetchTrustpilot("x.com")).toBeUndefined();
  });

  it("returns undefined on a 5xx from the scraper service", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad gateway", { status: 502 })));
    expect(await fetchTrustpilot("x.com")).toBeUndefined();
  });
});
