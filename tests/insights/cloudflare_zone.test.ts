import { describe, expect, it } from "vitest";
import { createCfClient } from "../../classes/insights/sources/cloudflare";
import type { HttpLike } from "../../classes/insights/sources/cloudflare";
import {
  labelCrawler,
  parseCrawlerPaths,
  parseCrawlerTotals,
  runCloudflareZone,
  zoneGroups,
  zoneQueries,
  zoneWindow,
} from "../../classes/insights/sources/cloudflareZone";
import { fixture } from "./helpers";

const FORBIDDEN = /clientIP|clientAsn|clientASNDescription|ja3Hash|ja4|sessionIdHash|clientRequestQuery|clientRequestReferer/;
const noWait = { sleep: async () => undefined, now: () => 0, minIntervalMs: 0, tokens: ["t1"] };

describe("Cloudflare zona", () => {
  it("authz en la primera consulta: inactiva y no intenta las demás", async () => {
    let posts = 0;
    const http: HttpLike = {
      get: async () => ({ status: 200, data: {} }),
      post: async () => {
        posts++;
        return { status: 200, data: fixture("cf_graphql_authz_error") };
      },
    };
    const res = await runCloudflareZone(createCfClient({ ...noWait, http }), new Date("2026-11-21T12:00:00Z"), null);
    expect(res.outcome.kind).toBe("inactive");
    expect((res.outcome as any).enableHint).toMatch(/Zona → Analytics → Leer/);
    expect(posts).toBe(1);
  });

  it("etiqueta el user-agent y nunca lo guarda crudo", () => {
    expect(labelCrawler("Mozilla/5.0 ...; compatible; GPTBot/1.2; +https://openai.com/gptbot")).toBe("GPTBot");
    expect(labelCrawler("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe("Googlebot");
    expect(labelCrawler("Mozilla/5.0 Chrome/120")).toBeNull();
    const groups = zoneGroups(fixture("cf_http_requests_ai_crawlers").data);
    const totals = parseCrawlerTotals(groups);
    expect(totals.map((t) => t.crawler).sort()).toEqual(["ClaudeBot", "GPTBot", "OAI-SearchBot", "PerplexityBot"]);
    expect(JSON.stringify(totals)).not.toMatch(/Mozilla/);
    const paths = parseCrawlerPaths(groups);
    expect(paths).toEqual([
      { crawler: "ClaudeBot", path: "/cotizacion/brou", status: 301, requests: 96 },
      { crawler: "OAI-SearchBot", path: "/alquileres-uruguay/montevideo/pocitos", status: 404, requests: 41 },
    ]);
  });

  it("un 304 no es una redirección", () => {
    const g = [
      { count: 5, dimensions: { userAgent: "GPTBot", edgeResponseStatus: 304, clientRequestPath: "/a" } },
      { count: 3, dimensions: { userAgent: "GPTBot", edgeResponseStatus: 301, clientRequestPath: "/b" } },
    ];
    const t = parseCrawlerTotals(g)[0];
    expect(t.notModified304).toBe(5);
    expect(t.redirects).toBe(3);
    expect(parseCrawlerPaths(g).map((x) => x.status)).toEqual([301]);
  });

  it("ninguna consulta pide campos que identifican personas", () => {
    const w = zoneWindow(new Date("2026-11-21T12:00:00Z"), null);
    expect(w.window).toEqual({ start: "2026-11-14", end: "2026-11-20", days: 7, tz: "UTC" });
    for (const q of Object.values(zoneQueries(w.geq, w.lt, null))) {
      expect(q.query).not.toMatch(FORBIDDEN);
      expect(JSON.stringify(q.filter)).not.toMatch(FORBIDDEN);
      expect(q.filter.requestSource).toBe("eyeball");
    }
    // availableFields saca lo que el plan no tiene
    const limited = zoneQueries(w.geq, w.lt, ["dimensions_clientRequestPath", "dimensions_edgeResponseStatus"]);
    expect(limited.crawlerTotals.query).not.toMatch(/userAgent/);
  });

  it("con datos: ok y los parsers arman el bloque", async () => {
    const http: HttpLike = {
      get: async () => ({ status: 200, data: {} }),
      post: async (_u, body) => {
        if (String(body.query).includes("settings")) return { status: 200, data: fixture("cf_settings_http_zone") };
        return { status: 200, data: fixture("cf_http_requests_ai_crawlers") };
      },
    };
    const res = await runCloudflareZone(createCfClient({ ...noWait, http }), new Date("2026-11-21T12:00:00Z"), null);
    expect(res.outcome.kind).toBe("ok");
    const data = (res.outcome as any).data;
    expect(data.errors[0]).toMatchObject({ path: "/alquileres-uruguay/montevideo/pocitos", status: 404, crawlerShare: 1 });
  });
});
