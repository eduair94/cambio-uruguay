import crypto from "crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => {
  const post = vi.fn();
  const get = vi.fn();
  return { default: { post, get }, post, get };
});

import axios from "axios";
import { inspectUrl, inspectUrlDetailed } from "../../classes/gsc/client";
import { ymdInTimeZone } from "../../classes/site-analytics/refresh";
import {
  buildIndexationBlock,
  classifyCoverage,
  compactOf,
  indexationOutcome,
  planInspections,
  runInspections,
} from "../../classes/insights/sources/indexation";
import type { CompactInspection, CoverageClass } from "../../classes/insights/types";
import { GOOGLE_QUOTA_TZ } from "../../classes/insights/types";
import { fixture } from "./helpers";

const CASES: [string, CoverageClass][] = [
  ["Submitted and indexed", "indexed"],
  ["Indexed, not submitted in sitemap", "indexed"],
  ["Indexed, though blocked by robots.txt", "indexed-warning"],
  ["Page indexed without content", "indexed-warning"],
  ["Crawled - currently not indexed", "crawled-not-indexed"],
  ["Discovered - currently not indexed", "discovered-not-indexed"],
  ["Duplicate without user-selected canonical", "duplicate-no-canonical"],
  ["Duplicate, Google chose different canonical than user", "duplicate-google-chose"],
  ["Alternate page with proper canonical tag", "alternate-canonical"],
  ["Page with redirect", "redirect"],
  ["Excluded by ‘noindex’ tag", "noindex"],
  ["URL marked 'noindex'", "noindex"],
  ["Not found (404)", "not-found"],
  ["Soft 404", "soft-404"],
  ["Server error (5xx)", "server-error"],
  ["Redirect error", "redirect-error"],
  ["Blocked by robots.txt", "blocked-robots"],
  ["URL blocked by robots.txt", "blocked-robots"],
  ["Blocked due to unauthorized request (401)", "blocked-4xx"],
  ["Blocked due to access forbidden (403)", "blocked-4xx"],
  ["Blocked due to other 4xx issue", "blocked-4xx"],
  ["URL blocked due to other 4xx issue", "blocked-4xx"],
  ["URL is unknown to Google", "unknown-to-google"],
];

describe("classifyCoverage", () => {
  it.each(CASES)("%s → %s", (state, cls) => {
    expect(classifyCoverage("NEUTRAL", state, null, null)).toBe(cls);
  });

  it("NOT_FOUND del fetch y lo desconocido", () => {
    expect(classifyCoverage("FAIL", "algo nuevo", "NOT_FOUND", null)).toBe("not-found");
    expect(classifyCoverage("NEUTRAL", "algo nuevo", null, null)).toBe("other");
  });
});

describe("planInspections", () => {
  const sitemap = [
    ...Array.from({ length: 30 }, (_, i) => `/guias/g${i}`),
    ...Array.from({ length: 30 }, (_, i) => `/alquileres/a${i}`),
    "/",
    "/dolar-hoy",
  ];
  const base = {
    sitemapPaths: sitemap,
    firstSeenOf: (p: string) => (p === "/guias/g0" || p === "/guias/g1" ? "2026-11-15" : "2026-10-01"),
    seededAt: "2026-10-01",
    lastInspected: new Map<string, string>([["/dolar-hoy", "2026-11-18"]]),
    trafficRank: ["/", "/dolar-hoy", "/fuera-del-sitemap", "/guias/g0"],
    budget: 12,
    day: "2026-11-20",
  };

  it("nuevas → más visitadas → al azar, dentro del cupo y sin repetir", () => {
    const plan = planInspections(base);
    expect(plan.length).toBe(12);
    expect(plan.slice(0, 2).map((p) => p.reason)).toEqual(["new", "new"]);
    expect(plan[2]).toEqual({ path: "/", reason: "top" });
    // /dolar-hoy se miró hace 2 días (enfriamiento de 7) y la de afuera del sitemap no entra
    expect(plan.some((p) => p.path === "/dolar-hoy" || p.path === "/fuera-del-sitemap")).toBe(false);
    expect(new Set(plan.map((p) => p.path)).size).toBe(plan.length);
    expect(plan.slice(3).every((p) => p.reason === "random")).toBe(true);
    // al azar alternando familias
    const fams = plan
      .slice(3, 5)
      .map((p) => p.path.split("/")[1])
      .sort();
    expect(fams).toEqual(["alquileres", "guias"]);
  });

  it("determinista para un día fijo; cero de cupo es cero", () => {
    expect(planInspections(base)).toEqual(planInspections(base));
    expect(planInspections({ ...base, budget: 0 })).toEqual([]);
    expect(planInspections({ ...base, day: "2026-11-21" })).not.toEqual(planInspections(base));
  });
});

