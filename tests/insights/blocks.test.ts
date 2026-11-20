import { describe, expect, it } from "vitest";
import { mergeCarried, nextBlock, refusalExpired } from "../../classes/insights/blocks";
import type { SourceBlock } from "../../classes/insights/types";

const T0 = "2026-11-10T12:00:00.000Z";
const NOW = "2026-11-20T12:00:00.000Z";
const prevOk: SourceBlock<{ a: number }> = {
  id: "ga4Behavior",
  status: "ok",
  ok: true,
  fetchedAt: T0,
  attemptedAt: T0,
  lastOkAt: T0,
  failingSince: null,
  note: null,
  enableHint: null,
  window: null,
  truncated: false,
  carried: [],
  rowsSeen: {},
  data: { a: 1 },
};

describe("nextBlock", () => {
  it("ok: datos nuevos y fecha nueva", () => {
    const b = nextBlock("ga4Behavior", prevOk, { kind: "ok", data: { a: 2 } }, NOW);
    expect(b).toMatchObject({ status: "ok", ok: true, data: { a: 2 }, fetchedAt: NOW, lastOkAt: NOW, failingSince: null, carried: [] });
  });

  it("partial: anota lo arrastrado", () => {
    const b = nextBlock("ga4Behavior", prevOk, { kind: "partial", data: { a: 3 }, carried: ["flows"] }, NOW);
    expect(b).toMatchObject({ status: "partial", ok: true, fetchedAt: NOW, carried: ["flows"] });
  });

  it("thin: conserva el bloque anterior con su fecha", () => {
    const b = nextBlock("ga4Behavior", prevOk, { kind: "thin", data: { a: 0 }, note: "flaco" }, NOW);
    expect(b).toMatchObject({ status: "thin", ok: false, data: { a: 1 }, fetchedAt: T0, lastOkAt: T0, failingSince: NOW });
  });

  it("thin sostenido 7 días: se acepta", () => {
    const thin = { ...prevOk, status: "thin" as const, failingSince: "2026-11-13T12:00:00.000Z" };
    const b = nextBlock("ga4Behavior", thin, { kind: "thin", data: { a: 0 }, note: "flaco" }, NOW);
    expect(b).toMatchObject({ status: "ok", data: { a: 0 }, note: "aceptado tras 7 días de caída sostenida" });
    const young = { ...thin, failingSince: "2026-11-15T12:00:00.000Z" };
    expect(nextBlock("ga4Behavior", young, { kind: "thin", data: { a: 0 }, note: "x" }, NOW).status).toBe("thin");
  });

  it("una fecha ilegible nunca autoriza", () => {
    expect(refusalExpired("no-es-fecha", NOW)).toBe(false);
    const thin = { ...prevOk, status: "thin" as const, failingSince: "no-es-fecha" };
    expect(nextBlock("ga4Behavior", thin, { kind: "thin", data: { a: 0 }, note: "x" }, NOW).status).toBe("thin");
  });

  it("primera corrida sin bloque anterior: acepta lo que vino", () => {
    expect(nextBlock("ga4Behavior", null, { kind: "thin", data: { a: 0 }, note: "x" }, NOW)).toMatchObject({
      status: "ok",
      data: { a: 0 },
    });
  });

  it("failed: conserva datos y fecha, empieza la racha", () => {
    const b = nextBlock("ga4Behavior", prevOk, { kind: "failed", note: "http 500" }, NOW);
    expect(b).toMatchObject({ status: "failed", ok: false, data: { a: 1 }, fetchedAt: T0, failingSince: NOW, note: "http 500" });
    const again = nextBlock("ga4Behavior", b, { kind: "failed", note: "otra" }, "2026-11-21T12:00:00.000Z");
    expect(again.failingSince).toBe(NOW);
  });

  it("inactive: conserva datos (pueden ser null) y deja la pista", () => {
    const b = nextBlock("clarity", null, { kind: "inactive", enableHint: "falta X" }, NOW);
    expect(b).toMatchObject({ status: "inactive", ok: false, data: null, enableHint: "falta X", failingSince: null });
    const kept = nextBlock("ga4Behavior", prevOk, { kind: "inactive", enableHint: "falta Y" }, NOW);
    expect(kept).toMatchObject({ data: { a: 1 }, fetchedAt: T0 });
  });

  it("skipped: deja todo como estaba", () => {
    const failed = nextBlock("ga4Behavior", prevOk, { kind: "failed", note: "x" }, NOW);
    const b = nextBlock("ga4Behavior", failed, { kind: "skipped", note: "--skip" }, "2026-11-21T00:00:00.000Z");
    expect(b).toMatchObject({ status: "skipped", data: { a: 1 }, fetchedAt: T0, failingSince: NOW });
  });
});

describe("mergeCarried", () => {
  it("copia las sub-partes caídas", () => {
    expect(mergeCarried({ a: [1], b: [2] }, { a: [9], b: [8] }, ["b"])).toEqual({ a: [1], b: [8] });
    expect(mergeCarried({ a: [1] }, null, ["a"])).toEqual({ a: [1] });
  });
});
