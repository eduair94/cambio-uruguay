import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { refreshUsageInsights } from "../../classes/insights/refresh";
import { readOnlyStore, STATE_KEYS, stateUpdate, emptyState } from "../../classes/insights/store";
import { SOURCE_IDS } from "../../classes/insights/types";
import { BING_QUERY, deps, ga4Api, memoryStore, SEARCH_TERM } from "./fakes";
import { fakeSecrets } from "./helpers";

const NOW = new Date("2026-11-21T12:21:00Z");
const S = fakeSecrets();
const ENV = { ...process.env };

beforeEach(() => {
  process.env.CLARITY_EXPORT_TOKEN = S.jwt;
  process.env.BING_WEBMASTER_API_KEY = S.bingKey;
  process.env.CRUX_API_KEY = S.googleKey;
  process.env.USAGE_INSIGHTS_INSPECT_MAX = "5";
});
afterEach(() => {
  process.env = { ...ENV };
});

async function run(over: any = {}) {
  const mem = over.mem || memoryStore();
  const { deps: d, counts } = deps(over.deps || {});
  const lines: string[] = [];
  const res = await refreshUsageInsights({
    now: over.now || NOW,
    dryRun: !!over.dryRun,
    hasDb: true,
    only: over.only || null,
    skip: over.skip || [],
    backfillDays: over.backfillDays || 0,
    inspectBudget: over.inspectBudget ?? null,
    allowClarity: !!over.allowClarity,
    store: over.store ? over.store(mem.store) : mem.store,
    log: (l) => lines.push(l),
    deps: d,
  });
  return { res, mem, counts, lines };
}

