import { describe, expect, it, vi, beforeEach } from "vitest";

const askGrounded = vi.fn();
const geminiConfigured = vi.fn();
const groundedHeadlines = vi.fn();
vi.mock("../../classes/gemini", () => ({
  askGrounded: (...a: unknown[]) => askGrounded(...a),
  geminiConfigured: (...a: unknown[]) => geminiConfigured(...a),
  groundedHeadlines: (...a: unknown[]) => groundedHeadlines(...a),
}));

const updateOne = vi.fn();
vi.mock("../../classes/models/PricePrediction", () => ({
  PricePredictionModel: { updateOne: (...a: unknown[]) => updateOne(...a) },
}));

const fetchRecentSeries = vi.fn();
const listActiveCurrencies = vi.fn();
vi.mock("../../classes/predictions/series", () => ({
  fetchRecentSeries: (...a: unknown[]) => fetchRecentSeries(...a),
  listActiveCurrencies: (...a: unknown[]) => listActiveCurrencies(...a),
}));

import { recordTodayPrediction } from "../../classes/predictions/refresh";

// CLP is deliberately NOT in FORECAST_CURRENCIES (USD/EUR/ARS/BRL only) — searchExternalForecasts
// short-circuits to [] without calling askGrounded, so every askGrounded call in these tests is
// unambiguously the AI-lean analysis leg.
const CURRENCY = "CLP";
const AI_REPLY_TEXT = "LEAN: up\nCONFIANZA: alta\nRAZONAMIENTO: Repunte por baja de tasas en la región.";

describe("recordTodayPrediction", () => {
  beforeEach(() => {
    askGrounded.mockReset();
    geminiConfigured.mockReset();
    groundedHeadlines.mockReset();
    updateOne.mockReset();
    fetchRecentSeries.mockReset();
    listActiveCurrencies.mockReset();

    geminiConfigured.mockReturnValue(true);
    fetchRecentSeries.mockResolvedValue([]);
  });

  it("includes the AI analysis in $set when Gemini succeeds", async () => {
    askGrounded.mockResolvedValue({ text: AI_REPLY_TEXT, chunks: [], supports: [] });

    const out = await recordTodayPrediction(CURRENCY, "2026-06-02");

    expect(out).toEqual({ recorded: true, date: "2026-06-02" });
    const [filter, update, opts] = updateOne.mock.calls[0]!;
    expect(filter).toEqual({ currency: CURRENCY, date: "2026-06-02" });
    expect(opts).toEqual({ upsert: true });
    expect(update.$set.ai).toEqual({
      lean: "up",
      confidence: "high",
      reasoning: "Repunte por baja de tasas en la región.",
      basedOn: [],
    });
    expect(update.$set.externalForecasts).toEqual([]);
  });

  it("omits `ai` from $set (never writes null) when Gemini fails", async () => {
    askGrounded.mockResolvedValue(null); // Gemini outage / no key / bad HTTP — all collapse to null

    const out = await recordTodayPrediction(CURRENCY, "2026-06-02");

    expect(out).toEqual({ recorded: true, date: "2026-06-02" });
    const [, update] = updateOne.mock.calls[0]!;
    expect(update.$set).not.toHaveProperty("ai");
    expect(update.$set.externalForecasts).toEqual([]);
  });

  // IMPORTANT 1: a plain unconditional `$set: { ai, externalForecasts }` would overwrite a good
  // morning row's `ai` analysis with `null` the moment a later same-day re-run's Gemini call also
  // failed, destroying it instead of leaving it alone. Omitting `ai` from the $set payload is what
  // leaves an existing document's `ai` field untouched in Mongo (fields absent from $set are not
  // modified) — this asserts the payload itself, not a live DB round-trip.
  it("never sends a $set update that would blank a same-day row's good AI analysis on a failed re-run", async () => {
    askGrounded.mockResolvedValue(null);

    await recordTodayPrediction(CURRENCY, "2026-06-02");

    const [, update] = updateOne.mock.calls[0]!;
    expect(Object.keys(update.$set)).toEqual(["externalForecasts"]);
  });
});
