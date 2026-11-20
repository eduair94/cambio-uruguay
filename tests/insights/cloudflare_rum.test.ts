import { describe, expect, it } from "vitest";
import { addDays } from "../../classes/site-analytics/refresh";
import { createCfClient } from "../../classes/insights/sources/cloudflare";
import type { HttpLike } from "../../classes/insights/sources/cloudflare";
import {
  buildCfRumBlock,
  clsValue,
  parseElements,
  parsePages,
  parseVitals,
  ratedFromTuple,
  referrerKind,
  RUM_PARTS,
  rumGroups,
  rumQuery,
  runCloudflareRum,
  tupleOf,
  usToMs,
} from "../../classes/insights/sources/cloudflareRum";
import type { ArchivedRumDay } from "../../classes/insights/sources/cloudflareRum";
import type { CfRumDay, DayWindow } from "../../classes/insights/types";
import { fixture } from "./helpers";

const WINDOW: DayWindow = { start: "2026-10-24", end: "2026-11-20", days: 28, tz: "America/Montevideo" };

function day(over: Partial<CfRumDay> = {}, loads = 1000): CfRumDay {
  return {
    suspect: false,
    sampleInterval: 1,
    totals: { uy: { loads, visits: loads / 2 }, all: { loads: loads * 2, visits: loads } },
    pagesByDevice: [
      { path: "/", device: "mobile", loads: loads * 0.6, visits: loads * 0.3 },
      { path: "/", device: "desktop", loads: loads * 0.4, visits: loads * 0.2 },
    ],
    referrers: [
      { host: "www.google.com", device: "mobile", loads: loads * 0.8, visits: loads * 0.5 },
      { host: "cambio-uruguay.com", device: "mobile", loads: loads * 0.2, visits: 0 },
    ],
    countries: [{ country: "UY", loads, visits: loads / 2 }],
    vitals: [],
    elements: [],
    ...over,
  };
}

describe("valores de RUM", () => {
  it("µs → ms y −1 → null", () => {
    expect(usToMs(1113000)).toBe(1113);
    expect(usToMs(-1)).toBeNull();
    expect(clsValue(-1)).toBeNull();
    expect(clsValue(0.14)).toBe(0.14);
    const v = parseVitals(rumGroups(fixture("cf_rum_webvitals_by_path_device").data, "rumWebVitalsEventsAdaptiveGroups"));
    const home = v.find((x) => x.path === "/" && x.device === "mobile")!;
    expect(home.p75).toEqual({ lcpMs: 1113, inpMs: 624, cls: 0.14, fcpMs: 1343, ttfbMs: 459 });
    expect(home.sampleInterval).toBe(10);
    expect(home.lcp).toEqual([330, 50, 20]);
    expect(v.find((x) => x.path === "/en/celulares-uruguay")!.p75.lcpMs).toBeNull();
  });

  it("calificación con los umbrales de Google, ida y vuelta por la tupla", () => {
    expect(ratedFromTuple([330, 50, 20]).rating).toBe("good");
    expect(ratedFromTuple([250, 70, 80]).rating).toBe("ni");
    expect(ratedFromTuple([10, 10, 80]).rating).toBe("poor");
    expect(ratedFromTuple([0, 0, 0]).rating).toBeNull();
    const r = ratedFromTuple([7, 2, 1]);
    expect(ratedFromTuple(tupleOf(r))).toEqual(r);
    expect(r.poorShare).toBe(0.1);
  });

  it("el elemento vacío se guarda y el referente se clasifica", () => {
    const cls = parseElements("cls", rumGroups(fixture("cf_rum_webvitals_cls_elements").data, "rumWebVitalsEventsAdaptiveGroups"));
    expect(cls.some((e) => e.element === "" && e.path === "/" && e.events === 90)).toBe(true);
    const inp = parseElements("inp", rumGroups(fixture("cf_rum_webvitals_inp_elements").data, "rumWebVitalsEventsAdaptiveGroups"));
    expect(inp[0].inpName).toBe("pointer");
    expect(referrerKind("www.google.com")).toBe("search");
    expect(referrerKind("chatgpt.com")).toBe("ai");
    expect(referrerKind("cambio-uruguay.com")).toBe("internal");
    expect(referrerKind("")).toBe("direct");
    expect(referrerKind("l.facebook.com")).toBe("social");
    expect(referrerKind("ejemplo.uy")).toBe("other");
  });

  it("las páginas suman cargas y entradas por ruta × dispositivo", () => {
    const groups = rumGroups(fixture("cf_rum_pageloads_by_path").data).map((g: any) => ({
      ...g,
      dimensions: { ...g.dimensions, deviceType: "mobile" },
    }));
    const p = parsePages(groups);
    expect(p.totals).toEqual({ loads: 3200, visits: 2290 });
    expect(p.rows.find((r) => r.path === "/autos-usados-uruguay/comparar")!.visits).toBe(0);
  });
});

