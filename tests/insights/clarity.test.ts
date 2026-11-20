import { afterEach, describe, expect, it } from "vitest";
import { CLARITY_CALLS, parseClarity, runClarity } from "../../classes/insights/sources/clarity";
import type { ClarityHttp } from "../../classes/insights/sources/clarity";
import { fixture } from "./helpers";

const NOW = new Date("2026-11-21T12:21:00Z");

function counter(max: number) {
  const state = { used: 0, reserved: 0 };
  return {
    state,
    reserve: async (m: number) => {
      state.reserved++;
      if (state.used >= Math.min(m, max)) return null;
      return ++state.used;
    },
  };
}

function http(answer: (params: any) => { status: number; data?: any }) {
  const calls: any[] = [];
  const h: ClarityHttp = {
    get: async (_url, config) => {
      calls.push(config.params);
      return { data: undefined, ...answer(config.params) };
    },
  };
  return { h, calls };
}

afterEach(() => {
  delete process.env.USAGE_INSIGHTS_CLARITY_MAX_CALLS;
});

describe("parseClarity", () => {
  it("convierte números en texto y une los bloques sin importar mayúsculas", () => {
    const p = parseClarity(fixture("clarity_overall").body);
    const t = p.rows[0];
    expect(t.sessions).toBe(1520);
    expect(t.botSessions).toBe(310);
    expect(t.users).toBe(1388);
    expect(t.pagesPerSession).toBe(1.74);
    expect(t.activeSec).toBe(61200);
    expect(t.scrollDepth).toBe(41.37);
    expect(t.rage).toEqual({ sessionsShare: 0.0145, events: 31, sessions: 1520 });
    expect(p.unknownKeys).toEqual([]);
  });

  it("acepta las dos grafías, saca la query y descarta otro host", () => {
    const body = fixture("clarity_by_url_device").body;
    body[0].information.push({ totalSessionCount: "5", Url: "http://localhost:3000/", Device: "PC" });
    body[0].information.push({ totalSessionCount: "7", Url: "https://cambio-uruguay.com/?utm=1", Device: "Mobile", rareField: 1 });
    const p = parseClarity(body);
    const home = p.rows.find((r) => r.dims.url === "/" && r.dims.device === "Mobile")!;
    expect(home.sessions).toBe(427);
    expect(home.users).toBe(401);
    expect(home.rage?.sessionsShare).toBe(0.0429);
    expect(home.dead?.events).toBe(71);
    expect(p.rows.some((r) => String(r.dims.url).includes("localhost"))).toBe(false);
    expect(p.unknownKeys).toContain("Traffic.rareField");
  });

  it("1.000 filas o más se marcan como truncadas", async () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ totalSessionCount: "1", Url: `https://cambio-uruguay.com/p${i}` }));
    const { h } = http(() => ({ status: 200, data: [{ metricName: "Traffic", information: rows }] }));
    const c = counter(6);
    const res = await runClarity({
      lastOkAt: null,
      now: NOW,
      reserve: c.reserve,
      http: h,
      log: () => undefined,
      prevData: null,
      token: "t",
    });
    expect((res.outcome as any).truncated).toBe(true);
  });
});

describe("runClarity", () => {
  it("sin token: cero llamadas", async () => {
    const { h, calls } = http(() => ({ status: 200, data: [] }));
    const res = await runClarity({
      lastOkAt: null,
      now: NOW,
      reserve: counter(6).reserve,
      http: h,
      log: () => undefined,
      prevData: null,
      token: "",
    });
    expect(res.outcome.kind).toBe("inactive");
    expect(calls).toEqual([]);
  });

  it("reserva ANTES de cada llamada; un null no llama", async () => {
    const order: string[] = [];
    const h: ClarityHttp = {
      get: async () => {
        order.push("call");
        return { status: 200, data: fixture("clarity_overall").body };
      },
    };
    let used = 0;
    const reserve = async () => {
      order.push("reserve");
      return used < 2 ? ++used : null;
    };
    const res = await runClarity({ lastOkAt: null, now: NOW, reserve, http: h, log: () => undefined, prevData: null, token: "t" });
    expect(order).toEqual(["reserve", "call", "reserve", "call", "reserve"]);
    expect(res.outcome.kind).toBe("partial");
  });

  it("no relee dentro de las 20 h", async () => {
    const { h, calls } = http(() => ({ status: 200, data: [] }));
    const res = await runClarity({
      lastOkAt: "2026-11-21T01:00:00Z",
      now: NOW,
      reserve: counter(6).reserve,
      http: h,
      log: () => undefined,
      prevData: null,
      token: "t",
    });
    expect(res.outcome).toMatchObject({ kind: "skipped", note: "ya leído hoy" });
    expect(calls).toEqual([]);
  });

  it("dos corridas del mismo día con todas las llamadas fallando reservan ≤ máximo entre las dos", async () => {
    const c = counter(6);
    const { h, calls } = http(() => ({ status: 400 }));
    await runClarity({ lastOkAt: null, now: NOW, reserve: c.reserve, http: h, log: () => undefined, prevData: null, token: "t" });
    await runClarity({ lastOkAt: null, now: NOW, reserve: c.reserve, http: h, log: () => undefined, prevData: null, token: "t" });
    expect(c.state.used).toBe(6);
    expect(calls.length).toBe(6);
    const third = await runClarity({
      lastOkAt: null,
      now: NOW,
      reserve: c.reserve,
      http: h,
      log: () => undefined,
      prevData: null,
      token: "t",
    });
    expect(third.outcome.kind).toBe("skipped");
    expect(calls.length).toBe(6);
  });

  it("401 → inactiva; 429 corta", async () => {
    const r401 = await runClarity({
      lastOkAt: null,
      now: NOW,
      reserve: counter(6).reserve,
      http: http(() => ({ status: 401 })).h,
      log: () => undefined,
      prevData: null,
      token: "t",
    });
    expect(r401.outcome).toMatchObject({ kind: "inactive", enableHint: expect.stringMatching(/generar otro/) });
    let n = 0;
    const { h, calls } = http(() =>
      ++n === 1 ? { status: 200, data: fixture("clarity_overall").body } : { status: 429, data: "Exceeded daily limit" }
    );
    const r429 = await runClarity({
      lastOkAt: null,
      now: NOW,
      reserve: counter(6).reserve,
      http: h,
      log: () => undefined,
      prevData: null,
      token: "t",
    });
    expect(r429.outcome).toMatchObject({ kind: "partial", note: "límite diario de Clarity agotado" });
    expect(calls.length).toBe(2);
  });

  it("pide las dimensiones exactamente como se documentan", async () => {
    const { h, calls } = http(() => ({ status: 200, data: fixture("clarity_by_url_device").body }));
    await runClarity({ lastOkAt: null, now: NOW, reserve: counter(6).reserve, http: h, log: () => undefined, prevData: null, token: "t" });
    expect(calls.map((p) => [p.dimension1, p.dimension2].filter(Boolean).join("+"))).toEqual(CLARITY_CALLS.map((c) => c.dims.join("+")));
    expect(calls.every((p) => p.numOfDays === 1)).toBe(true);
  });
});
