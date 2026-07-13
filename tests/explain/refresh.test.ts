import { describe, expect, it, vi, beforeEach } from "vitest";

const findNotableMove = vi.fn();
const loadDriverSeries = vi.fn();
const attributeMove = vi.fn();
vi.mock("../../classes/explain/moves", () => ({
  findNotableMove: (...a: unknown[]) => findNotableMove(...a),
  loadDriverSeries: (...a: unknown[]) => loadDriverSeries(...a),
  attributeMove: (...a: unknown[]) => attributeMove(...a),
}));

const searchMoveNews = vi.fn();
const loadArchivedHeadlines = vi.fn();
vi.mock("../../classes/explain/news", () => ({
  searchMoveNews: (...a: unknown[]) => searchMoveNews(...a),
  loadArchivedHeadlines: (...a: unknown[]) => loadArchivedHeadlines(...a),
}));

const classify = vi.fn();
vi.mock("../../classes/ai_service", () => ({
  aiService: { classify: (...a: unknown[]) => classify(...a) },
}));

const updateOne = vi.fn();
vi.mock("../../classes/models/MoveExplanation", () => ({
  MoveExplanationModel: { updateOne: (...a: unknown[]) => updateOne(...a) },
}));

import { recordTodayExplanation } from "../../classes/explain/refresh";

const MOVE = { date: "2026-06-02", pctChange: 2, direction: "up" as const };
const DRIVER_SERIES = [{ key: "brl", points: [{ date: "2026-06-02", value: 5.15 }] }];
const ATTRIBUTION = [{ key: "brl", dayMovePct: 3 }];

describe("recordTodayExplanation", () => {
  beforeEach(() => {
    findNotableMove.mockReset();
    loadDriverSeries.mockReset();
    attributeMove.mockReset();
    searchMoveNews.mockReset();
    loadArchivedHeadlines.mockReset();
    classify.mockReset();
    updateOne.mockReset();

    loadDriverSeries.mockResolvedValue(DRIVER_SERIES);
    attributeMove.mockReturnValue(ATTRIBUTION);
  });

  it("stores the grounded narrative and its real cited headlines when Gemini finds something", async () => {
    findNotableMove.mockResolvedValue(MOVE);
    searchMoveNews.mockResolvedValue({
      narrative: "El BCU subió la tasa, presionando al alza.",
      headlines: [{ title: "El BCU subió la tasa", source: "bcu.gub.uy", link: "https://www.bcu.gub.uy/x" }],
    });

    const out = await recordTodayExplanation("USD", "2026-06-02");

    expect(out).toEqual({ recorded: true, date: "2026-06-02" });
    expect(classify).not.toHaveBeenCalled(); // the fallback narrative path never runs
    expect(loadArchivedHeadlines).not.toHaveBeenCalled();
    const [filter, update, opts] = updateOne.mock.calls[0]!;
    expect(filter).toEqual({ currency: "USD", date: "2026-06-02" });
    expect(update.$set.narrative).toBe("El BCU subió la tasa, presionando al alza.");
    expect(update.$set.headlines).toEqual([
      { title: "El BCU subió la tasa", source: "bcu.gub.uy", link: "https://www.bcu.gub.uy/x" },
    ]);
    expect(opts).toEqual({ upsert: true });
  });

  it("falls back to archived headlines + the plain-AI narrative when Gemini finds nothing, and still writes the doc", async () => {
    findNotableMove.mockResolvedValue(MOVE);
    searchMoveNews.mockResolvedValue(null); // no key / SIN NOTICIAS / a failure — all collapse to null
    classify.mockResolvedValue("El real brasileño se depreció, arrastrando al peso.");
    loadArchivedHeadlines.mockResolvedValue([{ title: "Nota archivada", source: "elpais.com.uy", link: "https://elpais.com.uy/x" }]);

    const out = await recordTodayExplanation("USD", "2026-06-02");

    expect(out).toEqual({ recorded: true, date: "2026-06-02" });
    expect(classify).toHaveBeenCalledTimes(1);
    const [, update] = updateOne.mock.calls[0]!;
    expect(update.$set.narrative).toBe("El real brasileño se depreció, arrastrando al peso.");
    expect(update.$set.headlines).toEqual([{ title: "Nota archivada", source: "elpais.com.uy", link: "https://elpais.com.uy/x" }]);
    expect(update.$set.drivers).toEqual(ATTRIBUTION);
  });

  it("does nothing and writes nothing when the target date is not a notable move", async () => {
    findNotableMove.mockResolvedValue(null);

    const out = await recordTodayExplanation("USD", "2026-06-02");

    expect(out).toEqual({ recorded: false, date: "2026-06-02" });
    expect(loadDriverSeries).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("omits narrative/headlines from $set (never writes null) when both AI paths fail, but always writes the measured drivers", async () => {
    findNotableMove.mockResolvedValue(MOVE);
    searchMoveNews.mockResolvedValue(null);
    classify.mockResolvedValue(null);
    loadArchivedHeadlines.mockResolvedValue([]);

    const out = await recordTodayExplanation("USD", "2026-06-02");

    expect(out).toEqual({ recorded: true, date: "2026-06-02" });
    const [, update] = updateOne.mock.calls[0]!;
    expect(update.$set).not.toHaveProperty("narrative");
    expect(update.$set).not.toHaveProperty("headlines");
    expect(update.$set.drivers).toEqual(ATTRIBUTION);
  });

  // IMPORTANT 1: sync_explain.ts advertises re-running later the same day as the repair path for
  // a morning Gemini outage. Regression for the bug that made a re-run destructive instead: a
  // plain unconditional `$set: { narrative, headlines }` would overwrite a good morning row with
  // `narrative: null` the moment the afternoon re-run's generating call also failed. Omitting the
  // fields from $set (this test's real assertion — updateOne's `$set` payload, not any find) is
  // exactly what leaves an existing document's `narrative`/`headlines` untouched in Mongo: fields
  // absent from $set are not modified.
  it("never sends a $set update that would blank a same-day row's good narrative on repeated failed re-runs", async () => {
    findNotableMove.mockResolvedValue(MOVE);
    searchMoveNews.mockResolvedValue(null);
    classify.mockResolvedValue(null); // the re-run's Gemini call fails too
    loadArchivedHeadlines.mockResolvedValue([]);

    await recordTodayExplanation("USD", "2026-06-02");

    const [filter, update, opts] = updateOne.mock.calls[0]!;
    expect(filter).toEqual({ currency: "USD", date: "2026-06-02" });
    expect(opts).toEqual({ upsert: true });
    expect(Object.keys(update.$set).sort()).toEqual(["direction", "drivers", "pctChange"]);
  });
});