describe("consultas", () => {
  it("el INP se filtra en microsegundos y cada consulta pide los dos hosts", () => {
    expect(rumQuery("inpElements", "2026-11-20", "in").filter.interactionToNextPaint_gt).toBe(200000);
    expect(rumQuery("lcpElements", "2026-11-20", "in").filter.largestContentfulPaint_gt).toBe(2500000);
    for (const part of RUM_PARTS) {
      const q = rumQuery(part, "2026-11-20", "in");
      expect(q.filter.requestHost_in).toEqual(["cambio-uruguay.com", "www.cambio-uruguay.com"]);
      expect(q.filter.datetime_geq).toBe("2026-11-20T03:00:00Z");
      expect(q.filter.bot).toBe(0);
      expect(q.query).not.toMatch(/refererPath/);
    }
    expect(rumQuery("pages", "2026-11-20", "exact").filter.requestHost).toBe("cambio-uruguay.com");
  });
});

describe("buildCfRumBlock", () => {
  it("suma sólo la racha contigua que termina en el último día", () => {
    const archived: ArchivedRumDay[] = [
      { day: "2026-11-15", data: day({}, 500) },
      { day: "2026-11-18", data: day({}, 1000) },
      { day: "2026-11-19", data: day({}, 1000) },
      { day: "2026-11-20", data: day({}, 1000) },
    ];
    const b = buildCfRumBlock(archived, WINDOW, "2026-11-20");
    expect(b.daysCovered).toEqual(["2026-11-18", "2026-11-19", "2026-11-20"]);
    expect(b.totals.uy.loads).toBe(3000);
    expect(b.internalLoadsShare).toBe(0.2);
  });

  it("un día sospechoso queda afuera", () => {
    const archived: ArchivedRumDay[] = [
      { day: "2026-11-19", data: day({}, 1000) },
      { day: "2026-11-20", data: day({ suspect: true }, 10) },
    ];
    const b = buildCfRumBlock(archived, WINDOW, "2026-11-20");
    expect(b.daysCovered).toEqual(["2026-11-19"]);
    expect(b.suspectDays).toEqual(["2026-11-20"]);
  });

  it("realSamples = Σ count / sampleInterval: un día muestreado cuenta una décima", () => {
    const vital = (samples: number, interval: number) => ({
      path: "/",
      device: "mobile",
      samples,
      sampleInterval: interval,
      lcp: [10, 0, 0] as [number, number, number],
      inp: [10, 0, 0] as [number, number, number],
      cls: [0, 0, 10] as [number, number, number],
      fcp: [0, 0, 0] as [number, number, number],
      ttfb: [0, 0, 0] as [number, number, number],
      p75: { lcpMs: 1000, inpMs: 100, cls: 0.3, fcpMs: null, ttfbMs: null },
    });
    const b = buildCfRumBlock(
      [
        { day: "2026-11-19", data: day({ vitals: [vital(300, 10)] }) },
        { day: "2026-11-20", data: day({ vitals: [vital(5, 1)] }) },
      ],
      WINDOW,
      "2026-11-20"
    );
    const v = b.vitals[0];
    expect(v.samples).toBe(305);
    expect(v.realSamples).toBe(35);
    expect(v.cls.rating).toBe("poor");
    expect(v.p75Approx?.day).toBe("2026-11-20");
  });

  it("el rango de consentimiento termina anteayer y suma sólo esos días", () => {
    const archived: ArchivedRumDay[] = [];
    for (let i = 0; i < 10; i++) archived.push({ day: addDays("2026-11-20", -i), data: day({}, 100 * (i + 1)) });
    const b = buildCfRumBlock(archived, WINDOW, "2026-11-20");
    expect(b.consent?.range).toEqual({ start: "2026-11-11", end: "2026-11-19" });
    expect(b.consent?.days).toBe(9);
    // días 1..9 atrás: 200 + 300 + … + 1000 cargas
    expect(b.consent?.totals.loads).toBe(5400);
    expect(b.consent?.pages[0].path).toBe("/");
  });
});

