import { describe, expect, it } from "vitest";
import { botConfig, type BotConfig } from "../../classes/redditbot/config";
import { retrievalGate } from "../../classes/redditbot/gate";
import type { RetrievedPage } from "../../classes/rag/types";

const cfg = (over: Partial<BotConfig> = {}): BotConfig => ({
  ...botConfig(),
  minCosine: 0.62,
  minMargin: 1.12,
  strongCosine: 0.72,
  ...over,
});

const page = (path: string, score: number, cosine: number): RetrievedPage => ({
  path,
  title: path,
  tier: "full",
  score,
  cosine,
  chunks: [],
});

describe("redditbot/gate", () => {
  it("lets through a close match that clearly won", () => {
    const verdict = retrievalGate(cfg(), [page("/a", 0.030, 0.78), page("/b", 0.020, 0.61)]);
    expect(verdict.ok).toBe(true);
    expect(verdict.page!.path).toBe("/a");
    expect(verdict.margin).toBeCloseTo(1.5, 2);
  });

  it("rejects a winner that is not actually close to the question", () => {
    const verdict = retrievalGate(cfg(), [page("/a", 0.030, 0.41), page("/b", 0.010, 0.30)]);
    expect(verdict.reason).toBe("weak_match");
  });

  it("lets a tie through when the match is strong — two good pages is coverage, not a gap", () => {
    // Measured against the real index: "¿me conviene monotributo o unipersonal?" scores cosine
    // 0.741 with a 1.04 margin because /que-empresa-abrir-uruguay and /facturar-en-monotributo
    // legitimately both answer it. Calling that a content gap would be wrong twice over.
    const verdict = retrievalGate(cfg(), [page("/a", 0.0442, 0.741), page("/b", 0.0425, 0.735)]);
    expect(verdict.ok).toBe(true);
  });

  it("rejects a four-way tie — that is a content gap, not a link", () => {
    // The real shape of this: /alquilar-en-uruguay, /alquilar-estando-en-clearing and the rent
    // communities page all score alike for "no tengo garantía". Each is adjacent; none answers.
    const verdict = retrievalGate(cfg(), [page("/a", 0.0280, 0.71), page("/b", 0.0275, 0.70)]);
    expect(verdict.reason).toBe("no_clear_winner");
    expect(verdict.detail).toContain("/b");
  });

  it("treats a lone result as the most decisive win there is, not as a missing measurement", () => {
    const verdict = retrievalGate(cfg(), [page("/a", 0.016, 0.80)]);
    expect(verdict.ok).toBe(true);
    expect(verdict.margin).toBe(Infinity);
  });

  it("does not divide by a zero runner-up", () => {
    const verdict = retrievalGate(cfg(), [page("/a", 0.016, 0.80), page("/b", 0, 0)]);
    expect(verdict.ok).toBe(true);
    expect(Number.isNaN(verdict.margin)).toBe(false);
  });

  it("says no when retrieval returned nothing", () => {
    expect(retrievalGate(cfg(), []).reason).toBe("no_pages");
  });

  it("checks the cosine before the margin — a far page that won big is still the wrong answer", () => {
    const verdict = retrievalGate(cfg(), [page("/a", 0.030, 0.20), page("/b", 0.005, 0.10)]);
    expect(verdict.reason).toBe("weak_match");
  });

  it("is not silently unreachable: the default config admits a plausible top result", () => {
    // The bug this guards. The first version gated on the absolute RRF score with a threshold of
    // 0.034, above the 2/61 ≈ 0.0328 maximum a page can reach by topping BOTH retrieval arms — the
    // bot could never have posted, and the number looked deliberately tuned.
    const bestPossible = 2 / 61;
    const verdict = retrievalGate(botConfig(), [page("/a", bestPossible, 0.75), page("/b", 0.020, 0.6)]);
    expect(verdict.ok).toBe(true);
  });
});
