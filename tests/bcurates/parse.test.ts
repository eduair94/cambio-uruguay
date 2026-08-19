import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseBcuText, parsePeriodo, parseVigenteDesde } from "../../classes/bcurates/parse";
import { BASELINE_TABLE, rowKey, validateTable } from "../../classes/bcurates/table";

// The real text of the BCU PDF as published for August 2026, extracted with unpdf. Keeping a
// fixture means the parser is exercised against the actual document, layout quirks included,
// without a network call — and a future BCU redesign shows up as a failing test rather than as a
// silent job that stops updating.
const FIXTURE = readFileSync(join(__dirname, "fixtures", "tasas-medias-2026-08.txt"), "utf8");

describe("parsePeriodo / parseVigenteDesde", () => {
  it("reads the quarter and the effective date the document declares", () => {
    expect(parsePeriodo(FIXTURE)).toBe("abril–junio de 2026");
    expect(parseVigenteDesde(FIXTURE)).toBe("2026-08-01");
  });

  it("handles the Uruguayan spelling of September", () => {
    expect(parseVigenteDesde("vigentes a partir del 1º de setiembre de 2026.")).toBe("2026-09-01");
    expect(parseVigenteDesde("vigentes a partir del 1º de septiembre de 2026.")).toBe("2026-09-01");
  });

  it("returns empty rather than guessing", () => {
    expect(parsePeriodo("sin período acá")).toBe("");
    expect(parseVigenteDesde("vigentes a partir del 1º de brumario de 2026")).toBe("");
    expect(parseVigenteDesde("")).toBe("");
  });
});

describe("parseBcuText against the real August 2026 document", () => {
  const { table, problems } = parseBcuText(FIXTURE, BASELINE_TABLE.rows);

  it("parses without complaints", () => {
    expect(problems).toEqual([]);
    expect(table).not.toBeNull();
  });

  it("recovers exactly the six rows the page needs", () => {
    expect(table!.rows).toHaveLength(6);
    expect(new Set(table!.rows.map(rowKey)).size).toBe(6);
  });

  it("passes the Ley 18.212 proof on figures taken from the document", () => {
    // The caps are READ, not derived, so this closing is evidence the columns were mapped right.
    expect(validateTable(table!)).toEqual({ ok: true, problems: [] });
  });

  it("agrees with the hand-verified baseline, cell for cell", () => {
    // The baseline was transcribed by hand from the PDF; the parser reads the same document.
    // If they disagree, one of the two is wrong and this page should not ship either.
    const byKey = new Map(table!.rows.map(r => [rowKey(r), r]));
    for (const expected of BASELINE_TABLE.rows) {
      const got = byKey.get(rowKey(expected));
      expect(got, rowKey(expected)).toBeDefined();
      expect(got!.media, `${rowKey(expected)}.media`).toBeCloseTo(expected.media, 4);
      expect(got!.tope, `${rowKey(expected)}.tope`).toBeCloseTo(expected.tope, 3);
      expect(got!.topeMora, `${rowKey(expected)}.topeMora`).toBeCloseTo(expected.topeMora, 3);
    }
  });

  it("puts the headline cap where the page expects it", () => {
    const row = table!.rows.find(
      r => r.currency === "UYU" && r.bracket === "menor10kUI" && r.cortoPlazo
    )!
    expect(row.media).toBeCloseTo(84.47, 4)
    expect(row.tope).toBeCloseTo(130.9285, 4)
  });
});

describe("parseBcuText refuses to guess", () => {
  it("returns null when the capital section is missing", () => {
    const { table, problems } = parseBcuText("un documento cualquiera sin la tabla", BASELINE_TABLE.rows);
    expect(table).toBeNull();
    expect(problems.join(" ")).toMatch(/capital menor/i);
  });

  it("returns null when a row lost its columns", () => {
    // Simulate a re-flowed row: fewer figures than the table has columns.
    const broken = FIXTURE.replace(
      /^días 12\.0280%.*$/m,
      "días 12.0280% 20.0415% 34.6270%"
    );
    const { table } = parseBcuText(broken, BASELINE_TABLE.rows);
    // Either it refuses outright, or the arithmetic proof rejects what it produced.
    if (table) expect(validateTable(table).ok).toBe(false)
    else expect(table).toBeNull()
  });

  it("reports the missing effective date instead of inventing one", () => {
    const noDate = FIXTURE.replace(/vigentes a partir del[^\n]*/i, "")
    const { problems } = parseBcuText(noDate, BASELINE_TABLE.rows)
    expect(problems.join(" ")).toMatch(/vigencia/i)
  });
});