const PASS = {
  ok: true as const,
  result: {
    url: "",
    verdict: "PASS",
    coverageState: "Submitted and indexed",
    robotsTxtState: "ALLOWED",
    indexingState: "INDEXING_ALLOWED",
    lastCrawlTime: null,
    googleCanonical: null,
    userCanonical: null,
    pageFetchState: "SUCCESSFUL",
  },
};

describe("runInspections", () => {
  const plan = Array.from({ length: 10 }, (_, i) => ({ path: `/p${i}`, reason: "random" as const }));
  const deps = (over: any = {}) => {
    let used = 0;
    return {
      inspect: async () => PASS,
      reserve: async () => (used < 400 ? ++used : null),
      now: () => 0,
      maxMinutes: 20,
      siteBase: "https://cambio-uruguay.com",
      day: "2026-11-20",
      ...over,
    };
  };

  it("para por cuota o permiso y nunca da veredicto a lo no inspeccionado", async () => {
    let n = 0;
    const quota = await runInspections(plan, deps({ inspect: async () => (++n > 3 ? { ok: false, status: 429, kind: "quota" } : PASS) }));
    expect(quota.stoppedBy).toBe("quota");
    expect(quota.results.map((r) => r.path)).toEqual(["/p0", "/p1", "/p2"]);
    const perm = await runInspections(plan, deps({ inspect: async () => ({ ok: false, status: 403, kind: "permission" }) }));
    expect(perm.stoppedBy).toBe("permission");
    expect(perm.results).toEqual([]);
    expect(indexationOutcome(perm, 10, {} as any, { used: 1, max: 400, day: "x" }).kind).toBe("inactive");
  });

  it("para por el reloj y por errores seguidos", async () => {
    let t = 0;
    const time = await runInspections(plan, deps({ now: () => (t += 7 * 60000) }));
    expect(time.stoppedBy).toBe("time");
    const errors = await runInspections(plan, deps({ inspect: async () => Promise.reject(new Error("x")) }));
    expect(errors.stoppedBy).toBe("errors");
  });

  it("dos corridas del mismo día de Google no pasan el máximo entre las dos", async () => {
    let used = 0;
    const max = 6;
    const reserve = async () => (used < max ? ++used : null);
    const first = await runInspections(plan, deps({ reserve }));
    expect(first.results.length).toBe(6);
    expect(first.stoppedBy).toBe("counter");
    const second = await runInspections(plan, deps({ reserve }));
    expect(second.results.length).toBe(0);
    expect(indexationOutcome(second, plan.length, {} as any, { used, max, day: "2026-11-20" })).toMatchObject({ kind: "skipped" });
    expect(used).toBe(max);
  });

  it("el día de cuota es el de Google (Pacífico)", () => {
    expect(ymdInTimeZone(new Date("2026-11-21T07:30:00Z"), GOOGLE_QUOTA_TZ)).toBe("2026-11-20");
    expect(ymdInTimeZone(new Date("2026-11-21T09:30:00Z"), GOOGLE_QUOTA_TZ)).toBe("2026-11-21");
  });
});