describe("refreshUsageInsights", () => {
  it("una corrida normal: cada fuente su línea, se escribe todo", async () => {
    const { res, mem, counts, lines } = await run();
    const st = res.snapshot.sources;
    expect(st.cloudflareRum.status).toBe("ok");
    expect(st.ga4Behavior.status).toBe("ok");
    expect(st.feedback.status).toBe("ok");
    expect(st.cloudflareZone.status).toBe("inactive");
    expect(st.clarity.status).toBe("ok");
    expect(st.bing.status).toBe("ok");
    expect(st.crux.status).toBe("ok");
    expect(st.indexation.status).toBe("ok");
    expect(counts.inspect).toBe(5);
    expect(mem.quota.inspection.used).toBe(5);
    expect(mem.quota.clarity.used).toBe(6);
    expect(mem.calls).toEqual(expect.arrayContaining(["saveDaySlices", "saveState", "saveSnapshot"]));
    for (const id of SOURCE_IDS) expect(lines.filter((l) => l.startsWith(`[usage-insights] ${id}:`)).length, id).toBe(1);
    expect(res.exitCode).toBe(0);
    expect(res.snapshot.signals.length).toBe(12);
  });

  it("una fuente que tira no le cuesta nada a las otras y conserva su bloque anterior", async () => {
    const first = await run();
    const before = first.res.snapshot.sources.ga4Behavior;
    const second = await run({
      mem: first.mem,
      now: new Date("2026-11-22T12:21:00Z"),
      deps: { ga4: ga4Api({ metadata: async () => Promise.reject(new Error("boom")) }) },
    });
    const ga = second.res.snapshot.sources.ga4Behavior;
    expect(ga.status).toBe("failed");
    expect(ga.data).toEqual(before.data);
    expect(ga.fetchedAt).toBe(before.fetchedAt);
    expect(ga.note).toBe("ga4Behavior: Error: boom");
    expect(second.res.snapshot.sources.cloudflareRum.status).toBe("ok");
  });

  it("Bing caído con su bloque conservado: el cruce con Search Console se lee igual", async () => {
    const first = await run();
    const second = await run({
      mem: first.mem,
      now: new Date("2026-11-22T12:21:00Z"),
      deps: { bingHttp: { get: async () => Promise.reject(new Error("bing caído")) } },
    });
    expect(second.res.snapshot.sources.bing.status).toBe("failed");
    const sig = second.res.snapshot.signals.find((s) => s.id === "bing-only-queries")!;
    expect(sig.reason || "").not.toMatch(/no se pudo leer/);
    expect(sig.rows.map((r) => r.key)).toContain(BING_QUERY);
  });

  it("guarda las claves enteras de cada señal en el estado y la segunda corrida no las ve nuevas", async () => {
    const first = await run();
    expect(first.res.stateKeys).toContain("signalKeys");
    const stored = first.mem.state.signalKeys;
    const bing = first.res.snapshot.signals.find((s) => s.id === "bing-only-queries")!;
    expect(stored["bing-only-queries"]!.length).toBe(bing.count);
    const second = await run({ mem: first.mem, now: new Date("2026-11-22T12:21:00Z") });
    const again = second.res.snapshot.signals.find((s) => s.id === "bing-only-queries")!;
    expect(again.newRows).toBe(0);
  });

  it("--only y --skip dejan las demás `skipped` con su bloque", async () => {
    const only = await run({ only: ["feedback"] });
    expect(only.res.snapshot.sources.feedback.status).toBe("ok");
    expect(only.res.snapshot.sources.cloudflareRum.status).toBe("skipped");
    const skip = await run({ skip: ["crux", "clarity"] });
    expect(skip.res.snapshot.sources.crux.status).toBe("skipped");
    expect(skip.counts.crux).toBe(0);
    expect(skip.counts.clarity).toBe(0);
  });

  it("--backfill corre sólo Cloudflare RUM, GA4 y opiniones", async () => {
    const { res, counts } = await run({ backfillDays: 28 });
    const st = res.snapshot.sources;
    expect([st.cloudflareRum.status, st.ga4Behavior.status, st.feedback.status]).toEqual(["ok", "ok", "ok"]);
    for (const id of ["indexation", "clarity", "crux", "bing", "cloudflareZone"] as const) expect(st[id].status, id).toBe("skipped");
    expect(counts).toMatchObject({ inspect: 0, clarity: 0, crux: 0 });
    expect(res.state.cfRum.backfillTarget).toBeNull();
  });

  it("dos corridas el mismo día de Google: el contador nunca pasa el máximo", async () => {
    const first = await run();
    const second = await run({ mem: first.mem, now: new Date("2026-11-21T14:00:00Z") });
    expect(first.counts.inspect + second.counts.inspect).toBe(5);
    expect(second.res.snapshot.sources.indexation.status).toBe("skipped");
    expect(second.res.snapshot.sources.indexation.note).toMatch(/cupo diario de inspección ya usado/);
    // Clarity: ya leído hoy
    expect(second.res.snapshot.sources.clarity.status).toBe("skipped");
    expect(first.mem.quota.clarity.used).toBe(6);
  });

  it("el dry run no escribe ni reserva, y no llama a Clarity ni inspecciona", async () => {
    const { mem, counts, res } = await run({ dryRun: true, store: (s: any) => readOnlyStore(s, { allowQuotaCounter: false }) });
    expect(mem.calls).toEqual([]);
    expect(counts).toMatchObject({ inspect: 0, clarity: 0, sitemap: 0 });
    expect(res.snapshot.sources.indexation.status).toBe("skipped");
    expect(res.telegram).toBeNull();
  });

  it("con --clarity / --inspect=N el dry run reserva por la fachada, y nada más", async () => {
    const { mem, counts } = await run({
      dryRun: true,
      allowClarity: true,
      inspectBudget: 2,
      store: (s: any) => readOnlyStore(s, { allowQuotaCounter: true }),
    });
    expect(counts.inspect).toBe(2);
    expect(counts.clarity).toBe(6);
    expect(mem.calls.every((c) => c.startsWith("reserveQuota:"))).toBe(true);
    expect(mem.quota.inspection.used).toBe(2);
  });

  it("saveState nunca escribe state.quota", async () => {
    const upd = stateUpdate(emptyState(), [...STATE_KEYS]).$set;
    expect(Object.keys(upd).filter((k) => k.startsWith("state.quota"))).toEqual([]);
    const { mem } = await run();
    for (const u of mem.lastStateUpdates) expect(Object.keys(u).some((k) => k.startsWith("state.quota"))).toBe(false);
  });

  it("los logs y Telegram no llevan términos, consultas de Bing ni tokens", async () => {
    const first = await run();
    const searchSignal = first.res.snapshot.signals.find((s) => s.id === "search-no-results")!;
    expect(searchSignal.rows.map((r) => r.key)).toContain(SEARCH_TERM);
    const bing = first.res.snapshot.signals.find((s) => s.id === "bing-only-queries")!;
    expect(bing.rows.map((r) => r.key)).toContain(BING_QUERY);
    const second = await run({
      mem: first.mem,
      now: new Date("2026-11-22T12:21:00Z"),
      deps: {
        ga4: ga4Api({
          metadata: async () =>
            Promise.reject(
              Object.assign(new Error(`Bearer ${S.bearer}`), {
                isAxiosError: true,
                config: { headers: { Authorization: `Bearer ${S.bearer}` } },
                response: { status: 500 },
              })
            ),
        }),
      },
    });
    const text = [...first.lines, ...second.lines, second.res.telegram || "", ...second.res.snapshot.signals.map((s) => s.summary)].join(
      "\n"
    );
    expect(second.res.telegram).toMatch(/ga4Behavior/);
    for (const secret of [SEARCH_TERM, BING_QUERY, S.bearer, S.jwt, S.bingKey, S.googleKey]) expect(text).not.toContain(secret);
  });
});
