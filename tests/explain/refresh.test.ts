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

  it("writes the doc with narrative:null and the measured drivers when both AI paths fail", async () => {
    findNotableMove.mockResolvedValue(MOVE);
    searchMoveNews.mockResolvedValue(null);
    classify.mockResolvedValue(null);
    loadArchivedHeadlines.mockResolvedValue([]);

    const out = await recordTodayExplanation("USD", "2026-06-02");

    expect(out).toEqual({ recorded: true, date: "2026-06-02" });
    const [, update] = updateOne.mock.calls[0]!;
    expect(update.$set.narrative).toBeNull();
    expect(update.$set.drivers).toEqual(ATTRIBUTION);
    expect(update.$set.headlines).toEqual([]);
  });
});