describe("buildIndexationBlock", () => {
  const ins = (path: string, r: "new" | "top" | "random", cs: string, at = "2026-11-20"): CompactInspection =>
    compactOf(path, r, at, {
      url: "",
      verdict: "NEUTRAL",
      coverageState: cs,
      robotsTxtState: "",
      indexingState: "",
      lastCrawlTime: null,
      googleCanonical: null,
      userCanonical: `https://cambio-uruguay.com${path}`,
      pageFetchState: null,
    });
  const today = {
    budget: 400,
    quotaUsedBefore: 0,
    quotaDay: "2026-11-20",
    picked: { new: 0, top: 0, random: 0 },
    checked: 0,
    stoppedBy: null,
    minutes: 0,
  };

  it("la proporción de la familia sale SÓLO de la capa al azar", () => {
    const list: CompactInspection[] = [];
    for (let i = 0; i < 40; i++) list.push(ins(`/guias/n${i}`, "new", "Crawled - currently not indexed"));
    for (let i = 0; i < 20; i++) list.push(ins(`/guias/r${i}`, "random", "Submitted and indexed"));
    const data = buildIndexationBlock({
      inspections: list,
      firstSeenOf: () => "2026-10-01",
      seededAt: "2026-09-01",
      traffic: new Map(),
      day: "2026-11-20",
      today,
      sitemap: null,
    });
    const fam = data.families.find((f) => f.family === "/guias/*")!;
    expect(fam.shareActionable).toBe(0);
    expect(fam.checked).toBe(60);
    expect(fam.actionable).toBe(40);
    expect(data.newUrls.checked).toBe(40);
    const few = buildIndexationBlock({
      inspections: list.slice(0, 49),
      firstSeenOf: () => "2026-10-01",
      seededAt: "2026-09-01",
      traffic: new Map(),
      day: "2026-11-20",
      today,
      sitemap: null,
    });
    expect(few.families[0].shareActionable).toBeNull();
  });

  it("menos de 14 días en el sitemap es pendiente; la siembra no", () => {
    const list = [ins("/nueva", "new", "Crawled - currently not indexed"), ins("/vieja", "random", "Crawled - currently not indexed")];
    const firstSeen = (p: string) => (p === "/nueva" ? "2026-11-15" : "2026-09-01");
    const data = buildIndexationBlock({
      inspections: list,
      firstSeenOf: firstSeen,
      seededAt: "2026-09-01",
      traffic: new Map(),
      day: "2026-11-20",
      today,
      sitemap: null,
    });
    expect(data.rows.map((r) => r.path)).toEqual(["/vieja"]);
    expect(data.totals28d.pending).toBe(1);
    expect(data.newUrls.pending).toBe(1);
    expect(data.rows[0].userCanonical).toBe("=");
  });
});

describe("inspectUrlDetailed", () => {
  const OLD_ENV = { ...process.env };
  beforeAll(() => {
    const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 1024 });
    process.env.GSC_CLIENT_EMAIL = "sa@example.iam.gserviceaccount.com";
    process.env.GSC_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  const answer = (err: any) => {
    const post = vi.mocked(axios.post);
    post.mockReset();
    post.mockImplementation(async (url: string) => {
      if (String(url).includes("oauth2")) return { data: { access_token: "x" } } as any;
      if (err) throw err;
      return { data: fixture("gsc_inspection_pass") } as any;
    });
  };

  it("lee los campos nuevos y manda languageCode", async () => {
    answer(null);
    const o = await inspectUrlDetailed("https://cambio-uruguay.com/dolar-hoy", { languageCode: "en-US" });
    expect(o.ok).toBe(true);
    if (o.ok) {
      expect(o.result.crawledAs).toBe("MOBILE");
      expect(o.result.inspectionResultLink).toMatch(/search-console/);
      expect(o.result.sitemap).toEqual(["https://cambio-uruguay.com/sitemap.xml"]);
    }
    const body = vi.mocked(axios.post).mock.calls.find((c) => String(c[0]).includes("urlInspection"))?.[1] as any;
    expect(body.languageCode).toBe("en-US");
  });

  it("un 403 de permiso es `permission` sin reintentos; inspectUrl sigue en null", async () => {
    const e = { response: { status: 403, data: fixture("gsc_inspection_errors")["403"].body } };
    answer(e);
    expect(await inspectUrlDetailed("https://cambio-uruguay.com/x")).toEqual({ ok: false, status: 403, kind: "permission" });
    expect(await inspectUrl("https://cambio-uruguay.com/x")).toBeNull();
    const body = vi
      .mocked(axios.post)
      .mock.calls.filter((c) => String(c[0]).includes("urlInspection"))
      .pop()?.[1] as any;
    expect(body.languageCode).toBeUndefined();
  });

  it("un 429 es `quota` (después de los reintentos de paced)", async () => {
    vi.useFakeTimers();
    try {
      answer({ response: { status: 429, data: fixture("gsc_inspection_errors")["429"].body } });
      const p = inspectUrlDetailed("https://cambio-uruguay.com/x");
      await vi.runAllTimersAsync();
      expect(await p).toEqual({ ok: false, status: 429, kind: "quota" });
      answer({ response: { status: 403, data: { error: { message: "Quota exceeded for quota metric" } } } });
      const q = inspectUrl("https://cambio-uruguay.com/x");
      await vi.runAllTimersAsync();
      expect(await q).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
