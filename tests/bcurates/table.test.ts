import { describe, expect, it } from "vitest";

import {
  ARITHMETIC_EPSILON,
  BASELINE_TABLE,
  MARKUP_MORA,
  MARKUP_TASA,
  baselineTable,
  capsFromMedia,
  isStale,
  rowKey,
  validateTable,
  type BcuRateTable,
} from "../../classes/bcurates/table";
import { sameAs } from "../../classes/bcurates/refresh";

const clone = (): BcuRateTable => JSON.parse(JSON.stringify(BASELINE_TABLE));

describe("the verified baseline is internally consistent", () => {
  // This is the same proof the guard applies to a live candidate. If the transcription from the
  // BCU PDF were wrong, it would not close — which is how we caught the column mapping in the
  // first place (84,47 × 1,55 = 130,9285 exactly matches the printed cap).
  it("passes its own validator", () => {
    expect(validateTable(BASELINE_TABLE)).toEqual({ ok: true, problems: [] });
  });

  it("derives every cap from the published average", () => {
    for (const r of BASELINE_TABLE.rows) {
      expect(r.tope, rowKey(r)).toBeCloseTo(r.media * (1 + MARKUP_TASA), 3);
      expect(r.topeMora, rowKey(r)).toBeCloseTo(r.media * (1 + MARKUP_MORA), 3);
    }
  });

  it("covers both currencies and both brackets", () => {
    const keys = new Set(BASELINE_TABLE.rows.map(rowKey));
    expect(keys.size).toBe(6);
    expect(keys.has("UYU|menor10kUI|corto")).toBe(true);
    expect(keys.has("UYU|mayor10kUI|largo")).toBe(true);
    expect(keys.has("USD|menor10kUI|corto")).toBe(true);
  });

  it("keeps the small-ticket cap far above the large-ticket one", () => {
    const chico = BASELINE_TABLE.rows.find((r) => r.bracket === "menor10kUI" && r.currency === "UYU" && r.cortoPlazo)!;
    const grande = BASELINE_TABLE.rows.find((r) => r.bracket === "mayor10kUI" && r.currency === "UYU" && r.cortoPlazo)!;
    expect(chico.tope).toBeGreaterThan(grande.tope * 2);
  });

  it("hands out copies, not the frozen original", () => {
    const a = baselineTable();
    a.rows[0]!.media = 1;
    expect(BASELINE_TABLE.rows[0]!.media).not.toBe(1);
  });
});

describe("validateTable rejects what it should", () => {
  it("rejects a cap that does not follow Ley 18.212 arithmetic", () => {
    const t = clone();
    t.rows[0]!.tope = 125; // plausible-looking, but not media × 1,55
    const r = validateTable(t);
    expect(r.ok).toBe(false);
    expect(r.problems.join(" ")).toMatch(/tope .* != media/);
  });

  it("rejects a default cap that does not follow the ×1,80 rule", () => {
    const t = clone();
    t.rows[1]!.topeMora = 150;
    expect(validateTable(t).ok).toBe(false);
  });

  it("rejects a missing row", () => {
    const t = clone();
    t.rows.pop();
    const r = validateTable(t);
    expect(r.ok).toBe(false);
    expect(r.problems.join(" ")).toMatch(/missing row/);
  });

  it("rejects a duplicated row", () => {
    const t = clone();
    t.rows.push({ ...t.rows[0]! });
    const r = validateTable(t);
    expect(r.ok).toBe(false);
    expect(r.problems.join(" ")).toMatch(/duplicate row/);
  });

  it("rejects an internally consistent table whose numbers are nonsense", () => {
    // A decimal slip scales media, tope and mora together, so the arithmetic still closes —
    // only the plausibility band notices. This is why both guards exist.
    const t = clone();
    const row = t.rows[0]!;
    row.media = 8.447;
    row.tope = 8.447 * 1.55;
    row.topeMora = 8.447 * 1.8;
    const r = validateTable(t);
    expect(r.ok).toBe(false);
    expect(r.problems.join(" ")).toMatch(/outside band/);
  });

  it("rejects non-finite and negative numbers", () => {
    const t = clone();
    t.rows[0]!.media = Number.NaN;
    expect(validateTable(t).ok).toBe(false);
    const t2 = clone();
    t2.rows[0]!.media = -84.47;
    expect(validateTable(t2).ok).toBe(false);
  });

  it("rejects a malformed vigenteDesde", () => {
    const t = clone();
    t.vigenteDesde = "agosto 2026";
    const r = validateTable(t);
    expect(r.ok).toBe(false);
    expect(r.problems.join(" ")).toMatch(/ISO date/);
  });

  it("rejects junk input without throwing", () => {
    for (const junk of [null, undefined, 42, "table", [], {}, { rows: "no" }]) {
      expect(validateTable(junk as unknown).ok).toBe(false);
    }
  });

  it("tolerates rounding within the stated epsilon", () => {
    const t = clone();
    t.rows[0]!.tope = t.rows[0]!.media * (1 + MARKUP_TASA) + ARITHMETIC_EPSILON / 2;
    expect(validateTable(t).ok).toBe(true);
  });
});

describe("capsFromMedia", () => {
  it("reproduces the printed caps for the current table", () => {
    const { tope, topeMora } = capsFromMedia(84.47);
    expect(tope).toBe(130.9285);
    expect(topeMora).toBe(152.046);
  });
});

describe("isStale", () => {
  it("is fresh within the BCU's monthly cadence", () => {
    expect(isStale({ vigenteDesde: "2026-08-01" }, new Date("2026-08-19T00:00:00Z"))).toBe(false);
  });

  it("goes stale once a newer table must exist", () => {
    expect(isStale({ vigenteDesde: "2026-08-01" }, new Date("2026-09-25T00:00:00Z"))).toBe(true);
  });

  it("treats an unparseable date as stale", () => {
    expect(isStale({ vigenteDesde: "nope" }, new Date("2026-08-19T00:00:00Z"))).toBe(true);
  });
});

describe("sameAs", () => {
  it("sees an identical table regardless of row order", () => {
    const a = clone();
    const b = clone();
    b.rows.reverse();
    expect(sameAs(a, b)).toBe(true);
  });

  it("notices a changed rate", () => {
    const a = clone();
    const b = clone();
    b.rows[0]!.media = 85.0;
    expect(sameAs(a, b)).toBe(false);
  });

  it("notices a new effective date", () => {
    const a = clone();
    const b = clone();
    b.vigenteDesde = "2026-09-01";
    expect(sameAs(a, b)).toBe(false);
  });
});
