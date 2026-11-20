import { describe, expect, it } from "vitest";
import { sanitizeError } from "../../classes/insights/errors";
import { joinGsc, parseBing, parseWcfDate, runBing, unwrapD } from "../../classes/insights/sources/bing";
import type { BingHttp } from "../../classes/insights/sources/bing";
import { fakeSecrets, fixture } from "./helpers";

const SITE = "https://cambio-uruguay.com/";

function http(map: Record<string, { status: number; data: any }>) {
  const calls: string[] = [];
  const h: BingHttp = {
    get: async (url) => {
      const method = url.split("/").pop()!;
      calls.push(method);
      return map[method] || { status: 200, data: { d: [] } };
    },
  };
  return { h, calls };
}

const SITES = { status: 200, data: { d: [{ Url: SITE }] } };

describe("Bing", () => {
  it("desenvuelve `d` y lee las fechas WCF", () => {
    expect(unwrapD({ d: [1] })).toEqual([1]);
    expect(parseWcfDate("/Date(1763276400000-0700)/")).toBe("2025-11-16");
    expect(parseWcfDate("nada")).toBeNull();
  });

  it("suma los baldes por consulta y pondera la posición por impresiones", () => {
    const data = parseBing(
      {
        queries: fixture("bing_query_stats"),
        pages: fixture("bing_page_stats"),
        traffic: fixture("bing_rank_and_traffic"),
        crawl: fixture("bing_crawl_stats"),
        issues: fixture("bing_crawl_issues"),
      },
      SITE
    );
    const q = data.queries.find((x) => x.query === "cotizacion dolar uruguay")!;
    expect(q.impressions).toBe(201);
    expect(q.clicks).toBe(17);
    expect(q.weeks).toBe(2);
    expect(q.avgPosition).toBe(Math.round(((4 * 140 + 2 * 61) / 201) * 10) / 10);
    expect(data.queries.find((x) => x.query === "casas de cambio montevideo")!.avgClickPosition).toBeNull();
    expect(data.pages[0]).toMatchObject({ path: "/dolar-hoy", impressions: 260 });
    expect(data.issues[0]).toMatchObject({ path: "/cotizacion/brou", httpCode: 301, issuesRaw: 1 });
    expect(data.crawl[0].crawled).toBe(1341);
    expect(data.buckets.length).toBe(2);
  });

  it("sin clave: inactiva y cero llamadas", async () => {
    const { h, calls } = http({});
    const res = await runBing({ http: h, key: "", prevData: null, log: () => undefined });
    expect(res.outcome.kind).toBe("inactive");
    expect(calls).toEqual([]);
  });

  it("ErrorCode 3 y 14 → inactiva; 4 y 5 → falla", async () => {
    for (const [code, kind] of [
      [3, "inactive"],
      [14, "inactive"],
      [4, "failed"],
      [5, "failed"],
    ] as const) {
      const { h } = http({ GetUserSites: SITES, GetRankAndTrafficStats: { status: 400, data: { ErrorCode: code, Message: "x" } } });
      const res = await runBing({ http: h, key: "k", siteUrl: SITE, prevData: null, log: () => undefined });
      expect(res.outcome.kind, String(code)).toBe(kind);
    }
    const { h } = http({ GetUserSites: { status: 400, data: fixture("bing_error_invalid_key").body } });
    expect((await runBing({ http: h, key: "k", siteUrl: SITE, prevData: null, log: () => undefined })).outcome.kind).toBe("inactive");
  });

  it("el sitio que no figura en GetUserSites deja la fuente inactiva", async () => {
    const { h } = http({ GetUserSites: { status: 200, data: { d: [{ Url: "https://otro.com/" }] } } });
    const res = await runBing({ http: h, key: "k", siteUrl: SITE, prevData: null, log: () => undefined });
    expect(res.outcome).toMatchObject({ kind: "inactive", enableHint: expect.stringMatching(/verificar/) });
  });

  it("con todo bien: ok", async () => {
    const { h } = http({
      GetUserSites: SITES,
      GetQueryStats: { status: 200, data: fixture("bing_query_stats") },
      GetPageStats: { status: 200, data: fixture("bing_page_stats") },
    });
    const res = await runBing({ http: h, key: "k", siteUrl: SITE, prevData: null, log: () => undefined });
    expect(res.outcome.kind).toBe("ok");
  });

  it("la nota de un error nunca lleva la clave", () => {
    const key = fakeSecrets().bingKey;
    const e = Object.assign(new Error(`GET ...?apikey=${key}`), {
      isAxiosError: true,
      config: { params: { apikey: key } },
      request: { path: `/x?apikey=${key}` },
      response: { status: 500, data: {} },
    });
    expect(sanitizeError(e, "bing")).not.toContain(key);
    expect(sanitizeError(e, "bing")).not.toContain("apikey");
  });

  it("joinGsc suma por consulta normalizada", () => {
    const m = joinGsc([
      { queries: [{ key: "Dolar  Hoy", clicks: 2, impressions: 10 }] },
      { queries: [{ key: "dolar hoy", clicks: 1, impressions: 5 }] },
    ]);
    expect(m.get("dolar hoy")).toEqual({ clicks: 3, impressions: 15 });
  });
});
