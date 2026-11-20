import { describe, expect, it } from "vitest";
import { parseCrux, parseCruxHistory, runCrux } from "../../classes/insights/sources/crux";
import type { CruxHttp } from "../../classes/insights/sources/crux";
import { fixture } from "./helpers";

const NOW = new Date("2026-11-21T12:21:00Z");

function http(answer: (url: string, body: any) => { status: number; data?: any }) {
  const calls: { url: string; headers: any; body: any }[] = [];
  const h: CruxHttp = {
    post: async (url, body, config) => {
      calls.push({ url, headers: config.headers, body });
      return answer(url, body) as any;
    },
  };
  return { h, calls };
}

const base = {
  topPaths: ["/dolar-hoy", "/"],
  state: { historyFetchedAt: null, lastOkAt: null },
  prevData: null,
  now: NOW,
  sleep: async () => undefined,
  log: () => undefined,
};

describe("CrUX", () => {
  it("CLS en texto → número; la densidad del primer tramo es `good`", () => {
    const { record, period } = parseCrux(fixture("crux_query_record_url_phone"));
    expect(record.cls).toBe(0.26);
    expect(record.lcpMs).toBe(1904);
    expect(record.good.lcp).toBe(0.8812);
    expect(record.rating).toEqual({ lcp: "good", inp: "ni", cls: "poor" });
    expect(period).toEqual({ first: "2026-10-21", last: "2026-11-17" });
  });

  it("la historia: NaN y null son null", () => {
    const h = parseCruxHistory(fixture("crux_query_history_record_origin"), "ALL");
    expect(h.lcpP75).toEqual([2010, null, 1904]);
    expect(h.clsP75).toEqual([0.27, null, 0.26]);
    expect(h.periods).toEqual(["2026-10-31", "2026-11-07", "2026-11-14"]);
  });

  it("sin clave: inactiva y cero llamadas", async () => {
    const { h, calls } = http(() => ({ status: 200 }));
    const res = await runCrux({ ...base, http: h, key: "" });
    expect(res.outcome.kind).toBe("inactive");
    expect(calls).toEqual([]);
  });

  it("la clave viaja en la cabecera, nunca en la URL", async () => {
    const { h, calls } = http(() => ({ status: 200, data: fixture("crux_query_record_url_phone") }));
    const key = "AI" + "za" + "k".repeat(35);
    await runCrux({ ...base, http: h, key });
    expect(calls.length).toBeGreaterThan(3);
    for (const c of calls) {
      expect(c.url).not.toMatch(/key=/);
      expect(c.headers["X-Goog-Api-Key"]).toBe(key);
    }
  });

  it("un 404 cuenta como sin datos; un 429 corta", async () => {
    const nf = await runCrux({ ...base, http: http(() => ({ status: 404, data: fixture("crux_not_found").body })).h, key: "k" });
    expect(nf.outcome.kind).toBe("ok");
    expect((nf.outcome as any).data.noData).toBe(7);
    let n = 0;
    const { h, calls } = http(() =>
      ++n <= 3 ? { status: 200, data: fixture("crux_query_record_url_phone") } : { status: 429, data: fixture("crux_rate_limited").body }
    );
    const rl = await runCrux({ ...base, http: h, key: "k" });
    expect(rl.outcome.kind).toBe("partial");
    expect(calls.length).toBe(4);
  });

  it("403 → inactiva; no relee dentro de las 20 h", async () => {
    const den = await runCrux({ ...base, http: http(() => ({ status: 403, data: fixture("crux_permission_denied").body })).h, key: "k" });
    expect(den.outcome.kind).toBe("inactive");
    const { h, calls } = http(() => ({ status: 200 }));
    const skip = await runCrux({ ...base, state: { historyFetchedAt: null, lastOkAt: "2026-11-21T00:00:00Z" }, http: h, key: "k" });
    expect(skip.outcome).toMatchObject({ kind: "skipped", note: "ya leído hoy" });
    expect(calls).toEqual([]);
  });
});
