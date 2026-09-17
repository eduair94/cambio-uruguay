// The other "third-party" signal for /tiendas-online-uruguay (see trustpilot.test.ts for the
// first): a Google Maps rating, but ONLY when the listing's own published website resolves to the
// store's domain — the same rule app/server/tasks/casas/refreshReviews.ts applies to exchange
// houses (there via a pinned place_id; here, since a store has no hand-verified place_id yet, via
// checking the listing's `website` field against the domain we already trust from the registry). A
// name search alone is not enough: "Magic Center" also matches a same-named electronics stall in a
// shopping mall that isn't the online store, and a co-marketed/neighboring business is exactly the
// failure mode `sameSite` exists to reject.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGoogle, parsePlaceDetails, sameSite } from "../../classes/stores/signals/google";

const CHECKED_AT = "2026-09-16T00:00:00.000Z";

describe("sameSite", () => {
  it("matches identical hosts, ignoring the www subdomain and scheme", () => {
    expect(sameSite("https://www.magiccenter.com.uy/", "magiccenter.com.uy")).toBe(true);
  });

  it("matches when it is the domain argument (not the website) that carries www", () => {
    expect(sameSite("http://magiccenter.com.uy/tienda", "www.magiccenter.com.uy")).toBe(true);
  });

  it("rejects an unrelated domain such as a social profile", () => {
    expect(sameSite("https://facebook.com/magiccenter", "magiccenter.com.uy")).toBe(false);
  });

  it("rejects when there is no website published at all", () => {
    expect(sameSite(null, "x.uy")).toBe(false);
    expect(sameSite(undefined, "x.uy")).toBe(false);
  });

  it("accepts a subdomain of the store's own domain", () => {
    expect(sameSite("https://tienda.x.com.uy/catalogo", "x.com.uy")).toBe(true);
  });
});

describe("parsePlaceDetails", () => {
  const GOOD = {
    result: {
      rating: 4.3,
      user_ratings_total: 812,
      website: "https://magiccenter.com.uy/",
      formatted_address: "Av. 8 de Octubre 3908, Montevideo",
      url: "https://maps.google.com/?cid=1",
    },
    status: "OK",
  };

  it("builds a GoogleSignal when the listing's website matches the store's domain", () => {
    expect(parsePlaceDetails(GOOD, "magiccenter.com.uy", CHECKED_AT)).toEqual({
      rating: 4.3,
      reviews: 812,
      address: "Av. 8 de Octubre 3908, Montevideo",
      url: "https://maps.google.com/?cid=1",
      checkedAt: CHECKED_AT,
    });
  });

  it("rejects a listing whose published website is a different domain", () => {
    const wrongDomain = { ...GOOD, result: { ...GOOD.result, website: "https://otratienda.com.uy/" } };
    expect(parsePlaceDetails(wrongDomain, "magiccenter.com.uy", CHECKED_AT)).toBeNull();
  });

  it("rejects a result with no review count published", () => {
    const { user_ratings_total: _drop, ...rest } = GOOD.result;
    expect(parsePlaceDetails({ result: rest, status: "OK" }, "magiccenter.com.uy", CHECKED_AT)).toBeNull();
  });

  it("rejects a non-OK status (e.g. ZERO_RESULTS)", () => {
    expect(parsePlaceDetails({ status: "ZERO_RESULTS" }, "magiccenter.com.uy", CHECKED_AT)).toBeNull();
  });
});

describe("fetchGoogle", () => {
  afterEach(() => vi.unstubAllGlobals());

  const FIND_ONE_CANDIDATE = {
    candidates: [{ place_id: "abc123", name: "Magic Center" }],
    status: "OK",
  };

  const DETAILS_MATCH = {
    result: {
      rating: 4.3,
      user_ratings_total: 812,
      website: "https://magiccenter.com.uy/",
      formatted_address: "Av. 8 de Octubre 3908, Montevideo",
      url: "https://maps.google.com/?cid=1",
    },
    status: "OK",
  };

  it("resolves the single candidate when its details match the domain", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(FIND_ONE_CANDIDATE), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(DETAILS_MATCH), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = await fetchGoogle("Magic Center", "magiccenter.com.uy");
    expect(signal?.rating).toBe(4.3);
    expect(signal?.reviews).toBe(812);
  });

  it("skips a candidate whose website doesn't match and tries the next one", async () => {
    const wrongDetails = { result: { ...DETAILS_MATCH.result, website: "https://otra.com.uy/" }, status: "OK" };
    const findTwoCandidates = {
      candidates: [{ place_id: "wrong-one" }, { place_id: "right-one" }],
      status: "OK",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(findTwoCandidates), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(wrongDetails), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(DETAILS_MATCH), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const signal = await fetchGoogle("Magic Center", "magiccenter.com.uy");
    expect(signal?.rating).toBe(4.3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns null when findPlaceFromText has zero results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ status: "ZERO_RESULTS", candidates: [] }), { status: 200 }))
    );
    expect(await fetchGoogle("Nadie SA", "nadie.com.uy")).toBeNull();
  });

  it("returns null when no candidate's details pass domain validation", async () => {
    const wrongDetails = { result: { ...DETAILS_MATCH.result, website: "https://otra.com.uy/" }, status: "OK" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(FIND_ONE_CANDIDATE), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(wrongDetails), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchGoogle("Magic Center", "magiccenter.com.uy")).toBeNull();
  });

  it("returns undefined when the findPlaceFromText network call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      })
    );
    expect(await fetchGoogle("Magic Center", "magiccenter.com.uy")).toBeUndefined();
  });

  it("honors STORES_GMAPS_URL when set", async () => {
    process.env.STORES_GMAPS_URL = "https://maps.internal.example";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(FIND_ONE_CANDIDATE), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(DETAILS_MATCH), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await fetchGoogle("Magic Center", "magiccenter.com.uy");
    const [findUrl] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(findUrl.startsWith("https://maps.internal.example/findPlaceFromText")).toBe(true);
    delete process.env.STORES_GMAPS_URL;
  });
});
