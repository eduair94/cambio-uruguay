import { describe, expect, it } from "vitest";
import { applyProposals } from "../../classes/aduana/norms";
import type { AduanaFact, Source } from "../../classes/aduana/types";

const SOURCES: Source[] = [
  { id: "decreto-50-026", title: "Decreto 50/026", norm: "Decreto 50/026", url: "https://www.impo.com.uy/bases/decretos/50-2026", checkedAt: "2026-07-11" },
];

const current: AduanaFact[] = [
  { id: "franquicia.tope_anual_usd", label: "Tope anual", value: 800, unit: "USD", sourceId: "decreto-50-026", article: "art. 3", verifiedAt: "2026-07-11", origin: "baseline" },
];

const proposal = (over: Record<string, unknown>) => [
  { id: "franquicia.tope_anual_usd", value: 800, sourceUrl: "https://www.impo.com.uy/bases/decretos/50-2026", article: "art. 3", ...over },
];

describe("applyProposals", () => {
  it("keeps the last-good value and flags a changed fact instead of publishing it", () => {
    const out = applyProposals(current, proposal({ value: 1200 }), SOURCES);
    expect(out.facts[0].value).toBe(800); // NOT 1200 — a human confirms a change of law
    expect(out.pendingReview).toContain("franquicia.tope_anual_usd");
  });

  it("rejects a fact sourced to a domain that is not official", () => {
    const out = applyProposals(current, proposal({ value: 900, sourceUrl: "https://elpais.com.uy/nota" }), SOURCES);
    expect(out.facts[0].value).toBe(800);
    expect(out.pendingReview).toContain("franquicia.tope_anual_usd");
  });

  it("rejects a value outside its plausible range", () => {
    const out = applyProposals(current, proposal({ value: 999999 }), SOURCES);
    expect(out.facts[0].value).toBe(800);
  });

  it("keeps everything when the AI returns garbage", () => {
    expect(applyProposals(current, "<think>hmm</think>", SOURCES).facts).toEqual(current);
    expect(applyProposals(current, null, SOURCES).facts).toEqual(current);
    expect(applyProposals(current, [{ nonsense: true }], SOURCES).facts).toEqual(current);
  });

  it("re-stamps verifiedAt when the AI confirms the value we already had", () => {
    const out = applyProposals(current, proposal({ value: 800 }), SOURCES);
    expect(out.facts[0].value).toBe(800);
    expect(out.pendingReview).toEqual([]);
    expect(out.facts[0].origin).toBe("baseline"); // confirmation does not make it AI-authored
  });
});