/** Un Cloudflare de mentira que contesta los fixtures según la consulta. */
function fakeRumHttp(perDayLoads = 3200) {
  const days: string[] = [];
  const http: HttpLike = {
    get: async () => ({ status: 200, data: fixture("cf_zone_get") }),
    post: async (_url, body) => {
      const q: string = body.query;
      if (q.includes("settings")) return { status: 200, data: fixture("cf_settings_rum") };
      const geq = body.variables?.filter?.datetime_geq as string;
      if (q.includes("requestPath deviceType }") && q.includes("rumPageloadEventsAdaptiveGroups")) {
        days.push(geq.slice(0, 10));
        const g = rumGroups(fixture("cf_rum_pageloads_by_path").data).map((x: any) => ({
          ...x,
          count: Math.round((x.count * perDayLoads) / 3200),
          dimensions: { ...x.dimensions, deviceType: "mobile" },
        }));
        return { status: 200, data: { data: { viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: g }] } } } };
      }
      if (q.includes("refererHost")) return { status: 200, data: fixture("cf_rum_pageloads_by_source") };
      if (q.includes("countryName"))
        return {
          status: 200,
          data: {
            data: {
              viewer: {
                accounts: [
                  { rumPageloadEventsAdaptiveGroups: [{ count: 9000, sum: { visits: 5000 }, dimensions: { countryName: "UY" } }] },
                ],
              },
            },
          },
        };
      if (q.includes("cumulativeLayoutShiftElement")) return { status: 200, data: fixture("cf_rum_webvitals_cls_elements") };
      if (q.includes("interactionToNextPaintElement")) return { status: 200, data: fixture("cf_rum_webvitals_inp_elements") };
      if (q.includes("largestContentfulPaintElement")) return { status: 200, data: fixture("cf_rum_webvitals_lcp_elements") };
      return { status: 200, data: fixture("cf_rum_webvitals_by_path_device") };
    },
  };
  return { http, days };
}

describe("runCloudflareRum", () => {
  const noWait = { sleep: async () => undefined, now: () => 0, minIntervalMs: 0, tokens: ["t1"] };

  it("sin tokens: inactiva, cero pedidos", async () => {
    const { http, days } = fakeRumHttp();
    const res = await runCloudflareRum({
      client: createCfClient({ ...noWait, http, tokens: [] }),
      dataDay: "2026-11-20",
      window: WINDOW,
      archived: [],
      state: { suspectSince: null, backfillTarget: null },
      backfillDays: 0,
      nowIso: "2026-11-21T12:21:00Z",
      log: () => undefined,
    });
    expect(res.outcome.kind).toBe("inactive");
    expect(days).toEqual([]);
  });

  it("--backfill=28 fija el objetivo, para en el tope y la corrida siguiente lo termina", async () => {
    const run = async (archived: ArchivedRumDay[], state: any, backfillDays: number, maxQueries: number) => {
      const { http, days } = fakeRumHttp();
      const res = await runCloudflareRum({
        client: createCfClient({ ...noWait, http, maxQueries }),
        dataDay: "2026-11-20",
        window: WINDOW,
        archived,
        state,
        backfillDays,
        nowIso: "2026-11-21T12:21:00Z",
        log: () => undefined,
      });
      return { res, days };
    };
    const first = await run([], { suspectSince: null, backfillTarget: null }, 28, 100);
    expect(first.res.state.backfillTarget).toBe("2026-10-24");
    // 1 de settings + 7 por día: 14 días enteros entran en 100 consultas
    expect(first.res.fetched.length).toBe(14);
    expect(first.res.outcome.kind).toBe("ok");
    const archived = first.res.fetched.map((f) => ({ day: f.day, data: f.data }));
    const second = await run(archived, first.res.state, 0, 200);
    const all = new Set([...archived.map((a) => a.day), ...second.res.fetched.map((f) => f.day)]);
    expect(all.size).toBe(28);
    expect(second.res.state.backfillTarget).toBeNull();
    const block = (second.res.outcome as any).data;
    expect(block.daysCovered.length).toBe(28);
  });

  it("ayer en cero contra la mediana: el día queda sospechoso y el bloque thin", async () => {
    const archived: ArchivedRumDay[] = [];
    for (let i = 1; i <= 7; i++) archived.push({ day: addDays("2026-11-20", -i), data: day({}, 3200) });
    const { http } = fakeRumHttp(100);
    const res = await runCloudflareRum({
      client: createCfClient({ ...noWait, http }),
      dataDay: "2026-11-20",
      window: WINDOW,
      archived,
      state: { suspectSince: null, backfillTarget: null },
      backfillDays: 0,
      nowIso: "2026-11-21T12:21:00Z",
      log: () => undefined,
    });
    expect(res.outcome.kind).toBe("thin");
    expect(res.fetched.find((f) => f.day === "2026-11-20")?.data.suspect).toBe(true);
    expect(res.state.suspectSince).toBe("2026-11-20");
  });
});
