// buildBanksBriefing must never call the real Gemini API from a unit test, so classes/gemini is
// mocked end to end. Three things are pinned here:
//   - no key configured -> unavailable, and NOT a single Gemini call spent (not even wastefully)
//   - an entity whose grounded reply is the "SIN NOTICIAS" sentinel is dropped from items
//   - the synthesis pass (askPlain, never grounded — it must summarise, not search) runs exactly
//     once when there is something to summarise, and never runs over an empty briefing
import { beforeEach, describe, expect, it, vi } from "vitest";

const askGrounded = vi.fn();
const askPlain = vi.fn();
const geminiConfigured = vi.fn();
const groundedHeadlines = vi.fn((..._args: unknown[]) => [] as unknown[]);

vi.mock("../../classes/gemini", () => ({
  askGrounded: (...a: unknown[]) => askGrounded(...a),
  askPlain: (...a: unknown[]) => askPlain(...a),
  geminiConfigured: (...a: unknown[]) => geminiConfigured(...a),
  groundedHeadlines: (...a: unknown[]) => groundedHeadlines(...a),
}));

import { BANK_ENTITIES } from "../../classes/banks/entities";
import { buildBanksBriefing } from "../../classes/banks/news";

describe("buildBanksBriefing", () => {
  beforeEach(() => {
    askGrounded.mockReset();
    askPlain.mockReset();
    geminiConfigured.mockReset();
    groundedHeadlines.mockReset();
    groundedHeadlines.mockReturnValue([]);
  });

  it("is unavailable and spends zero Gemini calls when the key is missing", async () => {
    geminiConfigured.mockReturnValue(false);

    const out = await buildBanksBriefing("es");

    expect(out.unavailable).toBe(true);
    expect(out.items).toEqual([]);
    expect(out.analysis).toBeNull();
    expect(askGrounded).not.toHaveBeenCalled();
    expect(askPlain).not.toHaveBeenCalled();
  });

  it("drops an entity whose grounded reply is the SIN NOTICIAS sentinel", async () => {
    geminiConfigured.mockReturnValue(true);
    const silent = BANK_ENTITIES[0]!;
    const newsy = BANK_ENTITIES[1]!;
    askGrounded.mockImplementation(async (prompt: string) => {
      if (prompt.includes(silent.name)) {
        return { text: "SIN NOTICIAS", sourceUris: [], chunks: [], supports: [], resolvedByChunk: [] };
      }
      return {
        text: `Novedad real sobre ${newsy.name}.`,
        sourceUris: ["https://example.com"],
        chunks: [],
        supports: [],
        resolvedByChunk: [],
      };
    });
    askPlain.mockResolvedValue(
      "Análisis del sector con longitud suficiente para superar el filtro de cuarenta caracteres."
    );

    const out = await buildBanksBriefing("es");

    expect(out.items.find((it) => it.id === silent.id)).toBeUndefined();
    expect(out.items.find((it) => it.id === newsy.id)).toBeDefined();
  });

  it("calls the synthesis (askPlain) exactly once when at least one entity has an insight", async () => {
    geminiConfigured.mockReturnValue(true);
    askGrounded.mockResolvedValue({
      text: "Novedad real.",
      sourceUris: ["https://example.com"],
      chunks: [],
      supports: [],
      resolvedByChunk: [],
    });
    askPlain.mockResolvedValue(
      "Análisis del sector con longitud suficiente para superar el filtro de cuarenta caracteres."
    );

    await buildBanksBriefing("es");

    expect(askPlain).toHaveBeenCalledTimes(1);
    // The synthesis must summarise what was found, never search on its own.
    expect(askGrounded.mock.calls.length).toBe(BANK_ENTITIES.length);
  });

  it("never calls the synthesis when no entity produced an insight", async () => {
    geminiConfigured.mockReturnValue(true);
    askGrounded.mockResolvedValue({
      text: "SIN NOTICIAS",
      sourceUris: [],
      chunks: [],
      supports: [],
      resolvedByChunk: [],
    });

    const out = await buildBanksBriefing("es");

    expect(out.items).toEqual([]);
    expect(askPlain).not.toHaveBeenCalled();
  });
});
