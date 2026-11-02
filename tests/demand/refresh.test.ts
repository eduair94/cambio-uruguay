import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assessSerp } from "../../classes/demand/classify";
import { harvest, type Suggestion } from "../../classes/demand/harvest";
import { loadKnownQueries } from "../../classes/demand/known";
import { refreshDemandQueue, type DemandQueue, type RefreshOptions } from "../../classes/demand/refresh";
import { probeSerp } from "../../classes/demand/serp";
import { loadIndex } from "../../classes/rag/store";

vi.mock("../../classes/gaps/topics", () => ({ SITE_TOPICS: [{ key: "trabajo", scope: "licencia" }] }));
vi.mock("../../classes/demand/harvest", () => ({
  buildSeeds: () => ["licencia uruguay"],
  harvest: vi.fn(),
}));
vi.mock("../../classes/demand/known", () => ({ loadKnownQueries: vi.fn() }));
vi.mock("../../classes/demand/serp", () => ({ probeSerp: vi.fn() }));
vi.mock("../../classes/rag/store", () => ({ loadIndex: vi.fn() }));

const NOW = Date.parse("2026-11-02T06:40:00.000Z");
const writing = assessSerp({ domains: ["reddit.com"], hasAnswerBox: false });
const doubtful = assessSerp({ domains: ["example.com"], hasAnswerBox: false });
const excluded = assessSerp({ domains: ["example.com"], hasAnswerBox: true });

const suggestions = (count: number): Suggestion[] => Array.from({ length: count }, (_, i) => ({
  query: `licencia uruguay caso ${String(i + 1).padStart(2, "0")}`,
  rank: 0,
  seed: "licencia uruguay",
}));

function harvested(rows: Suggestion[]) {
  vi.mocked(harvest).mockResolvedValue({ suggestions: rows, attempted: 1, failed: 0, throttled: false });
}

async function refresh(options: RefreshOptions = {}) {
  const pending = refreshDemandQueue(options);
  await vi.runAllTimersAsync();
  return pending;
}

