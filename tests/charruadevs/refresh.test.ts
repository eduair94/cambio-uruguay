import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock se eleva arriba de todo: lo que sus fábricas usan tiene que nacer en vi.hoisted.
const { store, fetchRange, classifyPosts, classifyComments } = vi.hoisted(() => ({
  store: {
    ensureIndexes: vi.fn(),
    upsertTexts: vi.fn(async (d: unknown[]) => d.length),
    knownRids: vi.fn(async () => new Set<string>()),
    threadInfo: vi.fn(async () => new Map()),
    recentRids: vi.fn(async () => [] as string[]),
    applyLive: vi.fn(async () => 0),
    loadAnalyzeRows: vi.fn(async () => []),
    loadQuotePool: vi.fn(async () => []),
    loadState: vi.fn(),
    saveState: vi.fn(),
    storedSnapshotTexts: vi.fn(async () => 0),
    loadStoredFred: vi.fn(async () => []),
    saveSnapshot: vi.fn(),
    storedTextCount: vi.fn(async () => 0),
  },
  fetchRange: vi.fn(),
  classifyPosts: vi.fn(),
  classifyComments: vi.fn(),
}));

vi.mock("../../classes/charruadevs/store", () => store);
vi.mock("../../classes/charruadevs/harvest", () => ({ fetchRange }));
vi.mock("../../classes/charruadevs/classify", () => ({ CLASSIFIER_MODEL: "m", classifyPosts, classifyComments }));
vi.mock("../../classes/charruadevs/fred", () => ({ fetchFred: async () => null }));
vi.mock("../../classes/reddit", () => ({ fetchInfoLive: async () => null }));

import { isThin, runRefresh } from "../../classes/charruadevs/refresh";

const emptyLex = { no_hay_laburo: 0, saturado: 0, despidos: 0, reemplazo_ia: 0, ia_menciones: 0, optimismo: 0 };
const NOW = new Date("2026-09-15T12:00:00Z");

describe("refresh", () => {
  beforeEach(() => {
    for (const f of Object.values(store)) f.mockClear();
    fetchRange.mockReset();
    classifyPosts.mockReset();
    classifyComments.mockReset();
    store.knownRids.mockResolvedValue(new Set());
    store.storedSnapshotTexts.mockResolvedValue(0);
    store.loadState.mockResolvedValue({
      months: [{ m: "2026-08", posts: 9, comments: 99, candidates: 50, classified: 50, lex: emptyLex, lexN: 99 }],
    });
  });

  it("refuses to run without a seeded state", async () => {
    store.loadState.mockResolvedValue(null);
    await expect(runRefresh({ now: NOW })).rejects.toThrow(/--seed/);
  });

  it("classifies only what is new and never stores an unlabelled text", async () => {
    fetchRange.mockImplementation(async (kind: string) =>
      kind === "posts"
        ? [
            // 1789000000 = 2026-09-10, dentro de los dos meses que cosecha una corrida del 2026-09-15.
            { id: "p1", created_utc: 1789000000, title: "No hay laburo", selftext: "", permalink: "/r/CharruaDevs/comments/p1/x/" },
            { id: "p2", created_utc: 1789000100, title: "Duda con React", selftext: "" },
          ]
        : [{ id: "c1", link_id: "t3_p1", parent_id: "t3_p1", created_utc: 1789000200, body: "el mercado está muerto", author: "u" }]
    );
    store.knownRids.mockResolvedValue(new Set(["t3_p2"]));
    classifyPosts.mockResolvedValue(
      new Map([["p1", { rel: true, stance: -1, themes: ["busqueda"], ai: null, event: "busca", persona: "junior" }]])
    );
    classifyComments.mockResolvedValue(new Map());
    const report = await runRefresh({ now: NOW });
    expect(classifyPosts.mock.calls[0][0].map((p: { id: string }) => p.id)).toEqual(["p1"]);
    const stored = store.upsertTexts.mock.calls.flatMap((c) => c[0] as Array<Record<string, unknown>>);
    expect(stored.map((d) => d.rid)).toEqual(["t3_p1"]);
    expect(stored.some((d) => "author" in d)).toBe(false);
    expect(report.failed).toBe(1);
    const saved = store.saveState.mock.calls[0][0] as { months: Array<{ m: string; candidates: number }> };
    expect(saved.months.find((r) => r.m === "2026-09")?.candidates).toBe(1);
  });

  it("an empty harvest keeps the stored month rows", async () => {
    fetchRange.mockResolvedValue([]);
    await runRefresh({ now: NOW });
    const saved = store.saveState.mock.calls[0][0] as { months: Array<{ m: string; comments: number }> };
    expect(saved.months.find((r) => r.m === "2026-08")?.comments).toBe(99);
  });

  it("does not overwrite the board with a thin snapshot", async () => {
    fetchRange.mockResolvedValue([]);
    store.storedSnapshotTexts.mockResolvedValue(1000);
    const report = await runRefresh({ now: NOW });
    expect(report.wrote).toBe(false);
    expect(store.saveSnapshot).not.toHaveBeenCalled();
  });

  it("isThin only trips on a real drop", () => {
    expect(isThin(950, 1000)).toBe(false);
    expect(isThin(800, 1000)).toBe(true);
    expect(isThin(10, 0)).toBe(false);
  });
});
