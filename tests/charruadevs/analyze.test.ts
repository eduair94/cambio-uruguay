import { describe, expect, it } from "vitest";
import { bucketStats, buildSnapshot, type AnalyzeRow } from "../../classes/charruadevs/analyze";
import type { CharruaText, MonthRow } from "../../classes/charruadevs/types";
import { VALIDATION } from "../../classes/charruadevs/validation";

const lex = { no_hay_laburo: 2, saturado: 1, despidos: 0, reemplazo_ia: 0, ia_menciones: 5, optimismo: 1 };
const month = (m: string, over: Partial<MonthRow> = {}): MonthRow => ({
  m,
  posts: 2,
  comments: 10,
  candidates: 2,
  classified: 1,
  lex,
  lexN: 10,
  ...over,
});
const row = (over: Partial<AnalyzeRow>): AnalyzeRow => ({
  rid: "t3_x",
  kind: "post",
  createdAt: new Date("2024-01-10T00:00:00Z"),
  month: "2024-01",
  score: 1,
  rel: true,
  stance: 0,
  themes: [],
  ai: null,
  event: "ninguno",
  gone: false,
  ...over,
});

describe("analyze", () => {
  it("bucketStats weighs every unit and ignores off-topic ones", () => {
    const s = bucketStats([
      { stance: -2, w: 1 },
      { stance: 1, w: 1 },
      { stance: -1, w: 2 },
      { stance: null, w: 5 },
    ]);
    expect(s.n).toBe(4);
    expect(s.neg).toBeCloseTo(0.75);
    expect(s.pos).toBeCloseTo(0.25);
    expect(s.negOfOpinion).toBeCloseTo(0.75);
  });

  it("weights sampled comments by candidates/classified of their month", () => {
    const snap = buildSnapshot({
      rows: [row({ rid: "t3_a", stance: -2 }), row({ rid: "t3_b", stance: 1 }), row({ rid: "t1_c", kind: "comment", stance: -1 })],
      months: [month("2024-01", { candidates: 2 })],
      quotePool: [],
      fred: [],
      validation: VALIDATION,
      now: new Date("2024-01-31T00:00:00Z"),
      model: "m",
    });
    const jan = snap.monthly.find((m) => m.m === "2024-01")!;
    expect(jan.neg).toBeCloseTo(0.75);
    expect(jan.pos).toBeCloseTo(0.25);
    expect(snap.corpus.relPosts).toBe(2);
    expect(snap.corpus.relComments).toBe(1);
    expect(snap.lexMonthly[0].no_hay_laburo).toBe(200);
  });

  it("an empty corpus produces nulls, never NaN", () => {
    const snap = buildSnapshot({
      rows: [],
      months: [],
      quotePool: [],
      fred: [],
      validation: VALIDATION,
      now: new Date("2026-09-15T00:00:00Z"),
      model: "m",
    });
    expect(snap.windows.last90.neg).toBeNull();
    expect(JSON.stringify(snap)).not.toContain("NaN");
  });

  it("quotes skip gone texts and neutral ones, and never carry an author", () => {
    const base: CharruaText = {
      rid: "t1_q1",
      kind: "comment",
      thread: "p",
      title: "Hilo",
      body: "no hay laburo",
      createdAt: new Date("2026-09-01T00:00:00Z"),
      month: "2026-09",
      score: 50,
      rel: true,
      stance: -2,
      themes: ["busqueda"],
      ai: null,
      event: "ninguno",
      gone: false,
      url: "https://www.reddit.com/r/CharruaDevs/comments/p/_/q1/",
      model: "m",
    };
    const snap = buildSnapshot({
      rows: [],
      months: [],
      quotePool: [base, { ...base, rid: "t1_q2", gone: true, score: 99 }, { ...base, rid: "t1_q3", stance: 0, score: 80 }],
      fred: [],
      validation: VALIDATION,
      now: new Date("2026-09-15T00:00:00Z"),
      model: "m",
    });
    expect(snap.quotesNeg.map((q) => q.rid)).toEqual(["t1_q1"]);
    expect(JSON.stringify(snap.quotesNeg)).not.toContain("author");
  });
});