function expectAccounting(queue: DemandQueue) {
  const run = queue.serpRun!;
  expect(run).toBeDefined();
  const failed = Object.values(run.failures).reduce((sum, count) => sum + count, 0);
  expect(run.attempted).toBe(queue.probed + failed);
  expect(queue.inScope).toBe(run.attempted + run.notAttempted.budget + run.notAttempted.disabled);
  expect(run.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  expect(run.finishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  expect(Date.parse(run.finishedAt)).toBeGreaterThanOrEqual(Date.parse(run.startedAt));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.mocked(loadIndex).mockResolvedValue([]);
  vi.mocked(loadKnownQueries).mockResolvedValue(new Map());
  vi.mocked(probeSerp).mockReset().mockResolvedValue({ status: "classified", assessment: doubtful });
  harvested(suggestions(25));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("refreshDemandQueue: diagnóstico de SERP", () => {
  it("distingue 25 fallos reales de 25 consultas fuera de un presupuesto cero", async () => {
    vi.mocked(probeSerp).mockResolvedValue({ status: "failed", reason: "http", httpStatus: 429 });
    const failed = await refresh();

    expect(probeSerp).toHaveBeenCalledTimes(25);
    expect(failed.probed).toBe(0);
    expect(failed.serpRun).toMatchObject({
      budget: 25,
      attempted: 25,
      failures: { http: 25 },
      httpStatuses: { "429": 25 },
      notAttempted: { budget: 0, disabled: 0 },
    });
    expect(failed.items).toHaveLength(25);
    for (const item of failed.items) {
      expect(item.serpCheck).toEqual({ status: "failed", reason: "http", httpStatus: 429 });
      expect(item.serp).toBeUndefined();
      expect(item.score).toBe(0.4);
    }
    expectAccounting(failed);

    vi.mocked(probeSerp).mockClear();
    const omitted = await refresh({ serpBudget: 0 });

    expect(probeSerp).not.toHaveBeenCalled();
    expect(omitted.probed).toBe(0);
    expect(omitted.serpRun).toMatchObject({
      budget: 0,
      attempted: 0,
      failures: {},
      httpStatuses: {},
      notAttempted: { budget: 25, disabled: 0 },
    });
    expect(omitted.items).toHaveLength(25);
    for (const item of omitted.items) {
      expect(item.serpCheck).toEqual({ status: "not-attempted", reason: "budget" });
      expect(item.serp).toBeUndefined();
      expect(item.score).toBe(0.4);
    }
    expectAccounting(omitted);
  });

  it("skipSerp no llama al servidor y marca todas las consultas como deshabilitadas", async () => {
    harvested(suggestions(30));
    const queue = await refresh({ skipSerp: true });

    expect(probeSerp).not.toHaveBeenCalled();
    expect(queue.probed).toBe(0);
    expect(queue.serpRun).toMatchObject({
      budget: 25,
      attempted: 0,
      failures: {},
      httpStatuses: {},
      notAttempted: { budget: 0, disabled: 30 },
    });
    expect(queue.items).toHaveLength(30);
    expect(queue.items.every((item) => item.serpCheck?.status === "not-attempted"
      && item.serpCheck.reason === "disabled")).toBe(true);
    expectAccounting(queue);
  });

  it("cuenta los clasificados, descartados y fallidos antes del recorte a 40 filas", async () => {
    const rows = suggestions(50);
    harvested(rows);
    vi.mocked(probeSerp)
      .mockResolvedValueOnce({ status: "classified", assessment: writing })
      .mockResolvedValueOnce({ status: "classified", assessment: excluded })
      .mockResolvedValueOnce({ status: "failed", reason: "http", httpStatus: 503 });

    const queue = await refresh({ serpBudget: 45 });

    expect(probeSerp).toHaveBeenCalledTimes(45);
    expect(queue.probed).toBe(44);
    expect(queue.inScope).toBe(50);
    expect(queue.items).toHaveLength(40);
    expect(queue.serpRun).toMatchObject({
      budget: 45,
      attempted: 45,
      failures: { http: 1 },
      httpStatuses: { "503": 1 },
      notAttempted: { budget: 5, disabled: 0 },
    });
    expect(queue.items[0]).toMatchObject({
      query: rows[0].query, serp: writing, serpCheck: { status: "classified" }, score: 1,
    });
    expect(queue.items.find((item) => item.query === rows[1].query)).toBeUndefined();
    expect(queue.items.find((item) => item.query === rows[2].query)).toMatchObject({
      serpCheck: { status: "failed", reason: "http", httpStatus: 503 }, score: 0.4,
    });
    expectAccounting(queue);
  });

  it("agrega todos los motivos y códigos HTTP sin reintentar ni llenar el presupuesto sobrante", async () => {
    harvested(suggestions(8));
    vi.mocked(probeSerp)
      .mockResolvedValueOnce({ status: "failed", reason: "http", httpStatus: 429 })
      .mockResolvedValueOnce({ status: "failed", reason: "http", httpStatus: 429 })
      .mockResolvedValueOnce({ status: "failed", reason: "http", httpStatus: 503 })
      .mockResolvedValueOnce({ status: "failed", reason: "timeout" })
      .mockResolvedValueOnce({ status: "failed", reason: "network" })
      .mockResolvedValueOnce({ status: "failed", reason: "empty-results" })
      .mockResolvedValueOnce({ status: "failed", reason: "invalid-response" })
      .mockResolvedValueOnce({ status: "failed", reason: "unexpected" });

    const queue = await refresh();

    expect(probeSerp).toHaveBeenCalledTimes(8);
    expect(new Set(vi.mocked(probeSerp).mock.calls.map(([query]) => query)).size).toBe(8);
    expect(queue.probed).toBe(0);
    expect(queue.serpRun).toMatchObject({
      budget: 25,
      attempted: 8,
      failures: { http: 3, timeout: 1, network: 1, "empty-results": 1, "invalid-response": 1, unexpected: 1 },
      httpStatuses: { "429": 2, "503": 1 },
      notAttempted: { budget: 0, disabled: 0 },
    });
    expectAccounting(queue);
  });

  it("mantiene la pausa entre consultas y registra el comienzo y final de la etapa", async () => {
    harvested(suggestions(3));
    const calledAt: number[] = [];
    vi.mocked(probeSerp).mockImplementation(async () => {
      calledAt.push(Date.now());
      return { status: "classified", assessment: doubtful };
    });

    const queue = await refresh();

    expect(calledAt).toEqual([NOW, NOW + 1500, NOW + 3000]);
    expect(Date.parse(queue.serpRun!.startedAt)).toBeLessThanOrEqual(calledAt[0]);
    expect(Date.parse(queue.serpRun!.finishedAt)).toBeGreaterThanOrEqual(calledAt[2]);
    expect(queue.probed).toBe(3);
    expectAccounting(queue);
  });

  it("el diagnóstico sólo cuenta candidatos locales dentro del alcance y conserva options.now", async () => {
    const row = (query: string): Suggestion => ({ query, rank: 0, seed: "licencia uruguay" });
    harvested([
      row("licencia uruguay"),
      row("licencia por duelo mexico"),
      row("futbol uruguay jugadores"),
      ...suggestions(3),
    ]);

    const queue = await refresh({ now: Date.parse("2026-10-31T23:00:00.000Z"), serpBudget: 1 });

    expect(queue).toMatchObject({ key: "demand_queue", asOf: "2026-10-31", harvested: 5, local: 4, inScope: 3, probed: 1 });
    expect(queue.serpRun).toMatchObject({ attempted: 1, notAttempted: { budget: 2, disabled: 0 } });
    expect(probeSerp).toHaveBeenCalledTimes(1);
    expect(queue.items.filter((item) => item.serpCheck?.status === "not-attempted")).toHaveLength(2);
    expectAccounting(queue);
  });

  it.each([
    { requested: -4, effective: 0 },
    { requested: 2.9, effective: 2 },
    { requested: NaN, effective: 25 },
    { requested: Infinity, effective: 25 },
  ])("usa un presupuesto entero efectivo para $requested", async ({ requested, effective }) => {
    const queue = await refresh({ serpBudget: requested });

    expect(queue.serpRun!.budget).toBe(effective);
    expect(probeSerp).toHaveBeenCalledTimes(effective);
    expect(queue.serpRun!.notAttempted).toEqual({ budget: 25 - effective, disabled: 0 });
    expectAccounting(queue);
  });

  it("una cosecha sin candidatos registra ceros sin consultar el SERP", async () => {
    harvested([]);
    const queue = await refresh();

    expect(queue.items).toEqual([]);
    expect(probeSerp).not.toHaveBeenCalled();
    expect(queue.serpRun).toMatchObject({
      budget: 25, attempted: 0, failures: {}, httpStatuses: {}, notAttempted: { budget: 0, disabled: 0 },
    });
    expectAccounting(queue);
  });
});
